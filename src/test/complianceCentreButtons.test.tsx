import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountantComplianceCentrePage } from "../pages/accountant/AccountantComplianceCentrePage";
import { useAuth } from "../app/auth";
import { apiGetJson, apiPostJson, hasApiBaseUrl } from "../services/apiClient";
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async original => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate }));
vi.mock("../app/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn(), apiPostJson: vi.fn(), hasApiBaseUrl: vi.fn() }));
const item = { id: "item-1", clientId: "client-1", categoryId: "category-1", categoryName: "Tax", name: "Tax certificate", status: "missing", alertLevel: "medium", dueDateUtc: "2026-10-01T00:00:00Z", expiryDateUtc: null, ownerName: "Alex Accountant" };
const renderPage = () => {
  const result = render(<MemoryRouter><AccountantComplianceCentrePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Document records" }));
  return result;
};
beforeEach(() => {
  navigate.mockReset();
  vi.mocked(useAuth).mockReturnValue({ user: { id: "admin", role: "admin", fullName: "System Admin" } } as ReturnType<typeof useAuth>);
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockImplementation(async path => {
    if (path === "/api/compliance/items") return [item];
    if (path === "/api/clients") return [{ id: "client-1", name: "Acme" }];
    if (path === "/api/compliance/categories") return [{ id: "category-1", name: "Tax", isActive: true }];
    throw new Error("Unexpected endpoint");
  });
  vi.mocked(apiPostJson).mockReset().mockResolvedValue({ ...item, id: "new-item" });
});
describe("compliance centre", () => {
  it.each(["admin", "accountant"])("uses recorded compliance data and its actual owner for %s", async role => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "staff", role, fullName: "Staff User" } } as ReturnType<typeof useAuth>);
    renderPage();
    await screen.findByText("Tax certificate");
    expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/items");
    expect(apiGetJson).not.toHaveBeenCalledWith("/api/monthly-packs");
    expect(screen.getByText("Owner: Alex Accountant")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Missing evidence")).toBeInTheDocument();
    expect(screen.getByText("Expires: Not set")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Compliance totals" })).getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Board" })).not.toBeInTheDocument();
  });
  it("creates a real compliance item rather than silently creating a request", async () => {
    renderPage();
    await screen.findByText("Tax certificate");
    fireEvent.click(screen.getByRole("button", { name: "Add compliance item" }));
    fireEvent.change(screen.getByLabelText("Client", { selector: "select" }), { target: { value: "client-1" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "category-1" } });
    fireEvent.change(screen.getByLabelText("Requirement name"), { target: { value: "Tax certificate" } });
    fireEvent.click(screen.getByRole("button", { name: "Create record" }));
    await screen.findByText("Compliance item created");
    expect(apiPostJson).toHaveBeenCalledWith("/api/compliance/items", expect.objectContaining({ clientId: "client-1", categoryId: "category-1", name: "Tax certificate", status: "missing", ownerUserId: null }));
  });
  it("requires selecting an item before sending a request with its chosen due date", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Open Tax certificate for Acme" }));
    expect(screen.getByRole("region", { name: "Actions for Tax certificate" })).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Request due date"), { target: { value: "2026-10-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Request documents" }));
    await screen.findByText("Request created");
    expect(apiPostJson).toHaveBeenCalledWith("/api/compliance/items/item-1/request", expect.objectContaining({ requestType: "missing_document", dueDateUtc: "2026-10-05T00:00:00.000Z" }));
  });
  it("keeps a future due date from turning missing evidence into a valid record", async () => {
    renderPage();
    await screen.findByText("Tax certificate");
    fireEvent.click(screen.getByRole("button", { name: /Valid records/ }));
    expect(screen.getByText("No matching records")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Tax certificate")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "does not exist" } });
    expect(screen.getByText("No matching records")).toBeInTheDocument();
  });
  it("shows unavailable data honestly and retries", async () => {
    // The default monitoring view first loads its own business list.
    vi.mocked(apiGetJson).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    await screen.findByText("Compliance records unavailable");
    expect(screen.getByRole("button", { name: /Tracked items/ })).toHaveTextContent("—");
    expect(screen.getByRole("button", { name: "Add compliance item" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Tax certificate");
  });
  it("shows zero records without claiming the client is compliant", async () => {
    vi.mocked(apiGetJson).mockResolvedValue([]);
    renderPage();
    await screen.findByText("No compliance records yet");
    expect(screen.getByRole("button", { name: /Tracked items/ })).toHaveTextContent("0");
    expect(screen.getByText(/An empty register does not mean/)).toBeInTheDocument();
  });
  it("opens the selected client workspace and keeps failed request inputs", async () => {
    vi.mocked(apiPostJson).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Open Tax certificate for Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Open client workspace" }));
    expect(navigate).toHaveBeenCalledWith("/firm/clients/client-1");
    fireEvent.change(screen.getByLabelText("Request due date"), { target: { value: "2026-10-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Request documents" }));
    await screen.findByText("Request failed");
    expect(screen.getByLabelText("Request due date")).toHaveValue("2026-10-05");
  });
});
