import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiDelete, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface ClientRecord {
  id: string;
  name: string;
  entityType: string;
  status: string;
  complianceHealth: number;
  assignedAccountantId?: string | null;
  primaryContact?: string | null;
  email?: string | null;
}

interface AssignmentRecord {
  id: string;
  clientId: string;
  clientName?: string | null;
  accountantUserId: string;
  accountantName?: string | null;
  isPrimary: boolean;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const PAGE_SIZE = 10;
const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];
const ownershipOptions = [
  { label: "All clients", value: "all" },
  { label: "Assigned", value: "assigned" },
  { label: "Unassigned", value: "unassigned" },
];

function healthTone(value: number) {
  if (value >= 80) return "bg-emerald-50 text-emerald-700";
  if (value >= 60) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

export function AdminClientsPage() {
  const navigate = useNavigate();
  const backendMode = hasApiBaseUrl();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  async function load() {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Backend required", message: "Client administration requires the live backend API." });
      return;
    }

    setLoading(true);
    try {
      const [clientRows, assignmentRows] = await Promise.all([
        apiGetJson<ClientRecord[]>("/api/clients"),
        apiGetJson<AssignmentRecord[]>("/api/assignments"),
      ]);
      setClients(clientRows);
      setAssignments(assignmentRows);
      setFeedback(null);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Clients could not be loaded", message: error instanceof ApiError ? error.message : "The admin client register could not be loaded." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [backendMode]);
  useEffect(() => { setPage(1); }, [query, statusFilter, assignmentFilter]);

  const enrichedClients = useMemo(() => clients.map((client) => {
    const clientAssignments = assignments.filter((assignment) => assignment.clientId === client.id);
    const primary = clientAssignments.find((assignment) => assignment.isPrimary) ?? clientAssignments[0];
    return {
      ...client,
      accountantName: primary?.accountantName ?? "Unassigned",
      accountantUserId: primary?.accountantUserId ?? client.assignedAccountantId ?? null,
      assignmentCount: clientAssignments.length,
    };
  }), [assignments, clients]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return enrichedClients.filter((client) => {
      const matchesQuery = !needle || client.name.toLowerCase().includes(needle) || client.entityType.toLowerCase().includes(needle) || client.accountantName.toLowerCase().includes(needle) || (client.email ?? "").toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || client.status.toLowerCase() === statusFilter;
      const assigned = Boolean(client.accountantUserId);
      const matchesAssignment = assignmentFilter === "all" || (assignmentFilter === "assigned" ? assigned : !assigned);
      return matchesQuery && matchesStatus && matchesAssignment;
    });
  }, [assignmentFilter, enrichedClients, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const pagedClients = filteredClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const unassignedCount = enrichedClients.filter((client) => !client.accountantUserId).length;
  const atRiskCount = enrichedClients.filter((client) => client.complianceHealth < 60).length;

  async function toggleStatus(client: ClientRecord) {
    const isActive = client.status.toLowerCase() === "active";
    const nextStatus = isActive ? "inactive" : "active";
    if (!window.confirm(`${isActive ? "Deactivate" : "Activate"} ${client.name}?`)) return;

    setBusyClientId(client.id);
    try {
      await apiPutJson<ClientRecord, { status: string }>(`/api/clients/${client.id}/status`, { status: nextStatus });
      setFeedback({ tone: "success", title: `Client ${nextStatus}`, message: `${client.name} is now ${nextStatus}.` });
      await load();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Client status update failed", message: error instanceof ApiError ? error.message : "The client status could not be updated." });
    } finally {
      setBusyClientId(null);
    }
  }

  async function deleteClient(client: ClientRecord) {
    const confirmed = window.confirm(`Permanently delete ${client.name}? This cannot be undone.`);
    if (!confirmed) return;
    const verification = window.prompt(`Type DELETE to confirm permanent deletion of ${client.name}.`);
    if (verification !== "DELETE") return;

    setBusyClientId(client.id);
    try {
      await apiDelete(`/api/clients/${client.id}`);
      setFeedback({ tone: "success", title: "Client deleted", message: `${client.name} was permanently removed.` });
      await load();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Client could not be deleted", message: error instanceof ApiError ? error.message : "The client could not be deleted." });
    } finally {
      setBusyClientId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader actions={<Button onClick={() => navigate("/firm/admin/assignments")}>Manage assignments</Button>} description="Control client coverage, lifecycle, ownership and risk from an administrator-first register." eyebrow="Administration" title="Client management" />

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="portal-section-title text-slate-950">Firm client register</h2>
            <p className="mt-1 text-sm text-slate-500">
              {enrichedClients.length} clients · {unassignedCount} unassigned · {atRiskCount} below 60% compliance health.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[660px]">
            <TextField label="Search" onChange={(event) => setQuery(event.target.value)} value={query} />
            <SelectField label="Status" onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} value={statusFilter} />
            <SelectField label="Ownership" onChange={(event) => setAssignmentFilter(event.target.value)} options={ownershipOptions} value={assignmentFilter} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Primary accountant</th><th className="px-4 py-3">Health</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Coverage</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedClients.map((client) => {
                const busy = busyClientId === client.id;
                const active = client.status.toLowerCase() === "active";
                return <tr key={client.id}>
                  <td className="px-4 py-4"><p className="font-semibold text-slate-950">{client.name}</p><p className="mt-1 text-xs text-slate-500">{client.entityType} · {client.email || client.primaryContact || "No contact recorded"}</p></td>
                  <td className="px-4 py-4 text-slate-700">{client.accountantName}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${healthTone(client.complianceHealth)}`}>{client.complianceHealth}%</span></td>
                  <td className="px-4 py-4 capitalize text-slate-600">{client.status}</td>
                  <td className="px-4 py-4 text-slate-600">{client.assignmentCount} assignment{client.assignmentCount === 1 ? "" : "s"}</td>
                  <td className="px-4 py-4"><div className="flex flex-wrap justify-end gap-2">
                    <Button disabled={busy} onClick={() => navigate(`/firm/clients/${client.id}/profile`)} size="sm" variant="secondary">Profile</Button>
                    <Button disabled={busy} onClick={() => navigate("/firm/admin/assignments")} size="sm" variant="secondary">Assign</Button>
                    <Button disabled={busy} onClick={() => void toggleStatus(client)} size="sm" variant="secondary">{active ? "Deactivate" : "Activate"}</Button>
                    <Button disabled={busy} onClick={() => void deleteClient(client)} size="sm" variant="danger">Delete</Button>
                  </div></td>
                </tr>;
              })}
              {!loading && pagedClients.length === 0 ? <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>No clients match the current filters.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{filteredClients.length} client{filteredClients.length === 1 ? "" : "s"} · Page {page} of {pageCount}</span>
          <div className="flex gap-2"><Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" variant="secondary">Previous</Button><Button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} size="sm" variant="secondary">Next</Button></div>
        </div>
      </SurfaceCard>
    </div>
  );
}
