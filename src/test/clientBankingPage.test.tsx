import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ClientBankingPage } from "../pages/client/ClientBankingPage";
import { bankingApi } from "../services/bankingApi";

vi.mock("../services/bankingApi", () => ({ bankingApi: { getOverview: vi.fn(), addManualAccount: vi.fn(), importManualTransactions: vi.fn(), connectSandbox: vi.fn(), sync: vi.fn(), disconnect: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

it("does not claim no connection when overview fails and hides technical errors", async () => {
  vi.mocked(bankingApi.getOverview).mockRejectedValue(new Error("Secret provider token"));
  render(<MemoryRouter><ClientBankingPage /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load banking data");
  expect(screen.queryByText("No bank account connected")).not.toBeInTheDocument();
  expect(screen.queryByText(/Secret provider/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

it("replaces live connection controls with manual statements and preserves safe history", async () => {
  vi.mocked(bankingApi.getOverview).mockResolvedValue({ clientId: "client-a", integrationEnabled: false, sandboxEnabled: false,
    connections: [], accounts: [], recentTransactions: [], syncRuns: [{ id: "run", bankConnectionId: "bank", provider: "Test bank",
      startedAtUtc: "2026-09-16T00:00:00Z", finishedAtUtc: null, status: "failed", transactionsReceived: 0,
      fromDateUtc: null, toDateUtc: null, errorMessage: "Secret provider token" }] });
  render(<MemoryRouter><ClientBankingPage /></MemoryRouter>);
  await screen.findByRole("button", { name: "Save account" });
  expect(screen.getByText(/Direct bank connections are paused/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Upload statements in Monthly Packs" })).toHaveAttribute("href", "/client/packs");
  expect(screen.queryByRole("button", { name: /Sync|Connect/ })).not.toBeInTheDocument();
  expect(screen.queryByText("Secret provider token")).not.toBeInTheDocument();
});

it("saves a masked manual account without calling a bank provider", async () => {
  const empty = { clientId: "client-a", integrationEnabled: false, sandboxEnabled: false, connections: [], accounts: [], recentTransactions: [], syncRuns: [] };
  vi.mocked(bankingApi.getOverview).mockResolvedValue(empty);
  vi.mocked(bankingApi.addManualAccount).mockResolvedValue(empty);
  render(<MemoryRouter><ClientBankingPage /></MemoryRouter>);
  await screen.findByRole("button", { name: "Save account" });
  fireEvent.change(screen.getByLabelText("Bank name"), { target: { value: "Standard Bank" } });
  fireEvent.change(screen.getByLabelText("Account label"), { target: { value: "Operating" } });
  fireEvent.change(screen.getByLabelText("Last four digits"), { target: { value: "1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Save account" }));
  await waitFor(() => expect(bankingApi.addManualAccount).toHaveBeenCalledWith({ clientId: undefined, bankName: "Standard Bank", accountName: "Operating", lastFourDigits: "1234", registrationId: expect.any(String) }));
  expect(await screen.findByRole("status")).toHaveTextContent("Account saved");
  expect(bankingApi.connectSandbox).not.toHaveBeenCalled();
});

it("previews the CSV before confirming and refreshing saved transactions", async () => {
  vi.mocked(bankingApi.getOverview).mockResolvedValue({ clientId: "client-a", integrationEnabled: false, sandboxEnabled: false, connections: [],
    accounts: [{ id: "a", bankConnectionId: "manual", bankName: "Bank", accountName: "Operating", accountNumberMasked: "****1234", accountType: "manual", currency: "ZAR", currentBalance: null, availableBalance: null, lastUpdatedAtUtc: "2026-11-10" }], recentTransactions: [], syncRuns: [] });
  vi.mocked(bankingApi.importManualTransactions).mockResolvedValue({ imported: 1, duplicates: 0, totalRows: 1, credits: 0, debits: 20, preview: true });
  render(<MemoryRouter><ClientBankingPage /></MemoryRouter>);
  await screen.findByRole("button", { name: "Save account" });
  fireEvent.change(screen.getByLabelText("Account"), { target: { value: "a" } });
  const file = new File([], "statement.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve('Date,Description,Amount\n2026-11-01,Rent,-20') });
  fireEvent.change(screen.getByLabelText("Statement CSV"), { target: { files: [file] } });
  fireEvent.click(await screen.findByRole("button", { name: "Preview 1 transactions" }));
  const confirm = await screen.findByRole("button", { name: "Confirm import" });
  expect(bankingApi.importManualTransactions).toHaveBeenCalledTimes(1);
  expect(vi.mocked(bankingApi.importManualTransactions).mock.calls[0][0].preview).toBe(true);
  fireEvent.click(confirm);
  await waitFor(() => expect(bankingApi.importManualTransactions).toHaveBeenCalledTimes(2));
  expect(vi.mocked(bankingApi.importManualTransactions).mock.calls[1][0].preview).toBe(false);
  expect(await screen.findByRole("status")).toHaveTextContent("Imported 1 transactions");
});
