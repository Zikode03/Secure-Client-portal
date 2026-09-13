// Friendly guide: this module (auth) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import {
  createContext,
// Shared shape notes: these types keep UI and data contracts aligned.
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role, SessionUser } from "../types/portal";
import { applyPermissionOverride } from "../utils/userPermissionOverrides";
import {
  ApiError,
  apiGetJson,
  apiPostJson,
  hasApiBaseUrl,
} from "../services/apiClient";

const STORAGE_KEY = "accounting-document-control-session";
const AUTH_NOTICE_KEY = "accounting-document-control-auth-notice";
const LEGACY_TOKEN_KEYS = [
  "accounting-document-control-auth-token",
  "accounting-document-control-refresh-token",
  "accounting-document-control-credentials",
];

interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface InviteSetupPayload {
  email: string;
  token?: string;
  fullName: string;
  password: string;
}

export interface MfaChallenge { mfaRequired: boolean; challengeToken: string; setupKey?: string | null; expiresAtUtc?: string; }

interface AuthResult {
  mfaRequired?: boolean;
  recoveryCodes?: string[];
  ok: boolean;
  message?: string;
  user?: SessionUser;
}

interface AuthContextValue {
  pendingMfa: MfaChallenge | null;
  verifyMfa: (code: string, recovery: boolean) => Promise<AuthResult>;
  finishMfa: () => Promise<AuthResult>;
  cancelMfa: () => void;
  ready: boolean;
  user: SessionUser | null;
  authNotice: string | null;
  clearAuthNotice: () => void;
  login: (payload: LoginPayload) => Promise<AuthResult>;
  completeInvite: (payload: InviteSetupPayload) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mockUsersByEmail: Record<string, SessionUser> = {
  "client@example.com": {
    id: "user-client-1",
    name: "Sarah",
    fullName: "Sarah Jacobs",
    email: "client@example.com",
    role: "client",
    title: "Finance Manager",
    company: "Apex Trading Ltd",
    initials: "SJ",
    clientIds: ["client-apex"],
    assignedClientIds: [],
  },
  "accountant@example.com": {
    id: "user-accountant-1",
    name: "Daniel",
    fullName: "Daniel Mokoena",
    email: "accountant@example.com",
    role: "accountant",
    title: "Senior Accountant",
    company: "Finwell Advisory",
    initials: "DM",
    clientIds: [],
    assignedClientIds: [],
  },
  "admin@example.com": {
    id: "user-admin-1",
    name: "Priya",
    fullName: "Priya Naidoo",
    email: "admin@example.com",
    role: "admin",
    title: "Operations Lead",
    company: "Finwell Advisory",
    initials: "PN",
    clientIds: [],
    assignedClientIds: [],
  },
};

const defaultCredentialsByEmail: Record<string, string> = {
  "client@example.com": "Client@2026",
  "accountant@example.com": "Accountant@2026",
  "admin@example.com": "Admin@2026",
};

interface BackendLoginResponse extends Partial<MfaChallenge> {
  expiresAtUtc?: string;
  refreshExpiresAtUtc?: string;
}

interface BackendMeResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    permissions?: SessionUser["permissions"];
    clientIds?: string[];
  };
}

// Component flow: gather data first, then render a focused UI state.
function createInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "U";
}

function getMockUserByEmail(email: string) {
  return mockUsersByEmail[email.trim().toLowerCase()];
}

function buildUserName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "User";
}

function mapBackendUser(payload: BackendMeResponse["user"]): SessionUser {
  const clientIds = payload.clientIds ?? [];

  return {
    id: payload.id,
    name: buildUserName(payload.fullName),
    fullName: payload.fullName,
    email: payload.email,
    role: payload.role,
    title: payload.role === "client" ? "Client user" : "Portal user",
    company: "",
    initials: createInitials(payload.fullName),
    clientIds,
    assignedClientIds: payload.role === "client" ? [] : clientIds,
    permissions: payload.permissions,
  };
}

function readStoredValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.sessionStorage.getItem(key) ??
    window.localStorage.getItem(key) ??
    ""
  );
}

