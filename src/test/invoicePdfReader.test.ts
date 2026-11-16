import { beforeEach, expect, it, vi } from "vitest";
import { readInvoicePdf, readInvoicePdfWithSources } from "../services/invoicePdfReader";
import { extractReviewInvoiceValues } from "../services/invoiceReviewScanner";

const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn(), recognize: vi.fn() }));
vi.mock("../services/invoiceScanner", async (original) => ({
  ...await original<typeof import("../services/invoiceScanner")>(), recognizeInvoiceImage: mocks.recognize,
}));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument: mocks.getDocument }));
vi.mock("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url", () => ({ default: "/assets/pdf.worker.mjs" }));

const file = () => ({ name: "invoice.pdf", size: 100, arrayBuffer: async () => new ArrayBuffer(8) }) as File;
function load(pages: string[][]) {
  const getPage = vi.fn(async (number: number) => ({
    getTextContent: async () => ({ items: pages[number - 1].map((str, index) => ({ str, transform: [1, 0, 0, 1, 0, 800 - index * 20], hasEOL: true })) }),
    getViewport: () => ({width: 600, height: 800}),
    cleanup: vi.fn(),
  }));
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: pages.length, getPage }), destroy: mocks.destroy });
  return getPage;
}
beforeEach(() => { vi.clearAllMocks(); mocks.destroy.mockResolvedValue(undefined); });

it("reads all pages locally and deduplicates repeated continuation totals", async () => {
  load([["Supplier: Verified supplier", "Invoice No: 123", "Invoice total: R 115.00"], ["Invoice total: R 115.00", "Amount due: R 15.00"]]);
  const progress = vi.fn();
  const text = await readInvoicePdf(file(), new AbortController().signal, progress);
  expect(extractReviewInvoiceValues(text)).toMatchObject({ invoiceTotal: "115.00", amountDue: "15.00" });
  expect(progress).toHaveBeenLastCalledWith(100);
  expect(mocks.destroy).toHaveBeenCalledOnce();
  expect(mocks.getDocument.mock.calls[0][0].data).toBeInstanceOf(Uint8Array);
});

it("leaves conflicting totals across pages unresolved", async () => {
  load([["Supplier: Verified supplier", "Invoice total: R 115.00"], ["Supplier: Verified supplier", "Invoice total: R 125.00"]]);
  const text = await readInvoicePdf(file(), new AbortController().signal, vi.fn());
  expect(extractReviewInvoiceValues(text).invoiceTotal).toBe("");
});

it("rejects excessive page counts before reading pages and releases the PDF", async () => {
  const getPage = load(Array.from({ length: 21 }, () => []));
  await expect(readInvoicePdf(file(), new AbortController().signal, vi.fn())).rejects.toThrow("20 pages");
  expect(getPage).not.toHaveBeenCalled();
  expect(mocks.destroy).toHaveBeenCalledOnce();
});

it("does not start a PDF worker when already cancelled", async () => {
  const controller = new AbortController(); controller.abort();
  await expect(readInvoicePdf(file(), controller.signal, vi.fn())).rejects.toThrow();
  expect(mocks.getDocument).not.toHaveBeenCalled();
});

it("rejects oversized files before starting extraction", async () => {
  await expect(readInvoicePdf({ ...file(), size: 26 * 1024 * 1024 } as File, new AbortController().signal, vi.fn())).rejects.toThrow("25 MB");
  expect(mocks.getDocument).not.toHaveBeenCalled();
});

it("renders scanned pages and passes them to local OCR", async () => {
  const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  mocks.getDocument.mockReturnValue({ destroy: mocks.destroy, promise: Promise.resolve({ numPages: 1, getPage: async () => ({
    getTextContent: async () => ({ items: [] }),
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render, cleanup: vi.fn(),
  }) }) });
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["page"], { type: "image/png" })));
  mocks.recognize.mockResolvedValue({ text: "Supplier: Verified supplier\nInvoice total: R 115.00" });
  try {
    const text = await readInvoicePdf(file(), new AbortController().signal, vi.fn());
    expect(render).toHaveBeenCalledOnce();
    expect(mocks.recognize.mock.calls[0][0].type).toBe("image/png");
    expect(extractReviewInvoiceValues(text).invoiceTotal).toBe("115.00");
  } finally { canvas.mockRestore(); }
});

it("preserves page numbers and normalised source coordinates from the PDF transform", async () => {
  mocks.getDocument.mockReturnValue({ destroy: mocks.destroy, promise: Promise.resolve({ numPages: 2, getPage: async () => ({
    getTextContent: async () => ({items: [{str: "Invoice total: R 115.00", transform: [1,0,0,1,60,600], width: 240, height: 20, hasEOL: true}]}),
    getViewport: () => ({width: 600, height: 800, transform: [1,0,0,-1,0,800]}), cleanup: vi.fn(),
  }) }) });
  const result = await readInvoicePdfWithSources(file(), new AbortController().signal, vi.fn());
  expect(result.lines).toHaveLength(2);
  expect(result.lines[1]).toMatchObject({pageIndex: 1, x: .1, y: .225, width: .4});
  expect(result.lines[1].height).toBeCloseTo(.025);
});
it("rejects combined PDFs containing distinct invoice numbers instead of merging their figures", async () => {
  load([["Supplier: Verified supplier", "Invoice No: INV-1", "Invoice total: R 115.00"], ["Supplier: Verified supplier", "Invoice No: INV-2", "Invoice total: R 125.00"]]);
  await expect(readInvoicePdf(file(), new AbortController().signal, vi.fn())).rejects.toThrow("multiple invoices");
});
