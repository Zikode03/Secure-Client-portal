import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { apiGetJson, hasApiBaseUrl } from "../services/apiClient";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async original => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate }));
vi.mock("../services/apiClient", async original => ({
  ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn(), hasApiBaseUrl: vi.fn(),
}));
const renderPage = () => render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
beforeEach(() => {
  navigate.mockReset();
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockResolvedValue([]);
});

describe("admin dashboard", () => {
  it("shows four aligned metrics and genuine empty states", async () => {
    renderPage();
    await screen.findByText("You're up to date");
    const metrics = screen.getByRole("region", { name: "Administration metrics" });
    expect(metrics).toHaveClass("lg:grid-cols-4");
    expect(within(metrics).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText("No accountants have been added yet.")).toBeInTheDocument();
    expect(screen.getByText("No clients currently meet the risk criteria.")).toBeInTheDocument();
    fireEvent.click(within(metrics).getByRole("button", { name: /Needs attention/ }));
    expect(screen.getByRole("region", { name: "Needs attention" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Manage assignments" }));
    expect(navigate).toHaveBeenCalledWith("/firm/admin/assignments");
  });

  it("includes client-risk exceptions in the actionable priority list", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/clients"
      ? [{ id: "acme", name: "Acme Holdings", entityType: "Pty Ltd", status: "active", complianceHealth: 45, assignedAccountantId: "owner" }]
      : []);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "View client" }));
    expect(navigate).toHaveBeenCalledWith("/firm/clients/acme/profile");
    expect(screen.queryByText("You're up to date")).not.toBeInTheDocument();
    expect(screen.getByText("45% health")).toBeInTheDocument();
  });

  it("does not display an all-clear or zero review count when a feed fails", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => {
      if (path === "/api/review-queue") throw new Error("Unavailable");
      return [];
    });
    renderPage();
    await screen.findByText("Partial admin data");
    expect(screen.queryByText("You're up to date")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open reviews/ })).toHaveTextContent("—");
    expect(screen.getAllByText("Data unavailable. Please try again later.").length).toBeGreaterThan(0);
  });

  it("renders team counts and audit events from live responses", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => {
      if (path === "/api/admin/users") return [{ id: "owner", fullName: "Alex Smith", email: "alex@example.test", role: "accountant" }];
      if (path === "/api/assignments") return [{ id: "assignment", clientId: "acme", accountantUserId: "owner", isPrimary: true }];
      if (path === "/api/review-queue") return [{ id: "review", assignedToUserId: "owner", status: "pending" }];
      if (path.startsWith("/api/audit-logs")) return [{ id: "audit", actorUserId: "owner", actorRole: "accountant", action: "document.reviewed", entityType: "Document", entityId: "doc", createdAtUtc: "2026-09-13T08:00:00Z" }];
      return [];
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
