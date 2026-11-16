import { apiData, portalApiClient } from "./portalApiClient";
import type { components } from "./generated/portal-api";
type Schemas = components["schemas"];
export type InvoiceReviewResponse =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewResponse"];
export type SaveInvoiceReviewRequest =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.SaveInvoiceReviewRequest"];
export type InvoiceReviewContext =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.InvoiceReviewContext"];
export const invoiceReviewApi = {
  get: (documentId: string) =>
    apiData(
      portalApiClient.GET("/api/documents/{documentId}/invoice-review", {
        params: { path: { documentId } },
      }),
    ),
  save: (documentId: string, body: SaveInvoiceReviewRequest) =>
    apiData(
      portalApiClient.POST(
        "/api/documents/{documentId}/invoice-review/corrections",
        { params: { path: { documentId } }, body },
      ),
    ),
};
