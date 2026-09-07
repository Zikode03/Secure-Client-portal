import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const { clearAuthNoticeMock, loginMock } = vi.hoisted(() => ({
  clearAuthNoticeMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock("../app/auth", () => ({
  defaultPathForRole: () => "/client/dashboard",
  useAuth: () => ({
    clearAuthNotice: clearAuthNoticeMock,
    login: loginMock,
  }),
}));

import { LoginPage } from "../pages/shared/LoginPage";

function renderLoginPage() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function completeCredentials() {
  fireEvent.change(screen.getByLabelText("Work email"), {
    target: { value: "client@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
}

describe("LoginPage", () => {
  afterEach(() => {
    clearAuthNoticeMock.mockReset();
    loginMock.mockReset();
  });

  it("requires POPIA acknowledgement before attempting authentication", () => {
    renderLoginPage();
    completeCredentials();

    const submitButton = screen.getByRole("button", { name: /sign in securely/i });
    fireEvent.submit(submitButton.closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please acknowledge the POPIA privacy notice before signing in.",
    );
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("authenticates after the user acknowledges the POPIA notice", async () => {
    loginMock.mockResolvedValue({ ok: false, message: "Test response" });
    renderLoginPage();
    completeCredentials();

    fireEvent.click(screen.getByLabelText(/I have read and understand the POPIA privacy notice/i));
    fireEvent.submit(screen.getByRole("button", { name: /sign in securely/i }).closest("form")!);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "client@example.com",
        password: "password123",
        rememberMe: true,
      });
    });
  });
});
