import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { InvoiceReviewPanel } from "../components/invoice-review/InvoiceReviewPanel";
import { InvoiceEvidenceViewer } from "../components/invoice-review/InvoiceEvidenceViewer";
import {
  invoiceReviewApi,
  type InvoiceReviewResponse,
} from "../services/invoiceReviewApi";
import { emptyReviewValues } from "../services/invoiceReviewScanner";
vi.mock("../services/invoiceReviewApi", () => ({
  invoiceReviewApi: { get: vi.fn(), save: vi.fn() },
}));
const onReady = vi.fn();
const response = (
  patch: Partial<InvoiceReviewResponse> = {},
): InvoiceReviewResponse => ({
  documentId: "invoice-1",
  versionNumber: 1,
  revision: 0,
  state: "not_started",
  isStale: false,
  canAccept: false,
  year: 2025,
  month: 1,
  ruleSetVersion: "invoice-v1.0",
  values: {
    ...emptyReviewValues,
    supplierName: "Supplier",
    invoiceNumber: "INV-001",
  },
  evidence: [],
  originalConfirmed: false,
  reviewNote: null,
  findings: [
    {
      id: "total",
      rule: "total.consistency",
      result: "unable_to_verify",
      message: "Enter the subtotal and VAT to check this total.",
      fields: ["subtotal", "vatAmount"],
    },
  ],
  history: [],
  ...patch,
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invoiceReviewApi.get).mockResolvedValue(response());
});
function open() {
  render(
    <InvoiceReviewPanel
      documentId="invoice-1"
      versionNumber={1}
      fileName="invoice.pdf"
      fileUrl="blob:invoice"
      mimeType="application/pdf"
      onReady={onReady}
    />,
  );
}
it("loads private checks and displays the original with truthful coverage", async () => {
  open();
  await waitFor(() =>
    expect(screen.getByLabelText("Supplier")).toHaveValue("Supplier"),
  );
  expect(invoiceReviewApi.get).toHaveBeenCalledWith("invoice-1");
  expect(screen.getByTitle("invoice.pdf")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Read invoice details" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Unable to verify")).toBeInTheDocument();
  expect(onReady).toHaveBeenLastCalledWith(
    expect.objectContaining({ ready: false }),
  );
});
it("saves corrected fields with the current file version and review revision", async () => {
  vi.mocked(invoiceReviewApi.save).mockResolvedValue(
    response({ revision: 1, canAccept: true, originalConfirmed: true }),
  );
  open();
  await screen.findByDisplayValue("Supplier");
  fireEvent.change(screen.getByLabelText("Invoice total"), {
    target: { value: "1150.00" },
  });
  fireEvent.click(screen.getByLabelText(/I checked these details/));
  fireEvent.change(screen.getByLabelText("Review explanation"), {
    target: { value: "Original verified manually" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save details and recheck" }),
  );
  await waitFor(() =>
    expect(invoiceReviewApi.save).toHaveBeenCalledWith(
      "invoice-1",
      expect.objectContaining({
        expectedVersionNumber: 1,
        expectedRevision: 0,
        originalConfirmed: true,
        reviewNote: "Original verified manually",
        values: expect.objectContaining({ invoiceTotal: "1150.00" }),
      }),
    ),
  );
  await waitFor(() =>
    expect(onReady).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 1, ready: true, dirty: false }),
    ),
  );
});
it("editing an approved set of findings invalidates the original confirmation and readiness", async () => {
  vi.mocked(invoiceReviewApi.get).mockResolvedValue(
    response({ revision: 1, canAccept: true, originalConfirmed: true }),
  );
  open();
  await screen.findByDisplayValue("Supplier");
  await waitFor(() =>
    expect(onReady).toHaveBeenLastCalledWith(
      expect.objectContaining({ ready: true }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Supplier"), {
    target: { value: "Corrected supplier" },
  });
  expect(screen.getByLabelText(/I checked these details/)).not.toBeChecked();
  await waitFor(() =>
    expect(onReady).toHaveBeenLastCalledWith(
      expect.objectContaining({ ready: false, dirty: true }),
    ),
  );
});
it("shows stale-write errors while preserving the accountant's unsaved correction", async () => {
  vi.mocked(invoiceReviewApi.save).mockRejectedValue(
    new Error("This invoice changed. Refresh the review."),
  );
  open();
  await screen.findByDisplayValue("Supplier");
  fireEvent.change(screen.getByLabelText("Supplier"), {
    target: { value: "Unsaved correction" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save details and recheck" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This invoice changed",
  );
  expect(screen.getByLabelText("Supplier")).toHaveValue("Unsaved correction");
  expect(onReady).toHaveBeenLastCalledWith(
    expect.objectContaining({ ready: false, dirty: true }),
  );
});
it("shows lookup failure without inventing findings or enabling approval", async () => {
  vi.mocked(invoiceReviewApi.get).mockRejectedValue(
    new Error("Review API unavailable"),
  );
  open();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Review API unavailable",
  );
  expect(
    screen.queryByRole("region", { name: "Invoice findings" }),
  ).not.toBeInTheDocument();
  expect(onReady).toHaveBeenLastCalledWith(
    expect.objectContaining({ ready: false }),
  );
});
it("highlights the original source region with normalized coordinates and truthful fallback", () => {
  const props = {
    url: "blob:invoice",
    mimeType: "image/jpeg",
    fileName: "invoice.jpg",
    evidence: [
      {
        field: "invoiceTotal",
        text: "Total R 1150.00",
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.1,
      },
    ],
    selectedField: "invoiceTotal",
  };
  const { rerender } = render(<InvoiceEvidenceViewer {...props} />);
  expect(screen.getByLabelText("Source for invoiceTotal")).toHaveStyle({
    left: "10%",
    top: "20%",
    width: "30%",
    height: "10%",
  });
  expect(screen.getByText("Total R 1150.00")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in invoice" }));
  expect(screen.getByText("125%")).toBeInTheDocument();
  rerender(<InvoiceEvidenceViewer {...props} selectedField="supplierName" />);
  expect(screen.getByText(/Source location unavailable/)).toBeInTheDocument();
});

it("retains originally read amounts beside a corrected field",async()=>{
  vi.mocked(invoiceReviewApi.get).mockResolvedValue(response({values:{...emptyReviewValues,invoiceTotal:"1150.00"},suggestions:{...emptyReviewValues,invoiceTotal:"1250.00"}}));
  open();
  expect(await screen.findByText("Read as 1250.00")).toBeInTheDocument();
  expect(screen.getByLabelText(/Invoice total/)).toHaveValue("1150.00");
});

it("saves line corrections and clears both confirmations when a row changes", async () => {
  vi.mocked(invoiceReviewApi.get).mockResolvedValue(response({ revision: 1, originalConfirmed: true, lineItemsConfirmed: true,
    lineItems: [{description: "Service", quantity: "2", unitPrice: "10", discount: "0", netTotal: "20"}] }));
  vi.mocked(invoiceReviewApi.save).mockResolvedValue(response({revision: 2}));
  open();
  const quantity = await screen.findByLabelText("Line 1 quantity");
  fireEvent.change(quantity, {target: {value: "3"}});
  expect(screen.getByLabelText(/I checked every line/)).not.toBeChecked();
  expect(screen.getByLabelText(/I checked these details/)).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", {name: "Save details and recheck"}));
  await waitFor(() => expect(invoiceReviewApi.save).toHaveBeenCalledWith("invoice-1", expect.objectContaining({ originalConfirmed: false, lineItemsConfirmed: false,
    lineItems: [expect.objectContaining({quantity: "3"})] })));
});
