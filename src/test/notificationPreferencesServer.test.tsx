import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NotificationPreferencesPage } from "../pages/shared/NotificationPreferencesPage";
import { apiGetJson, apiPutJson } from "../services/apiClient";
vi.mock("../app/auth", () => ({ useAuth: () => ({ user: { id: "staff", role: "accountant" } }) }));
vi.mock("../app/portal", () => ({ usePortal: () => ({ clientSettings: { notificationPreferences: {} } }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPutJson: vi.fn() }));
const preferences = { deadlineAlerts: true, rejectionAlerts: true, complianceAlerts: true, weeklySummary: false, browserAlerts: false, emailReminders: true, escalationAlerts: true, quietHours: "22:00-06:00" };
beforeEach(() => { vi.clearAllMocks(); window.localStorage.clear(); vi.mocked(apiGetJson).mockResolvedValue(preferences); });
it("loads and saves staff preferences through the account API", async () => {
  vi.mocked(apiPutJson).mockResolvedValue({ ...preferences, deadlineAlerts: false });
  render(<NotificationPreferencesPage />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Save preferences" })).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox", { name: /Deadline reminders/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
  await screen.findByText("Notification preferences saved to your account.");
  expect(apiPutJson).toHaveBeenCalledWith("/api/notifications/preferences", { ...preferences, deadlineAlerts: false });
  expect(Object.keys(window.localStorage)).toEqual([]);
});
it("does not claim success when persistence fails", async () => {
  vi.mocked(apiPutJson).mockRejectedValue(new Error("Offline"));
  render(<NotificationPreferencesPage />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Save preferences" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
  await screen.findByText(/Preferences were not saved/);
  expect(screen.queryByText("Notification preferences saved to your account.")).not.toBeInTheDocument();
});

it("allows email opt-out without disabling in-app deadline alerts", async () => {
  vi.mocked(apiPutJson).mockResolvedValue({...preferences, emailReminders:false});
  render(<NotificationPreferencesPage />);
  await waitFor(() => expect(screen.getByRole("button", {name:"Save preferences"})).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox", {name:/Email notifications/}));
  fireEvent.click(screen.getByRole("button", {name:"Save preferences"}));
  await waitFor(() => expect(apiPutJson).toHaveBeenCalledWith("/api/notifications/preferences", {...preferences, emailReminders:false}));
});
