import type { Permission, SessionUser } from "../types/portal";

const USER_PERMISSION_OVERRIDES_KEY = "accounting-document-control-user-permissions";

type PermissionOverrideMap = Record<string, Permission[]>;

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readPermissionOverrides(): PermissionOverrideMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(USER_PERMISSION_OVERRIDES_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as PermissionOverrideMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writePermissionOverrides(next: PermissionOverrideMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_PERMISSION_OVERRIDES_KEY, JSON.stringify(next));
}

export function setPermissionOverride(email: string, permissions: Permission[]) {
  const overrides = readPermissionOverrides();
  overrides[normaliseEmail(email)] = Array.from(new Set(permissions));
  writePermissionOverrides(overrides);
}

export function removePermissionOverride(email: string) {
  const overrides = readPermissionOverrides();
  delete overrides[normaliseEmail(email)];
  writePermissionOverrides(overrides);
}

export function getPermissionOverride(email: string) {
  return readPermissionOverrides()[normaliseEmail(email)] ?? null;
}

export function applyPermissionOverride(user: SessionUser): SessionUser {
  const override = getPermissionOverride(user.email);
  if (!override) {
    return user;
  }

  return {
    ...user,
    permissions: override,
  };
}

