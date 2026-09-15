import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountantComplianceCentrePage } from "../pages/accountant/AccountantComplianceCentrePage";
import { useAuth } from "../app/auth";
import { apiGetJson, apiPostJson, apiPutJson } from "../services/apiClient";

vi.mock("../app/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/apiClient", async original => ({
  ...await original<typeof import("../services/apiClient")>(),
  apiGetJson: vi.fn(),
  apiPostJson: vi.fn(),
  apiPutJson: vi.fn(),
  apiPostForm: vi.fn(),
}));

const obligation = {
  id: "obligation-1",
  clientId: "client-1",
  clientName: "Acme",
  code: "VAT201",
  name: "VAT201 return",
  authority: "SARS",
  periodStartUtc: "2026-08-01T00:00:00Z",
  periodEndUtc: "2026-09-30T00:00:00Z",
  dueDateUtc: null,
  workflowStatus: "ready_to_file",
  readiness: "ready_to_file",
  preparationStatus: "complete",
  reviewStatus: "approved",
  submissionStatus: "not_submitted",
  submittedAtUtc: null,
  submissionReference: null,
  amountPayable: null,
  amountRefundable: null,
  paymentRequired: false,
  paymentStatus: "not_required",
  paidAtUtc: null,
  paymentReference: null,
  evidenceRequired: 3,
  evidenceFound: 3,
  missingEvidenceCategories: [],
  responsibleAccountantId: "accountant-1",
  ruleVersion: "starter-2026.1",
  createdReason: "Created automatically because VAT registration is confirmed.",
  createdAtUtc: "2026-09-14T00:00:00Z",
  updatedAtUtc: "2026-09-14T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: "admin", role: "admin", fullName: "System Admin" } } as ReturnType<typeof useAuth>);
  vi.mocked(apiGetJson).mockReset().mockImplementation(async path => {
    if (path === "/api/compliance/automation/obligations") return [obligation];
    if (path === "/api/compliance/automation/rules") return { version: "starter-2026.1", rules: [], updatedAtUtc: "2026-09-14T00:00:00Z" };
    if (path === "/api/clients") return [{ id: "client-1", name: "Acme" }];
    if (path === "/api/compliance/automation/obligations/obligation-1/evidence") return [];
    if (path === "/api/compliance/automation/profiles/client-1") return {
      clientId: "client-1",
      vatRegistered: true,
      vatCycleMonths: 2,
      vatAnchorMonth: 1,
      payeRegistered: false,
      uifRegistered: false,
      coidaRegistered: false,
      provisionalTaxpayer: false,
      companyTaxRegistered: true,
      cipcRegistered: true,
      governmentSupplier: true,
      csdRegistered: true,
      csdSupplierNumber: "MAAA0000000",
      financialYearEndMonth: 2,
      updatedAtUtc: "2026-09-14T00:00:00Z",
    };
    throw new Error(`Unexpected endpoint: ${path}`);
  });
  vi.mocked(apiPostJson).mockReset().mockImplementation(async path => {
    if (path.startsWith("/api/compliance/automation/run")) return {
      runAtUtc: "2026-09-14T00:00:00Z",
      clientsEvaluated: 1,
      obligationsCreated: 0,
      obligationsRefreshed: 1,
      missingEvidenceRequestsCreated: 0,
      notificationsCreated: 0,
      warnings: [],
    };
    if (path.endsWith("/submission")) return { ...obligation, submissionStatus: "submitted", workflowStatus: "complete", submissionReference: "SARS-123", submittedAtUtc: "2026-09-14T12:00:00Z" };
    return obligation;
  });
  vi.mocked(apiPutJson).mockReset();
});

const renderPage = () => render(<MemoryRouter><AccountantComplianceCentrePage /></MemoryRouter>);

describe("Phase 4 compliance centre", () => {
  it.each(["admin", "accountant"])("shows the obligation workflow for %s", async role => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "staff", role, fullName: "Staff User" } } as ReturnType<typeof useAuth>);
    renderPage();
    const row = within(await screen.findByRole("row", { name: /VAT201/ }));
    expect(row.getByText("Acme")).toBeInTheDocument();
    expect(row.getByText("Ready To File")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run automation" })).toBeInTheDocument();
  });

  it("runs the compliance automation endpoint", async () => {
    renderPage();
    await screen.findByText("VAT201");
    fireEvent.click(screen.getByRole("button", { name: "Run automation" }));
    expect(await screen.findByText("Compliance automation completed")).toBeInTheDocument();
    expect(apiPostJson).toHaveBeenCalledWith("/api/compliance/automation/run", {});
  });

  it("opens an obligation and exposes manual filing only after review approval", async () => {
    renderPage();
    await screen.findByText("VAT201");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Record external submission")).toBeInTheDocument();
    expect(screen.getByText(/does not submit externally/i)).toBeInTheDocument();
  });

  it("records a manual external submission", async () => {
    renderPage();
    await screen.findByText("VAT201");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.change(screen.getByLabelText("Submission reference"), { target: { value: "SARS-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Record submission" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Submission recorded");
    const drawer = within(screen.getByRole("complementary", { name: "VAT201 compliance obligation" }));
    expect(drawer.getByText("Submission recorded")).toBeInTheDocument();
    expect(drawer.getByText(/SARS-123/)).toBeInTheDocument();
    expect(drawer.queryByRole("button", { name: "Record submission" })).not.toBeInTheDocument();
    expect(apiPostJson).toHaveBeenCalledWith(
      "/api/compliance/automation/obligations/obligation-1/submission",
      expect.objectContaining({ submissionReference: "SARS-123" }),
    );
  });

  it("opens saved evidence from the obligation row and closes the workspace", async () => {
    renderPage();
    const row = within(await screen.findByRole("row", { name: /VAT201/ }));
    fireEvent.click(row.getByRole("button", { name: "Open" }));
    const drawer = within(screen.getByRole("complementary", { name: "VAT201 compliance obligation" }));
    fireEvent.click(drawer.getByRole("button", { name: "View saved evidence" }));
    expect(await drawer.findByText("No evidence has been uploaded for this obligation.")).toBeInTheDocument();
    expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/automation/obligations/obligation-1/evidence");
    fireEvent.click(drawer.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("complementary", { name: "VAT201 compliance obligation" })).not.toBeInTheDocument();
  });
});
