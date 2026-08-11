import { apiGetJson, apiPatchJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "./apiClient";
import { portalService } from "./portalData";
import { getAccountantComplianceCentreData, getClientComplianceCentreData } from "./complianceData";
import type {
  DocumentComment,
  FirmClientAccount,
  Role,
  UserAccountRecord,
  WorkflowRequest,
} from "../types/portal";

interface RequestWithComments extends WorkflowRequest {
  comments: DocumentComment[];
}

interface BackendAdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  securityStatus?: string;
}

interface BackendCreateUserResponse {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  invite?: {
    expiresAtUtc?: string;
    setupUrl?: string;
  };
  delivery?: string;
  deliveryError?: string | null;
}

interface BackendClientRecord {
  id: string;
  name: string;
  entityType: string;
  status: string;
  complianceHealth: number;
  assignedAccountantId: string;
  primaryContact: string;
  email: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendAssignmentRecord {
  id: string;
  clientId: string;
  clientName?: string;
  accountantUserId: string;
  accountantName?: string;
  isPrimary: boolean;
  createdAtUtc: string;
}

function toUserAccountStatus(status?: string): UserAccountRecord["status"] {
  if (status === "disabled" || status === "locked" || status === "suspended") {
    return "suspended";
  }

  if (status === "invited" || status === "reset_pending" || status === "password_reset_required") {
    return "invited";
  }

  return "active";
}

function toPortfolioStatus(
  status: string | undefined,
  complianceHealth: number,
): FirmClientAccount["status"] {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "archived") {
    return "overdue";
  }

  if (normalized === "inactive" || normalized === "pending" || complianceHealth < 70) {
    return "attention";
  }

  return "on_track";
}

function mapBackendClientRecord(
  client: BackendClientRecord,
  assignments: BackendAssignmentRecord[],
): FirmClientAccount {
  const primaryAssignment =
    assignments.find((assignment) => assignment.isPrimary) ??
    assignments.find((assignment) => assignment.accountantUserId === client.assignedAccountantId);
  const backupAssignment = assignments.find(
    (assignment) => !assignment.isPrimary && assignment.accountantUserId !== primaryAssignment?.accountantUserId,
  );
  const assignedName = primaryAssignment?.accountantName?.trim();
  const backupName = backupAssignment?.accountantName?.trim();
  const normalizedStatus = client.status?.trim().toLowerCase();

  return {
    id: client.id,
    clientName: client.name,
    industry: client.entityType,
    assignedAccountant: assignedName || "Assigned accountant",
    assignedAccountantUserId: primaryAssignment?.accountantUserId ?? client.assignedAccountantId,
    backupAccountant: backupName || undefined,
    backupAccountantUserId: backupAssignment?.accountantUserId,
    requiredPack: "Standard monthly pack",
    completionRate: client.complianceHealth,
    deadlinePolicy: "6th working day",
    status: toPortfolioStatus(normalizedStatus, client.complianceHealth),
    isActive: normalizedStatus !== "archived" && normalizedStatus !== "inactive",
  };
}

async function getOrFallback<T>(path: string, fallback: () => T): Promise<T> {
  if (!hasApiBaseUrl()) {
    return fallback();
  }

  if (shouldSkipBackendRoute(path)) {
    return fallback();
  }

  try {
    return await apiGetJson<T>(path);
  } catch {
    return fallback();
  }
}

const backendFallbackOnlyMatchers: Array<(path: string) => boolean> = [
  (path) => path.startsWith("/api/session/demo-user"),
  (path) => path === "/api/client/workflow-seed",
  (path) => path === "/api/client/notifications",
  (path) => path === "/api/client/compliance-centre",
  (path) => path === "/api/client/document-centre",
  (path) => path === "/api/accountant/dashboard",
  (path) => path === "/api/accountant/compliance-centre",
  (path) => path === "/api/accountant/notifications",
  (path) => path === "/api/accountant/review-workspace",
  (path) => path === "/api/admin/dashboard",
  (path) => path === "/api/admin/policies",
];

