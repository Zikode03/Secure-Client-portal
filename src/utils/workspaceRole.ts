import type { Role } from "../types/portal";

/** Reject unknown roles instead of granting a default workspace. */
export function workspaceRole(value: string): Role {
  if (value === "admin" || value === "accountant" || value === "client") return value;
  throw new Error("The server returned an unsupported workspace role.");
}
