import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountantSettingsPage } from "../pages/accountant/AccountantSettingsPage";
import { portalServiceApi } from "../services/portalApi";
import { apiGetJson, apiPutJson } from "./fixtures/apiTransportFixture";
const auth = vi.hoisted(() => ({ user: { id: "accountant-1", role: "accountant", fullName: "Alex Accountant", email: "alex@test.invalid", title: "Accountant", company: "Registered firm", permissions: ["documents.read", "documents.review"] }, changePassword: vi.fn() }));
vi.mock("../app/auth", () => ({ useAuth: () => auth }));
vi.mock("../app/portal", () => ({ usePortal: () => ({}) }));
vi.mock("../services/portalApi", () => ({ portalServiceApi: { getFilingRules: vi.fn(), updateFilingRule: vi.fn() } }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPutJson: vi.fn() }));
const preferences = { emailReminders: true, escalationAlerts: true, deadlineAlerts: true, quietHours: "22:00-06:00", rejectionAlerts: false, weeklySummary: false, browserAlerts: false, complianceAlerts: true };
beforeEach(() => {
  vi.clearAllMocks();
  auth.user.permissions = ["documents.read", "documents.review"];
  auth.changePassword.mockResolvedValue({ ok: true, message: "Password updated." });
  vi.mocked(portalServiceApi.getFilingRules).mockResolvedValue([{ id: "rule-1", category: "sales_invoices", description: "File accepted invoices.", createdAtUtc: "2026-11-01T00:00:00Z", updatedAtUtc: "2026-11-01T00:00:00Z", isEnabled: false }]);
  vi.mocked(portalServiceApi.updateFilingRule).mockResolvedValue({ ok: true });
  vi.mocked(apiGetJson).mockResolvedValue(preferences);
  vi.mocked(apiPutJson).mockResolvedValue(preferences);
});
const show = () => render(<MemoryRouter><AccountantSettingsPage /></MemoryRouter>);
it("shows real account details without fake workflow controls and supports keyboard tabs", () => {
  show();
  expect(screen.getByText("alex@test.invalid")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument();
  expect(screen.queryByText("Workflow defaults")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save compliance settings" })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("tab", { name: "My account" }), { key: "ArrowRight" });
  expect(screen.getByRole("tabpanel", { name: "Security" })).toBeInTheDocument();
});
it("validates password confirmation and uses the real auth action", async () => {
  show(); fireEvent.click(screen.getByRole("tab", { name: "Security" }));
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter your current password");
  fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
  fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: "new-password-12345" } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different" } });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(auth.changePassword).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password-12345" } });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  await screen.findByText("Password updated.");
  expect(auth.changePassword).toHaveBeenCalledWith("current-password", "new-password-12345");
  expect(screen.getByLabelText("Current password")).toHaveValue("");
});
it("saves filing changes through the protected category API", async () => {
  show(); fireEvent.click(screen.getByRole("tab", { name: "Auto-filing" }));
  fireEvent.click(await screen.findByRole("checkbox", { name: "Auto-file sales invoices" }));
  fireEvent.click(screen.getByRole("button", { name: "Save filing rules" }));
  expect(await screen.findByText("Auto-filing rules saved.")).toBeInTheDocument();
  expect(portalServiceApi.updateFilingRule).toHaveBeenCalledWith("sales_invoices", true);
});
it("keeps filing rules read-only when review permission is absent", async () => {
  auth.user.permissions = ["documents.read"];
  show(); fireEvent.click(screen.getByRole("tab", { name: "Auto-filing" }));
  expect(await screen.findByRole("checkbox", { name: "Auto-file sales invoices" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save filing rules" })).toBeDisabled();
  expect(portalServiceApi.updateFilingRule).not.toHaveBeenCalled();
});
it("uses saved notification preferences instead of local success-only switches", async () => {
  show(); fireEvent.click(screen.getByRole("tab", { name: "Notifications" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save preferences" })).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox", { name: /Email notifications/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
  await waitFor(() => expect(apiPutJson).toHaveBeenCalledWith("/api/notifications/preferences", expect.objectContaining({ emailReminders: false })));
});
