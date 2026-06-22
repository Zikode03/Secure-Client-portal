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

  it("filters unresolved threads and supports back to all", () => {
    renderPage([
      createRequest({ id: "resolved-1", status: "resolved", title: "Resolved tax query", comments: [] }),
      createRequest({ id: "open-1", status: "open", title: "Open bank statement task", comments: [] }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Filter messages" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Unresolved" }));
    expect(screen.queryByText("Resolved tax query")).not.toBeInTheDocument();
    expect(screen.getAllByText("Open bank statement task").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Filter messages" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "All" }));
    expect(screen.getAllByText("Resolved tax query").length).toBeGreaterThan(0);
  });

  it("supports filter menu options", () => {
    renderPage([createRequest()]);

    fireEvent.click(screen.getByRole("button", { name: "Filter messages" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Resolved" }));
    expect(screen.getByText("No messages match your filters")).toBeInTheDocument();
  });

  it("reveals checkboxes after selecting a thread and shows bulk actions for multiple checked messages", () => {
    renderPage([
      createRequest({ id: "request-1", title: "First request" }),
      createRequest({ id: "request-2", title: "Second request" }),
    ]);

    expect(screen.queryByRole("checkbox", { name: "Select First request" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /First request/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select First request" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Second request" }));

    expect(screen.getByText("2 messages selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark resolved" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });

  it("toggles selection mode from the toolbar", () => {
    renderPage([
      createRequest({ id: "request-1", title: "First request" }),
      createRequest({ id: "request-2", title: "Second request" }),
    ]);

    expect(screen.queryByRole("checkbox", { name: "Select First request" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Selection mode" }));
    expect(screen.getByRole("checkbox", { name: "Select First request" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Second request" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Selection mode" }));
    expect(screen.queryByRole("checkbox", { name: "Select First request" })).not.toBeInTheDocument();
  });

  it("refreshes toolbar state back to the default inbox view", () => {
    renderPage([
      createRequest({ id: "resolved-1", status: "resolved", title: "Resolved tax query", comments: [] }),
      createRequest({ id: "open-1", status: "open", title: "Open bank statement task", comments: [] }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Filter messages" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Resolved" }));
    expect(screen.queryByText("Open bank statement task")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh inbox" }));
    expect(screen.getAllByText("Resolved tax query").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open bank statement task").length).toBeGreaterThan(0);
  });

  it("toggles message sort order from the toolbar", () => {
    renderPage([
      createRequest({
        id: "older",
        title: "Older request",
        comments: [{ id: "older-comment", author: "Daniel Mokoena", role: "accountant", message: "Older message.", createdAt: "2026-05-01T09:00:00.000Z" }],
      }),
      createRequest({
        id: "newer",
        title: "Newer request",
        comments: [{ id: "newer-comment", author: "Daniel Mokoena", role: "accountant", message: "Newer message.", createdAt: "2026-05-03T09:00:00.000Z" }],
      }),
    ]);

    const olderBeforeSort = screen.getByRole("button", { name: /Older request/ });
    const newerBeforeSort = screen.getByRole("button", { name: /Newer request/ });
    expect(newerBeforeSort.compareDocumentPosition(olderBeforeSort) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sort messages" }));

    const olderAfterSort = screen.getByRole("button", { name: /Older request/ });
    const newerAfterSort = screen.getByRole("button", { name: /Newer request/ });
    expect(olderAfterSort.compareDocumentPosition(newerAfterSort) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
