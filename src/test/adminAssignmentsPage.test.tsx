import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAssignmentsPage } from "../pages/admin/AdminAssignmentsPage";
import { apiGetJson, apiPostJson, hasApiBaseUrl } from "../services/apiClient";

vi.mock("../app/portal", () => ({ usePortal: () => ({ adminClients: [], managedAccountants: [] }) }));
vi.mock("../services/apiClient", async (original) => ({
  ...await original<typeof import("../services/apiClient")>(),
  apiGetJson: vi.fn(), apiPostJson: vi.fn(), apiDelete: vi.fn(), hasApiBaseUrl: vi.fn(),
}));

const clientRows = [
  { id: "acme", name: "Acme Holdings", entityType: "Pty Ltd", status: "active", assignedAccountantId: "alex", complianceHealth: 92 },
  { id: "beta", name: "Beta Trading", entityType: "Retail", status: "active", assignedAccountantId: "", complianceHealth: 65 },
];
const assignmentRows = [{ id: "assignment-1", clientId: "acme", accountantUserId: "alex", accountantName: "Alex Smith", isPrimary: true }];
const userRows = [
  { id: "alex", fullName: "Alex Smith", email: "alex@firm.test", role: "accountant" },
  { id: "sam", fullName: "Sam Jones", email: "sam@firm.test", role: "accountant" },
];

beforeEach(() => {
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockImplementation(async (path) => path === "/api/clients" ? clientRows : path === "/api/assignments" ? assignmentRows : userRows);
  vi.mocked(apiPostJson).mockReset().mockResolvedValue(undefined);
});

async function openEditor() {
  render(<MemoryRouter><AdminAssignmentsPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Edit assignment for Acme Holdings" }));
}

describe("assignment workspace", () => {
  it("filters coverage without changing any assignments", async () => {
    render(<MemoryRouter><AdminAssignmentsPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Acme Holdings" });
    fireEvent.click(screen.getByRole("button", { name: /Unassigned/ }));
    expect(screen.queryByRole("button", { name: "Acme Holdings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beta Trading" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search clients or accountants"), { target: { value: "missing" } });
    expect(screen.getByText("No clients match this view.")).toBeInTheDocument();
    expect(apiPostJson).not.toHaveBeenCalled();
  });

  it("keeps primary changes as drafts until the handover is complete and saved", async () => {
    await openEditor();
    fireEvent.change(screen.getByLabelText("Primary accountant"), { target: { value: "sam" } });
    expect(apiPostJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    expect(apiPostJson).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Assignment reason"), { target: { value: "Rebalance workload" } });
    fireEvent.change(screen.getByLabelText("Message to accountant"), { target: { value: "Please review the current monthly pack." } });
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    await waitFor(() => expect(apiPostJson).toHaveBeenCalledWith("/api/assignments/reassign", {
      clientId: "acme", fromAccountantUserId: "alex", toAccountantUserId: "sam", makePrimary: true,
    }));
  });

  it("uses live accountants for backup and excludes the current primary", async () => {
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Backup support" }));
    const select = screen.getByLabelText("Backup accountant");
    expect(within(select).getByRole("option", { name: "Sam Jones" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Alex Smith" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Assignment reason")).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: "sam" } });
    expect(apiPostJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    await waitFor(() => expect(apiPostJson).toHaveBeenCalledWith("/api/assignments", { accountantUserId: "sam", clientId: "acme", isPrimary: false }));
  });

  it("cancels unsaved changes without a request", async () => {
    await openEditor();
    fireEvent.change(screen.getByLabelText("Primary accountant"), { target: { value: "sam" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Select a client" })).toBeInTheDocument();
    expect(apiPostJson).not.toHaveBeenCalled();
  });
});
