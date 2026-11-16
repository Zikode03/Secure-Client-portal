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
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountantReviewPage } from "../pages/accountant/AccountantReviewPage";
import { PortalProvider } from "../app/portal";
import { apiGetBlob, apiGetJson } from "../services/apiClient";
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
  fireEvent.click(
    await screen.findByRole("button", { name: "Actions for Sales Invoices" }),
  );
  const open = await screen.findByRole("button", { name: "Open review" });
  fireEvent.click(open);
  await waitFor(() =>
    expect(apiGetJson).toHaveBeenCalledWith("/api/review-queue/document-live"),
  );
  expect(screen.getAllByText("invoice.pdf").length).toBeGreaterThan(0);
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
    await screen.findByRole("button", { name: "Actions for Sales Invoices" }),
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
  fireEvent.click(
    await screen.findByRole("button", { name: "Actions for Sales Invoices" }),
  );
  fireEvent.click(await screen.findByRole("button", { name: "Open review" }));
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

it("filters saved findings using queue summaries without fetching every review", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/review-queue" ? [
    {...item, assistantState: "needs_attention"},
    {...item, documentId: "another-invoice", documentName: "another.pdf", clientName: "Another business", assistantState: "not_started"},
  ] : []);
  render(<MemoryRouter><PortalProvider><AccountantReviewPage /></PortalProvider></MemoryRouter>);
  await screen.findByText(/Another business \|/);
  fireEvent.change(screen.getByLabelText("Saved invoice checks"), {target: {value: "needs_attention"}});
  expect(screen.queryByText(/Another business \|/)).not.toBeInTheDocument();
  expect(screen.getByText(/Saved checks: Needs attention/)).toBeInTheDocument();
  expect(invoiceReviewApi.get).not.toHaveBeenCalled();
});
