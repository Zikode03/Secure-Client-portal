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

const STORAGE_KEY = "accounting-document-control-session";
const CREDENTIALS_KEY = "accounting-document-control-credentials";

interface LoginPayload {
  email: string;
  password: string;
}

interface InviteSetupPayload {
  email: string;
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
  login: (payload: LoginPayload) => AuthResult;
  completeInvite: (payload: InviteSetupPayload) => AuthResult;
  changePassword: (currentPassword: string, nextPassword: string) => AuthResult;
  logout: () => void;
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
      return "/firm/dashboard";
    default:
      return "/client/dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    const storedSession = window.localStorage.getItem(STORAGE_KEY);
    if (!storedSession) {
      setReady(true);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedSession) as SessionUser;
      setUser(applyPermissionOverride(parsedUser));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      login({ email, password }) {
        const trimmedEmail = email.trim().toLowerCase();
        const matchedUser = getMockUserByEmail(trimmedEmail);
        const credentials = readCredentials();

        if (!trimmedEmail.includes("@")) {
          return { ok: false, message: "Use the email tied to your portal account." };
        }

        if (!matchedUser) {
          return {
            ok: false,
            message:
              "That account is not available in the mock workspace yet. Try client@example.com, accountant@example.com, or admin@example.com.",
          };
        }

        if (password.trim().length < 8) {
          return {
            ok: false,
            message: "Use a password with at least 8 characters to continue.",
          };
        }

        if (credentials[trimmedEmail] !== password) {
          return {
            ok: false,
            message: "The password does not match this portal account.",
          };
        }

        const nextUser = applyPermissionOverride(matchedUser);
        setUser(nextUser);
        return { ok: true, user: nextUser };
      },
      completeInvite({ email, fullName, password }) {
        const trimmedEmail = email.trim().toLowerCase();
        const matchedUser = getMockUserByEmail(trimmedEmail);

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
        setUser(resolvedUser);

        return { ok: true, user: resolvedUser };
      },
      changePassword(currentPassword, nextPassword) {
        if (!user) {
          return { ok: false, message: "You need an active session before changing the password." };
        }

        if (nextPassword.trim().length < 8) {
          return { ok: false, message: "Use a new password with at least 8 characters." };
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
      logout() {
        setUser(null);
      },
    }),
    [ready, user],
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
