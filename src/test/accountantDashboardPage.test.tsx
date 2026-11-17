import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountantDashboardPage } from "../pages/accountant/AccountantDashboardPage";
import { portalServiceApi } from "../services/portalApi";
import { apiGetJson } from "./fixtures/apiTransportFixture";
const user = vi.hoisted(() => ({ id: "accountant-1", role: "accountant", name: "Alex", assignedClientIds: ["client-1"] }));
vi.mock("../app/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn() }));
vi.mock("../services/portalApi", () => ({ portalServiceApi: { getAdminClients: vi.fn() } }));
const client = { id: "client-1", clientName: "Registered business", industry: "Services", assignedAccountant: "Alex", assignedAccountantUserId: "accountant-1", requiredPack: "", completionRate: 99, deadlinePolicy: "", status: "on_track" as const };
const pack = { id: "pack-1", clientId: "client-1", year: 2026, month: 11, status: "in_progress" };
const review = { documentId: "doc-1", clientId: "client-1", clientName: client.clientName, documentName: "statement.pdf", documentCategory: "bank_statement", documentStatus: "under_review", slotStatus: "submitted", year: 2026, month: 11, reviewPriority: "normal", uploadedAtUtc: "2026-11-10T10:00:00Z" };
const slots = [
  { id: "approved", monthlyPackId: pack.id, clientId: client.id, isRequired: true, status: "accepted", label: "Approved invoice" },
  { id: "review", monthlyPackId: pack.id, clientId: client.id, isRequired: true, status: "under_review", label: "Statement" },
  { id: "missing", monthlyPackId: pack.id, clientId: client.id, isRequired: true, status: "not_started", label: "Receipt" },
  { id: "na", monthlyPackId: pack.id, clientId: client.id, isRequired: true, status: "not_applicable", label: "Not applicable" },
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(portalServiceApi.getAdminClients).mockResolvedValue([client]);
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/monthly-packs" ? [pack] : path === "/api/review-queue" ? [review] : path === "/api/document-slots/pack-1" ? slots : []);
});
it("counts approved requirements accurately and never invents deadlines or trend data", async () => {
  render(<MemoryRouter><AccountantDashboardPage /></MemoryRouter>);
  expect(await screen.findByText("1 / 3")).toBeInTheDocument();
  expect(screen.getByText("No outstanding requirements have a recorded deadline.")).toBeInTheDocument();
  expect(screen.queryByText("Compliance health trend")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open accountant alerts" })).not.toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("max", "3");
  const row = screen.getByRole("row", { name: /Registered business/ });
  expect(within(row).getByText("1 waiting on client")).toBeInTheDocument();
  expect(within(row).getByText("1 to review")).toBeInTheDocument();
  expect(apiGetJson).not.toHaveBeenCalledWith("/api/notifications");
});
it("marks failed checklist progress unavailable and retries without hiding the review queue", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => { if (path === "/api/document-slots/pack-1") throw new Error("Offline"); return path === "/api/monthly-packs" ? [pack] : path === "/api/review-queue" ? [review] : []; });
  render(<MemoryRouter><AccountantDashboardPage /></MemoryRouter>);
  expect(await screen.findByText(/Checklist data for 1 monthly pack/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review statement.pdf" })).toBeEnabled();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(portalServiceApi.getAdminClients).toHaveBeenCalledTimes(2));
});
it("retains all open periods and excludes closed historical checklists from open work", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/monthly-packs" ? [pack, { ...pack, id: "older", month: 10 }, { ...pack, id: "closed", month: 9, status: "closed" }] : path === "/api/review-queue" ? [] : []);
  render(<MemoryRouter><AccountantDashboardPage /></MemoryRouter>);
  await screen.findByText("No documents awaiting a decision.");
  expect(apiGetJson).toHaveBeenCalledWith("/api/document-slots/older");
  expect(screen.queryByText("2 open months")).not.toBeInTheDocument();
  expect(apiGetJson).not.toHaveBeenCalledWith("/api/document-slots/closed");
  expect(screen.getByRole("button", { name: "Review next" })).toBeDisabled();
});
it("shows an explicit error rather than fabricated zero totals when the backend fails", async () => {
  vi.mocked(portalServiceApi.getAdminClients).mockRejectedValue(new Error("Service unavailable"));
  render(<MemoryRouter><AccountantDashboardPage /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard unavailable");
  expect(screen.queryByText("Assigned clients")).not.toBeInTheDocument();
});
