import { beforeEach, expect, it, vi } from "vitest";
import { scanBulkInvoice } from "../services/invoiceBulkScanner";
import { invoiceReviewApi, type SaveInvoiceReviewRequest } from "../services/invoiceReviewApi";
import { apiGetBlob } from "../services/apiClient";
import { emptyReviewValues, scanReviewInvoiceDocument } from "../services/invoiceReviewScanner";
vi.mock("../services/invoiceReviewApi", () => ({ invoiceReviewApi: { get: vi.fn(), save: vi.fn() } }));
vi.mock("../services/apiClient", () => ({ apiGetBlob: vi.fn() }));
vi.mock("../services/invoiceReviewScanner", async original => ({ ...await original<typeof import("../services/invoiceReviewScanner")>(), scanReviewInvoiceDocument: vi.fn() }));
const invoice = { id: "private-invoice", fileName: "invoice.png", versionNumber: 2 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invoiceReviewApi.get).mockResolvedValue({ versionNumber: 2, revision: 0 } as never);
  vi.mocked(apiGetBlob).mockResolvedValue({ blob: new Blob(["original"]), contentType: "image/png" });
  vi.mocked(scanReviewInvoiceDocument).mockResolvedValue({ values: emptyReviewValues, evidence: [], lineItems: [] });
  vi.mocked(invoiceReviewApi.save).mockResolvedValue({} as never);
});
it("saves suggestions without confirmation, approval or filing", async () => {
  const result = await scanBulkInvoice(invoice, new AbortController().signal, vi.fn(), new Map());
  expect(result).toBe("saved");
  expect(invoiceReviewApi.save).toHaveBeenCalledWith(invoice.id, expect.objectContaining({ expectedVersionNumber: 2, expectedRevision: 0, originalConfirmed: false, lineItemsConfirmed: false, source: "on_device_ocr" }));
});
it("skips saved reviews before downloading any original", async () => {
  vi.mocked(invoiceReviewApi.get).mockResolvedValue({ versionNumber: 2, revision: 1 } as never);
  expect(await scanBulkInvoice(invoice, new AbortController().signal, vi.fn(), new Map())).toBe("skipped");
  expect(apiGetBlob).not.toHaveBeenCalled(); expect(invoiceReviewApi.save).not.toHaveBeenCalled();
});
it("retries the identical prepared request when a save response is lost", async () => {
  const prepared = new Map<string, SaveInvoiceReviewRequest>();
  vi.mocked(invoiceReviewApi.save).mockRejectedValueOnce(new Error("Connection lost"));
  await expect(scanBulkInvoice(invoice, new AbortController().signal, vi.fn(), prepared)).rejects.toThrow("Connection lost");
  const original = vi.mocked(invoiceReviewApi.save).mock.calls[0][1];
  await scanBulkInvoice(invoice, new AbortController().signal, vi.fn(), prepared);
  expect(vi.mocked(invoiceReviewApi.save).mock.calls[1][1]).toBe(original);
  expect(scanReviewInvoiceDocument).toHaveBeenCalledOnce(); expect(prepared.size).toBe(0);
});
it("rejects replaced file versions before scanning", async () => {
  vi.mocked(invoiceReviewApi.get).mockResolvedValue({ versionNumber: 3, revision: 0 } as never);
  await expect(scanBulkInvoice(invoice, new AbortController().signal, vi.fn(), new Map())).rejects.toThrow("version changed");
  expect(apiGetBlob).not.toHaveBeenCalled();
});
it("cancels between extraction and saving", async () => {
  const controller = new AbortController();
  vi.mocked(scanReviewInvoiceDocument).mockImplementation(async () => { controller.abort(); return { values: emptyReviewValues, evidence: [], lineItems: [] }; });
  await expect(scanBulkInvoice(invoice, controller.signal, vi.fn(), new Map())).rejects.toThrow();
  expect(invoiceReviewApi.save).not.toHaveBeenCalled();
});
