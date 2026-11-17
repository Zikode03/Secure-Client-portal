import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminRolesPage } from "../pages/admin/AdminRolesPage";
import { apiGetJson } from "./fixtures/apiTransportFixture";

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
    expect(screen.queryByText("Advanced: edit role permissions")).not.toBeInTheDocument();
    expect(screen.queryByText("Create a custom role")).not.toBeInTheDocument();
    for (const name of ["Accountant", "Admin", "Client"]) {
      const button = within(group).getByRole("button", { name });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute("aria-controls", "role-editor");
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(1);
    }
  });
  it("shows advanced controls only when the backend grants owner capabilities", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/roles/access"
      ? { canCreate: true, canUpdate: true, canActivate: false, canDeactivate: false }
      : [{ name: "admin", displayName: "Administrator", scope: "admin", permissions: ["roles.update"], isSystemRole: true, isActive: true }]);
    render(<AdminRolesPage />);
    expect(await screen.findByText("Advanced: edit role permissions")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Advanced: edit role permissions"));
    expect(screen.getByRole("button", { name: "Save role" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
    expect(screen.getByText("Create a custom role")).toBeInTheDocument();
  });

});
