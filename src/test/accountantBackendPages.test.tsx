import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PortalProvider } from "../app/portal";
import { apiGetJson } from "./fixtures/apiTransportFixture";
import type { SessionUser } from "../types/portal";
const user = vi.hoisted(() => ({ id: "accountant-live", role: "accountant", name: "Test", fullName: "Test Accountant", email: "accountant@test.local", title: "Accountant", company: "Test Firm", initials: "TA", clientIds: [], assignedClientIds: ["live-client"] }));
vi.mock("../app/auth", async original => ({ ...await original<typeof import("../app/auth")>(), useAuth: () => ({ user: user as SessionUser, ready: true, authNotice: null, logoutPending: false }), useOptionalAuth: () => ({ user: user as SessionUser, ready: true }) }));
vi.mock("../services/apiClient", async original => {
  const actual = await original<typeof import("../services/apiClient")>();
  return { ...actual, hasApiBaseUrl: () => true, apiGetJson: vi.fn(async () => { throw new actual.ApiError(503, "Test API temporarily unavailable"); }) };
});
const pages = [
  ["Dashboard", "/firm/dashboard", "/firm/dashboard", () => import("../pages/accountant/AccountantDashboardPage"), "AccountantDashboardPage"],
  ["Clients", "/firm/clients", "/firm/clients", () => import("../pages/accountant/AccountantPortfolioPage"), "AccountantPortfolioPage"],
  ["Client workspace", "/firm/clients/:clientId", "/firm/clients/live-client", () => import("../pages/accountant/AccountantClientWorkspacePage"), "AccountantClientWorkspacePage"],
  ["Pack workspace", "/firm/clients/:clientId/packs", "/firm/clients/live-client/packs", () => import("../pages/accountant/AccountantClientPackWorkspacePage"), "AccountantClientPackWorkspacePage"],
  ["Documents", "/firm/documents", "/firm/documents", () => import("../pages/accountant/AccountantDocumentsPage"), "AccountantDocumentsPage"],
  ["Filing", "/firm/filing", "/firm/filing", () => import("../pages/accountant/AccountantFilingPage"), "AccountantFilingPage"],
  ["Review", "/firm/review", "/firm/review", () => import("../pages/accountant/AccountantReviewPage"), "AccountantReviewPage"],
  ["Inbox", "/firm/inbox", "/firm/inbox", () => import("../pages/firm/FirmRequestsPage"), "FirmRequestsPage"],
  ["Request", "/firm/inbox/:requestId", "/firm/inbox/request-1", () => import("../pages/firm/FirmRequestDetailPage"), "FirmRequestDetailPage"],
  ["Activity", "/firm/activity", "/firm/activity", () => import("../pages/firm/FirmActivityFeedPage"), "FirmActivityFeedPage"],
  ["Exceptions", "/firm/exceptions", "/firm/exceptions", () => import("../pages/firm/FirmExceptionsQueuePage"), "FirmExceptionsQueuePage"],
  ["Compliance", "/firm/compliance", "/firm/compliance", () => import("../pages/accountant/AccountantComplianceCentrePage"), "AccountantComplianceCentrePage"],
  ["Calendar", "/firm/compliance/calendar", "/firm/compliance/calendar", () => import("../pages/firm/FirmComplianceCalendarPage"), "FirmComplianceCalendarPage"],
  ["Notifications", "/firm/notifications", "/firm/notifications", () => import("../pages/accountant/AccountantNotificationsPage"), "AccountantNotificationsPage"],
  ["Preferences", "/firm/notifications/preferences", "/firm/notifications/preferences", () => import("../pages/shared/NotificationPreferencesPage"), "NotificationPreferencesPage"],
  ["Settings", "/firm/settings", "/firm/settings", () => import("../pages/firm/FirmSettingsPage"), "FirmSettingsPage"],
  ["Profile", "/firm/profile", "/firm/profile", () => import("../pages/shared/ProfilePage"), "ProfilePage"],
  ["Help", "/firm/help", "/firm/help", () => import("../pages/shared/HelpSupportPage"), "HelpSupportPage"],
  ["Client profile", "/firm/clients/:clientId/profile", "/firm/clients/live-client/profile", () => import("../pages/firm/FirmClient360Page"), "FirmClient360Page"],
] as const;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGetJson).mockRejectedValue(new Error("Test API temporarily unavailable"));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "Test API temporarily unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it.each(pages)("%s renders without crashing when its live API is unavailable", async (_name, path, url, loader, exportName) => {
  const module = await loader();
  const Page = (module as unknown as Record<string, React.ComponentType>)[exportName];
  await act(async () => { render(<MemoryRouter initialEntries={[url]}><PortalProvider><Routes><Route path={path} element={<Page />} /></Routes></PortalProvider></MemoryRouter>); });
  expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
});
it("filing requests the real register rather than silently showing an empty demo workspace", async () => {
  const { AccountantFilingPage } = await import("../pages/accountant/AccountantFilingPage");
  await act(async () => { render(<MemoryRouter><PortalProvider><AccountantFilingPage /></PortalProvider></MemoryRouter>); });
  expect(apiGetJson).toHaveBeenCalledWith("/api/documents/filing-register");
  expect(screen.getByText("Test API temporarily unavailable")).toBeInTheDocument();
});
it("calendar loads real deadlines and reports an API failure", async () => {
  const { FirmComplianceCalendarPage } = await import("../pages/firm/FirmComplianceCalendarPage");
  await act(async () => { render(<MemoryRouter><PortalProvider><FirmComplianceCalendarPage /></PortalProvider></MemoryRouter>); });
  expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/automation/obligations");
  expect(screen.getByText("Test API temporarily unavailable")).toBeInTheDocument();
});