function shouldSkipBackendRoute(path: string) {
  return backendFallbackOnlyMatchers.some((matches) => matches(path));
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
    return getOrFallback("/api/client/compliance-centre", getClientComplianceCentreData);
  },
  getClientDocumentCenter() {
    return getOrFallback("/api/client/document-centre", () => portalService.getClientDocumentCenter());
  },
  getAccountantDashboard() {
    return getOrFallback("/api/accountant/dashboard", () => portalService.getAccountantDashboard());
  },
  getAccountantComplianceCentre() {
    return getOrFallback("/api/accountant/compliance-centre", getAccountantComplianceCentreData);
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
  async getAssignments(clientId?: string): Promise<BackendAssignmentRecord[]> {
    if (!hasApiBaseUrl()) {
      return [];
    }

    const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";

    try {
      return await apiGetJson<BackendAssignmentRecord[]>(`/api/assignments${suffix}`);
    } catch {
      return [];
    }
  },
  async getAdminClients(options: { allowFallback?: boolean } = {}) {
    if (!hasApiBaseUrl()) {
      return portalService.getAdminClients();
    }

    try {
      const [clients, assignments] = await Promise.all([
        apiGetJson<BackendClientRecord[]>("/api/clients"),
        apiGetJson<BackendAssignmentRecord[]>("/api/assignments"),
      ]);

      const assignmentsByClientId = new Map<string, BackendAssignmentRecord[]>();
      assignments.forEach((assignment) => {
        const current = assignmentsByClientId.get(assignment.clientId) ?? [];
        current.push(assignment);
        assignmentsByClientId.set(assignment.clientId, current);
      });

      return clients.map((client) =>
        mapBackendClientRecord(client, assignmentsByClientId.get(client.id) ?? []),
      );
    } catch (error) {
      if (options.allowFallback === false) {
        throw error;
      }
      return portalService.getAdminClients();
    }
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
      if (!assignedAccountantUserId) {
        return {
          ok: false,
          message: "A primary accountant is required when backend mode is enabled.",
        };
      }

      const assignments = await apiGetJson<BackendAssignmentRecord[]>(
        `/api/assignments?clientId=${encodeURIComponent(clientId)}`,
      );
      const currentPrimary = assignments.find((assignment) => assignment.isPrimary);
      const existingTarget = assignments.find(
        (assignment) => assignment.accountantUserId === assignedAccountantUserId,
      );

      if (currentPrimary?.accountantUserId === assignedAccountantUserId) {
        return { ok: true, message: "Accountant assignment already up to date." };
      }

      if (currentPrimary) {
        await apiPostJson<
          { clientId: string; accountantUserId: string; isPrimary: boolean },
          {
            clientId: string;
            fromAccountantUserId: string;
            toAccountantUserId: string;
            makePrimary: boolean;
          }
        >("/api/assignments/reassign", {
          clientId,
          fromAccountantUserId: currentPrimary.accountantUserId,
          toAccountantUserId: assignedAccountantUserId,
          makePrimary: true,
        });
      } else {
        await apiPostJson<
          { id: string; clientId: string; accountantUserId: string; isPrimary: boolean },
          { accountantUserId: string; clientId: string; isPrimary: boolean }
        >("/api/assignments", {
          accountantUserId: assignedAccountantUserId,
          clientId,
          isPrimary: true,
        });
      }

      if (existingTarget && !existingTarget.isPrimary) {
        await apiPostJson<
          { id: string; clientId: string; accountantUserId: string; isPrimary: boolean },
          Record<string, never>
        >(`/api/assignments/${encodeURIComponent(existingTarget.id)}/make-primary`, {});
      }

      return portalService.updateClientAssignment(
        clientId,
        assignedAccountant,
        assignedAccountantUserId,
      );
    } catch {
      return {
        ok: false,
        message: "Could not update the backend assignment.",
      };
    }
  },
  async getAdminUsers(): Promise<UserAccountRecord[]> {
    if (!hasApiBaseUrl()) {
      return [];
    }

    try {
      const users = await apiGetJson<BackendAdminUserRecord[]>("/api/admin/users");
      return users.map((user) => ({
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        status: toUserAccountStatus(user.securityStatus),
      }));
    } catch {
      return [];
    }
  },
  async createUserAccount(payload: { fullName: string; email: string; role: Role; company?: string }) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      const response = await apiPostJson<BackendCreateUserResponse, typeof payload>("/api/admin/users", payload);
      return {
        ok: true,
        user: {
          id: response.id,
          name: response.fullName,
          email: response.email,
          role: response.role,
          status: "invited",
          company: payload.company?.trim() || undefined,
        } satisfies UserAccountRecord,
        invite: response.invite,
        delivery: response.delivery,
        deliveryError: response.deliveryError ?? undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create the user account.";
      return { ok: false, message };
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
      const response = await apiPostJson<{
        delivery?: string;
        deliveryError?: string | null;
        invite?: {
          setupUrl?: string;
          expiresAtUtc?: string;
        };
      }, { reason: string }>(`/api/admin/users/${encodeURIComponent(userId)}/reset-access`, { reason });
      return {
        ok: true,
        delivery: response.delivery,
        deliveryError: response.deliveryError ?? undefined,
        invite: response.invite,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Could not resend access instructions.",
      };
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
      await apiPostJson("/api/clients", payload);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async updateClientBusiness(clientId: string, payload: Record<string, unknown>) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPutJson(`/api/clients/${encodeURIComponent(clientId)}`, payload);
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
  async addRequestComment(requestId: string, message: string, isInternal = false) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      const comment = await apiPostJson<DocumentComment, { message: string; isInternal: boolean }>(
        `/api/requests/${encodeURIComponent(requestId)}/comments`,
        { message, isInternal },
      );
      return { ok: true, comment };
    } catch {
      return { ok: false };
    }
  },
  async updateRequestStatus(requestId: string, status: string) {
    if (!hasApiBaseUrl()) return { ok: true };
    try {
      await apiPatchJson(`/api/requests/${encodeURIComponent(requestId)}/status`, { status });
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
