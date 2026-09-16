import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ClientBankingPage } from "../pages/client/ClientBankingPage";
import { bankingApi } from "../services/bankingApi";

vi.mock("../services/bankingApi", () => ({ bankingApi: { getOverview: vi.fn(), connectSandbox: vi.fn(), sync: vi.fn(), disconnect: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

it("does not claim no connection when overview fails and hides technical errors", async () => {
  vi.mocked(bankingApi.getOverview).mockRejectedValue(new Error("Secret provider token"));
  render(<ClientBankingPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load banking data");
  expect(screen.queryByText("No bank account connected")).not.toBeInTheDocument();
  expect(screen.queryByText(/Secret provider/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

it("does not expose raw sync diagnostics in history", async () => {
  vi.mocked(bankingApi.getOverview).mockResolvedValue({ clientId: "client-a", sandboxEnabled: false,
    connections: [], accounts: [], recentTransactions: [], syncRuns: [{ id: "run", bankConnectionId: "bank", provider: "Test bank",
      startedAtUtc: "2026-09-16T00:00:00Z", finishedAtUtc: null, status: "failed", transactionsReceived: 0,
      fromDateUtc: null, toDateUtc: null, errorMessage: "Secret provider token" }] });
  render(<ClientBankingPage />);
  await screen.findByRole("button", { name: "Sync history" });
  fireEvent.click(screen.getByRole("button", { name: "Sync history" }));
  expect(screen.getByText("Sync could not be completed. Please try again.")).toBeInTheDocument();
  expect(screen.queryByText("Secret provider token")).not.toBeInTheDocument();
});
