import { apiData, portalApiClient } from "./portalApiClient";
import type { components } from "./generated/portal-api";

// Compatibility names for screens; the models themselves come from the backend.
export type BankConnectionDto = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankConnectionDto"];
export type BankAccountDto = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankAccountDto"];
export type BankTransactionDto = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankTransactionDto"];
export type BankSyncRunDto = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankSyncRunDto"];
export type BankingOverviewDto = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.BankingOverviewDto"];
export type MonthlyPackBankingStatusDto = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.MonthlyPackBankingStatusDto"];
export type ManualTransactionRow = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionRow"];
export type ManualAccountRequest = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualBankAccountRequest"];
export type ManualImportRequest = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportRequest"];
export type ManualImportResult = components["schemas"]["SecureClientPortal.Backend.Application.Modules.Banking.ManualTransactionImportResult"];

export const bankingApi = {
  addManualAccount: (body: ManualAccountRequest) =>
    apiData(portalApiClient.POST("/api/banking/manual/accounts", { body })),
  importManualTransactions: (body: ManualImportRequest) =>
    apiData(portalApiClient.POST("/api/banking/manual/import", { body })),
  getOverview: (clientId?: string) =>
    apiData(portalApiClient.GET("/api/banking/overview", { params: { query: { clientId } } })),
  getMonthlyPackStatus: (clientId: string, year: number, month: number) =>
    apiData(portalApiClient.GET("/api/banking/monthly-pack-status", { params: { query: { clientId, year, month } } })),
  connectSandbox: () =>
    apiData(portalApiClient.POST("/api/banking/sandbox/connect", { body: { clientId: null } })),
  sync: (connectionId: string) =>
    apiData(portalApiClient.POST("/api/banking/connections/{connectionId}/sync", { params: { path: { connectionId } } })),
  disconnect: (connectionId: string) =>
    apiData(portalApiClient.POST("/api/banking/connections/{connectionId}/disconnect", { params: { path: { connectionId } } })),
};
