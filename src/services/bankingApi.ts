import { apiGetJson, apiPostJson } from "./apiClient";

export interface BankConnectionDto {
  id: string;
  clientId: string;
  provider: string;
  status: string;
  connectedAtUtc: string;
  lastSyncedAtUtc: string | null;
  consentExpiresAtUtc: string | null;
  disconnectedAtUtc: string | null;
  failureReason: string | null;
}

export interface BankAccountDto {
  id: string;
  bankConnectionId: string;
  bankName: string;
  accountName: string;
  accountType: string;
  accountNumberMasked: string;
  currency: string;
  currentBalance: number | null;
  availableBalance: number | null;
  lastUpdatedAtUtc: string;
}

export interface BankTransactionDto {
  id: string;
  bankAccountId: string;
  transactionDateUtc: string;
  postedDateUtc: string | null;
  description: string;
  reference: string;
  amount: number;
  direction: "debit" | "credit" | string;
  balance: number | null;
  providerCategory: string;
}

export interface BankSyncRunDto {
  id: string;
  bankConnectionId: string;
  provider: string;
  startedAtUtc: string;
  finishedAtUtc: string | null;
  status: string;
  transactionsReceived: number;
  fromDateUtc: string | null;
  toDateUtc: string | null;
  errorMessage: string | null;
}

export interface BankingOverviewDto {
  clientId: string;
  sandboxEnabled: boolean;
  connections: BankConnectionDto[];
  accounts: BankAccountDto[];
  recentTransactions: BankTransactionDto[];
  syncRuns: BankSyncRunDto[];
}

export interface MonthlyPackBankingStatusDto {
  clientId: string;
  year: number;
  month: number;
  status: "not_connected" | "incomplete" | "current" | "complete" | "needs_attention" | string;
  hasActiveConnection: boolean;
  isPeriodComplete: boolean;
  connectedAccountCount: number;
  periodStartUtc: string;
  periodEndUtc: string;
  requiredThroughUtc: string;
  dataFromUtc: string | null;
  dataThroughUtc: string | null;
  missingFromUtc: string | null;
  missingToUtc: string | null;
  message: string;
}

export const bankingApi = {
  getOverview: (clientId?: string) =>
    apiGetJson<BankingOverviewDto>(clientId ? `/api/banking/overview?clientId=${encodeURIComponent(clientId)}` : "/api/banking/overview"),
  getMonthlyPackStatus: (clientId: string, year: number, month: number) =>
    apiGetJson<MonthlyPackBankingStatusDto>(
      `/api/banking/monthly-pack-status?clientId=${encodeURIComponent(clientId)}&year=${year}&month=${month}`,
    ),
  connectSandbox: () => apiPostJson<BankingOverviewDto, { clientId: null }>("/api/banking/sandbox/connect", { clientId: null }),
  sync: (connectionId: string) => apiPostJson<BankingOverviewDto, Record<string, never>>(`/api/banking/connections/${connectionId}/sync`, {}),
  disconnect: (connectionId: string) => apiPostJson<BankingOverviewDto, Record<string, never>>(`/api/banking/connections/${connectionId}/disconnect`, {}),
};
