import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { ClientComplianceCentrePage } from "../pages/client/ClientComplianceCentrePage";
import type { SessionUser } from "../types/portal";
import { apiGetJson } from "../services/apiClient";

vi.mock("../services/apiClient", async original => ({
  ...await original<typeof import("../services/apiClient")>(),
  apiGetJson: vi.fn(),
  apiPostJson: vi.fn(),
  apiPutJson: vi.fn(),
  apiPostForm: vi.fn(),
}));

const STORAGE_KEY = "accounting-document-control-session";
const clientUser: SessionUser = {
  id: "user-client-1",
  name: "Sarah",
  fullName: "Sarah Jacobs",
  email: "client@example.com",
  role: "client",
  title: "Finance Manager",
  company: "Apex Trading Ltd",
  initials: "SJ",
  clientIds: ["client-apex"],
  assignedClientIds: [],
};

const obligation = {
  id: "obligation-1",
  clientId: "client-apex",
  clientName: "Apex Trading Ltd",
  code: "VAT201",
  name: "VAT201 return",
  authority: "SARS",
  periodStartUtc: "2026-08-01T00:00:00Z",
  periodEndUtc: "2026-09-30T00:00:00Z",
  dueDateUtc: null,
  workflowStatus: "waiting_for_client",
  readiness: "waiting_for_client",
  preparationStatus: "not_started",
  reviewStatus: "not_started",
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
  evidenceFound: 2,
  missingEvidenceCategories: ["sales_invoices"],
  responsibleAccountantId: "accountant-1",
  ruleVersion: "starter-2026.1",
  createdReason: "Created automatically because the client compliance profile confirms VatRegistered.",
  createdAtUtc: "2026-09-14T00:00:00Z",
  updatedAtUtc: "2026-09-14T00:00:00Z",
};

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clientUser));
  vi.mocked(apiGetJson).mockReset().mockImplementation(async path => {
    if (path === "/api/compliance/automation/obligations") return [obligation];
    if (path === "/api/compliance/automation/rules") return { version: "starter-2026.1", rules: [], updatedAtUtc: "2026-09-14T00:00:00Z" };
    throw new Error(`Unexpected endpoint: ${path}`);
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PortalProvider>
        <AuthProvider><ClientComplianceCentrePage /></AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("ClientComplianceCentrePage", () => {
  it("renders the Phase 4 obligation register", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Compliance Centre" })).toBeInTheDocument();
    const row = within(await screen.findByRole("row", { name: /VAT201/ }));
    expect(row.getByText("SARS")).toBeInTheDocument();
    expect(row.getByText("Waiting For Client")).toBeInTheDocument();
    expect(row.getByText("2/3")).toBeInTheDocument();
  });

  it("does not expose accountant automation actions to clients", async () => {
    renderPage();
    await screen.findByText("VAT201");
    expect(screen.queryByRole("button", { name: "Run automation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compliance profile" })).not.toBeInTheDocument();
  });

  it("shows the obligation workflow details", async () => {
    renderPage();
    await screen.findByText("VAT201");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const drawer = within(screen.getByRole("complementary", { name: "VAT201 compliance obligation" }));
    expect(drawer.getByRole("heading", { name: /VAT201/ })).toBeInTheDocument();
    expect(drawer.getByText(/Missing: sales_invoices/)).toBeInTheDocument();
    expect(drawer.getByText(/Created automatically/)).toBeInTheDocument();
  });
});
