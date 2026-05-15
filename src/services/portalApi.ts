import { apiGetJson, hasApiBaseUrl } from "./apiClient";
import { portalService } from "./portalData";
import type { Role } from "../types/portal";

async function getOrFallback<T>(path: string, fallback: () => T): Promise<T> {
  if (!hasApiBaseUrl()) {
    return fallback();
  }

  try {
    return await apiGetJson<T>(path);
  } catch {
    return fallback();
  }
}

export const portalServiceApi = {
  getDemoUser(role: Role) {
    return getOrFallback(`/api/session/demo-user?role=${encodeURIComponent(role)}`, () =>
      portalService.getDemoUser(role),
    );
  },
  getClientWorkflowSeed() {
    return getOrFallback("/api/client/workflow-seed", () => portalService.getClientWorkflowSeed());
  },
  getClientNotifications() {
    return getOrFallback("/api/client/notifications", () => portalService.getClientNotifications());
  },
  getClientComplianceCentre() {
    return getOrFallback("/api/client/compliance-centre", () =>
      portalService.getClientComplianceCentre(),
    );
  },
  getClientDocumentCenter() {
    return getOrFallback("/api/client/document-centre", () => portalService.getClientDocumentCenter());
  },
  getAccountantDashboard() {
    return getOrFallback("/api/accountant/dashboard", () => portalService.getAccountantDashboard());
  },
  getAccountantComplianceCentre() {
    return getOrFallback("/api/accountant/compliance-centre", () =>
      portalService.getAccountantComplianceCentre(),
    );
  },
  getAccountantNotifications() {
    return getOrFallback("/api/accountant/notifications", () =>
      portalService.getAccountantNotifications(),
    );
  },
  getReviewWorkspace() {
    return getOrFallback("/api/accountant/review-workspace", () => portalService.getReviewWorkspace());
  },
  getAdminDashboard() {
    return getOrFallback("/api/admin/dashboard", () => portalService.getAdminDashboard());
  },
  getAdminClients() {
    return getOrFallback("/api/admin/clients", () => portalService.getAdminClients());
  },
  getAdminPolicies() {
    return getOrFallback("/api/admin/policies", () => portalService.getAdminPolicies());
  },
  getDocumentById(documentId: string) {
    return getOrFallback(`/api/documents/${encodeURIComponent(documentId)}`, () =>
      portalService.getDocumentById(documentId),
    );
  },
};