function writeStoredValue(key: string, value: string, persistent: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const target = persistent ? window.localStorage : window.sessionStorage;
  const alternate = persistent ? window.sessionStorage : window.localStorage;

  alternate.removeItem(key);
  target.setItem(key, value);
}

function clearStoredValue(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

function hasSessionValue(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.sessionStorage.getItem(key));
}

function readAuthNotice() {
  const value = readStoredValue(AUTH_NOTICE_KEY).trim();
  return value || null;
}

function clearStoredFrontendSession() {
  clearStoredValue(STORAGE_KEY);
}

function clearStoredAuthNotice() {
  clearStoredValue(AUTH_NOTICE_KEY);
}

function persistSessionUser(nextUser: SessionUser, persistent: boolean) {
  writeStoredValue(STORAGE_KEY, JSON.stringify(nextUser), persistent);
}

async function loadBackendSessionUser() {
  const response = await apiGetJson<BackendMeResponse>("/api/auth/me");
  return mapBackendUser(response.user);
}

async function refreshBackendSession() {
  return apiPostJson<BackendLoginResponse, Record<string, never>>(
    "/api/auth/refresh",
    {},
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (error.status === 401 && !error.code) {
    return "Your session expired. Please sign in again.";
  }

  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "The email or password is incorrect.";
    case "ACCOUNT_SETUP_REQUIRED":
      return "This account still needs to finish setup. Use the access email to set a password first.";
    case "PASSWORD_RESET_REQUIRED":
      return "A password reset is required before this account can sign in.";
    case "ACCOUNT_DISABLED":
      return "This account is disabled. Please contact your administrator.";
    case "SESSION_EXPIRED":
      return "Your session expired. Please sign in again.";
    case "SESSION_INACTIVE":
      return "Your account session is no longer active. Please sign in again.";
    case "TOKEN_INVALID":
      return "This setup or reset link is invalid or has expired.";
    case "SETUP_NOT_PENDING":
      return "This account does not currently have a pending setup request.";
    case "PASSWORD_TOO_SHORT":
      return "Use a password with at least 15 characters.";
    case "PASSWORD_REUSE":
      return "Choose a new password that is different from the current one.";
    case "INVALID_EMAIL":
      return "Use the email tied to your portal account.";
    case "CURRENT_PASSWORD_REQUIRED":
      return "Enter your current password before choosing a new one.";
    case "CURRENT_PASSWORD_INVALID":
      return "Your current password is incorrect.";
    case "RATE_LIMITED":
      return "Too many authentication attempts. Please wait a moment and try again.";
    default:
      return error.message || fallback;
  }
}

