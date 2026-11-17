// Isolated state/UI unit test; application data is not used.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { ClientComplianceCentrePage } from "../pages/client/ClientComplianceCentrePage";
import type { SessionUser } from "../types/portal";
import { apiGetJson, apiPostForm } from "./fixtures/apiTransportFixture";

vi.mock("../services/apiClient", async original => ({
  ...await original<typeof import("../services/apiClient")>(),
  hasApiBaseUrl: () => false,
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
    if (path === "/api/compliance/history") return [
      { id: "event-1", action: "compliance.review_approved", actor: "Daniel Mokoena", timestamp: "2026-09-14T12:00:00Z", detail: "VAT documents approved" },
      { id: "event-2", action: "compliance.evidence_uploaded", actor: "Sarah Jacobs", timestamp: "2026-09-13T12:00:00Z", detail: "Bank statement uploaded" },
    ];
    if (path === "/api/compliance/automation/rules") return { version: "starter-2026.1", rules: [], updatedAtUtc: "2026-09-14T00:00:00Z" };
    if (path === "/api/compliance/automation/obligations/obligation-1/evidence") return [];
    throw new Error(`Unexpected endpoint: ${path}`);
  });
  vi.mocked(apiPostForm).mockReset();
});

afterEach(() => vi.restoreAllMocks());

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
  it("renders the client compliance overview and required actions", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Compliance Centre" })).toBeInTheDocument();
    await screen.findByRole("heading", { name: "VAT201 return" });
    expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/history");
    expect(apiGetJson).not.toHaveBeenCalledWith("/api/client/compliance-centre");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Compliance sections" })).getByRole("button", { name: "Action required" }));
    expect(screen.getByRole("heading", { name: /^Checklist/ })).toBeInTheDocument();
    expect(screen.getByText("VAT201 return")).toBeInTheDocument();
    expect(within(screen.getByRole("article")).getByText(/SARS/)).toBeInTheDocument();
    expect(screen.getByText("Provide sales invoices")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload documents" })).toBeInTheDocument();
  });

  it("does not expose accountant automation actions to clients", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    expect(screen.queryByRole("button", { name: "Run automation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compliance profile" })).not.toBeInTheDocument();
  });

  it("shows the obligation workflow details", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.click(screen.getByRole("button", { name: "View details for VAT201 return" }));
    expect(screen.getByText("Documents received")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 received")).toBeInTheDocument();
    await screen.findByText("No documents uploaded yet.");
    fireEvent.click(screen.getByRole("button", { name: "Close details for VAT201 return" }));
    expect(screen.queryByText("Documents received")).not.toBeInTheDocument();
  });

  it("combines search with authority filtering and clears an empty result", async () => {
    vi.mocked(apiGetJson).mockResolvedValueOnce([obligation, { ...obligation, id: "cipc-1", code: "CIPC", name: "Annual return", authority: "CIPC", workflowStatus: "complete" }]);
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by authority" }), { target: { value: "CIPC" } });
    expect(screen.getByRole("heading", { name: "Annual return" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "VAT201 return" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search compliance items" }), { target: { value: "VAT" } });
    expect(screen.getByText("No matching items")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("filters upcoming deadlines and excludes completed and past obligations", async () => {
    const due = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
    vi.mocked(apiGetJson).mockResolvedValueOnce([
      { ...obligation, dueDateUtc: due(15) },
      { ...obligation, id: "later", name: "Annual return", dueDateUtc: due(120) },
      { ...obligation, id: "past", name: "Past return", dueDateUtc: due(-15) },
      { ...obligation, id: "done", name: "Completed return", workflowStatus: "complete", dueDateUtc: due(5) },
    ]);
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.click(screen.getByRole("button", { name: "Upcoming" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Upcoming period" }), { target: { value: "365" } });
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("filters the history timeline by activity and search", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("VAT documents approved")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review Approved" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter activity" }), { target: { value: "compliance.evidence_uploaded" } });
    expect(screen.queryByText("VAT documents approved")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search compliance history" }), { target: { value: "Sarah" } });
    expect(screen.getByText("Bank statement uploaded")).toBeInTheDocument();
  });

  it("keeps obligations available when history fails and provides a retry for obligation failures", async () => {
    vi.mocked(apiGetJson).mockImplementation(async path => {
      if (path === "/api/compliance/automation/obligations") return [obligation];
      throw new Error("Unavailable");
    });
    vi.mocked(apiGetJson).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    expect(await screen.findByText("Compliance information is unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("No obligations yet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText(/Compliance history is unavailable/)).toBeInTheDocument();
  });

  it("directs payment questions to the accountant rather than a document upload", async () => {
    vi.mocked(apiGetJson).mockResolvedValueOnce([{ ...obligation, workflowStatus: "payment_outstanding" }]);
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    expect(screen.getByRole("link", { name: "Contact accountant" })).toHaveAttribute("href", "/client/inbox");
    expect(screen.queryByRole("link", { name: "Upload documents" })).not.toBeInTheDocument();
  });

  it("attaches evidence to the selected obligation and refreshes backend status and history", async () => {
    const originalGet = vi.mocked(apiGetJson).getMockImplementation()!;
    let saved = false;
    const updated = { ...obligation, evidenceFound: 3, missingEvidenceCategories: [], workflowStatus: "ready_to_prepare" };
    const evidence = { id: "version-1", complianceItemId: "linked-item-1", clientId: "client-apex", versionNumber: 1, fileName: "vat.pdf", uploadedAtUtc: "2026-09-16T12:00:00Z", downloadUrl: "/api/compliance/evidence/version-1/download" };
    vi.mocked(apiGetJson).mockImplementation(async (path, init) => {
      if (saved && path === "/api/compliance/automation/obligations") return [updated];
      if (saved && path === "/api/compliance/history") return [{ id: "upload-1", action: "compliance.evidence_uploaded", actor: "Sarah Jacobs", timestamp: evidence.uploadedAtUtc, detail: "VAT evidence saved" }];
      return originalGet(path, init);
    });
    vi.mocked(apiPostForm).mockImplementation(async () => { saved = true; return { obligation: updated, evidence }; });
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.click(screen.getByRole("button", { name: /^Upload documents$/ }));
    await screen.findByText("No documents uploaded yet.");
    const file = new File(["vat"], "vat.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("VAT201 supporting document"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "VAT receipt" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
    await screen.findByText("Evidence uploaded for VAT201.");
    await screen.findByText("3 of 3 received");
    expect(screen.getByRole("button", { name: "Download vat.pdf" })).toBeInTheDocument();
    const [path, form] = vi.mocked(apiPostForm).mock.calls[0];
    expect(path).toBe("/api/compliance/automation/obligations/obligation-1/evidence");
    expect(form.get("File")).toBe(file);
    expect(form.get("Note")).toBe("VAT receipt");
    fireEvent.click(screen.getByRole("button", { name: /^History$/ }));
    expect(await screen.findByText("VAT evidence saved")).toBeInTheDocument();
  });

  it("preserves selected evidence and readiness when a backend upload fails", async () => {
    vi.mocked(apiPostForm).mockRejectedValue(new Error("File scan failed"));
    renderPage();
    await screen.findByRole("heading", { name: "VAT201 return" });
    fireEvent.click(screen.getByRole("button", { name: /^Upload documents$/ }));
    await screen.findByText("No documents uploaded yet.");
    const input = screen.getByLabelText("VAT201 supporting document");
    fireEvent.change(input, { target: { files: [new File(["vat"], "vat.pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
    expect(await screen.findByText("File scan failed")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 received")).toBeInTheDocument();
    expect(screen.queryByText("Evidence uploaded for VAT201.")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Upload document" })).toBeEnabled());
  });
});

it("loads authority checks only when the client asks to view them", async () => {
  const originalGet = vi.mocked(apiGetJson).getMockImplementation()!;
  vi.mocked(apiGetJson).mockImplementation(async (path, init) => path === "/api/compliance/monitoring/client-apex" ? {
    clientId: "client-apex", clientName: "Business", checks: [{code: "cipc_registration", source: "CIPC", name: "Company registration", description: "Registration check", applicability: "applies", verificationStatus: "not_checked", latestVerification: null}],
  } : originalGet(path, init));
  renderPage();
  await screen.findByRole("heading", { name: "VAT201 return" });
  expect(vi.mocked(apiGetJson).mock.calls.some(([path]) => path.startsWith("/api/compliance/monitoring/"))).toBe(false);
  const button = screen.getByRole("button", {name: /Business verification checks/});
  expect(button).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(button);
  expect(await screen.findByText("Company registration")).toBeInTheDocument();
  expect(screen.getByText("Not checked yet", {selector: ".cv-status"})).toBeInTheDocument();
  expect(button).toHaveAttribute("aria-expanded", "true");
});

it("keeps accountant and completed filters working after consolidating the summary controls", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/compliance/automation/obligations" ? [obligation,
    {...obligation, id: "preparing", name: "Payroll return", code: "EMP201", workflowStatus: "in_preparation"},
    {...obligation, id: "done", name: "Annual return", code: "CIPC", workflowStatus: "complete"},
  ] : []);
  renderPage();
  await screen.findByRole("heading", {name: "VAT201 return"});
  fireEvent.click(screen.getByRole("button", {name: "With accountant"}));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("heading", {name: "Payroll return"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "Completed"}));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("heading", {name: "Annual return"})).toBeInTheDocument();
});

it("distinguishes repeated requirements by month and uploads to the selected month's obligation", async () => {
  const august = {...obligation, id:"august-paye", code:"EMP201", name:"Employer declaration", periodStartUtc:"2026-08-01T00:00:00Z", periodEndUtc:"2026-08-31T23:59:59Z"};
  const october = {...august, id:"october-paye", periodStartUtc:"2026-10-01T00:00:00Z", periodEndUtc:"2026-10-31T23:59:59Z"};
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/compliance/automation/obligations" ? [august, october] : []);
  renderPage();
  await screen.findAllByRole("heading", {name:"Employer declaration"});
  expect(screen.getByText("Aug 2026", {selector: ".cc-due span"})).toBeInTheDocument();
  expect(screen.getByText("Oct 2026", {selector: ".cc-due span"})).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2);
  fireEvent.change(screen.getByRole("combobox", {name:"Reporting period"}), {target:{value:"2026-10-01:2026-10-31"}});
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.queryByText("Aug 2026", {selector: ".cc-due span"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Upload documents"}));
  await screen.findByText("No documents uploaded yet.");
  expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/automation/obligations/october-paye/evidence");
});
