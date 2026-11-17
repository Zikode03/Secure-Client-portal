import { workspaceRole } from "../utils/workspaceRole";
import { apiGetJson, apiPatchJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "./apiClient";
import { portalService } from "./portalData";
import { normaliseBusinessClassification } from "./businessClassification";
import type { FirmClientAccount, Role, UserAccountRecord } from "../types/portal";

interface BackendClientRecord {
  id: string;
  name: string;
  entityType: string;
  industry?: string | null;
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
  clientName?: string | null;
  accountantUserId: string;
  accountantName?: string | null;
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
  const classification = normaliseBusinessClassification(client);

  return {
    id: client.id,
    clientName: client.name,
    industry: classification.industry,
    assignedAccountant: assignedName || "Assigned accountant",
    assignedAccountantUserId: primaryAssignment?.accountantUserId ?? client.assignedAccountantId,
    backupAccountant: backupName || undefined,
    backupAccountantUserId: backupAssignment?.accountantUserId,
    requiredPack: "Standard monthly pack",
    completionRate: client.complianceHealth,
    deadlinePolicy: "See monthly pack due dates",
    status: toPortfolioStatus(normalizedStatus, client.complianceHealth),
    isActive: normalizedStatus !== "archived" && normalizedStatus !== "inactive",
  };
}



export const portalServiceApi = {









  async getAssignments(clientId?: string): Promise<BackendAssignmentRecord[]> {
    if (!hasApiBaseUrl()) {
      return [];
    }

    const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` as const : "";

    try {
      return await apiGetJson(`/api/assignments${suffix}`);
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
        apiGetJson("/api/clients"),
        apiGetJson("/api/assignments"),
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
      void options;
      throw error;
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

      const assignments = await apiGetJson(
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
        await apiPostJson("/api/assignments/reassign", {
          clientId,
          fromAccountantUserId: currentPrimary.accountantUserId,
          toAccountantUserId: assignedAccountantUserId,
          makePrimary: true,
        });
      } else {
        await apiPostJson("/api/assignments", {
          accountantUserId: assignedAccountantUserId,
          clientId,
          isPrimary: true,
        });
      }

      if (existingTarget && !existingTarget.isPrimary) {
        await apiPostJson(`/api/assignments/${encodeURIComponent(existingTarget.id)}/make-primary`, {});
      }

      return { ok: true, message: "Accountant assignment updated." };
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
      const users = await apiGetJson("/api/admin/users");
      return users.map((user) => ({
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: workspaceRole(user.role),
        status: toUserAccountStatus(user.securityStatus),
      }));
    } catch {
      return [];
    }
  },
  async createUserAccount(payload: { fullName: string; email: string; role: Role; company?: string }) {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      const response = await apiPostJson("/api/admin/users", payload);
      return {
        ok: true,
        user: {
          id: response.id,
          name: response.fullName,
          email: response.email,
          role: workspaceRole(response.role),
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
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      await apiPutJson(`/api/admin/users/${encodeURIComponent(userId)}/status`, { status });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async setUserRole(userId: string, role: Role) {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      await apiPutJson(`/api/admin/users/${encodeURIComponent(userId)}/role`, { role });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async resetUserAccess(userId: string, reason = "admin_reset") {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      const response = await apiPostJson(`/api/admin/users/${encodeURIComponent(userId)}/reset-access`, { reason });
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
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      await apiPutJson(`/api/admin/settings/${key}`, { valueJson: JSON.stringify(value) });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  // Filing register is read-only and only contains auto-filed documents.
  getFilingRegister(clientId?: string) {
    const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` as const : "";
    return apiGetJson(`/api/documents/filing-register${suffix}`);
  },
  getFilingRules() {
    return apiGetJson("/api/documents/filing-rules");
  },
  async updateFilingRule(category: string, isEnabled: boolean) {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      await apiPutJson(`/api/documents/filing-rules/${encodeURIComponent(category)}`, { isEnabled });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async updateDocumentStatus(documentId: string, status: string) {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      await apiPutJson(`/api/documents/${encodeURIComponent(documentId)}/status`, { status });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
  async addRequestComment(requestId: string, message: string, isInternal = false) {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      const comment = await apiPostJson(
        `/api/requests/${encodeURIComponent(requestId)}/comments`,
        { message, isInternal },
      );
      return { ok: true, comment };
    } catch {
      return { ok: false };
    }
  },
  async updateRequestStatus(requestId: string, status: string) {
    if (!hasApiBaseUrl()) throw new Error("The portal requires a backend connection.");
    try {
      await apiPatchJson(`/api/requests/${encodeURIComponent(requestId)}/status`, { status });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },

};
