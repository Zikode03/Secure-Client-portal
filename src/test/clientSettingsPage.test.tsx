import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientSettingsPage } from "../pages/client/ClientSettingsPage";
import { useAuth } from "../app/auth";
import { usePortal } from "../app/portal";
import { apiGetJson, hasApiBaseUrl } from "../services/apiClient";

vi.mock("../app/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../app/portal", () => ({ usePortal: vi.fn() }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn(), hasApiBaseUrl: vi.fn() }));
const changePassword = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  changePassword.mockResolvedValue({ ok: true, message: "Password saved." });
  vi.mocked(useAuth).mockReturnValue({ user: { fullName: "Jane Client", email: "jane@example.test", clientIds: ["business-1"] }, changePassword } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(usePortal).mockReturnValue({
    clientProfile: { clientId: "business-1", legalName: "", primaryContact: "", financeEmail: "", registrationNumber: "", vatNumber: "", phone: "" },
    clientSettings: { notificationPreferences: { deadlineAlerts: true }, security: { activeSessions: [], passwordLastChangedAt: "" } },
    clientComplianceCentre: { retentionNote: "Records are retained under your firm's policy." },
  } as unknown as ReturnType<typeof usePortal>);
  vi.mocked(apiGetJson).mockResolvedValue({ id: "business-1", name: "Acme Business", primaryContact: "Jane Client", email: "jane@example.test",
    entityType: "Pty Ltd", industry: "Construction", registrationNumber: "2026/12345", vatNumber: "VAT123", phone: "0111234567", primaryContactJobTitle: "Director" });
});
const show = () => render(<MemoryRouter><ClientSettingsPage /></MemoryRouter>);

describe("client settings redesign", () => {
  it("preserves saved business values and does not confuse industry with legal entity type", async () => {
    show();
    expect(await screen.findByDisplayValue("Acme Business")).toBeInTheDocument();
    expect(screen.getByLabelText("Registration number")).toHaveValue("2026/12345");
    expect(screen.getByLabelText("VAT number")).toHaveValue("VAT123");
    expect(screen.getByLabelText("Phone number")).toHaveValue("0111234567");
    expect(screen.getByLabelText("Industry")).toHaveValue("Construction");
    expect(screen.getByLabelText("Job title")).toHaveValue("Director");
    expect(screen.getByLabelText("Company name")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("offers four tabs with keyboard navigation and a labelled panel", async () => {
    show(); await screen.findByDisplayValue("Acme Business");
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    const business = screen.getByRole("tab", { name: "Business profile" });
    fireEvent.keyDown(business, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Security" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Security" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Security" }), { key: "End" });
    expect(screen.getByRole("tabpanel", { name: "Document preferences" })).toBeInTheDocument();
  });

  it("changes passwords, supports visibility and clears secrets after success", async () => {
    show(); await screen.findByDisplayValue("Acme Business");
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "a longer new password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "a longer new password" } });
    fireEvent.click(screen.getByRole("button", { name: "Show passwords" }));
    expect(screen.getByLabelText("New password")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await screen.findByText("Password saved.");
    expect(changePassword).toHaveBeenCalledWith("current-password", "a longer new password");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("keeps password retry available after a network error", async () => {
    changePassword.mockRejectedValue(new Error("Network unavailable"));
    show(); await screen.findByDisplayValue("Acme Business");
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    for (const label of ["Current password", "New password", "Confirm new password"])
      fireEvent.change(screen.getByLabelText(label), { target: { value: "a longer new password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await screen.findByText("Network unavailable");
    await waitFor(() => expect(screen.getByRole("button", { name: "Update password" })).toBeEnabled());
  });

  it("does not invent editable notification preferences in live mode", async () => {
    show(); await screen.findByDisplayValue("Acme Business");
    fireEvent.click(screen.getByRole("tab", { name: "Notifications" }));
    expect(screen.getByRole("button", { name: /Open notification inbox/ })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save preferences" })).not.toBeInTheDocument();
  });
});

