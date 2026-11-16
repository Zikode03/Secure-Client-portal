import { describe, expect, it } from "vitest";
import { duplicateInvoiceReasons, extractInvoiceDetails, suggestedInvoiceName } from "../services/invoiceScanner";
import { acceptedFilesForSlot, buildSlotUploadForm } from "../services/clientMonthlyPackBackend";

describe("invoice photo suggestions", () => {
  it("extracts labelled details and uses the total instead of VAT or subtotal", () => {
    expect(extractInvoiceDetails("Supplier: Acme Hardware\nInvoice No: INV-123\nDate: 11/11/2026\nSubtotal R 100.00\nVAT total R 15.00\nTotal R 115.00")).toEqual({ supplierName: "Acme Hardware", invoiceNumber: "INV-123", invoiceDate: "2026-11-11", amount: "115.00" });
  });
  it("leaves impossible dates and absent amounts blank", () => {
    const result = extractInvoiceDetails("Acme Hardware\nInvoice No: INV-123\nDate: 31/02/2026");
    expect(result.invoiceDate).toBe(""); expect(result.amount).toBe("");
  });
  it("counts matching nonempty fields and requires more than matching amount for a warning", () => {
    const a = { supplierName: "Acme Ltd", invoiceNumber: "INV-123", invoiceDate: "2026-11-11", amount: "115.00" };
    expect(duplicateInvoiceReasons(a, { ...a, supplierName: "ACME LTD", invoiceNumber: "INV123" })).toHaveLength(4);
    expect(duplicateInvoiceReasons(a, { supplierName: "Other", invoiceNumber: "INV-456", invoiceDate: "2026-10-01", amount: "115" })).toEqual(["amount"]);
  });
  it("creates a filename from confirmed details without unsafe path characters", () => {
    expect(suggestedInvoiceName({ supplierName: "Acme / Hardware", invoiceNumber: "INV/123", invoiceDate: "2026-11-11", amount: "115" }, "jpg")).toBe("2026-11-11_Acme_Hardware_INV_123.jpg");
  });
  it("allows phone photos in invoice slots and sends confirmed details before file bytes", () => {
    expect(acceptedFilesForSlot("purchase_invoices", "Purchase invoices")).toContain("JPG");
    const form = buildSlotUploadForm({ clientId: "client", monthlyPackId: "pack", submission: { slotId: "slot", fileName: "IMG123.jpg", autoName: "Acme_2026.jpg", documentType: "Invoices", clientBusinessName: "Client", month: "November", year: 2026, description: "", file: new File(["bytes"], "IMG123.jpg", { type: "image/jpeg" }), invoiceDetails: { supplierName: "Acme", invoiceNumber: "123", invoiceDate: "2026-11-11", amount: "115.00" }, detailsConfirmed: true } });
    expect(form.get("DisplayName")).toBe("Acme_2026.jpg"); expect(form.get("DetailsConfirmed")).toBe("true");
    expect([...form.keys()].pop()).toBe("File"); expect((form.get("File") as File).name).toBe("IMG123.jpg");
  });
});
