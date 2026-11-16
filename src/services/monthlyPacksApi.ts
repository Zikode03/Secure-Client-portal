import { apiData, portalApiClient } from "./portalApiClient";
import type { components } from "./generated/portal-api";
export type MonthlyPackResponse = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.MonthlyPackResponse"];
type AddItemRequest = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.MonthlyPacks.AddClientMonthlyPackItemRequest"];

export const monthlyPacksApi = {
  list: (clientId?: string) => apiData(portalApiClient.GET("/api/monthly-packs", { params: { query: { clientId } } })),
  submit: (id: string) => apiData(portalApiClient.POST("/api/monthly-packs/{id}/submit", { params: { path: { id } } })),
  close: (id: string) => apiData(portalApiClient.POST("/api/monthly-packs/{id}/close", { params: { path: { id } } })),
  profile: (clientId: string) => apiData(portalApiClient.GET("/api/monthly-pack-profiles/{clientId}", { params: { path: { clientId } } })),
  addItem: (clientId: string, body: AddItemRequest) => apiData(portalApiClient.POST("/api/monthly-pack-profiles/{clientId}/items", { params: { path: { clientId } }, body })),
};

export const documentSlotsApi = {
  list: (monthlyPackId: string) => apiData(portalApiClient.GET("/api/document-slots/{monthlyPackId}", { params: { path: { monthlyPackId } } })),
  submit: (slotId: string) => apiData(portalApiClient.POST("/api/document-slots/{slotId}/submit", { params: { path: { slotId } } })),
  workspace: (slotId: string) => apiData(portalApiClient.GET("/api/document-slots/{slotId}/workspace", { params: { path: { slotId } } })),
  approve: (slotId: string, internalNote: string | null = null) => apiData(portalApiClient.POST("/api/document-slots/{slotId}/approve", { params: { path: { slotId } }, body: { internalNote } })),
  reject: (slotId: string, reason: string, internalNote: string | null = null) => apiData(portalApiClient.POST("/api/document-slots/{slotId}/reject", { params: { path: { slotId } }, body: { reason, internalNote } })),
};
