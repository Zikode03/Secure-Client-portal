import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { PortalProvider } from "../app/portal";
import { apiGetJson } from "../services/apiClient";
import { AccountantDashboardPage } from "../pages/accountant/AccountantDashboardPage";
import { AccountantPortfolioPage } from "../pages/accountant/AccountantPortfolioPage";
import { AccountantDocumentsPage } from "../pages/accountant/AccountantDocumentsPage";
import { AccountantReviewPage, mapBackendQueueRecord } from "../pages/accountant/AccountantReviewPage";
import { AccountantComplianceCentrePage } from "../pages/accountant/AccountantComplianceCentrePage";
import { FirmSettingsPage } from "../pages/firm/FirmSettingsPage";
const session = vi.hoisted(() => ({ role: "accountant" as "admin" | "accountant" }));
vi.mock("../app/auth", () => ({ useAuth: () => ({ user: { id: "staff-1", name: "Test", fullName: "Test Staff", email: "staff@test.local", role: session.role, clientIds: [], assignedClientIds: [], initials: "TS" }, ready: true }), useOptionalAuth: () => ({ user: { id: "staff-1", role: session.role, clientIds: [], assignedClientIds: [] }, ready: true }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(async () => []) }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiGetJson).mockResolvedValue([]); });
const pages = [
  ["dashboard", AccountantDashboardPage, "/api/monthly-packs"],
  ["client list", AccountantPortfolioPage, "/api/monthly-packs"],
  ["documents", AccountantDocumentsPage, "/api/documents"],
  ["work queue", AccountantReviewPage, "/api/review-queue"],
  ["compliance", AccountantComplianceCentrePage, "/api/clients"],
  ["settings", FirmSettingsPage, "/api/documents/filing-rules"],
] as const;
for (const role of ["accountant", "admin"] as const) {
  it.each(pages)(`${role} %s loads authenticated API responses without sample business records`, async (_name, Page, endpoint) => {
    session.role = role;
    await act(async () => { render(<MemoryRouter><PortalProvider><Page /></PortalProvider></MemoryRouter>); });
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    expect(apiGetJson).toHaveBeenCalledWith(endpoint);
    expect(screen.queryByText("Apex Trading Ltd")).not.toBeInTheDocument();
    expect(screen.queryByText("Blue Peak Logistics")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /demo/i })).not.toBeInTheDocument();
  });
}
it("maps real queue metadata without depending on sample workspace documents", () => {
  const record = mapBackendQueueRecord({ documentId: "doc-1", clientId: "client-1", clientName: "Test business", monthlyPackId: "pack-1", year: 2026, month: 11, documentSlotId: null, slotLabel: null, documentName: "invoice.pdf", documentCategory: "sales_invoices", documentStatus: "under_review", slotStatus: "submitted", reviewPriority: "normal", reviewAgeDays: 0, currentVersionNumber: 1, uploadedAtUtc: "2026-11-11T08:00:00Z", submittedAtUtc: null, rejectionReason: null });
  expect(record.fileName).toBe("invoice.pdf"); expect(record.uploadedAt).toBe("2026-11-11T08:00:00.000Z");
  expect(record.fileDataUrl).toBeUndefined();
});
