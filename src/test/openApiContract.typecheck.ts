import { portalApiClient } from "../services/portalApiClient";

// Compiled by tsc, never executed. A stale or weakened contract fails these checks.
export function verifyGeneratedContract() {
  // @ts-expect-error File uploads require an actual Blob/File and business metadata.
  void portalApiClient.POST("/api/documents/upload", { body: { clientId: "a", documentType: "sales_invoices" } });
  // @ts-expect-error API paths are generated, not arbitrary strings.
  void portalApiClient.GET("/api/not-a-real-endpoint");
  // @ts-expect-error Registration requires the bank, account label and last four digits.
  void portalApiClient.POST("/api/banking/manual/accounts", { body: { bankName: "Bank" } });
  // @ts-expect-error CSV transaction amounts must be numbers.
  void portalApiClient.POST("/api/banking/manual/import", { body: { accountId: "a", sourceName: "statement.csv", rows: [{ date: "2026-11-01", description: "Sale", reference: "", amount: "100" }] } });
  // @ts-expect-error The period requires year and month as well as a client.
  void portalApiClient.GET("/api/banking/monthly-pack-status", { params: { query: { clientId: "a" } } });
}