it("filing displays only actual filed records from the API", async () => {
  const { LiveFilingRegister } = await import("../components/documents/LiveFilingRegister");
  vi.mocked(apiGetJson).mockResolvedValue([
    { id: "filed-1", clientId: "live-client", name: "Filed invoice.pdf", category: "sales_invoices", currentVersionNumber: 2, isFiled: true, filedAtUtc: "2026-11-11T08:00:00Z" },
    { id: "draft-1", clientId: "live-client", name: "Unfiled draft.pdf", isFiled: false },
  ]);
  await act(async () => { render(<MemoryRouter><LiveFilingRegister /></MemoryRouter>); });
  expect(await screen.findByText("Filed invoice.pdf")).toBeInTheDocument();
  expect(screen.queryByText("Unfiled draft.pdf")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Client documents" })).toHaveAttribute("href", "/firm/documents?client=live-client");
});
it("calendar shows obligation deadlines and document expiries from live records", async () => {
  const { FirmComplianceCalendarPage } = await import("../pages/firm/FirmComplianceCalendarPage");
  vi.mocked(apiGetJson).mockImplementation(async path => {
    if (path === "/api/compliance/automation/obligations") return [{ id: "obligation", clientName: "Live business", name: "VAT filing", dueDateUtc: new Date().toISOString(), workflowStatus: "preparation" }];
    if (path === "/api/compliance/items") return [{ id: "certificate", clientId: "live-client", name: "Insurance renewal", expiryDateUtc: new Date().toISOString() }];
    return [];
  });
  await act(async () => { render(<MemoryRouter><PortalProvider><FirmComplianceCalendarPage /></PortalProvider></MemoryRouter>); });
  expect((await screen.findAllByText("VAT filing")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Insurance renewal").length).toBeGreaterThan(0);
  expect(screen.queryByText("No deadlines in this window.")).not.toBeInTheDocument();
});
it("dashboard keeps available data visible when one pack checklist fails", async () => {
  const { AccountantDashboardPage } = await import("../pages/accountant/AccountantDashboardPage");
  const { portalService } = await import("../services/portalData");
  const { portalServiceApi } = await import("../services/portalApi");
  vi.spyOn(portalServiceApi, "getAdminClients").mockResolvedValue([{ ...portalService.getAdminClients()[0], id: "live-client", clientName: "Live business", assignedAccountantUserId: user.id }]);
  vi.mocked(apiGetJson).mockImplementation(async path => {
    if (path === "/api/monthly-packs") return [{ id: "pack-good", clientId: "live-client", year: 2026, month: 11, status: "in_progress" }, { id: "pack-bad", clientId: "live-client", year: 2026, month: 10, status: "in_progress" }];
    if (path === "/api/document-slots/pack-bad") throw new Error("One checklist failed");
    return [];
  });
  await act(async () => { render(<MemoryRouter><PortalProvider><AccountantDashboardPage /></PortalProvider></MemoryRouter>); });
  expect(await screen.findByText(/Checklist data for 1 monthly pack/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Welcome, Test" })).toBeInTheDocument();
  expect(screen.queryByText("Dashboard unavailable")).not.toBeInTheDocument();
});
