import { apiGetBlob } from "./apiClient";
import { invoiceReviewApi, type SaveInvoiceReviewRequest } from "./invoiceReviewApi";
import { scanReviewInvoiceDocument } from "./invoiceReviewScanner";

export interface BulkInvoice { id: string; fileName: string; versionNumber: number; }
export type BulkScanPhase = "Checking review" | "Downloading" | "Reading" | "Saving";

/** Retain a prepared request in memory so a lost save response can be retried idempotently. */
export async function scanBulkInvoice(
  invoice: BulkInvoice,
  signal: AbortSignal,
  update: (phase: BulkScanPhase, percent: number) => void,
  prepared: Map<string, SaveInvoiceReviewRequest>,
) {
  signal.throwIfAborted();
  let body = prepared.get(invoice.id);
  if (!body) {
    update("Checking review", 0);
    const current = await invoiceReviewApi.get(invoice.id);
    signal.throwIfAborted();
    if (current.versionNumber !== invoice.versionNumber) throw new Error("The file version changed. Refresh the queue.");
    // Never replace a saved human review or a previous set of suggestions in a batch.
    if ((current.revision ?? 0) > 0) return "skipped" as const;
    update("Downloading", 0);
    const { blob, contentType } = await apiGetBlob(`/api/documents/${encodeURIComponent(invoice.id)}/download`, { signal });
    signal.throwIfAborted();
    update("Reading", 0);
    const result = await scanReviewInvoiceDocument(new File([blob], invoice.fileName, { type: contentType }), signal,
      (percent) => update("Reading", percent));
    signal.throwIfAborted();
    body = { requestId: crypto.randomUUID(), expectedVersionNumber: invoice.versionNumber,
      expectedRevision: current.revision ?? 0, values: result.values, suggestions: result.values,
      evidence: result.evidence, lineItems: result.lineItems, lineItemsConfirmed: false,
      source: "on_device_ocr", originalConfirmed: false, reviewNote: null };
    prepared.set(invoice.id, body);
  }
  signal.throwIfAborted();
  update("Saving", 100);
  // Let an in-flight save settle: cancellation cannot undo a committed server write.
  await invoiceReviewApi.save(invoice.id, body);
  prepared.delete(invoice.id);
  return "saved" as const;
}
