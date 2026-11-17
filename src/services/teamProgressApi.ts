import { apiGetJson } from "./apiClient";
import type { components } from "./generated/portal-api";
export type TeamProgress = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.TeamProgressResponse"];
export type AccountantProgress = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AccountantProgress"];
export async function getTeamProgress() {
  const result = await apiGetJson("/api/admin/team-progress");
  if (!result?.checkedAtUtc || !Array.isArray(result.accountants)) throw new Error("Team progress is unavailable.");
  return result;
}
