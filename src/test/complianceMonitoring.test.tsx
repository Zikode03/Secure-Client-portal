import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComplianceMonitoringPanel, ComplianceMonitoringWorkspace, type MonitoringProfile } from "../components/compliance/ComplianceMonitoringWorkspace";
import { apiGetJson, apiPutJson, apiPostJson, hasApiBaseUrl } from "../services/apiClient";
import { useAuth } from "../app/auth";

vi.mock("../app/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/apiClient", () => ({ apiGetJson: vi.fn(), apiPutJson: vi.fn(), apiPostJson: vi.fn(), hasApiBaseUrl: vi.fn() }));
const profile: MonitoringProfile = {
  clientId: "business-a", clientName: "Test Business", version: "version-1", canManage: true,
  registrationNumber: "REG-EXAMPLE", taxNumber: "", csdSupplierNumber: "",
  checks: [{ code: "cipc_registration", source: "CIPC", name: "Company registration", description: "Registration only.", applicability: "undecided", reason: "", connectionStatus: "not_connected", verificationStatus: "not_checked", latestVerification: null }],
};
const manual = { id: "v1", checkCode: "cipc_registration", method: "accountant_confirmed", outcome: "pass", evidenceReference: "Internal evidence ref 42", checkedAtUtc: "2026-01-01T10:00:00Z", recordedAtUtc: "2026-01-01T11:00:00Z", reviewAfterUtc: "2026-02-01T10:00:00Z", recordedByName: "Alex", matchesCurrentIdentifiers: true };
beforeEach(() => {
  vi.mocked(apiGetJson).mockReset().mockResolvedValue(structuredClone(profile));
  vi.mocked(apiPutJson).mockReset(); vi.mocked(apiPostJson).mockReset();
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(useAuth).mockReturnValue({ user: { id: "staff", role: "accountant" } } as ReturnType<typeof useAuth>);
});
describe("authority monitoring foundation", () => {
  it("starts with unassessed, disconnected and unchecked states, without overall compliance", async () => {
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText("Not checked")).toBeInTheDocument();
    expect(screen.getByText("Needs assessment")).toBeInTheDocument();
    expect(screen.getByText(/No overall compliance conclusion/)).toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
  it("saves identifiers and applicability to the backend without triggering verification", async () => {
    vi.mocked(apiPutJson).mockResolvedValue(profile);
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    fireEvent.click(await screen.findByRole("button", { name: "Configure checks" }));
    fireEvent.change(screen.getByLabelText("CSD supplier number"), { target: { value: "SUPPLIER-EXAMPLE" } });
    fireEvent.change(screen.getByLabelText("Applicability — Company registration"), { target: { value: "not_applicable" } });
    expect(screen.getByLabelText("Reason — Company registration")).toBeRequired();
    fireEvent.change(screen.getByLabelText("Reason — Company registration"), { target: { value: "Assessment reason" } });
    fireEvent.click(screen.getByRole("button", { name: "Save monitoring setup" }));
    await screen.findByText("Monitoring setup saved. No authority check was performed.");
    expect(apiPutJson).toHaveBeenCalledWith("/api/compliance/monitoring/business-a", expect.objectContaining({ version: "version-1", csdSupplierNumber: "SUPPLIER-EXAMPLE", checks: [{ checkCode: "cipc_registration", applicability: "not_applicable", reason: "Assessment reason" }] }));
    expect(apiPostJson).not.toHaveBeenCalled();
  });
  it("keeps edits on a failed save and provides recovery guidance", async () => {
    vi.mocked(apiPutJson).mockRejectedValue(new Error("This setup changed."));
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    fireEvent.click(await screen.findByRole("button", { name: "Configure checks" }));
    fireEvent.change(screen.getByLabelText("Tax reference number"), { target: { value: "1234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Save monitoring setup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This setup changed.");
    expect(screen.getByLabelText("Tax reference number")).toHaveValue("1234567890");
  });
  it("does not expose editing controls to clients and loads empty history honestly", async () => {
    vi.mocked(apiGetJson).mockResolvedValueOnce({ ...profile, canManage: false }).mockResolvedValueOnce([]);
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    fireEvent.click(await screen.findByRole("button", { name: "History — Company registration" }));
    expect(await screen.findByText(/No verification recorded yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Configure checks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record manual check/ })).not.toBeInTheDocument();
    expect(apiGetJson).toHaveBeenLastCalledWith("/api/compliance/monitoring/business-a/history?checkCode=cipc_registration&page=1");
  });
  it("labels stale manual results and their history without calling them live", async () => {
    vi.mocked(apiGetJson).mockResolvedValueOnce({ ...profile, checks: [{ ...profile.checks[0], applicability: "applies", verificationStatus: "stale", latestVerification: manual }] }).mockResolvedValueOnce([manual]);
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    expect(await screen.findByText("Recheck due")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History — Company registration" }));
    expect(await screen.findByText("No issue recorded · Manual verification")).toBeInTheDocument();
    expect(screen.getByText(/Evidence: Internal evidence ref 42/)).toBeInTheDocument();
  });
  it("records only an explicit manual observation with UTC dates and a version", async () => {
    vi.mocked(apiGetJson).mockResolvedValue({ ...profile, checks: [{ ...profile.checks[0], applicability: "applies" }] });
    vi.mocked(apiPostJson).mockResolvedValue(profile);
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    fireEvent.click(await screen.findByRole("button", { name: "Record manual check — Company registration" }));
    fireEvent.change(screen.getByLabelText("Evidence reference"), { target: { value: "Internal ref" } });
    fireEvent.change(screen.getByLabelText("Checked at (your local time)"), { target: { value: "2026-01-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/Review after \(your local time\)/), { target: { value: "2026-02-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save manual verification" }));
    await screen.findByText(/Manual verification recorded. This is not/);
    expect(apiPostJson).toHaveBeenCalledWith("/api/compliance/monitoring/business-a/manual-verifications", { version: "version-1", checkCode: "cipc_registration", outcome: "unknown", evidenceReference: "Internal ref", checkedAtUtc: new Date("2026-01-01T10:00").toISOString(), reviewAfterUtc: new Date("2026-02-01T10:00").toISOString() });
  });
  it("shows unavailable state, not unchecked results, when the API fails", async () => {
    vi.mocked(apiGetJson).mockRejectedValueOnce(new Error("API unavailable"));
    render(<ComplianceMonitoringPanel clientId="business-a" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Monitoring unavailable");
    expect(screen.queryByText("Not checked")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry monitoring" }));
    await screen.findByText("Not checked");
  });
  it("ignores a late response from a previous business", async () => {
    let resolve!: (value: MonitoringProfile) => void;
    vi.mocked(apiGetJson).mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValueOnce({ ...profile, clientId: "business-b", clientName: "Business B" });
    const { rerender } = render(<ComplianceMonitoringPanel clientId="business-a" />);
    rerender(<ComplianceMonitoringPanel clientId="business-b" />);
    await screen.findByRole("heading", { name: "Business B" });
    resolve(profile);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Test Business" })).not.toBeInTheDocument());
  });
  it("keeps authority checks separate from document records", async () => {
    vi.mocked(apiGetJson).mockResolvedValueOnce([{ id: "business-a", name: "Test Business" }]).mockResolvedValue(profile);
    render(<ComplianceMonitoringWorkspace records={<p>Existing records</p>} />);
    await screen.findByText("Not checked");
    expect(screen.queryByText("Existing records")).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Compliance views" })).getByRole("button", { name: "Document records" }));
    expect(screen.getByText("Existing records")).toBeInTheDocument();
    expect(screen.queryByText("Not checked")).not.toBeInTheDocument();
  });
});
