import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { useAuth } from "../app/auth";
import { usePortal } from "../app/portal";
import { AccountantMessagesPage } from "../pages/accountant/AccountantMessagesPage";
import type { DocumentRecord, WorkflowRequest } from "../types/portal";

vi.mock("../app/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../app/portal", () => ({
  usePortal: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUsePortal = vi.mocked(usePortal);

function createRequest(): WorkflowRequest {
  return {
    id: "request-apex-1",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    title: "Upload missing bank statement",
    description: "We still need the April operating account statement.",
    monthLabel: "April 2026",
    status: "awaiting_client",
    priority: "high",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-06T17:00:00.000Z",
    createdAt: "2026-05-06T08:30:00.000Z",
    comments: [
      {
        id: "request-comment-1",
        author: "Daniel Mokoena",
        role: "accountant",
        message: "Please upload the April bank statement before review starts.",
        createdAt: "2026-05-06T08:30:00.000Z",
      },
    ],
    auditTrail: [],
  };
}

function createDocument(): DocumentRecord {
  return {
    id: "document-apex-1",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    documentType: "VAT Return",
    fileName: "ApexTrading_VATReturn_April_2026.pdf",
    monthLabel: "April 2026",
    description: "April VAT return upload.",
    status: "under_review",
    uploadedBy: "Sarah Jacobs",
    uploadedAt: "2026-05-05T09:00:00.000Z",
    reviewedBy: "Daniel Mokoena",
    reviewedAt: "2026-05-05T11:00:00.000Z",
    sizeLabel: "1.2 MB",
    keywordTags: ["vat"],
    comments: [
      {
        id: "document-comment-1",
        author: "Sarah Jacobs",
        role: "client",
        message: "Uploaded the return from eFiling.",
        createdAt: "2026-05-05T09:00:00.000Z",
      },
    ],
    auditTrail: [],
  };
}

function renderPage() {
  const addDocumentComment = vi.fn(() => ({ ok: true, message: "Document thread updated." }));
  const addRequestComment = vi.fn(() => ({ ok: true, message: "Request thread updated." }));

  mockedUseAuth.mockReturnValue({
    ready: true,
    user: {
      id: "accountant-1",
      name: "Daniel",
      fullName: "Daniel Mokoena",
      email: "daniel@example.com",
      role: "accountant",
      title: "Senior Accountant",
      company: "Finwell Advisory",
      initials: "DM",
      clientIds: [],
    },
    login: vi.fn(),
    completeInvite: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn(),
  });

  mockedUsePortal.mockReturnValue({
    clientWorkflow: {
      documents: [createDocument()],
      requests: [createRequest()],
    },
    addDocumentComment,
    addRequestComment,
  } as never);

  render(
    <MemoryRouter>
      <AccountantMessagesPage />
    </MemoryRouter>,
  );

  return {
    addDocumentComment,
    addRequestComment,
  };
}

describe("AccountantMessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the simpler thread inbox with clear filters", () => {
    renderPage();

    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Thread list")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All threads/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Requests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Documents/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open workspace" })).toBeInTheDocument();
  });

  it("switches between request and document threads and sends replies to the right record", () => {
    const { addDocumentComment, addRequestComment } = renderPage();

    fireEvent.change(screen.getByLabelText("Reply in this request thread"), {
      target: { value: "Please send it today." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    expect(addRequestComment).toHaveBeenCalledWith(
      "request-apex-1",
      "Daniel Mokoena",
      "accountant",
      "Please send it today.",
    );

    fireEvent.click(screen.getByRole("button", { name: /Documents/i }));

    expect(screen.getByLabelText("Reply in this document thread")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reply in this document thread"), {
      target: { value: "Please replace this with the stamped final PDF." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    expect(addDocumentComment).toHaveBeenCalledWith(
      "document-apex-1",
      "Daniel Mokoena",
      "accountant",
      "Please replace this with the stamped final PDF.",
    );
  });
});
