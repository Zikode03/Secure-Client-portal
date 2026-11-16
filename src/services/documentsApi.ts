import { apiData, portalApiClient } from "./portalApiClient";
import type { components } from "./generated/portal-api";
type Upload = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.UploadDocumentRequest"];

export function serializeUpload(body: Upload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (key !== "file" && value != null) form.append(key, String(value));
  }
  if (body.file) form.append("file", body.file);
  return form;
}

export const documentsApi = {
  list: () => apiData(portalApiClient.GET("/api/documents")),
  upload: (body: Upload) => apiData(portalApiClient.POST("/api/documents/upload", { body, bodySerializer: serializeUpload })),
  uploadForm: (form: FormData) => {
    const file = form.get("File") ?? form.get("file");
    if (!(file instanceof Blob)) throw new Error("Choose a file to upload.");
    return documentsApi.upload({
      clientId: String(form.get("ClientId") ?? ""), documentType: String(form.get("DocumentType") ?? ""), file,
      displayName: form.get("DisplayName")?.toString(), invoiceDetailsJson: form.get("InvoiceDetailsJson")?.toString(),
      detailsConfirmed: form.get("DetailsConfirmed") === "true", allowDuplicate: form.get("AllowDuplicate") === "true",
      monthlyPackId: form.get("MonthlyPackId")?.toString(), documentSlotId: form.get("DocumentSlotId")?.toString(), documentId: form.get("DocumentId")?.toString(),
    });
  },
};
