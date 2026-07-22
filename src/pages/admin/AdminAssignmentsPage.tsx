// Friendly guide: this module (AdminAssignmentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import type { FirmClientAccount, ManagedAccountant } from "../../types/portal";

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
  clientName?: string | null;
  accountantUserId: string;
  accountantName?: string | null;
  isPrimary: boolean;
  createdAtUtc: string;
}

interface BackendAdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  profileJson?: string | null;
  securityJson?: string | null;
  securityStatus?: string | null;
}

function normalizeAccountantStatus(status?: string | null): ManagedAccountant["status"] {
  switch ((status ?? "").trim().toLowerCase()) {
    case "invited":
      return "capacity_available";
    case "disabled":
    case "locked":
      return "busy";
    default:
      return "active";
  }
}

function mapLiveAccountants(
  users: BackendAdminUserRecord[],
  assignments: BackendAssignmentRecord[],
): ManagedAccountant[] {
  return users
    .filter((user) => user.role.trim().toLowerCase() === "accountant")
    .map((user) => {
      const assignedClientCount = assignments.filter(
        (assignment) => assignment.accountantUserId === user.id,
      ).length;

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        title: "Accountant",
        assignedClientCount,
        openReviews: 0,
        status: normalizeAccountantStatus(user.securityStatus),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function mapLiveClients(
  clients: BackendClientRecord[],
  assignments: BackendAssignmentRecord[],
  accountants: ManagedAccountant[],
): FirmClientAccount[] {
  return clients.map((client) => {
    const clientAssignments = assignments.filter((assignment) => assignment.clientId === client.id);
    const primaryAssignment = clientAssignments.find((assignment) => assignment.isPrimary) ?? null;
    const backupAssignment = clientAssignments.find((assignment) => !assignment.isPrimary) ?? null;

    return {
      id: client.id,
      clientName: client.name,
      industry: client.entityType,
      assignedAccountant:
        primaryAssignment?.accountantName ??
        accountants.find((accountant) => accountant.id === client.assignedAccountantId)?.name ??
        "Unassigned",
      assignedAccountantUserId:
        primaryAssignment?.accountantUserId ?? (client.assignedAccountantId || undefined),
      backupAccountant: backupAssignment?.accountantName ?? undefined,
      backupAccountantUserId: backupAssignment?.accountantUserId ?? undefined,
      requiredPack: "Current month pack",
      completionRate: client.complianceHealth,
      deadlinePolicy: "Monthly",
      status: client.status === "active" ? "on_track" : client.status === "inactive" ? "attention" : "overdue",
      isActive: client.status === "active",
    };
  });
}

// Component flow: gather data first, then render a focused UI state.
export function AdminAssignmentsPage() {
  const navigate = useNavigate();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [liveClients, setLiveClients] = useState<FirmClientAccount[] | null>(null);
  const [liveAccountants, setLiveAccountants] = useState<ManagedAccountant[] | null>(null);
  const [liveAssignments, setLiveAssignments] = useState<BackendAssignmentRecord[] | null>(null);
  const [handoverByClientId, setHandoverByClientId] = useState<
    Record<string, { reason: string; message: string; effectiveDate: string }>
  >({});

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isMounted = true;

    async function loadLiveAssignments() {
      try {
        const [clients, assignments, users] = await Promise.all([
          apiGetJson<BackendClientRecord[]>("/api/clients"),
          apiGetJson<BackendAssignmentRecord[]>("/api/assignments"),
          apiGetJson<BackendAdminUserRecord[]>("/api/admin/users"),
        ]);

        if (!isMounted) {
          return;
        }

        const mappedAccountants = mapLiveAccountants(users, assignments);
        setLiveAssignments(assignments);
        setLiveAccountants(mappedAccountants);
        setLiveClients(mapLiveClients(clients, assignments, mappedAccountants));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedbackMessage(
          error instanceof ApiError
            ? error.message
            : "The live assignments view could not be loaded, so the seeded workspace is still shown.",
        );
      }
    }

    void loadLiveAssignments();

    return () => {
      isMounted = false;
    };
  }, [backendMode]);

  const clients = backendMode && liveClients ? liveClients : portal.adminClients;
  const accountants = backendMode && liveAccountants ? liveAccountants : portal.managedAccountants;
  const assignments = liveAssignments ?? [];

  const accountantOptions = useMemo(
    () =>
      accountants
        .map((accountant) => ({
          label: accountant.name,
          value: accountant.id,
        }))
        .concat([{ label: "Unassigned", value: "" }]),
    [accountants],
  );

  function getHandover(clientId: string) {
    return (
      handoverByClientId[clientId] ?? {
        reason: "",
        message: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      }
    );
  }

  function updateHandover(
    clientId: string,
    key: "reason" | "message" | "effectiveDate",
    value: string,
  ) {
    const current = getHandover(clientId);
    setHandoverByClientId((state) => ({
      ...state,
      [clientId]: {
        ...current,
        [key]: value,
      },
    }));
  }

  async function reloadLiveAssignments() {
    const [clientsData, assignmentsData, users] = await Promise.all([
      apiGetJson<BackendClientRecord[]>("/api/clients"),
      apiGetJson<BackendAssignmentRecord[]>("/api/assignments"),
      apiGetJson<BackendAdminUserRecord[]>("/api/admin/users"),
    ]);

    const mappedAccountants = mapLiveAccountants(users, assignmentsData);
    setLiveAssignments(assignmentsData);
    setLiveAccountants(mappedAccountants);
    setLiveClients(mapLiveClients(clientsData, assignmentsData, mappedAccountants));
  }

  async function handlePrimaryAssignmentChange(client: FirmClientAccount, accountantUserId: string) {
    const handover = getHandover(client.id);
    if (!handover.reason.trim() || !handover.message.trim() || !handover.effectiveDate) {
      setFeedbackMessage("Provide assignment reason, handover message, and effective date before assigning.");
      return;
    }

    if (!accountantUserId) {
      setFeedbackMessage("Unassigning a client is not available in the live backend yet.");
      return;
    }

    const currentPrimary =
      assignments.find((assignment) => assignment.clientId === client.id && assignment.isPrimary) ?? null;
    const existingTarget =
      assignments.find(
        (assignment) =>
          assignment.clientId === client.id && assignment.accountantUserId === accountantUserId,
      ) ?? null;

    try {
      if (currentPrimary && currentPrimary.accountantUserId !== accountantUserId) {
        await apiPostJson("/api/assignments/reassign", {
          clientId: client.id,
          fromAccountantUserId: currentPrimary.accountantUserId,
          toAccountantUserId: accountantUserId,
          makePrimary: true,
        });
      } else if (existingTarget && !existingTarget.isPrimary) {
        await apiPostJson(`/api/assignments/${encodeURIComponent(existingTarget.id)}/make-primary`, {});
      } else if (!currentPrimary) {
        await apiPostJson("/api/assignments", {
          accountantUserId,
          clientId: client.id,
          isPrimary: true,
        });
      }

      await reloadLiveAssignments();
      setFeedbackMessage(
        `Primary accountant updated for ${client.clientName}. Handover effective ${handover.effectiveDate}.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiError ? error.message : "Could not update the client assignment.",
      );
    }
  }

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-6">
      <PageHeader
        description="Use this page to assign accountants to clients without leaving the firm operations workflow."
        eyebrow="Admin assignments"
        title="Assign accountants"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-4">
        {clients.map((client) => (
          <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_220px_220px_auto]" key={client.id}>
            <div>
              <p className="text-sm font-semibold text-slate-950">{client.clientName}</p>
              <p className="mt-1 text-sm text-slate-500">{client.industry}</p>
              <p className="mt-1 text-xs text-slate-500">
                Backup: {client.backupAccountant ?? "None"} / {(client.isActive ?? true) ? "Active" : "Inactive"}
              </p>
              {client.lastAssignmentReason ? (
                <p className="mt-2 text-xs text-slate-500">
                  Last handover: {client.lastAssignmentReason} / {client.lastAssignmentEffectiveDate?.slice(0, 10)} by {client.lastAssignmentBy}
                </p>
              ) : null}
            </div>
            <SelectField
              label="Primary accountant"
              hint={backendMode ? "Saved to the live backend assignment service." : undefined}
              onChange={(event) => {
                if (backendMode) {
                  void handlePrimaryAssignmentChange(client, event.target.value);
                  return;
                }

                const selectedAccountant = portal.managedAccountants.find(
                  (accountant) => accountant.id === event.target.value,
                );
                const handover = getHandover(client.id);
                if (!handover.reason.trim() || !handover.message.trim() || !handover.effectiveDate) {
                  setFeedbackMessage("Provide assignment reason, handover message, and effective date before assigning.");
                  return;
                }
                const result = portal.assignClientAccountant(
                  client.id,
                  selectedAccountant?.name ?? event.target.value,
                  selectedAccountant?.id,
                  {
                    reason: handover.reason.trim(),
                    message: handover.message.trim(),
                    effectiveDate: new Date(handover.effectiveDate).toISOString(),
                    assignedBy: "Admin",
                  },
                );
                setFeedbackMessage(result.message);
              }}
              options={accountantOptions}
              value={
                client.assignedAccountantUserId ??
                accountants.find(
                  (accountant) => accountant.name === client.assignedAccountant,
                )?.id ??
                ""
              }
            />
            <SelectField
              disabled={backendMode}
              hint={backendMode ? "Backup accountant assignment is still using seeded demo behavior." : undefined}
              label="Backup accountant"
              onChange={(event) => {
                if (backendMode) {
                  setFeedbackMessage("Backup accountant updates are not exposed by the live backend yet.");
                  return;
                }

                const selectedAccountant = portal.managedAccountants.find(
                  (accountant) => accountant.id === event.target.value,
                );
                const result = portal.assignClientAccountantBackup(
                  client.id,
                  selectedAccountant?.name ?? event.target.value,
                  selectedAccountant?.id,
                );
                setFeedbackMessage(result.message);
              }}
              options={[
                { label: "None", value: "" },
                ...portal.managedAccountants.map((accountant) => ({
                  label: accountant.name,
                  value: accountant.id,
                })),
              ]}
              value={client.backupAccountantUserId ?? ""}
            />
            <div className="flex items-end">
              <Button
                onClick={() => navigate(`/firm/clients/${client.id}`)}
                variant="secondary"
              >
                Open client
              </Button>
            </div>
            <div className="md:col-span-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_180px]">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => updateHandover(client.id, "reason", event.target.value)}
                placeholder="Assignment reason (required)"
                value={getHandover(client.id).reason}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => updateHandover(client.id, "message", event.target.value)}
                placeholder="Message to accountant (required)"
                value={getHandover(client.id).message}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => updateHandover(client.id, "effectiveDate", event.target.value)}
                type="date"
                value={getHandover(client.id).effectiveDate}
              />
            </div>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
