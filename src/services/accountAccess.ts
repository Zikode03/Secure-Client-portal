export type AccountAccessStatus = "active" | "invited" | "disabled" | "locked" | "unknown";
export function accountAccessStatus(user: { securityStatus?: string | null; securityJson?: string | null }): AccountAccessStatus {
  let status = user.securityStatus?.trim().toLowerCase();
  if (!status && user.securityJson) {
    try { const value: unknown = JSON.parse(user.securityJson); if (value && typeof value === "object" && "status" in value && typeof value.status === "string") status = value.status.trim().toLowerCase(); } catch { /* Missing or malformed state must not imply active access. */ }
  }
  return status === "active" || status === "invited" || status === "disabled" || status === "locked" ? status : "unknown";
}
