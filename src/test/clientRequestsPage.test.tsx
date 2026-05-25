import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { useAuth } from "../app/auth";
import { useClientWorkflow } from "../hooks/useClientWorkflow";
import { ClientRequestsPage } from "../pages/client/ClientRequestsPage";
import type { WorkflowRequest } from "../types/portal";

const mockedNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock("../app/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useClientWorkflow", () => ({
  useClientWorkflow: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseClientWorkflow = vi.mocked(useClientWorkflow);

function createRequest(overrides: Partial<WorkflowRequest> = {}): WorkflowRequest {
  return {
    id: "request-1",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    title: "Expense invoice totals mismatch",
    description: "Please upload corrected invoice support for April.",
    monthLabel: "April 2026",
    status: "open",
    priority: "high",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-07T17:00:00.000Z",
    createdAt: "2026-05-02T09:00:00.000Z",
    requestType: "missing_document_request",
    comments: [
      {
        id: "comment-1",
        author: "Daniel Mokoena",
        role: "accountant",
        message: "Please re-upload the complete invoice support.",
        createdAt: "2026-05-02T09:15:00.000Z",
      },
    ],
    auditTrail: [],
    ...overrides,
  };
}

function renderPage(
  requests: WorkflowRequest[],
  overrides?: {
    createClientRequest?: ReturnType<typeof vi.fn>;
    replyToRequest?: ReturnType<typeof vi.fn>;
    resolveRequest?: ReturnType<typeof vi.fn>;
  },
) {
  const createClientRequest = overrides?.createClientRequest ?? vi.fn(() => ({ ok: true, message: "Request sent." }));
  const replyToRequest = overrides?.replyToRequest ?? vi.fn(() => ({ ok: true, message: "Reply added." }));
  const resolveRequest = overrides?.resolveRequest ?? vi.fn(() => ({ ok: true, message: "Resolved." }));

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

  mockedUseClientWorkflow.mockReturnValue({
    assignedAccountantName: "Daniel Mokoena",
    createClientRequest,
    dismissFeedbackNotice: vi.fn(),
    feedbackNotice: null,
    replyToRequest,
    resolveRequest,
    requests,
  } as never);

  render(
    <MemoryRouter>
      <ClientRequestsPage />
    </MemoryRouter>,
  );

  return { createClientRequest, replyToRequest, resolveRequest };
}

describe("ClientRequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedNavigate.mockReset();
  });

  it("renders thread comments for the selected request", () => {
    renderPage([createRequest()]);

    expect(screen.getAllByText("Please re-upload the complete invoice support.").length).toBeGreaterThan(0);
  });

  it("sends a reply using the client identity", () => {
    const { replyToRequest } = renderPage([createRequest()]);

    fireEvent.change(screen.getByPlaceholderText("Type your message..."), {
      target: { value: "Uploaded the corrected version now." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(replyToRequest).toHaveBeenCalledWith(
      "request-1",
      "client",
      "Sarah Jacobs",
      "Uploaded the corrected version now.",
    );
  });

  it("shows request-type helper text for clarification requests", () => {
    renderPage([createRequest({ requestType: "clarification_request" })]);

    expect(
      screen.getByText(
        "Clarification request: reply in this thread with details the accountant asked for.",
      ),
    ).toBeInTheDocument();
  });

  it("shows request-type helper text for renewal requests", () => {
    renderPage([createRequest({ requestType: "renewal_request" })]);

    expect(
      screen.getByText(
        "Renewal request: upload the latest compliance renewal files with date evidence.",
      ),
    ).toBeInTheDocument();
  });

  it("lets the client create a formal document request", () => {
    const { createClientRequest } = renderPage([createRequest()]);

    fireEvent.click(screen.getByRole("button", { name: "Request document" }));
    fireEvent.change(screen.getByLabelText("Document needed"), {
      target: { value: "Signed annual financial statements" },
    });
    fireEvent.change(screen.getByLabelText("Request details"), {
      target: { value: "Please share the signed annual financial statements for board reporting." },
    });
    fireEvent.change(screen.getByLabelText("Needed by"), {
      target: { value: "2026-05-30" },
    });
    fireEvent.change(screen.getByLabelText("Priority"), {
      target: { value: "high" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(createClientRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Document request: Signed annual financial statements",
        description: "Please share the signed annual financial statements for board reporting.",
        priority: "high",
      }),
      expect.objectContaining({
        fullName: "Sarah Jacobs",
        role: "client",
      }),
    );
  });

  it("filters unresolved threads and supports back to all", () => {
    renderPage([
      createRequest({ id: "resolved-1", status: "resolved", title: "Resolved tax query", comments: [] }),
      createRequest({ id: "open-1", status: "open", title: "Open bank statement task", comments: [] }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Unresolved" }));
    expect(screen.queryByText("Resolved tax query")).not.toBeInTheDocument();
    expect(screen.getAllByText("Open bank statement task").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Back to all" }));
    expect(screen.getAllByText("Resolved tax query").length).toBeGreaterThan(0);
  });

  it("supports header menu quick filters", () => {
    renderPage([createRequest()]);

    fireEvent.click(screen.getByRole("button", { name: "?" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Show resolved" }));
    expect(screen.getByText("No messages match your filters")).toBeInTheDocument();
  });

  it("navigates upload button with request context", () => {
    renderPage([createRequest({ id: "request-context-1" })]);
    fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
    expect(mockedNavigate).toHaveBeenCalledWith("/client/documents?requestId=request-context-1&from=inbox");
  });

  it("sends attachment payload in message", async () => {
    const replyToRequest = vi.fn(() => ({ ok: true, message: "Reply added." }));
    renderPage([createRequest()], { replyToRequest });

    const file = new File(["test"], "statement.pdf", { type: "application/pdf" });
    const attachInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(attachInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("Attached: statement.pdf")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(replyToRequest).toHaveBeenCalled();
    const sentMessage = ((replyToRequest as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[3] as string | undefined) ?? "";
    expect(sentMessage).toContain("[[attachment:");
  });

  it("shows retry for failed reply sends", () => {
    const replyToRequest = vi
      .fn()
      .mockReturnValueOnce({ ok: false, message: "Network failure" })
      .mockReturnValueOnce({ ok: true, message: "Reply added." });
    renderPage([createRequest()], { replyToRequest });

    fireEvent.change(screen.getByPlaceholderText("Type your message..."), {
      target: { value: "Please check this." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Network failure")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(replyToRequest).toHaveBeenCalledTimes(2);
  });
});
