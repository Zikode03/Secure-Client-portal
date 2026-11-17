import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountantFollowUpsPage } from "../pages/accountant/AccountantFollowUpsPage";
import { PortalProvider } from "../app/portal";
import { apiGetJson, apiPostJson } from "./fixtures/apiTransportFixture";
import { portalServiceApi } from "../services/portalApi";
const user = vi.hoisted(() => ({ id: "accountant-live", role: "accountant", name: "Test", fullName: "Test Accountant", email: "accountant@test.local", title: "Accountant", company: "Test Firm", initials: "TA", clientIds: [], assignedClientIds: ["client-live"] }));
vi.mock("../app/auth", () => ({ useAuth: () => ({ user, ready: true }), useOptionalAuth: () => ({ user, ready: true }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPostJson: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(portalServiceApi, "getAdminClients").mockResolvedValue([{ id: "client-live", clientName: "Test business", industry: "Consulting", assignedAccountant: user.fullName, assignedAccountantUserId: user.id, requiredPack: "Monthly", completionRate: 0, deadlinePolicy: "Configured", status: "on_track" }]);
});
it("renders the inbox index without waiting for every conversation and loads only the selected thread", async () => {
  const requests = Array.from({ length: 30 }, (_, i) => ({ id: `request-${i}`, clientId: "client-live", requestType: "missing_document", title: `Invoice request ${i}`, description: "Please supply the invoice", priority: "medium", status: "waiting_on_client", requestedByUserId: user.id, requestedAtUtc: "2026-11-11T08:00:00Z", updatedAtUtc: "2026-11-11T08:00:00Z", dueDateUtc: "2026-11-15T17:00:00Z" }));
  vi.mocked(apiGetJson).mockImplementation(async path => {
    if (path === "/api/requests") return requests;
    if (String(path).endsWith("/workspace")) return await new Promise(() => undefined);
    return [];
  });
  await act(async () => { render(<StrictMode><MemoryRouter><PortalProvider><AccountantFollowUpsPage /></PortalProvider></MemoryRouter></StrictMode>); });
  expect(await screen.findByRole("heading", { name: "Inbox" })).toBeInTheDocument();
  expect(screen.getAllByText(/Invoice request \d+/).length).toBeGreaterThan(1);
  await waitFor(() => expect(vi.mocked(apiGetJson).mock.calls.filter(([path]) => String(path).endsWith("/workspace"))).toHaveLength(1));
  expect(screen.getByRole("status")).toHaveTextContent("Loading selected conversation");
});

it("updates the selected conversation automatically without a refresh button", async () => {
  vi.useFakeTimers();
  const request = { id: "request-auto", clientId: "client-live", requestType: "missing_document", title: "Statement request", description: "Please supply the statement", priority: "medium", status: "waiting_on_client", requestedByUserId: user.id, requestedAtUtc: "2026-11-11T08:00:00Z", updatedAtUtc: "2026-11-11T08:00:00Z", dueDateUtc: "2026-11-15T17:00:00Z" };
  let workspaceLoads = 0;
  vi.mocked(apiGetJson).mockImplementation(async path => {
    if (path === "/api/requests") return [request];
    if (String(path).endsWith("/workspace")) { workspaceLoads++; return { request, comments: [] }; }
    return [];
  });
  let view: ReturnType<typeof render> | undefined;
  try {
    await act(async () => { view = render(<MemoryRouter><PortalProvider><AccountantFollowUpsPage /></PortalProvider></MemoryRouter>); });
    expect(workspaceLoads).toBe(1);
    expect(screen.queryByRole("button", { name: "Refresh conversation" })).not.toBeInTheDocument();
    expect(screen.getByText("Updates automatically")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(workspaceLoads).toBeGreaterThanOrEqual(2);
    view!.unmount();
    const count = workspaceLoads;
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(workspaceLoads).toBe(count);
  } finally { view?.unmount(); vi.useRealTimers(); }
});

it("uses a compact request form and preserves the message after a failed send", async () => {
  vi.mocked(apiGetJson).mockResolvedValue([]);
  let reject!: (reason: Error) => void;
  vi.mocked(apiPostJson).mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  render(<MemoryRouter><PortalProvider><AccountantFollowUpsPage /></PortalProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Request document" }));
  const dialog = screen.getByRole("dialog", { name: "Request document" });
  expect(within(dialog).queryByText("Live thread")).not.toBeInTheDocument();
  expect(within(dialog).queryByText("Request details")).not.toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Send request" })).toBeDisabled();
  expect(within(dialog).getByLabelText("Client")).toHaveValue("Test business");
  fireEvent.change(within(dialog).getByLabelText("Subject"), { target: { value: "November bank statement" } });
  fireEvent.change(within(dialog).getByLabelText("Message to client"), { target: { value: "Please include all pages." } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send request" }));
  expect(within(dialog).getByRole("button", { name: "Sending..." })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(apiPostJson).toHaveBeenCalledTimes(1);
  expect(apiPostJson).toHaveBeenCalledWith("/api/requests", expect.objectContaining({ clientId: "client-live", title: "Document request: November bank statement", description: "Please include all pages." }));
  await act(async () => { reject(new Error("Unavailable")); });
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Your message has been kept");
  expect(within(dialog).getByLabelText("Message to client")).toHaveValue("Please include all pages.");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Request document" })).not.toBeInTheDocument();
});

it("puts request creation in the list and resolution in the conversation header", async () => {
  const request = { id: "request-layout", clientId: "client-live", requestType: "missing_document", title: "Statement request", description: "Upload the complete statement.", priority: "medium", status: "waiting_on_client", requestedByUserId: user.id, requestedAtUtc: "2026-11-11T08:00:00Z", updatedAtUtc: "2026-11-11T08:00:00Z", dueDateUtc: "2026-11-15T17:00:00Z" };
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/requests" ? [request] : String(path).endsWith("/workspace") ? { request, comments: [] } : []);
  render(<MemoryRouter><PortalProvider><AccountantFollowUpsPage /></PortalProvider></MemoryRouter>);
  const list = await screen.findByRole("region", { name: "Conversations" });
  expect(within(list).getByRole("button", { name: "Request document" })).toBeInTheDocument();
  const composer = screen.getByRole("group", { name: "Reply composer" });
  expect(within(composer).getByRole("button", { name: "Send" })).toBeInTheDocument();
  expect(within(composer).queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  expect(within(screen.getByRole("group", { name: "Conversation controls" })).getByRole("button", { name: "Resolve" })).toBeInTheDocument();
  expect(screen.getByText("Original request")).toBeInTheDocument();
  expect(screen.queryByText("Assignment & SLA")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Conversation actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Edit request details" }));
  expect(screen.getByRole("dialog", { name: "Edit request details" })).toBeInTheDocument();
});
