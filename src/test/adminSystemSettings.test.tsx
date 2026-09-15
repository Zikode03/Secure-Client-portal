import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
import { apiGetJson, apiPutJson } from "../services/apiClient";

vi.mock("../services/apiClient", async importOriginal => ({ ...await importOriginal<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPutJson: vi.fn() }));
const request = { id: "request-1", name: "Missing statement", requestType: "missing_document", titleTemplate: "Please upload {{documentName}}", descriptionTemplate: "Send all pages.", priority: "medium", defaultDueInDays: 3 };
const reminder = { id: "reminder-1", name: "Three-day reminder", triggerType: "deadline_approaching", daysBeforeDue: 3, audienceRole: "client", messageTemplate: "Please complete your outstanding items.", isEnabled: true };
const deadline = { id: "deadline-1", name: "Monthly deadline", scope: "monthly_pack", dueDayOfMonth: 5, graceDays: 2, priority: "high", isEnabled: true };
const escalation = { id: "escalation-1", name: "Client overdue", triggerType: "overdue_client_action", daysAfterDue: 2, escalateToRole: "accountant", action: "create_request", isEnabled: true };
const profile = { firmName: "Example Advisory", email: "hello@example.com", timezone: "Africa/Johannesburg", currency: "ZAR", customSetting: "preserved" };
beforeEach(() => {
  vi.mocked(apiPutJson).mockReset();
  vi.mocked(apiPutJson).mockResolvedValue({});
  vi.mocked(apiGetJson).mockReset();
  vi.mocked(apiGetJson).mockImplementation(async path => {
    if (path.endsWith("firm.profile")) return { key: "firm.profile", valueJson: JSON.stringify(profile) };
    if (path.endsWith("templates/requests")) return [request];
    if (path.endsWith("rules/reminders")) return [reminder];
    if (path.endsWith("rules/deadlines")) return [deadline];
    if (path.endsWith("rules/escalations")) return [escalation];
    return { verifiedAtUtc: null };
  });
});
async function openSettings(section?: string) {
  render(<MemoryRouter><AdminSettingsPage /></MemoryRouter>);
  await screen.findByLabelText("Firm name");
  if (section) switchSection(section);
}
function switchSection(name: string) { fireEvent.click(within(screen.getByRole("navigation", { name: "Settings sections" })).getByRole("button", { name: new RegExp(`^${name}`) })); }

describe("system settings", () => {
  it("saves only the active section and preserves other drafts and feedback", async () => {
    await openSettings("Request templates");
    fireEvent.change(screen.getByLabelText(/^Template name/), { target: { value: "Updated statement request" } });
    expect(screen.getByText("Please upload September bank statement")).toBeInTheDocument();
    switchSection("Reminder rules");
    fireEvent.change(screen.getByLabelText(/^Days before the deadline/), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    await screen.findByText("Changes saved");
    expect(apiPutJson).toHaveBeenCalledWith("/api/admin/firm-management/rules/reminders", [expect.objectContaining({ daysBeforeDue: 7, triggerType: "deadline_approaching" })]);
    switchSection("Request templates");
    expect(screen.getByLabelText(/^Template name/)).toHaveValue("Updated statement request");
    expect(screen.getByRole("button", { name: "Save templates" })).toBeEnabled();
    expect(apiGetJson).toHaveBeenCalledTimes(6);
  });
  it("keeps failed saves editable and allows discarding a removal", async () => {
    await openSettings("Request templates");
    vi.mocked(apiPutJson).mockRejectedValueOnce(new Error("Unavailable"));
    fireEvent.change(screen.getByLabelText(/^Template name/), { target: { value: "Unsaved name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save templates" }));
    await screen.findByText("Changes could not be saved");
    expect(screen.getByLabelText(/^Template name/)).toHaveValue("Unsaved name");
    fireEvent.click(screen.getByRole("button", { name: "Remove template" }));
    expect(screen.queryByLabelText(/^Template name/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByLabelText(/^Template name/)).toHaveValue("Missing statement");
  });
  it("validates an invalid deadline even when a different rule is selected", async () => {
    await openSettings("Deadline rules");
    fireEvent.change(screen.getByLabelText(/^Due day of the month/), { target: { value: "32" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rule" }));
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    await screen.findByText("Check the selected item");
    expect(screen.getByLabelText(/^Due day of the month/)).toHaveValue(32);
    expect(apiPutJson).not.toHaveBeenCalled();
  });
  it("stores supported choices and supports pausing an escalation", async () => {
    await openSettings("Escalation rules");
    expect(screen.getByLabelText("What is overdue?")).toHaveValue("overdue_client_action");
    fireEvent.change(screen.getByLabelText("Escalate to"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("switch", { name: "Rule enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    await waitFor(() => expect(apiPutJson).toHaveBeenCalledWith("/api/admin/firm-management/rules/escalations", [expect.objectContaining({ escalateToRole: "admin", isEnabled: false, action: "create_request" })]));
  });
  it("preserves firm drafts across sections and existing profile metadata on save", async () => {
    await openSettings();
    fireEvent.change(screen.getByLabelText("Firm name"), { target: { value: "Updated Advisory" } });
    switchSection("Request templates"); switchSection("Firm profile");
    expect(screen.getByLabelText("Firm name")).toHaveValue("Updated Advisory");
    fireEvent.click(screen.getByRole("button", { name: "Save firm profile" }));
    await screen.findByText("Firm profile saved");
    const [, payload] = vi.mocked(apiPutJson).mock.calls[0];
    expect(JSON.parse((payload as { valueJson: string }).valueJson)).toEqual(expect.objectContaining({ firmName: "Updated Advisory", customSetting: "preserved" }));
  });
  it("does not allow overwriting settings when loading fails", async () => {
    vi.mocked(apiGetJson).mockRejectedValue(new Error("Offline"));
    render(<MemoryRouter><AdminSettingsPage /></MemoryRouter>);
    await screen.findByText("Firm profile could not be loaded");
    expect(screen.queryByRole("button", { name: "Save firm profile" })).not.toBeInTheDocument();
    switchSection("Request templates");
    await screen.findByText("Settings could not be loaded");
    expect(screen.getByRole("button", { name: "Add template" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save templates" })).not.toBeInTheDocument();
  });
});
