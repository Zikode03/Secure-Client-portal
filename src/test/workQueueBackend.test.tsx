const pdfState = vi.hoisted(() => ({ ready: true }));
vi.mock("../components/documents/DocumentPdfPreview", async () => {
  const { useEffect } = await import("react");
  return { DocumentPdfPreview: ({ documentId, onReady }: { documentId: string; onReady: (id: string, ready: boolean) => void }) => {
    useEffect(() => onReady(documentId, pdfState.ready), [documentId, onReady]);
    return <div>Rendered PDF preview</div>;
  } };
});
import { invoiceReviewApi } from "../services/invoiceReviewApi";
import { reviewQueueApi } from "../services/reviewQueueApi";
import { emptyReviewValues } from "../services/invoiceReviewScanner";
vi.mock("../services/invoiceReviewApi", () => ({
  invoiceReviewApi: { get: vi.fn(), save: vi.fn() },
}));
vi.mock("../services/reviewQueueApi", () => ({
  reviewQueueApi: {
    review: vi.fn(),
    requestReupload: vi.fn(),
    comment: vi.fn(),
  },
}));
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountantReviewPage } from "../pages/accountant/AccountantReviewPage";
import { PortalProvider } from "../app/portal";
import { apiGetBlob, apiGetJson } from "./fixtures/apiTransportFixture";
const user = vi.hoisted(() => ({
  id: "accountant-live",
  role: "accountant",
  name: "Test",
  fullName: "Test Accountant",
  email: "accountant@test.local",
  title: "Accountant",
  company: "Test Firm",
  initials: "TA",
  clientIds: [],
  assignedClientIds: ["client-live"],
}));
vi.mock("../app/auth", () => ({
  useAuth: () => ({ user, ready: true }),
  useOptionalAuth: () => ({ user, ready: true }),
}));
vi.mock("../services/apiClient", async (original) => ({
  ...(await original<typeof import("../services/apiClient")>()),
  hasApiBaseUrl: () => true,
  apiGetJson: vi.fn(),
  apiGetBlob: vi.fn(async () => ({
    blob: new Blob(["invoice"]),
    contentType: "application/pdf",
  })),
}));
const item = {
  documentId: "document-live",
  clientId: "client-live",
  clientName: "Test business",
  monthlyPackId: "pack-live",
  year: 2026,
  month: 11,
  documentSlotId: "slot-live",
  slotLabel: "Sales Invoices",
  documentName: "invoice.pdf",
  documentCategory: "sales_invoices",
  documentStatus: "under_review",
  slotStatus: "submitted",
  currentVersionNumber: 1,
  uploadedAtUtc: "2026-11-11T08:00:00Z",
  submittedAtUtc: "2026-11-11T08:10:00Z",
  rejectionReason: null,
  reviewAgeDays: 0,
  reviewPriority: "normal",
};
beforeEach(() => {
  pdfState.ready = true;
  vi.clearAllMocks();
  vi.mocked(invoiceReviewApi.get).mockResolvedValue({
    documentId: "document-live",
    versionNumber: 1,
    revision: 0,
    state: "not_started",
    isStale: false,
    canAccept: false,
    year: 2026,
    month: 11,
    ruleSetVersion: "invoice-v1.0",
    values: emptyReviewValues,
    evidence: [],
    originalConfirmed: false,
    reviewNote: null,
    findings: [],
    history: [],
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(apiGetJson).mockImplementation(async (path) => {
    if (path === "/api/review-queue") return [item];
    if (path === "/api/review-queue/document-live")
      return {
        item,
        downloadUrl: "/api/documents/document-live/download",
        versions: [],
        comments: [],
        reviewHistory: [],
      };
    return [];
  });
});
it("loads a populated backend queue and opens its real workspace without render loops", async () => {
  render(
    <MemoryRouter>
      <PortalProvider>
        <AccountantReviewPage />
      </PortalProvider>
    </MemoryRouter>,
  );
  const open = await screen.findByRole("button", { name: "Review invoice.pdf for Test business" });
  fireEvent.click(open);
  await waitFor(() =>
    expect(apiGetJson).toHaveBeenCalledWith("/api/review-queue/document-live"),
  );
  expect(screen.getAllByText("invoice.pdf").length).toBeGreaterThan(0);
  const dialog = screen.getByRole("dialog", { name: "Document review" });
  expect(within(dialog).getAllByRole("button", { name: "Download" })).toHaveLength(1);
  expect(within(dialog).queryByRole("button", { name: "Open in new tab" })).not.toBeInTheDocument();
  expect(within(dialog).getByRole("heading", { name: "Review decision" })).toBeInTheDocument();
  expect(within(dialog).queryByText("Key details")).not.toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Client history" })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe("hidden");

});

it("reports an invalid queue response and retries the API rather than restoring local records", async () => {
  vi.mocked(apiGetJson).mockImplementation(async (path) =>
    path === "/api/review-queue" ? [{ documentId: "bad-row" }] : [],
  );
  render(
    <MemoryRouter>
      <PortalProvider>
        <AccountantReviewPage />
      </PortalProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(/review queue response is incomplete/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Review queue unavailable" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /demo/i }),
  ).not.toBeInTheDocument();
  vi.mocked(apiGetJson).mockImplementation(async (path) =>
    path === "/api/review-queue" ? [item] : [],
  );
  fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));
  expect(
    await screen.findByRole("button", { name: "Review invoice.pdf for Test business" }),
  ).toBeInTheDocument();
});

it("keeps the file download active after metadata renders, even when the download is slower", async () => {
  let release!: (value: { blob: Blob; contentType: string }) => void;
  const download = new Promise<{ blob: Blob; contentType: string }>(
    (resolve) => {
      release = resolve;
    },
  );
  vi.mocked(apiGetBlob).mockReturnValueOnce(
    download as ReturnType<typeof apiGetBlob>,
  );
  render(
    <MemoryRouter>
      <PortalProvider>
        <AccountantReviewPage />
      </PortalProvider>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Review invoice.pdf for Test business" }));
  await waitFor(() =>
    expect(apiGetBlob).toHaveBeenCalledWith(
      "/api/documents/document-live/download",
    ),
  );
  // Flush the metadata update before allowing file bytes to arrive.
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByTitle("invoice.pdf")).not.toBeInTheDocument();
  await act(async () => {
    release({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      contentType: "application/pdf",
    });
  });
  expect(await screen.findByTitle("invoice.pdf")).toHaveAttribute(
    "src",
    "blob:test-download",
  );
});

it("opens a linked invoice and requires a saved assistant revision before approving", async () => {
  const initial = await vi.mocked(invoiceReviewApi.get)("document-live");
  vi.mocked(invoiceReviewApi.save).mockResolvedValue({
    ...initial,
    revision: 1,
    canAccept: true,
    originalConfirmed: true,
  });
  vi.mocked(reviewQueueApi.review).mockResolvedValue({
    id: "decision-test",
    decision: "accepted",
    documentId: "document-live",
    documentStatus: "accepted",
    decidedAtUtc: "2026-11-13T08:00:00Z",
    reason: null,
    internalNote: null,
  });
  render(
    <MemoryRouter initialEntries={["/firm/review?documentId=document-live"]}>
      <PortalProvider>
        <AccountantReviewPage />
      </PortalProvider>
    </MemoryRouter>,
  );
  await screen.findByRole("region", { name: "Invoice review assistant" });
  const approve = screen.getByRole("button", { name: "Approve" });
  expect(approve).toBeDisabled();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save details and recheck" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByLabelText(/I checked these details/));
  fireEvent.change(screen.getByLabelText("Review explanation"), {
    target: { value: "Manually checked the original invoice" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save details and recheck" }),
  );
  await waitFor(() => expect(approve).toBeEnabled());
  fireEvent.click(approve);
  await waitFor(() =>
    expect(reviewQueueApi.review).toHaveBeenCalledWith(
      "document-live",
      expect.objectContaining({
        decision: "accepted",
        invoiceReview: { expectedVersionNumber: 1, expectedRevision: 1 },
      }),
    ),
  );
});

it("uses the actual replacement version and invoice category for supporting imports", async () => {
  const supporting = {
    ...item,
    slotLabel: "Supporting document",
    documentSlotId: null,
    currentVersionNumber: 2,
  };
  vi.mocked(apiGetJson).mockImplementation(async (path) =>
    path === "/api/review-queue"
      ? [supporting]
      : path === "/api/review-queue/document-live"
        ? {
            item: supporting,
            downloadUrl: "/api/documents/document-live/download",
            versions: [],
            comments: [],
            reviewHistory: [],
          }
        : [],
  );
  const initial = await vi.mocked(invoiceReviewApi.get)("document-live");
  vi.mocked(invoiceReviewApi.get).mockResolvedValue({
    ...initial,
    versionNumber: 2,
  });
  vi.mocked(invoiceReviewApi.save).mockResolvedValue({
    ...initial,
    versionNumber: 2,
    revision: 1,
  });
  render(
    <MemoryRouter initialEntries={["/firm/review?documentId=document-live"]}>
      <PortalProvider>
        <AccountantReviewPage />
      </PortalProvider>
    </MemoryRouter>,
  );
  await screen.findByRole("region", { name: "Invoice review assistant" });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save details and recheck" }),
    ).toBeEnabled(),
  );
  expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Save details and recheck" }),
  );
  await waitFor(() =>
    expect(invoiceReviewApi.save).toHaveBeenCalledWith(
      "document-live",
      expect.objectContaining({ expectedVersionNumber: 2 }),
    ),
  );
});

