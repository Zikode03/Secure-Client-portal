import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MfaChallengePage } from "../components/auth/MfaChallengePage";
import { useAuth } from "../app/auth";
vi.mock("../app/auth", () => ({ useAuth: vi.fn(), defaultPathForRole: () => "/admin/dashboard" }));
const verify = vi.fn(), finish = vi.fn(), cancel = vi.fn();
function setup(setupKey: string | null = null) {
  vi.mocked(useAuth).mockReturnValue({
    ready: true, user: null, authNotice: null, clearAuthNotice: vi.fn(),
    login: vi.fn(), completeInvite: vi.fn(), requestPasswordReset: vi.fn(), changePassword: vi.fn(), logout: vi.fn(),
    pendingMfa: {mfaRequired: true, challengeToken: "challenge", setupKey},
    verifyMfa: verify, finishMfa: finish, cancelMfa: cancel,
  });
  return render(<MemoryRouter><MfaChallengePage /></MemoryRouter>);
}
beforeEach(() => { verify.mockReset(); finish.mockReset(); cancel.mockReset(); });
describe("MFA verification", () => {
  it("shows setup instructions and never finishes authentication without a valid code", async () => {
    verify.mockResolvedValue({ok: false, message: "Incorrect code"});
    setup("JBSWY3DPEHPK3PXP");
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Authenticator code"), {target: {value: "123456"}});
    fireEvent.click(screen.getByRole("button", {name: "Verify and continue"}));
    await screen.findByRole("alert");
    expect(verify).toHaveBeenCalledWith("123456", false);
    expect(finish).not.toHaveBeenCalled();
  });
  it("requires saved recovery-code acknowledgement before entering the workspace", async () => {
    verify.mockResolvedValue({ok: true, recoveryCodes: ["A".repeat(32), "B".repeat(32)]});
    finish.mockResolvedValue({ok: true, user: {role: "admin"}});
    setup("SETUPKEY");
    fireEvent.change(screen.getByLabelText("Authenticator code"), {target: {value: "123456"}});
    fireEvent.click(screen.getByRole("button", {name: "Verify and continue"}));
    const continueButton = await screen.findByRole("button", {name: "Continue to workspace"});
    expect(continueButton).toBeDisabled();
    expect(finish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(continueButton);
    await waitFor(() => expect(finish).toHaveBeenCalledOnce());
  });
  it("uses a recovery code without treating it as a completed login", async () => {
    verify.mockResolvedValue({ok: true, mfaRequired: true});
    setup();
    fireEvent.click(screen.getByRole("button", {name: /Lost your authenticator/}));
    fireEvent.change(screen.getByLabelText("Recovery code"), {target: {value: "C".repeat(32)}});
    fireEvent.click(screen.getByRole("button", {name: "Verify and continue"}));
    await waitFor(() => expect(verify).toHaveBeenCalledWith("C".repeat(32), true));
    expect(finish).not.toHaveBeenCalled();
  });
});
