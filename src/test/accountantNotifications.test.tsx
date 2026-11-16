import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import App from "../app/App";
import { PortalProvider } from "../app/portal";
import { ThemeProvider } from "../app/theme";
import { navigationByRole } from "../utils/navigation";
const user = vi.hoisted(() => ({ id: "accountant-1", name: "Test", fullName: "Test Staff", email: "staff@test.invalid", role: "accountant", title: "Accountant", company: "Test firm", initials: "TS", clientIds: [], assignedClientIds: [] }));
vi.mock("../app/auth", async original => ({ ...await original<typeof import("../app/auth")>(), useAuth: () => ({ ready: true, user, authNotice: null }), useOptionalAuth: () => ({ ready: true, user }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(async () => []) }));
it("opens the accountant notification drawer and routes to the API-backed notification page", async () => {
  render(<MemoryRouter initialEntries={["/firm/dashboard"]}><ThemeProvider><PortalProvider><App /></PortalProvider></ThemeProvider></MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "Welcome, Test" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Notifications" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open accountant alerts" }));
  expect(await screen.findByRole("dialog", { name: "Accountant notifications" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View more" }));
  expect(await screen.findByRole("heading", { name: "My alert inbox" })).toBeInTheDocument();
});
it("keeps admin-only navigation hidden from accountants", () => {
  expect(navigationByRole.accountant.some(item => item.to.includes("/admin/"))).toBe(false);
});