it("keeps scanning tools and saved findings inside review rather than the task list", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/review-queue" ? [
    {...item, assistantState: "needs_attention"},
    {...item, documentId: "another-invoice", documentName: "another.pdf", clientName: "Another business", assistantState: "not_started"},
  ] : []);
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  await screen.findByRole("button", { name: "Review another.pdf for Another business" });
  expect(screen.queryByRole("group", { name: "Queue status" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Bulk invoice scanning" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Saved invoice checks")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /More filters/ })).not.toBeInTheDocument();
  expect(invoiceReviewApi.get).not.toHaveBeenCalled();
});

it("shows only pending decisions and reviews urgent submissions first", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/review-queue" ? [
    {...item, documentId: "recent", documentName: "recent.pdf", reviewPriority: "normal", submittedAtUtc: "2026-11-15T08:00:00Z"},
    {...item, documentId: "finished", documentName: "finished.pdf", documentStatus: "accepted", slotStatus: "accepted"},
    {...item, reviewPriority: "high", reviewAgeDays: 8, submittedAtUtc: "2026-11-08T08:00:00Z"},
  ] : path === "/api/review-queue/document-live" ? { item, downloadUrl: "/api/documents/document-live/download", versions: [], comments: [], reviewHistory: [] } : []);
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  await screen.findByText("Waiting 8 days");
  expect(screen.queryByText("finished.pdf")).not.toBeInTheDocument();
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("invoice.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Review next" }));
  await waitFor(() => expect(apiGetJson).toHaveBeenCalledWith("/api/review-queue/document-live"));
});