export function defaultPathForRole(role: Role) {
  switch (role) {
    case "accountant":
      return "/firm/dashboard";
    case "admin":
      return "/firm/dashboard";
    default:
      return "/client/dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [pendingMfa, setPendingMfa] = useState<MfaChallenge | null>(null);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(readAuthNotice);
  const [persistSession, setPersistSession] = useState(() => !hasSessionValue(STORAGE_KEY));
  const [mockCredentials, setMockCredentials] = useState(defaultCredentialsByEmail);

  function updateAuthNotice(message: string | null) {
    setAuthNotice(message);
    if (!message) {
      clearStoredAuthNotice();
      return;
    }

    writeStoredValue(AUTH_NOTICE_KEY, message, false);
  }

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      LEGACY_TOKEN_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
      if (hasApiBaseUrl()) {
        try {
          const nextUser = await loadBackendSessionUser();
          if (isMounted) {
            setPersistSession(!hasSessionValue(STORAGE_KEY));
            setUser(nextUser);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            try {
              await refreshBackendSession();
              const nextPersistent = !hasSessionValue(STORAGE_KEY);
              const nextUser = await loadBackendSessionUser();
              if (isMounted) {
                setPersistSession(nextPersistent);
                setUser(nextUser);
              }
            } catch {
              clearStoredFrontendSession();
              if (isMounted) {
                updateAuthNotice("Your session expired. Please sign in again.");
                setUser(null);
              }
            } finally {
              if (isMounted) {
                setReady(true);
              }
            }
            return;
          }

          clearStoredFrontendSession();
          if (isMounted) {
            updateAuthNotice(getApiErrorMessage(error, "Please sign in again to continue."));
            setUser(null);
          }
        } finally {
          if (isMounted) {
            setReady(true);
          }
        }
        return;
      }

      const storedSession = readStoredValue(STORAGE_KEY);
      if (!storedSession) {
        if (isMounted) {
          setReady(true);
        }
        return;
      }

      try {
        const parsedUser = JSON.parse(storedSession) as SessionUser;
        if (isMounted) {
          setPersistSession(!hasSessionValue(STORAGE_KEY));
          setUser(applyPermissionOverride(parsedUser));
        }
      } catch {
        clearStoredFrontendSession();
      } finally {
        if (isMounted) {
          setReady(true);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      clearStoredFrontendSession();
      return;
    }

    persistSessionUser(user, persistSession);
  }, [persistSession, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      authNotice,
      pendingMfa,
      cancelMfa() { setPendingMfa(null); },
      async verifyMfa(code, recovery) {
        if (!pendingMfa) return { ok: false, message: "Sign in again to start verification." };
        try {
          const response = await apiPostJson<BackendLoginResponse & { recoveryCodes?: string[] }, object>(
            "/api/auth/mfa/verify", { challengeToken: pendingMfa.challengeToken, code, useRecoveryCode: recovery });
          if (response.mfaRequired) { setPendingMfa(response as MfaChallenge); return { ok: true, mfaRequired: true }; }
          return { ok: true, recoveryCodes: response.recoveryCodes };
        } catch (error) { return { ok: false, message: getApiErrorMessage(error, "Verification failed. Try again.") }; }
      },
      async finishMfa() {
        try {
          const nextUser = await loadBackendSessionUser();
          setPendingMfa(null); updateAuthNotice(null); setUser(nextUser);
          return { ok: true, user: nextUser };
        } catch (error) { return { ok: false, message: getApiErrorMessage(error, "Sign in again to continue.") }; }
      },
      clearAuthNotice() {
        updateAuthNotice(null);
      },
      async login({ email, password, rememberMe }) {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail.includes("@")) {
          return { ok: false, message: "Use the email tied to your portal account." };
        }

        if (!password) {
          return {
            ok: false,
            message: "Enter your password to continue.",
          };
        }

        if (hasApiBaseUrl()) {
          try {
            const loginResponse = await apiPostJson<BackendLoginResponse, LoginPayload>(
              "/api/auth/login",
              { email: trimmedEmail, password, rememberMe },
            );
            setPersistSession(rememberMe);
            if (loginResponse.mfaRequired) { setPendingMfa(loginResponse as MfaChallenge); return { ok: true, mfaRequired: true }; }

            const nextUser = await loadBackendSessionUser();
            updateAuthNotice(null);
            setUser(nextUser);
            return { ok: true, user: nextUser };
          } catch (error) {
            clearStoredFrontendSession();
            return {
              ok: false,
              message: getApiErrorMessage(
                error,
                "Sign-in failed. Check your credentials or backend connection and try again.",
              ),
            };
          }
        }

        const matchedUser = getMockUserByEmail(trimmedEmail);
        if (!matchedUser) {
          return {
            ok: false,
            message:
              "That account is not available in the mock workspace yet. Try client@example.com, accountant@example.com, or admin@example.com.",
          };
        }

        if (mockCredentials[trimmedEmail] !== password) {
          return {
            ok: false,
            message: "The password does not match this portal account.",
          };
        }

        const nextUser = applyPermissionOverride(matchedUser);
        setPersistSession(rememberMe);
        updateAuthNotice(null);
        setUser(nextUser);
        return { ok: true, user: nextUser };
      },
      async completeInvite({ email, token, fullName, password }) {
        const trimmedEmail = email.trim().toLowerCase();
        const matchedUser = getMockUserByEmail(trimmedEmail);

        if (hasApiBaseUrl()) {
          if (!token?.trim()) {
            return {
              ok: false,
              message: "The invite link is missing its setup token. Ask your administrator to resend the access email.",
            };
          }

          try {
            const inviteResponse = await apiPostJson<BackendLoginResponse, InviteSetupPayload>(
              "/api/auth/complete-invite",
              {
                email: trimmedEmail,
                token: token.trim(),
                fullName: fullName.trim(),
                password,
              },
            );
            setPersistSession(true);
            if (inviteResponse.mfaRequired) { setPendingMfa(inviteResponse as MfaChallenge); return { ok: true, mfaRequired: true }; }

            const nextUser = await loadBackendSessionUser();
            updateAuthNotice(null);
            setUser(nextUser);
            return { ok: true, user: nextUser };
          } catch (error) {
            clearStoredFrontendSession();
            return {
              ok: false,
              message: getApiErrorMessage(
                error,
                "Invite setup failed. The link may have expired or the backend rejected the request.",
              ),
            };
          }
        }

        if (!matchedUser) {
          return {
            ok: false,
            message: "This invite email is not recognised in the mocked portal users.",
          };
        }

        if (Array.from(password).length < 15) {
          return {
            ok: false,
            message: "Use a password with at least 15 characters.",
          };
        }

        const nextUser: SessionUser = {
          ...matchedUser,
          fullName: fullName.trim(),
          name: fullName.trim().split(/\s+/)[0] ?? matchedUser.name,
          initials: createInitials(fullName.trim()),
        };
        setMockCredentials((current) => ({
          ...current,
          [trimmedEmail]: password.trim(),
        }));
        const resolvedUser = applyPermissionOverride(nextUser);
        setPersistSession(true);
        updateAuthNotice(null);
        setUser(resolvedUser);

        return { ok: true, user: resolvedUser };
      },
      async requestPasswordReset(email) {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail.includes("@")) {
          return { ok: false, message: "Use the email tied to your portal account." };
        }

        if (hasApiBaseUrl()) {
          try {
            const response = await apiPostJson<{ message?: string }, { email: string }>(
              "/api/auth/forgot-password",
              { email: trimmedEmail },
            );
            return {
              ok: true,
              message:
                response.message ??
                "If the account exists, reset instructions will be sent.",
            };
          } catch (error) {
            return {
              ok: false,
              message: getApiErrorMessage(
                error,
                "Password reset could not be requested right now.",
              ),
            };
          }
        }

        return {
          ok: true,
          message:
            "Reset instructions have been prepared for this frontend workspace. Backend integration can wire this form to the real identity service later.",
        };
      },
      async changePassword(currentPassword, nextPassword) {
        if (!user) {
          return { ok: false, message: "You need an active session before changing the password." };
        }

        if (hasApiBaseUrl()) {
          try {
            const response = await apiPostJson<BackendLoginResponse, { currentPassword: string; nextPassword: string }>(
              "/api/auth/change-password",
              { currentPassword, nextPassword },
            );
            void response;
            const nextUser = await loadBackendSessionUser();
            setUser(nextUser);
            return { ok: true, message: "Password updated. Your current session has been refreshed." };
          } catch (error) {
            return {
              ok: false,
              message: getApiErrorMessage(error, "Password change failed. Please try again."),
            };
          }
        }

        if (Array.from(nextPassword).length < 15) {
          return { ok: false, message: "Use a new password with at least 15 characters." };
        }

        if (currentPassword.trim() === nextPassword.trim()) {
          return { ok: false, message: "Choose a new password that is different from the current one." };
        }

        const currentCredential = mockCredentials[user.email.toLowerCase()];

        if (currentCredential !== currentPassword) {
          return { ok: false, message: "Your current password is incorrect." };
        }

        setMockCredentials((current) => ({
          ...current,
          [user.email.toLowerCase()]: nextPassword.trim(),
        }));
        return { ok: true, message: "Password updated for this portal account." };
      },
      async logout() {
        if (hasApiBaseUrl()) {
          try {
            await apiPostJson<void, Record<string, never>>("/api/auth/logout", {});
          } catch {
            // Clear the local session even if the backend is already unavailable.
          }
        }

        clearStoredFrontendSession();
        updateAuthNotice(null);
        setUser(null);
      },
    }),
    [authNotice, mockCredentials, persistSession, ready, user, pendingMfa],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
