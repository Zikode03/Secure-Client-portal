import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { apiGetJson, hasApiBaseUrl } from "./fixtures/apiTransportFixture";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async original => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate }));
vi.mock("../services/apiClient", async original => ({
  ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn(), hasApiBaseUrl: vi.fn(),
}));
const emptyTeam = { checkedAtUtc: "2026-11-16T10:00:00Z", unassignedClients: 0, accountants: [] };
const renderPage = () => render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
beforeEach(() => {
  navigate.mockReset();
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockImplementation(async path => path === "/api/admin/team-progress" ? emptyTeam : []);
});

describe("admin dashboard", () => {
  it("shows four aligned metrics and genuine empty states", async () => {
    renderPage();
    await screen.findByText("You're up to date");
    const metrics = screen.getByRole("region", { name: "Administration metrics" });
    expect(metrics).toHaveClass("lg:grid-cols-4");
    expect(within(metrics).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText("No accountants have been added yet.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Client risk watch" })).not.toBeInTheDocument();
    expect(within(metrics).getByRole("button", { name: /Staff accounts/ })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Firm administration" })).getByRole("button", { name: /Team progress/ }));
    expect(navigate).toHaveBeenCalledWith("/firm/admin/team-progress");
  });

  it("puts administration actions and account setup ahead of accounting work", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/admin/users" ? [
      { id: "new-staff", fullName: "New Staff", role: "accountant", securityStatus: "invited" },
      { id: "admin", fullName: "Administrator", role: "admin", securityStatus: "active" },
    ] : path === "/api/admin/team-progress" ? emptyTeam : []);
    renderPage();
    const metrics = screen.getByRole("region", { name: "Administration metrics" });
    await screen.findByRole("button", { name: "Review invitation" });
    expect(within(metrics).getByRole("button", { name: /Staff accounts/ })).toHaveTextContent("2");
    expect(within(metrics).getByRole("button", { name: /Pending invitations/ })).toHaveTextContent("1");
    const controls = screen.getByRole("navigation", { name: "Firm administration" });
    expect(within(controls).getAllByRole("button")).toHaveLength(6);
    fireEvent.click(within(controls).getByRole("button", { name: /Roles & permissions/ }));
    expect(navigate).toHaveBeenCalledWith("/firm/admin/roles");
    fireEvent.click(screen.getByRole("button", { name: "Add client" }));
    expect(navigate).toHaveBeenCalledWith("/firm/clients?add=1");
    fireEvent.click(within(controls).getByRole("button", { name: /Users & access/ }));
    expect(navigate).toHaveBeenCalledWith("/firm/admin/users");
  });

  it("flags backup-only clients as still needing a primary accountant", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => {
      if (path === "/api/clients") return [{ id: "business", name: "Business", status: "active", complianceHealth: 100, assignedAccountantId: "00000000-0000-0000-0000-000000000000" }];
      if (path === "/api/assignments") return [{ clientId: "business", accountantUserId: "backup", isPrimary: false }];
      return path === "/api/admin/team-progress" ? emptyTeam : [];
    });
    renderPage();
    await screen.findByRole("button", { name: "Assign owner" });
    expect(within(screen.getByRole("region", { name: "Administration metrics" })).getByRole("button", { name: /Unassigned clients/ })).toHaveTextContent("1");
  });

  it("includes client-risk exceptions in the actionable priority list", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/clients"
      ? [{ id: "acme", name: "Acme Holdings", entityType: "Pty Ltd", status: "active", complianceHealth: 45, assignedAccountantId: "owner" }]
      : path === "/api/admin/team-progress" ? emptyTeam : []);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "View client" }));
    expect(navigate).toHaveBeenCalledWith("/firm/clients/acme/profile");
    expect(screen.queryByText("You're up to date")).not.toBeInTheDocument();
    expect(screen.getByText("45% compliance health · active")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Holdings")).toHaveLength(1);
  });

  it("loads system details only when opened and keeps them out of the initial overview", async () => {
    renderPage();
    await screen.findByText("You're up to date");
    expect(apiGetJson).not.toHaveBeenCalledWith("/api/admin/operations");
    const toggle = screen.getByRole("button", { name: /System status/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await screen.findByText(/Operations data is unavailable/);
    expect(apiGetJson).toHaveBeenCalledWith("/api/admin/operations");
    fireEvent.click(toggle);
    expect(screen.queryByRole("region", { name: "Firm operations" })).not.toBeInTheDocument();
  });

  it("does not display an all-clear or zero review count when a feed fails", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => {
      if (path === "/api/admin/team-progress") throw new Error("Unavailable");
      return path === "/api/admin/team-progress" ? emptyTeam : [];
    });
    renderPage();
    await screen.findByText("Partial admin data");
    expect(screen.queryByText("You're up to date")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByText("Data unavailable. Please try again later.").length).toBeGreaterThan(0);
  });

  it("renders team counts and audit events from live responses", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => {
      if (path === "/api/admin/users") return [{ id: "owner", fullName: "Alex Smith", email: "alex@example.test", role: "accountant" }];
      if (path === "/api/assignments") return [{ id: "assignment", clientId: "acme", accountantUserId: "owner", isPrimary: true }];
      if (path === "/api/admin/team-progress") return { ...emptyTeam, accountants: [{ accountantId: "owner", primaryClients: 1, awaitingReview: 1, inReview: 0 }] };
      if (path.startsWith("/api/audit-logs")) return [{ id: "audit", actorUserId: "owner", actorRole: "accountant", action: "document.reviewed", entityType: "Document", entityId: "doc", createdAtUtc: "2026-09-13T08:00:00Z" }];
      return path === "/api/admin/team-progress" ? emptyTeam : [];
    });
    renderPage();
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("rowheader", { name: "Alex Smith" })).toBeInTheDocument();
    expect(within(table).getAllByRole("cell", { name: "1" })).toHaveLength(2);
    expect(screen.getByText("Document Reviewed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View log" }));
    expect(navigate).toHaveBeenCalledWith("/firm/admin/audit");
  });
});
