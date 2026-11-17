import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOperationsPanel } from "../pages/admin/AdminOperationsPanel";
import { AdminRolesPage } from "../pages/admin/AdminRolesPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { apiGetJson, apiPostJson, apiPutJson } from "./fixtures/apiTransportFixture";
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPostJson: vi.fn(), apiPutJson: vi.fn() }));
beforeEach(() => { vi.mocked(apiGetJson).mockReset(); vi.mocked(apiPostJson).mockReset(); vi.mocked(apiPutJson).mockReset(); });

describe("admin operational flows", () => {
  it("reports unknown backups honestly and removes stale status when refresh fails", async () => {
    vi.mocked(apiGetJson).mockResolvedValueOnce({ checkedAtUtc: "2026-11-16T10:00:00Z", deploymentMode: "single_firm", missingDocuments: 4, overdueDocuments: 2, overdueRequests: 1, packsUnderReview: 3, packsClosed: 5, emailPending: 6, emailFailed: 2, accessEmailEnabled: false, notificationEmailEnabled: false, storageAvailable: false, storageBytes: null, storageQuotaBytes: 100_000_000_000, automationEnabled: true, automationLastRun: { status: "failed", atUtc: "2026-11-16T09:00:00Z" }, lastBackup: null, lastRestore: null });
    render(<MemoryRouter><AdminOperationsPanel /></MemoryRouter>);
    await screen.findByText("Outstanding required documents");
    expect(screen.getAllByText("No result recorded")).toHaveLength(2);
    expect(screen.getByText(/Failed ·/)).toBeInTheDocument();
    expect(screen.getByText(/One firm per installation/)).toBeInTheDocument();
    vi.mocked(apiGetJson).mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
    await screen.findByText(/Operations data is unavailable/);
    expect(screen.queryByText("Outstanding required documents")).not.toBeInTheDocument();
  });
  it("edits actual backend permission arrays without losing unlisted permissions", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/roles/access" ? { canCreate: true, canUpdate: true, canActivate: true, canDeactivate: true } : [{ name: "admin", displayName: "Administrator", scope: "admin", permissions: ["access.admin", "roles.update", "auth.login", "documents.review"], isSystemRole: true, isActive: true }]);
    vi.mocked(apiPutJson).mockResolvedValue({});
    render(<AdminRolesPage />);
    await screen.findByRole("heading", { name: "Administrator" });
    fireEvent.click(screen.getByText("Advanced: edit role permissions"));
    const editor = within(document.getElementById("role-editor")!);
    const review = editor.getByRole("checkbox", { name: "Approve documents and close months" });
    expect(review).toBeChecked();
    fireEvent.click(review);
    fireEvent.click(editor.getByRole("button", { name: "Save role" }));
    await waitFor(() => expect(apiPutJson).toHaveBeenCalledWith("/api/roles/admin", { displayName: "Administrator", scope: "admin", permissions: ["access.admin", "roles.update", "auth.login"] }));
  });
  it("resends an invitation using the invitation endpoint and keeps delivery feedback", async () => {
    vi.mocked(apiGetJson).mockResolvedValue([{ id: "invited", fullName: "New staff", email: "new@example.invalid", role: "accountant", securityStatus: "invited" }]);
    vi.mocked(apiPostJson).mockResolvedValue({ delivery: "smtp" });
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Security actions for New staff" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Resend invitation" }));
    await waitFor(() => expect(apiPostJson).toHaveBeenCalledWith("/api/admin/users/invited/resend-invitation", {}));
    await screen.findByText("Invitation resent");
    expect(screen.queryByRole("button", { name: "Reset access" })).not.toBeInTheDocument();
  });
});
