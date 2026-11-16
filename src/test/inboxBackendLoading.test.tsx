import { act, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountantFollowUpsPage } from "../pages/accountant/AccountantFollowUpsPage";
import { PortalProvider } from "../app/portal";
import { apiGetJson } from "../services/apiClient";
import { portalServiceApi } from "../services/portalApi";
const user = vi.hoisted(() => ({ id: "accountant-live", role: "accountant", name: "Test", fullName: "Test Accountant", email: "accountant@test.local", title: "Accountant", company: "Test Firm", initials: "TA", clientIds: [], assignedClientIds: ["client-live"] }));
vi.mock("../app/auth", () => ({ useAuth: () => ({ user, ready: true }), useOptionalAuth: () => ({ user, ready: true }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn() }));
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