it("searches documents, clears the view and opens the next review directly", async () => {
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  await screen.findByRole("button", { name: "Review invoice.pdf for Test business" });
  expect(screen.queryByLabelText("Saved invoice checks")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search documents" }), { target: { value: "does-not-match" } });
  expect(screen.queryByRole("button", { name: "Review invoice.pdf for Test business" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review next" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByRole("button", { name: "Review invoice.pdf for Test business" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review next" }));
  await waitFor(() => expect(apiGetJson).toHaveBeenCalledWith("/api/review-queue/document-live"));
});

it("removes a decided document and returns to the queue without reopening the next submission", async () => {
  let decided = false;
  const support = { ...item, documentName: "support.pdf", documentCategory: "general", slotLabel: "Supporting document" };
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/review-queue" ? decided ? [] : [support] : path === "/api/review-queue/document-live" ? { item: support, downloadUrl: "/api/documents/document-live/download", versions: [], comments: [], reviewHistory: [] } : []);
  vi.mocked(reviewQueueApi.review).mockImplementation(async () => { decided = true; return { id: "decision", decision: "accepted", documentId: item.documentId, documentStatus: "accepted", decidedAtUtc: "2026-11-16T10:00:00Z", reason: null, internalNote: null }; });
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Review support.pdf for Test business" }));
  fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
  await screen.findByRole("heading", { name: "No documents awaiting review" });
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  decided = false;
  fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));
  await screen.findByRole("button", { name: "Review support.pdf for Test business" });
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
});

it("keeps bank statement approval disabled until the PDF can be previewed", async () => {
  pdfState.ready = false;
  const bank = { ...item, documentName: "statement.pdf", documentCategory: "bank_statements", slotLabel: "Bank Statement" };
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/review-queue" ? [bank] : path === "/api/review-queue/document-live" ? { item: bank, downloadUrl: "/api/documents/document-live/download", versions: [], comments: [], reviewHistory: [] } : []);
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Review statement.pdf for Test business" }));
  expect(await screen.findByRole("button", { name: "Approve" })).toBeDisabled();
  expect(screen.getByText("Approval is available once the document preview loads.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open in new tab" })).not.toBeInTheDocument();
  expect(reviewQueueApi.review).not.toHaveBeenCalled();
});

it("collects rejection reasons inline, validates them and keeps text after a failed save", async () => {
  vi.mocked(reviewQueueApi.review).mockRejectedValueOnce(new Error("Offline"));
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Review invoice.pdf for Test business" }));
  fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
  const reason = screen.getByLabelText("Reason for the client");
  expect(reason).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a reason");
  expect(reviewQueueApi.review).not.toHaveBeenCalled();
  fireEvent.change(reason, { target: { value: "  Please provide a readable statement.  " } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
  await waitFor(() => expect(reviewQueueApi.review).toHaveBeenCalledWith("document-live", expect.objectContaining({ decision: "rejected", reason: "Please provide a readable statement." })));
  expect(await screen.findByText(/Your reason has been kept/)).toBeInTheDocument();
  expect(reason).toHaveValue("  Please provide a readable statement.  ");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Reason for the client")).not.toBeInTheDocument();
});
it("sends corrected-upload requests from the in-app form", async () => {
  vi.mocked(reviewQueueApi.review).mockResolvedValue({ id: "decision", decision: "request_reupload", documentId: item.documentId, documentStatus: "reupload_required", decidedAtUtc: "2026-11-16T10:00:00Z", reason: "Include every page.", internalNote: null });
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Review invoice.pdf for Test business" }));
  fireEvent.click(await screen.findByRole("button", { name: "Request re-upload" }));
  fireEvent.change(screen.getByLabelText("Reason for the client"), { target: { value: "Include every page." } });
  fireEvent.click(screen.getByRole("button", { name: "Send request" }));
  await waitFor(() => expect(reviewQueueApi.review).toHaveBeenCalledWith("document-live", expect.objectContaining({ decision: "request_reupload", reason: "Include every page." })));
});
