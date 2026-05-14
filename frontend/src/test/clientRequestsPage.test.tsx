// Friendly guide: this module (clientRequestsPage.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ClientRequestsPage } from "../pages/client/ClientRequestsPage";
import type { DocumentRecord, MonthlyPack, WorkflowRequest } from "../types/portal";
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

// Component flow: gather data first, then render a focused UI state.
function createBasePack(): MonthlyPack {
  return {
    monthLabel: "April 2026",
    dueDate: "2026-05-06T17:00:00.000Z",
    deadlineStatus: "due",
    progressPercent: 50,
    completedCount: 2,
    totalCount: 4,
    canComplete: false,
    completionMessage:
      "You cannot submit this month because required documents are still missing or rejected.",
    submissionStatus: "open",
    slots: [
      {
        id: "slot-bank",
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
        id: "slot-invoices",
        documentType: "Invoices",
        description: "Invoice evidence for the month.",
        status: "rejected",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF", "ZIP"],
        progress: 60,
        autoName: "ApexTrading_Invoices_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
        rejectionReason:
          "The invoice support is incomplete because three receipt scans are cropped and two VAT numbers are unreadable.",
      },
      {
        id: "slot-signed",
        documentType: "Signed Documents",
        description: "Signed approvals for the month.",
        status: "accepted",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF"],
        progress: 100,
        autoName: "ApexTrading_SignedDocuments_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
      },
      {
        id: "slot-compliance",
        documentType: "Compliance Record",
        description: "Compliance evidence for the period.",
        status: "accepted",
        month: "April",
        year: 2026,
        acceptedFiles: ["PDF"],
        progress: 100,
        autoName: "ApexTrading_ComplianceRecord_April_2026.pdf",
        isRequired: true,
        dueDate: "2026-05-06T17:00:00.000Z",
      },
    ],
  };
}

function createDocuments(): DocumentRecord[] {
  return [
    {
      id: "doc-invoices-1",
      clientId: "client-apex",
      clientName: "Apex Trading Ltd",
      documentType: "Invoices",
      fileName: "ApexTrading_Invoices_April_2026.pdf",
      monthLabel: "April 2026",
      description: "April invoice support bundle.",
      status: "rejected",
      uploadedBy: "Sarah Jacobs",
      uploadedAt: "2026-05-01T08:00:00.000Z",
      reviewedBy: "Daniel Mokoena",
      reviewedAt: "2026-05-02T09:00:00.000Z",
      sizeLabel: "2.4 MB",
      keywordTags: ["invoice", "april"],
      supplierName: "Makro (Pty) Ltd",
      amountLabel: "R12 500.00",
      rejectionReason:
        "The invoice support is incomplete because three receipt scans are cropped and two VAT numbers are unreadable.",
      comments: [],
      auditTrail: [],
    },
  ];
}

function createRequests(): WorkflowRequest[] {
  return [
    {
      id: "request-invoices",
      clientId: "client-apex",
      clientName: "Apex Trading Ltd",
      title: "Expense invoice totals mismatch",
      description:
        "Your accountant needs the corrected April invoice support before the month-end review can be completed.",
      monthLabel: "April 2026",
      status: "open",
      priority: "high",
      relatedDocumentId: "doc-invoices-1",
      requestedBy: "Daniel Mokoena",
      requestedByRole: "accountant",
      assignedTo: "Sarah Jacobs",
      dueDate: "2026-05-07T17:00:00.000Z",
      createdAt: "2026-05-02T09:00:00.000Z",
      comments: [
        {
          id: "request-comment-1",
          author: "Daniel Mokoena",
          role: "accountant",
          message: "Please upload the corrected invoice support into the same April invoices slot.",
          createdAt: "2026-05-02T09:15:00.000Z",
        },
      ],
      auditTrail: [
        {
          id: "audit-1",
          status: "Request created",
          actor: "Daniel Mokoena",
          timestamp: "2026-05-02T09:00:00.000Z",
          note: "Requested corrected invoice support.",
        },
      ],
    },
    {
      id: "request-bank",
      clientId: "client-apex",
      clientName: "Apex Trading Ltd",
      title: "Bank statement for reconciliation",
      description:
        "Your accountant needs the April bank statement to complete the reconciliation checks.",
      monthLabel: "April 2026",
      status: "awaiting_client",
      priority: "medium",
      requestedBy: "Daniel Mokoena",
      requestedByRole: "accountant",
      assignedTo: "Sarah Jacobs",
      dueDate: "2026-05-10T17:00:00.000Z",
      createdAt: "2026-05-03T08:30:00.000Z",
      comments: [
        {
          id: "request-comment-2",
          author: "Daniel Mokoena",
          role: "accountant",
          message: "Please upload the April bank statement in PDF format.",
          createdAt: "2026-05-03T08:30:00.000Z",
        },
      ],
      auditTrail: [
        {
          id: "audit-2",
          status: "Request created",
          actor: "Daniel Mokoena",
          timestamp: "2026-05-03T08:30:00.000Z",
          note: "Requested missing bank statement.",
        },
      ],
    },
  ];
}

