import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientsPage } from "../pages/admin/AdminClientsPage";
import { apiDelete, apiGetJson, apiPutJson, hasApiBaseUrl } from "../services/apiClient";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate }));
vi.mock("../services/apiClient", async (original) => ({
  ...await original<typeof import("../services/apiClient")>(),
  apiGetJson: vi.fn(), apiPutJson: vi.fn(), apiDelete: vi.fn(), hasApiBaseUrl: vi.fn(),
}));
const clients = [
  { id: "acme", name: "Acme Holdings", entityType: "Pty Ltd", email: "jane@acme.test", status: "active", complianceHealth: 92 },
  { id: "beta", name: "Beta Trading", entityType: "Pty Ltd", email: "info@beta.test", status: "inactive", complianceHealth: 45 },
];
const renderPage = () => render(<MemoryRouter><AdminClientsPage /></MemoryRouter>);

beforeEach(() => {
  navigate.mockReset();
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockImplementation(async (path) => path === "/api/clients" ? clients : [{ id: "assignment", clientId: "acme", accountantUserId: "accountant", accountantName: "Alex Smith", isPrimary: true }]);
  vi.mocked(apiPutJson).mockReset().mockResolvedValue(undefined);
  vi.mocked(apiDelete).mockReset().mockResolvedValue(undefined);
});

describe("admin client register", () => {
  it("keeps a compact directory, links profiles and hides unnecessary pagination", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Acme Holdings" }));
    expect(navigate).toHaveBeenCalledWith("/firm/clients/acme/profile");
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Client pages" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });

  it("combines search, status and ownership filters and resets them", async () => {
    renderPage();
    await screen.findByRole("button", { name: "Acme Holdings" });
    fireEvent.change(screen.getByLabelText("Search clients"), { target: { value: "Alex" } });
    expect(screen.queryByRole("button", { name: "Beta Trading" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "inactive" } });
    expect(screen.getByText("No matching clients")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    fireEvent.change(screen.getByLabelText("Ownership"), { target: { value: "unassigned" } });
    expect(screen.getByRole("button", { name: "Beta Trading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acme Holdings" })).not.toBeInTheDocument();
  });

  it("opens a keyboard-accessible menu and keeps monthly pack navigation", async () => {
    renderPage();
    const trigger = await screen.findByRole("button", { name: "Actions for Acme Holdings" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "Actions for Acme Holdings" });
    expect(within(menu).getByRole("menuitem", { name: "View profile" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(within(menu).getByRole("menuitem", { name: "Open monthly pack" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Open monthly pack" }));
    expect(navigate).toHaveBeenCalledWith("/firm/clients/acme/packs");
  });

  it("preserves confirmation before status updates and permanent deletion", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("not DELETE");
    renderPage();
    const trigger = await screen.findByRole("button", { name: "Actions for Acme Holdings" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Deactivate client" }));
    expect(apiPutJson).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Deactivate client" }));
    await waitFor(() => expect(apiPutJson).toHaveBeenCalledWith("/api/clients/acme/status", { status: "inactive" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Actions for Acme Holdings" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Actions for Acme Holdings" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete client" }));
    expect(prompt).toHaveBeenCalled();
    expect(apiDelete).not.toHaveBeenCalled();
    confirm.mockRestore();
    prompt.mockRestore();
  });
});
