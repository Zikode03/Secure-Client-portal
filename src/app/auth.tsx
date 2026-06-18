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
  clearAuthToken,
  clearRefreshToken,
  getRefreshToken,
  hasApiBaseUrl,
  setAuthToken,
  setRefreshToken,
} from "../services/apiClient";

const STORAGE_KEY = "accounting-document-control-session";
const CREDENTIALS_KEY = "accounting-document-control-credentials";
const AUTH_NOTICE_KEY = "accounting-document-control-auth-notice";

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

interface AuthResult {
  ok: boolean;
  message?: string;
  user?: SessionUser;
}

interface AuthContextValue {
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

interface BackendLoginResponse {
  token: string;
  refreshToken: string;
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
  const fallbackUser = getMockUserByEmail(payload.email);
  const clientIds = payload.clientIds ?? [];

  return applyPermissionOverride({
    id: payload.id,
    name: buildUserName(payload.fullName),
    fullName: payload.fullName,
    email: payload.email,
    role: payload.role,
    title: fallbackUser?.title ?? (payload.role === "client" ? "Client user" : "Portal user"),
    company: fallbackUser?.company ?? "",
    initials: createInitials(payload.fullName),
    clientIds,
    assignedClientIds: payload.role === "client" ? [] : clientIds,
    permissions: payload.permissions,
  });
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

function persistBackendTokens(response: BackendLoginResponse, persistent: boolean) {
  setAuthToken(response.token, persistent);
  setRefreshToken(response.refreshToken, persistent);
}

function clearStoredBackendSession() {
  clearAuthToken();
  clearRefreshToken();
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
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Refresh token missing");
  }

  const response = await apiPostJson<BackendLoginResponse, { refreshToken: string }>(
    "/api/auth/refresh",
    { refreshToken },
  );
  return response;
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
      return "Use a password with at least 8 characters.";
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

function readCredentials() {
  if (typeof window === "undefined") {
    return defaultCredentialsByEmail;
  }

  const storedCredentials = window.localStorage.getItem(CREDENTIALS_KEY);
  if (!storedCredentials) {
    window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(defaultCredentialsByEmail));
    return defaultCredentialsByEmail;
  }

  try {
    return {
      ...defaultCredentialsByEmail,
      ...(JSON.parse(storedCredentials) as Record<string, string>),
    };
  } catch {
    window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(defaultCredentialsByEmail));
    return defaultCredentialsByEmail;
  }
}

function writeCredentials(credentials: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function defaultPathForRole(role: Role) {
  switch (role) {
    case "accountant":
      return "/firm/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/client/dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(readAuthNotice);
  const [persistSession, setPersistSession] = useState(() => !hasSessionValue(STORAGE_KEY));

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
      if (hasApiBaseUrl()) {
        try {
          const nextUser = await loadBackendSessionUser();
          if (isMounted) {
            setPersistSession(!hasSessionValue(STORAGE_KEY));
            setUser(nextUser);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401 && getRefreshToken()) {
            try {
              const refreshResponse = await refreshBackendSession();
              const nextPersistent = !hasSessionValue(STORAGE_KEY);
              persistBackendTokens(refreshResponse, nextPersistent);
              const nextUser = await loadBackendSessionUser();
              if (isMounted) {
                setPersistSession(nextPersistent);
                setUser(nextUser);
              }
            } catch {
              clearStoredBackendSession();
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

          clearStoredBackendSession();
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
      clearAuthNotice() {
        updateAuthNotice(null);
      },
      async login({ email, password, rememberMe }) {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail.includes("@")) {
          return { ok: false, message: "Use the email tied to your portal account." };
        }

        if (password.trim().length < 8) {
          return {
            ok: false,
            message: "Use a password with at least 8 characters to continue.",
          };
        }

        if (hasApiBaseUrl()) {
          try {
            const loginResponse = await apiPostJson<BackendLoginResponse, LoginPayload>(
              "/api/auth/login",
              { email: trimmedEmail, password, rememberMe },
            );
            persistBackendTokens(loginResponse, rememberMe);
            setPersistSession(rememberMe);

            const nextUser = await loadBackendSessionUser();
            updateAuthNotice(null);
            setUser(nextUser);
            return { ok: true, user: nextUser };
          } catch (error) {
            clearStoredBackendSession();
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
        const credentials = readCredentials();

        if (!matchedUser) {
          return {
            ok: false,
            message:
              "That account is not available in the mock workspace yet. Try client@example.com, accountant@example.com, or admin@example.com.",
          };
        }

        if (credentials[trimmedEmail] !== password) {
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
            persistBackendTokens(inviteResponse, true);
            setPersistSession(true);

            const nextUser = await loadBackendSessionUser();
            updateAuthNotice(null);
            setUser(nextUser);
            return { ok: true, user: nextUser };
          } catch (error) {
            clearStoredBackendSession();
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

        if (password.trim().length < 8) {
          return {
            ok: false,
            message: "Use a password with at least 8 characters.",
          };
        }

        const nextUser: SessionUser = {
          ...matchedUser,
          fullName: fullName.trim(),
          name: fullName.trim().split(/\s+/)[0] ?? matchedUser.name,
          initials: createInitials(fullName.trim()),
        };
        const credentials = readCredentials();
        credentials[trimmedEmail] = password.trim();
        writeCredentials(credentials);
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
            persistBackendTokens(response, persistSession);
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

        if (nextPassword.trim().length < 8) {
          return { ok: false, message: "Use a new password with at least 8 characters." };
        }

        if (currentPassword.trim() === nextPassword.trim()) {
          return { ok: false, message: "Choose a new password that is different from the current one." };
        }

        const credentials = readCredentials();
        const currentCredential = credentials[user.email.toLowerCase()];

        if (currentCredential !== currentPassword) {
          return { ok: false, message: "Your current password is incorrect." };
        }

        credentials[user.email.toLowerCase()] = nextPassword.trim();
        writeCredentials(credentials);
        return { ok: true, message: "Password updated for this portal account." };
      },
      async logout() {
        if (hasApiBaseUrl()) {
          try {
            await apiPostJson<void, Record<string, never>>("/api/auth/logout", {});
          } catch {
            // Clear the local session even if the backend is already unavailable.
          }
          clearStoredBackendSession();
        }

        clearStoredFrontendSession();
        updateAuthNotice(null);
        setUser(null);
      },
    }),
    [authNotice, persistSession, ready, user],
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