function buildWorkflowState(overrides: Record<string, unknown> = {}) {
  return {
    assignedAccountantName: "Daniel Mokoena",
    clientName: "Apex Trading Ltd",
    createClientRequest: vi.fn(() => ({ ok: true, message: "Your request has been sent to your accountant." })),
    dismissFeedbackNotice: vi.fn(),
    documents: createDocuments(),
    feedbackNotice: null,
    monthPack: createBasePack(),
    replyToRequest: vi.fn(() => ({ ok: true, message: "Reply added to request." })),
    requests: createRequests(),
    resolveRequest: vi.fn(() => ({ ok: true, message: "Request marked as resolved." })),
    showFeedbackNotice: vi.fn(),
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
      assignedClientIds: [],
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
      <ClientRequestsPage />
    </MemoryRouter>,
  );

  return workflowState;
}

describe("ClientRequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders open requests in the request list", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: /expense invoice totals mismatch/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /bank statement for reconciliation/i }),
    ).toBeInTheDocument();
  });

  it("selecting a request updates the selected workspace", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: /re-upload invoices/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /bank statement for reconciliation/i }),
    );

    expect(
      screen.getByRole("button", { name: /upload bank statement/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bank Statement - April 2026").length).toBeGreaterThan(0);
  });

  it("displays request comments inside the selected request workspace", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /comments/i }));

    expect(
      screen.getByText(
        "Please upload the corrected invoice support into the same April invoices slot.",
      ),
    ).toBeInTheDocument();
  });

  it("does not allow document uploads through comments", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /comments/i }));

    expect(
      screen.getAllByText(
        "Files must be uploaded through the structured document slot so they can be named, tracked, and reviewed properly.",
      ).length,
    ).toBeGreaterThan(0);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("changes the primary action based on the selected request type", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: /re-upload invoices/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /bank statement for reconciliation/i }),
    );

    expect(
      screen.getByRole("button", { name: /upload bank statement/i }),
    ).toBeInTheDocument();
  });

  it("lets the client start a new accountant request", () => {
    const workflowState = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Ask accountant" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Request type"), {
      target: { value: "document" },
    });
    fireEvent.change(screen.getByPlaceholderText("What do you need from your accountant?"), {
      target: { value: "Signed annual financial statements" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Explain what document, answer, or clarification you need and why.",
      ),
      {
        target: { value: "Please send the signed annual financial statements for the board pack." },
      },
    );
    fireEvent.change(screen.getByLabelText("Needed by"), {
      target: { value: "2026-05-15" },
    });
    fireEvent.change(screen.getByLabelText("Priority"), {
      target: { value: "high" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(workflowState.createClientRequest).toHaveBeenCalledWith(
      {
        title: "Document request: Signed annual financial statements",
        description: "Please send the signed annual financial statements for the board pack.",
        dueDate: "2026-05-15T17:00:00.000Z",
        priority: "high",
        monthLabel: "April 2026",
      },
      expect.objectContaining({
        fullName: "Sarah Jacobs",
        role: "client",
      }),
    );
  });

  it("shows when a request is waiting on the accountant", () => {
    renderPage({
      requests: [
        {
          ...createRequests()[0],
          id: "request-client-1",
          title: "Document request: Signed annual financial statements",
          status: "awaiting_accountant",
          requestedBy: "Sarah Jacobs",
          requestedByRole: "client",
          assignedTo: "Daniel Mokoena",
          comments: [
            {
              id: "request-comment-client-1",
              author: "Sarah Jacobs",
              role: "client",
              message: "Please send the signed annual financial statements for our board pack.",
              createdAt: "2026-05-04T10:00:00.000Z",
            },
          ],
        },
      ],
    });

    expect(screen.getAllByText("Waiting on accountant").length).toBeGreaterThan(0);
    expect(screen.getByText("Assigned accountant")).toBeInTheDocument();
    expect(screen.getByText("Daniel Mokoena")).toBeInTheDocument();
  });

  it("shows an empty state when there are no requests", () => {
    renderPage({ requests: [] });

    expect(screen.getByText("No requests found")).toBeInTheDocument();
    expect(screen.getByText("No open requests. You are up to date.")).toBeInTheDocument();
    expect(
      screen.getByText("Select a request to view details, comments, and audit history."),
    ).toBeInTheDocument();
  });
});