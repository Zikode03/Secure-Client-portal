import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { MonthlyPackBankingStatusPanel } from "../components/banking/MonthlyPackBankingStatusPanel";
import { bankingApi, type MonthlyPackBankingStatusDto } from "../services/bankingApi";

vi.mock("../services/bankingApi", () => ({ bankingApi: { getMonthlyPackStatus: vi.fn(), getOverview: vi.fn() } }));

const getStatus = vi.mocked(bankingApi.getMonthlyPackStatus);
const getOverview = vi.mocked(bankingApi.getOverview);
const base: MonthlyPackBankingStatusDto = {
  clientId: "client-a", year: 2026, month: 9, status: "current", hasActiveConnection: true,
  isPeriodComplete: false, connectedAccountCount: 2,
  periodStartUtc: "2026-09-01T00:00:00Z", periodEndUtc: "2026-09-30T00:00:00Z",
  requiredThroughUtc: "2026-09-16T00:00:00Z", dataFromUtc: "2026-09-01T00:00:00Z",
  dataThroughUtc: "2026-09-16T00:00:00Z", missingFromUtc: null, missingToUtc: null,
  message: "Internal diagnostics must not be rendered",
};

function mount(showConnections = false) {
  return render(<MemoryRouter><MonthlyPackBankingStatusPanel clientId="client-a" year={2026} month={9}
    bankingPath="/client/banking" showConnections={showConnections} /></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  getStatus.mockResolvedValue({ ...base });
  getOverview.mockResolvedValue({ clientId: "client-a", sandboxEnabled: false, connections: [], accounts: [], recentTransactions: [], syncRuns: [] });
});

it("loads the scoped period, displays dates/count and blocks current-month finalisation", async () => {
  mount();
  expect(await screen.findByText("Current")).toBeInTheDocument();
  expect(getStatus).toHaveBeenCalledWith("client-a", 2026, 9);
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("01 Sept 2026 - 30 Sept 2026")).toBeInTheDocument();
  expect(screen.getByText("Banking is blocking submission and closure.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open Banking" })).toHaveAttribute("href", "/client/banking");
  expect(screen.queryByText(base.message)).not.toBeInTheDocument();
  expect(getOverview).not.toHaveBeenCalled();
});

it("keeps not-connected readiness under the manual document workflow", async () => {
  getStatus.mockResolvedValue({ ...base, status: "not_connected", hasActiveConnection: false, connectedAccountCount: 0,
    dataFromUtc: null, dataThroughUtc: null, missingFromUtc: base.periodStartUtc, missingToUtc: base.requiredThroughUtc });
  mount();
  expect(await screen.findByText("Bank statements are being handled manually.")).toBeInTheDocument();
  expect(screen.getByText("Manual bank-statement requirements control readiness.")).toBeInTheDocument();
  expect(screen.queryByText(/Missing period:/)).not.toBeInTheDocument();
});

it("shows missing dates and the incomplete blocker", async () => {
  getStatus.mockResolvedValue({ ...base, status: "incomplete", missingFromUtc: "2026-09-11T00:00:00Z", missingToUtc: "2026-09-14T00:00:00Z" });
  mount();
  expect(await screen.findByText("Incomplete")).toBeInTheDocument();
  expect(screen.getByText("Missing period: 11 Sept 2026 - 14 Sept 2026")).toBeInTheDocument();
  expect(screen.getByText("Banking is blocking submission and closure.")).toBeInTheDocument();
});

it("allows full-period complete Banking readiness", async () => {
  getStatus.mockResolvedValue({ ...base, status: "complete", isPeriodComplete: true });
  mount();
  expect(await screen.findByText("Complete")).toBeInTheDocument();
  expect(screen.getByText("Banking is ready for submission and closure.")).toBeInTheDocument();
});

it("attention blocks even if an inconsistent API response claims completion", async () => {
  getStatus.mockResolvedValue({ ...base, status: "needs_attention", isPeriodComplete: true });
  mount();
  expect(await screen.findByText("Needs attention")).toBeInTheDocument();
  expect(screen.getByText("Banking is blocking submission and closure.")).toBeInTheDocument();
});

it("does not interpret unknown statuses as manual/not connected", async () => {
  getStatus.mockResolvedValue({ ...base, status: "unexpected" });
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry before submitting or closing");
  expect(screen.queryByText("Not connected")).not.toBeInTheDocument();
});

it("sanitises errors and supports retry", async () => {
  getStatus.mockRejectedValueOnce(new Error("SQL connection string and provider token"));
  mount();
  expect(await screen.findByRole("alert")).not.toHaveTextContent("SQL");
  fireEvent.click(screen.getByRole("button", { name: "Refresh banking readiness" }));
  expect(await screen.findByText("Current")).toBeInTheDocument();
  expect(getStatus).toHaveBeenCalledTimes(2);
});

it("refreshes when returning from Banking in another window", async () => {
  mount();
  await screen.findByText("Current");
  getStatus.mockResolvedValue({ ...base, status: "not_connected", hasActiveConnection: false });
  fireEvent(window, new Event("focus"));
  expect(await screen.findByText("Not connected")).toBeInTheDocument();
  expect(getStatus).toHaveBeenCalledTimes(2);
});

it("shows only active scoped banks/accounts for the accountant", async () => {
  getOverview.mockResolvedValue({ clientId: "client-a", sandboxEnabled: false,
    connections: [
      { id: "active", clientId: "client-a", provider: "Test bank", status: "connected", connectedAtUtc: "2026-09-01", lastSyncedAtUtc: null, consentExpiresAtUtc: null, disconnectedAtUtc: null, failureReason: null },
      { id: "old", clientId: "client-a", provider: "Old bank", status: "disconnected", connectedAtUtc: "2026-08-01", lastSyncedAtUtc: null, consentExpiresAtUtc: null, disconnectedAtUtc: "2026-09-01", failureReason: null },
    ], accounts: [{ id: "account", bankConnectionId: "active", bankName: "Test bank", accountName: "Business", accountType: "current", accountNumberMasked: "****1234", currency: "ZAR", currentBalance: 0, availableBalance: 0, lastUpdatedAtUtc: "2026-09-16" }],
    recentTransactions: [], syncRuns: [] });
  mount(true);
  expect(await screen.findByText(/Business \(\*\*\*\*1234\)/)).toBeInTheDocument();
  expect(getOverview).toHaveBeenCalledWith("client-a");
  expect(screen.queryByText("Old bank")).not.toBeInTheDocument();
});

it("keeps readiness visible when accountant account details fail", async () => {
  getOverview.mockRejectedValue(new Error("Private provider failure"));
  mount(true);
  expect(await screen.findByText("Current")).toBeInTheDocument();
  expect(screen.getByText("Bank/account details could not be loaded.")).toBeInTheDocument();
  expect(screen.queryByText("Private provider failure")).not.toBeInTheDocument();
});

it("ignores a stale request after the selected pack changes", async () => {
  let resolveOld!: (status: MonthlyPackBankingStatusDto) => void;
  getStatus.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  const view = mount();
  view.rerender(<MemoryRouter><MonthlyPackBankingStatusPanel clientId="client-b" year={2026} month={8} /></MemoryRouter>);
  await screen.findByText("Current");
  await act(async () => { resolveOld({ ...base, status: "complete", isPeriodComplete: true }); });
  await waitFor(() => expect(getStatus).toHaveBeenLastCalledWith("client-b", 2026, 8));
  expect(screen.queryByText("Complete")).not.toBeInTheDocument();
});
