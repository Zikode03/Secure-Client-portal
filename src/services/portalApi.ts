import { apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "./apiClient";
import { portalService } from "./portalData";
import type {
  DocumentComment,
  FirmClientAccount,
  Role,
  WorkflowRequest,
} from "../types/portal";

interface BackendClientRecord {
  id: string;
  name: string;
  entityType: string;
  status: string;
  complianceHealth: number;
  assignedAccountantId: string;
}

interface BackendRequestRecord {
  id: string;
  clientId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDateUtc?: string | null;
  requestedByUserId: string;
  requestedAtUtc: string;
  updatedAtUtc: string;
}

interface RequestWithComments extends WorkflowRequest {
  comments: DocumentComment[];
}

function toPortfolioStatus(status: string): FirmClientAccount["status"] {
  if (status === "overdue" || status === "at_risk") {
    return "overdue";
  }
  if (status === "attention" || status === "pending") {
    return "attention";
  }
  return "on_track";
}

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
    if (!hasApiBaseUrl()) {
      return portalService.getAdminClients();
    }

    return apiGetJson<BackendClientRecord[]>("/api/clients")
      .then((clients) =>
        clients.map((client) => ({
          id: client.id,
          clientName: client.name,
          industry: client.entityType || "General",
          assignedAccountant:
            portalService
              .getAdminClients()
              .find((item) => item.assignedAccountantUserId === client.assignedAccountantId)
              ?.assignedAccountant ?? "Unassigned",
          assignedAccountantUserId: client.assignedAccountantId,
          requiredPack: "Standard monthly pack",
          completionRate: Math.max(0, Math.min(100, client.complianceHealth ?? 0)),
          deadlinePolicy: "6th working day",
          status: toPortfolioStatus(client.status),
        })),
      )
      .catch(() => portalService.getAdminClients());
  },
  async updateClientAssignment(
    clientId: string,
    assignedAccountant: string,
    assignedAccountantUserId?: string,
  ) {
    if (!hasApiBaseUrl()) {
      return portalService.updateClientAssignment(
        clientId,
        assignedAccountant,
        assignedAccountantUserId,
      );
    }

    try {
      await apiPutJson<{ assignedAccountantId: string }, { assignedAccountantId: string }>(
        `/api/clients/${encodeURIComponent(clientId)}/assignment`,
        { assignedAccountantId: assignedAccountantUserId ?? "" },
      );
      return portalService.updateClientAssignment(
        clientId,
        assignedAccountant,
        assignedAccountantUserId,
      );
    } catch {
      return portalService.updateClientAssignment(
        clientId,
        assignedAccountant,
        assignedAccountantUserId,
      );
    }
  },
  async createUserAccount(payload: { fullName: string; email: string; role: Role; company?: string }) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async setUserStatus(userId: string, status: "active" | "suspended") {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPutJson(`/api/admin/users/${encodeURIComponent(userId)}/status`, { status });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async setUserRole(userId: string, role: Role) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPutJson(`/api/admin/users/${encodeURIComponent(userId)}/role`, { role });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async resetUserAccess(userId: string, reason = "admin_reset") {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reason }),
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async putAdminSetting(
    key: "document-requirements" | "monthly-pack-rules" | "compliance-templates" | "role-permission-matrix",
    value: unknown,
  ) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPutJson(`/api/admin/settings/${key}`, { valueJson: JSON.stringify(value) });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async createClientBusiness(payload: {
    id?: string;
    name: string;
    entityType: string;
    status: "active" | "pending" | "at_risk" | "archived";
    complianceHealth: number;
    assignedAccountantId: string;
    primaryContact: string;
    email: string;
  }) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async updateClientBusiness(clientId: string, payload: Record<string, unknown>) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  getAdminPolicies() {
    return getOrFallback("/api/admin/policies", () => portalService.getAdminPolicies());
  },
  getDocumentById(documentId: string) {
    return getOrFallback(`/api/documents/${encodeURIComponent(documentId)}`, () =>
      portalService.getDocumentById(documentId),
    );
  },
  // Filing register is read-only and only contains auto-filed documents.
  getFilingRegister(clientId?: string) {
    const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    return apiGetJson(`/api/documents/filing-register${suffix}`);
  },
  getFilingRules() {
    return apiGetJson("/api/documents/filing-rules");
  },
  async updateFilingRule(category: string, isEnabled: boolean) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPutJson(`/api/documents/filing-rules/${encodeURIComponent(category)}`, { isEnabled });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async updateDocumentStatus(documentId: string, status: string) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPutJson(`/api/documents/${encodeURIComponent(documentId)}/status`, { status });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async addRequestComment(requestId: string, message: string) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      const comment = await apiPostJson<DocumentComment, { message: string }>(
        `/api/requests/${encodeURIComponent(requestId)}/comments`,
        { message },
      );
      return { ok: true, comment };
    } catch {
      return { ok: false };
    }
  },
  async updateRequestStatus(requestId: string, status: string) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      const request = await apiGetJson<BackendRequestRecord>(
        `/api/requests/${encodeURIComponent(requestId)}`,
      );
      await apiPutJson<BackendRequestRecord, BackendRequestRecord>(
        `/api/requests/${encodeURIComponent(requestId)}`,
        {
          ...request,
          status,
        },
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async getRequestWithComments(requestId: string): Promise<RequestWithComments | null> {
    if (!hasApiBaseUrl()) return null;
    try {
      return await apiGetJson<RequestWithComments>(
        `/api/requests/${encodeURIComponent(requestId)}`,
      );
    } catch {
      return null;
    }
  },
};
