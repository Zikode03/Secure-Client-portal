import { expect, it } from "vitest";
import { extractReviewLineItems, extractReviewInvoiceValues } from "../services/invoiceReviewScanner";
it("separates invoice total, amount due, VAT and subtotal", () => {
  const values = extractReviewInvoiceValues(
    "Supplier: Verified supplier\nInvoice No: 000123\nDate: 2026-10-15\nSubtotal: R 1,000.00\nVAT: R 150.00\nInvoice total: R 1,150.00\nAmount due: R 500.00",
  );
  expect(values).toMatchObject({
    supplierName: "Verified supplier",
    invoiceNumber: "000123",
    invoiceDate: "2026-10-15",
    subtotal: "1000.00",
    vatAmount: "150.00",
    invoiceTotal: "1150.00",
    amountDue: "500.00",
    adjustments: "",
    allAdjustmentsAccountedFor: false,
  });
});
it("leaves ambiguous dates and competing totals unresolved", () => {
  const values = extractReviewInvoiceValues(
    "Supplier: Test\nDate: 03/04/2026\nTotal: R 115.00\nTotal: R 125.00",
  );
  expect(values.invoiceDate).toBe("");
  expect(values.invoiceTotal).toBe("");
});
it("does not invent a total when the document only states amount due", () => {
  const values = extractReviewInvoiceValues(
    "Supplier: Test\nAmount due: R 150.00",
  );
  expect(values.invoiceTotal).toBe("");
  expect(values.amountDue).toBe("150.00");
});
it("preserves an explicitly different currency for manual review", () => {
  const values = extractReviewInvoiceValues(
    "Invoice Total: USD 100.00\nSupplier: Test",
  );
  expect(values.currency).toBe("USD");
});

it("suggests rows only under explicit net-column headings without inventing discounts", () => {
  expect(extractReviewLineItems("Description | Quantity | Unit price | Net total\nConsulting | 2 | 10.00 | 20.00\nSubtotal: 20.00")).toEqual([{description: "Consulting", quantity: "2", unitPrice: "10.00", discount: "", netTotal: "20.00"}]);
  expect(extractReviewLineItems("Consulting  2  10.00  20.00")).toEqual([]);
});
it("reads an explicit discount amount while preserving accountant confirmation", () => {
  expect(extractReviewLineItems("Description | Qty | Unit price | Discount amount | Net amount\nConsulting | 2 | 10.00 | 1.00 | 19.00")[0]).toMatchObject({discount: "1.00", netTotal: "19.00"});
});
