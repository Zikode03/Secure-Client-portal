// Friendly guide: this module (AdminAssignmentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { ArrowUpRight, Building2, Search, UserRound } from "lucide-react";
import { ApiError, apiDelete, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
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
      backupAccountant: backupAssignment?.accountantName ?? accountants.find((accountant) => accountant.id === backupAssignment?.accountantUserId)?.name,
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
  const [query, setQuery] = useState("");
  const [coverage, setCoverage] = useState<"all" | "unassigned" | "no_backup">("all");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"primary" | "backup">("primary");
  const [draftAccountantId, setDraftAccountantId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
            : "The live assignments view could not be loaded. No demo records are being shown.",
        );
      }
    }

    void loadLiveAssignments();

    return () => {
      isMounted = false;
    };
  }, [backendMode]);

  const clients = backendMode ? liveClients ?? [] : portal.adminClients;
  const accountants = backendMode ? liveAccountants ?? [] : portal.managedAccountants;
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

  const visibleClients = clients.filter((client) => {
    const matchesSearch = `${client.clientName} ${client.industry} ${client.assignedAccountant} ${client.backupAccountant ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesSearch && (coverage === "all" || (coverage === "unassigned" ? !client.assignedAccountantUserId : !client.backupAccountantUserId));
  });
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const currentAccountantId = selectedClient ? (assignmentType === "primary" ? selectedClient.assignedAccountantUserId : selectedClient.backupAccountantUserId) ?? "" : "";
  const selectedAccountantId = draftAccountantId ?? currentAccountantId;
  const selectedAccountant = accountants.find((accountant) => accountant.id === selectedAccountantId);
  const isLoading = backendMode && liveClients === null && !feedbackMessage;

  function openEditor(client: FirmClientAccount, type: "primary" | "backup" = "primary") {
    if (saving) return;
    setSelectedClientId(client.id);
    setAssignmentType(type);
    setDraftAccountantId(null);
    setFeedbackMessage("");
  }

  async function saveAssignment() {
    if (!selectedClient || saving || selectedAccountantId === currentAccountantId) return;
    if (assignmentType === "primary" && !selectedAccountantId) {
      setFeedbackMessage("Choose a primary accountant before saving.");
      return;
    }
    if (assignmentType === "primary") {
      const handover = getHandover(selectedClient.id);
      if (!handover.reason.trim() || !handover.message.trim() || !handover.effectiveDate) {
        setFeedbackMessage("Provide assignment reason, handover message, and effective date before assigning.");
        return;
      }
    }
    if (assignmentType === "backup" && selectedAccountantId && selectedAccountantId === selectedClient.assignedAccountantUserId) {
      setFeedbackMessage("Choose a different accountant for backup coverage.");
      return;
    }
    setSaving(true);
    setFeedbackMessage("");
    try {
      if (backendMode) {
        if (assignmentType === "primary") await handlePrimaryAssignmentChange(selectedClient, selectedAccountantId);
        else await handleBackupAssignmentChange(selectedClient, selectedAccountantId);
      } else {
        const handover = getHandover(selectedClient.id);
        const result = assignmentType === "primary"
          ? portal.assignClientAccountant(selectedClient.id, selectedAccountant?.name ?? selectedAccountantId, selectedAccountantId, {
            reason: handover.reason.trim(), message: handover.message.trim(), effectiveDate: new Date(handover.effectiveDate).toISOString(), assignedBy: "Admin",
          })
          : portal.assignClientAccountantBackup(selectedClient.id, selectedAccountant?.name ?? selectedAccountantId, selectedAccountantId);
        setFeedbackMessage(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

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

  async function handleBackupAssignmentChange(client: FirmClientAccount, accountantUserId: string) {
    const currentBackup = assignments.find(
      (assignment) => assignment.clientId === client.id && !assignment.isPrimary,
    );
    const selectedAssignment = assignments.find(
      (assignment) =>
        assignment.clientId === client.id && assignment.accountantUserId === accountantUserId,
    );

    if (selectedAssignment?.isPrimary) {
      setFeedbackMessage("The primary accountant cannot also be selected as the backup accountant.");
      return;
    }

    try {
      if (currentBackup && currentBackup.accountantUserId !== accountantUserId) {
        await apiDelete(`/api/assignments/${encodeURIComponent(currentBackup.id)}`);
      }

      if (accountantUserId && !selectedAssignment) {
        await apiPostJson("/api/assignments", {
          accountantUserId,
          clientId: client.id,
          isPrimary: false,
        });
      }

      await reloadLiveAssignments();
      setFeedbackMessage(
        accountantUserId
          ? `Backup accountant updated for ${client.clientName}.`
          : `Backup accountant removed from ${client.clientName}.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiError ? error.message : "Could not update the backup accountant.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Give every client a clear owner and the right backup support."
        eyebrow="Administration"
        title="Accountant assignments"
        actions={<Button variant="secondary" onClick={() => navigate("/firm/admin/accountants")}><UserRound aria-hidden="true" className="h-4 w-4" />View accountants</Button>}
      />

      {feedbackMessage ? <div role="status" className="border-l-2 border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-700">{feedbackMessage}</div> : null}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <section aria-label="Client coverage" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Client coverage</h2>
            <span className="text-xs text-slate-500">{clients.length} client{clients.length === 1 ? "" : "s"} · {accountants.length} accountant{accountants.length === 1 ? "" : "s"}</span>
          </div>

          <div role="group" aria-label="Coverage filters" className="flex flex-wrap gap-2">
            {([
              { value: "all", label: "All clients", count: clients.length },
              { value: "unassigned", label: "Unassigned", count: clients.filter((client) => !client.assignedAccountantUserId).length },
              { value: "no_backup", label: "No backup", count: clients.filter((client) => !client.backupAccountantUserId).length },
            ] as const).map((filter) => <button key={filter.value} type="button" aria-pressed={coverage === filter.value} onClick={() => setCoverage(filter.value)} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 ${coverage === filter.value ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"}`}>
              {filter.label}<span className="tabular-nums opacity-75">{filter.count}</span>
            </button>)}
          </div>

          <label className="relative block">
            <span className="sr-only">Search clients or accountants</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients or accountants" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </label>

          <div className="overflow-x-auto border-y border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <caption className="sr-only">Client primary and backup accountant assignments</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-[0.68rem] uppercase tracking-wider text-slate-500">
                <tr><th scope="col" className="px-3 py-3">Client</th><th scope="col" className="px-3 py-3">Primary / backup</th><th scope="col" className="px-3 py-3"><span className="sr-only">Assignment actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {!isLoading && visibleClients.map((client) => <tr key={client.id} className={selectedClientId === client.id ? "bg-brand-50/60" : "transition hover:bg-slate-50"}>
                  <td className="px-3 py-4 align-top">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-brand-700"><Building2 aria-hidden="true" className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <button type="button" disabled={saving} onClick={() => openEditor(client)} className="text-left font-semibold text-slate-950 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">{client.clientName}</button>
                        <p className="mt-1 text-xs text-slate-500">{client.industry}</p>
                        <p className="mt-1 text-xs text-slate-400">{(client.isActive ?? true) ? "Active" : "Inactive"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className={client.assignedAccountantUserId ? "font-medium text-slate-700" : "font-medium text-amber-700"}>{client.assignedAccountant}</p>
                    <p className="mt-1 text-xs text-slate-500">{client.backupAccountant ? `Backup: ${client.backupAccountant}` : "No backup assigned"}</p>
                  </td>
                  <td className="px-3 py-4 text-right align-top"><button type="button" aria-label={`Edit assignment for ${client.clientName}`} aria-expanded={selectedClientId === client.id} aria-controls="assignment-editor" disabled={saving} onClick={() => openEditor(client)} className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">Edit</button></td>
                </tr>)}
                {isLoading ? <tr><td colSpan={3} className="px-3 py-12 text-center text-slate-500"><span role="status">Loading assignments…</span></td></tr> : null}
                {!isLoading && !visibleClients.length ? <tr><td colSpan={3} className="px-3 py-12 text-center text-slate-500">No clients match this view.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside id="assignment-editor" aria-label="Assignment editor" className="min-w-0 border-t border-slate-200 pt-6 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
          {selectedClient ? <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void saveAssignment(); }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignment details</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedClient.clientName}</h2>
                <p className="mt-1 text-xs text-slate-500">Changes apply only when you save.</p>
              </div>
              <button type="button" aria-label={`Open ${selectedClient.clientName} profile`} onClick={() => navigate(`/firm/clients/${selectedClient.id}`)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"><ArrowUpRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>

            <fieldset disabled={saving} className="min-w-0 space-y-5">
              <div role="group" aria-label="Assignment type" className="grid grid-cols-2 gap-2">
                {(["primary", "backup"] as const).map((type) => <button key={type} type="button" aria-pressed={assignmentType === type} onClick={() => { setAssignmentType(type); setDraftAccountantId(null); }} className={`h-10 rounded-lg border text-sm font-semibold transition ${assignmentType === type ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"}`}>{type === "primary" ? "Primary owner" : "Backup support"}</button>)}
              </div>
              <SelectField
                label={assignmentType === "primary" ? "Primary accountant" : "Backup accountant"}
                value={selectedAccountantId}
                required={assignmentType === "primary"}
                onChange={(event) => setDraftAccountantId(event.target.value)}
                options={assignmentType === "primary" ? accountantOptions.map((option) => option.value ? option : { label: "Select an accountant", value: "" }) : [{ label: "No backup", value: "" }, ...accountants.filter((accountant) => accountant.id !== selectedClient.assignedAccountantUserId).map((accountant) => ({ label: accountant.name, value: accountant.id }))]}
              />
              {selectedAccountant ? <div className="flex items-start gap-2 text-xs text-slate-500"><UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="break-all">{selectedAccountant.email}</p><p className="mt-1">{selectedAccountant.assignedClientCount} current assignment{selectedAccountant.assignedClientCount === 1 ? "" : "s"}</p></div></div> : null}

              {assignmentType === "primary" ? <div className="space-y-4 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Handover details</p>
                <TextField label="Assignment reason" required placeholder="Why is ownership changing?" value={getHandover(selectedClient.id).reason} onChange={(event) => updateHandover(selectedClient.id, "reason", event.target.value)} />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Message to accountant</span>
                  <textarea required rows={3} placeholder="Include context for the handover" value={getHandover(selectedClient.id).message} onChange={(event) => updateHandover(selectedClient.id, "message", event.target.value)} className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                </label>
                <TextField label="Effective date" required type="date" value={getHandover(selectedClient.id).effectiveDate} onChange={(event) => updateHandover(selectedClient.id, "effectiveDate", event.target.value)} />
              </div> : <p className="text-sm leading-6 text-slate-500">Choose a second accountant for backup coverage. The primary owner stays unchanged.</p>}

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                <Button type="submit" disabled={saving || selectedAccountantId === currentAccountantId}>{saving ? "Saving…" : "Save assignment"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setSelectedClientId(""); setDraftAccountantId(null); }}>Cancel</Button>
              </div>
            </fieldset>
          </form> : <div className="py-10">
            <UserRound aria-hidden="true" className="h-7 w-7 text-slate-400" />
            <h2 className="mt-4 font-semibold text-slate-950">Select a client</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Choose Edit to manage a client's primary owner or backup support. You'll review the change here before saving.</p>
          </div>}
        </aside>
      </div>
    </div>
  );
}
