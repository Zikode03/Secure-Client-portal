import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
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
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      setFeedback({
        tone: "warning",
        title: "Backend required",
        message: "Client administration requires the live backend API.",
      });
      return;
    }

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [clientRows, assignmentRows] = await Promise.all([
          apiGetJson<ClientRecord[]>("/api/clients"),
          apiGetJson<AssignmentRecord[]>("/api/assignments"),
        ]);
        if (!mounted) return;
        setClients(clientRows);
        setAssignments(assignmentRows);
        setFeedback(null);
      } catch (error) {
        if (!mounted) return;
        setFeedback({
          tone: "danger",
          title: "Clients could not be loaded",
          message: error instanceof ApiError ? error.message : "The admin client register could not be loaded.",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [backendMode]);

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
      const matchesQuery =
        !needle ||
        client.name.toLowerCase().includes(needle) ||
        client.entityType.toLowerCase().includes(needle) ||
        client.accountantName.toLowerCase().includes(needle) ||
        (client.email ?? "").toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || client.status.toLowerCase() === statusFilter;
      const assigned = Boolean(client.accountantUserId);
      const matchesAssignment =
        assignmentFilter === "all" ||
        (assignmentFilter === "assigned" ? assigned : !assigned);
      return matchesQuery && matchesStatus && matchesAssignment;
    });
  }, [assignmentFilter, enrichedClients, query, statusFilter]);

  const stats = useMemo(() => ({
    total: enrichedClients.length,
    active: enrichedClients.filter((client) => client.status.toLowerCase() === "active").length,
    unassigned: enrichedClients.filter((client) => !client.accountantUserId).length,
    atRisk: enrichedClients.filter((client) => client.complianceHealth < 60).length,
  }), [enrichedClients]);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={() => navigate("/firm/admin/assignments")}>Manage assignments</Button>}
        description="Control client coverage, ownership, status and risk from an administrator-first register."
        eyebrow="Administration"
        title="Client management"
      />

      {feedback ? (
        <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total clients", stats.total, "All organisations in the firm"],
          ["Active clients", stats.active, "Currently active accounts"],
          ["Unassigned", stats.unassigned, "Need accountant ownership"],
          ["At risk", stats.atRisk, "Compliance health below 60%"],
        ].map(([label, value, helper]) => (
          <SurfaceCard className="space-y-2" key={String(label)}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
            <p className="text-sm text-slate-500">{helper}</p>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="portal-section-title text-slate-950">Firm client register</h2>
            <p className="mt-1 text-sm text-slate-500">Use this as the admin ownership view; accountants continue to use their portfolio workspace.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[660px]">
            <TextField label="Search" onChange={(event) => setQuery(event.target.value)} value={query} />
            <SelectField label="Status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
            <SelectField label="Ownership" onChange={(event) => setAssignmentFilter(event.target.value)} value={assignmentFilter}>
              <option value="all">All clients</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </SelectField>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Primary accountant</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Coverage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-950">{client.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{client.entityType} · {client.email || client.primaryContact || "No contact recorded"}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{client.accountantName}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${healthTone(client.complianceHealth)}`}>
                      {client.complianceHealth}%
                    </span>
                  </td>
                  <td className="px-4 py-4 capitalize text-slate-600">{client.status}</td>
                  <td className="px-4 py-4 text-slate-600">{client.assignmentCount} assignment{client.assignmentCount === 1 ? "" : "s"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => navigate(`/firm/clients/${client.id}/profile`)} variant="secondary">Open profile</Button>
                      <Button onClick={() => navigate("/firm/admin/assignments")} variant="secondary">Assign</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredClients.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>No clients match the current filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
