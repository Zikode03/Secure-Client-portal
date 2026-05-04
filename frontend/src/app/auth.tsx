import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role, SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

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
  },
};

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

export function defaultPathForRole(role: Role) {
  switch (role) {
    case "accountant":
      return "/accountant/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/client/dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(STORAGE_KEY);
    if (!storedSession) {
      setReady(true);
      return;
    }

    try {
      setUser(JSON.parse(storedSession) as SessionUser);
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

        setUser(matchedUser);
        return { ok: true, user: matchedUser };
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
        setUser(nextUser);

        return { ok: true, user: nextUser };
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
