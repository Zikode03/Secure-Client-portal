import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ClientMonthlyPacksPage } from "../pages/client/ClientMonthlyPacksPage";
import type { MonthlyPack, WorkflowRequest } from "../types/portal";
import { useAuth } from "../app/auth";
import { useClientWorkflow } from "../hooks/useClientWorkflow";

vi.mock("../app/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useClientWorkflow", () => ({
  useClientWorkflow: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseClientWorkflow = vi.mocked(useClientWorkflow);

function createBasePack(): MonthlyPack {
  return {
    monthLabel: "April 2026",
    dueDate: "2026-05-06T17:00:00.000Z",
    deadlineStatus: "due",
    progressPercent: 25,
    completedCount: 1,
    totalCount: 4,
    canComplete: false,
    completionMessage:
      "You cannot submit this month because required documents are still missing or rejected.",
    submissionStatus: "open",
    slots: [
      {
        id: "slot-1",
        documentType: "Bank Statement",
        description: "Main business account statement for the month.",
        status: "missing",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF"],
        progress: 0,
        autoName: "ApexTrading_BankStatement_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
      },
      {
        id: "slot-2",
        documentType: "Invoices",
        description: "All customer and supplier invoice evidence for the month in one controlled slot.",
        status: "rejected",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF", "JPG", "PNG", "ZIP"],
        progress: 35,
        autoName: "ApexTrading_Invoices_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
        lastSubmission: "2026-05-01T08:40:00.000Z",
        rejectionReason:
          "The invoice support is incomplete because three receipt scans are cropped and two VAT numbers are unreadable.",
      },
      {
        id: "slot-3",
        documentType: "Signed Documents",
        description: "Signed approvals, filing authorisations, and month-end sign-off.",
        status: "pending_signature",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF"],
        progress: 68,
        autoName: "ApexTrading_SignedDocuments_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
      },
      {
        id: "slot-4",
        documentType: "Compliance Record",
        description: "Current compliance evidence for the period.",
        status: "under_review",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF"],
        progress: 90,
        autoName: "ApexTrading_ComplianceRecord_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
        supportsExpiryDate: true,
        lastSubmission: "2026-05-02T09:30:00.000Z",
      },
    ],
  };
}

function createRequest(): WorkflowRequest {
  return {
    id: "request-1",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    title: "Re-upload invoice support with readable VAT details",
    description:
      "Three supplier receipts are cropped and two VAT numbers cannot be read clearly enough for review.",
    monthLabel: "April 2026",
    status: "awaiting_client",
    priority: "high",
    relatedDocumentId: "doc-1002",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-05T17:00:00.000Z",
    createdAt: "2026-04-30T09:15:00.000Z",
    comments: [
      {
        id: "request-comment-1",
        author: "Daniel Mokoena",
        role: "accountant",
        message: "Please upload the corrected invoice support into the same April invoices slot.",
        createdAt: "2026-04-30T09:15:00.000Z",
      },
    ],
    auditTrail: [
      {
        id: "request-audit-1",
        status: "Follow-up sent",
        actor: "Daniel Mokoena",
        timestamp: "2026-04-30T09:15:00.000Z",
        note: "Requested corrected supplier evidence.",
      },
    ],
  };
}

function buildWorkflowState(overrides: Record<string, unknown> = {}) {
  return {
    activity: [
      {
        id: "activity-1",
        title: "Invoice support file rejected",
        detail: "Daniel asked for clearer scans on three receipts before the file can be accepted.",
        timestamp: "2026-04-30T09:10:00.000Z",
        tone: "danger",
        actor: "Daniel Mokoena",
        relatedLabel: "Invoices",
      },
    ],
    clientName: "Apex Trading Ltd",
    dismissFeedbackNotice: vi.fn(),
    documents: [{ id: "doc-1002", documentType: "Invoices" }],
    feedbackNotice: null,
    monthPack: createBasePack(),
    previousMonthComparison: {
      currentMonthLabel: "April 2026",
      previousMonthLabel: "March 2026",
      currentInvoiceCount: 8,
      previousInvoiceCount: 6,
      delta: 2,
      message: "April invoice coverage is ahead of last month.",
      tone: "success",
    },
    replyToRequest: vi.fn(() => ({ ok: true, message: "Reply added to request." })),
    requests: [createRequest()],
    resolveRequest: vi.fn(() => ({ ok: true, message: "Request marked as resolved." })),
    showFeedbackNotice: vi.fn(),
    submitMonth: vi.fn(),
    uploadToSlot: vi.fn(),
    ...overrides,
  };
}

function renderPage(workflowOverrides: Record<string, unknown> = {}) {
  mockedUseAuth.mockReturnValue({
    ready: true,
    user: {
      id: "user-client-1",
      name: "Sarah",
      fullName: "Sarah Jacobs",
      email: "client@example.com",
      role: "client",
      title: "Finance Manager",
      company: "Apex Trading Ltd",
      initials: "SJ",
      clientIds: ["client-apex"],
    },
    login: vi.fn(),
    completeInvite: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn(),
  });

  const workflowState = buildWorkflowState(workflowOverrides);
  mockedUseClientWorkflow.mockReturnValue(workflowState as never);

  render(
    <MemoryRouter>
      <ClientMonthlyPacksPage />
    </MemoryRouter>,
  );

  return workflowState;
}

describe("ClientMonthlyPacksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps submit disabled when required documents are missing or rejected", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /submit month/i })).toBeDisabled();
  });

  it("shows a clear disabled-submit reason", () => {
    renderPage();

    expect(
      screen.getByText("2 required documents are missing and 1 document was rejected."),
    ).toBeInTheDocument();
  });

  it("enables submit when all required documents are ready", () => {
    const readyPack = {
      ...createBasePack(),
      canComplete: true,
      completionMessage: "Month is complete and ready to submit to your accountant.",
      slots: createBasePack().slots.map((slot) =>
        slot.documentType === "Compliance Record"
          ? slot
          : { ...slot, status: "accepted" as const, rejectionReason: undefined },
      ),
    };

    renderPage({ monthPack: readyPack });

    expect(screen.getByText("All required documents are ready for accountant review.")).toBeInTheDocument();
    screen
      .getAllByRole("button", { name: /submit month/i })
      .forEach((button) => expect(button).toBeEnabled());
  });

  it("routes the top upload action to the highest-priority blocker", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /upload into slot/i }));

    const dialog = screen.getByRole("dialog", { name: "Smart document upload" });

    expect(within(dialog).getByText("Checklist slot")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Invoices").length).toBeGreaterThan(0);
  });

  it("opens the upload modal for the correct slot when a blocker action is clicked", () => {
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: /open actions for invoices/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Re-upload" })[0]);

    const dialog = screen.getByRole("dialog", { name: "Smart document upload" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Checklist slot")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Invoices").length).toBeGreaterThan(0);
  });

  it("shows the rejection reason when the review note is opened", () => {
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: /open actions for invoices/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /view review note/i })[0]);

    expect(
      screen.getAllByText(/invoice support is incomplete because three receipt scans are cropped/i)
        .length,
    ).toBeGreaterThan(0);
  });

  it("lets the user open the review note from the action menu", () => {
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: /open actions for invoices/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /view review note/i })[0]);

    expect(screen.getAllByText("Accountant note").length).toBeGreaterThan(0);
  });

  it("lets the user dismiss contextual feedback messages", () => {
    const dismissFeedbackNotice = vi.fn();

    renderPage({
      dismissFeedbackNotice,
      feedbackNotice: {
        tone: "success",
        title: "Bank Statement uploaded successfully.",
        message: "The April bank statement is now tied to the correct checklist slot.",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(dismissFeedbackNotice).toHaveBeenCalledTimes(1);
  });

  it("shows a positive empty state when no blocking documents remain", () => {
    const readyPack = {
      ...createBasePack(),
      canComplete: true,
      completionMessage: "Month is complete and ready to submit to your accountant.",
      slots: createBasePack().slots.map((slot) => ({
        ...slot,
        status: "accepted" as const,
        rejectionReason: undefined,
      })),
    };

    renderPage({ monthPack: readyPack, requests: [] });

    expect(screen.getByText("This pack is ready.")).toBeInTheDocument();
    expect(screen.getByText("All required documents are ready for accountant review.")).toBeInTheDocument();
  });
});
