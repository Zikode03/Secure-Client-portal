import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminRolesPage } from "../pages/admin/AdminRolesPage";
import { apiGetJson } from "../services/apiClient";

vi.mock("../services/apiClient", async (original) => ({
  ...await original<typeof import("../services/apiClient")>(),
  hasApiBaseUrl: () => true,
  apiGetJson: vi.fn(),
}));

describe("role selection buttons", () => {
  it("shows compact role buttons and opens the corresponding editor", async () => {
    vi.mocked(apiGetJson).mockResolvedValue(["Accountant", "Admin", "Client"].map((name) => ({
      name: name.toLowerCase(), displayName: name, scope: name.toLowerCase(), permissionsJson: "[]", isSystemRole: true, isActive: true,
    })));
    render(<AdminRolesPage />);
    await screen.findByRole("button", { name: "Accountant" });
    const group = screen.getByRole("group", { name: "Select a role" });
    expect(within(group).getAllByRole("button")).toHaveLength(3);
    expect(group).toHaveClass("sm:grid-cols-3");
    for (const name of ["Accountant", "Admin", "Client"]) {
      const button = within(group).getByRole("button", { name });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute("aria-controls", "role-editor");
      expect(screen.getByRole("heading", { name: `Edit ${name}` })).toBeInTheDocument();
      expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(1);
    }
  });
});
