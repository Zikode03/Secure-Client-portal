import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientOnboardingForm, type ClientOnboardingResult } from "../../components/clients/ClientOnboardingForm";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { RecordActions } from "../../components/ui/RecordActions";
import { ArrowUpRight, Building2, Search, UsersRound } from "lucide-react";
import { ApiError, apiDelete, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface ClientRecord {
  id: string;
  name: string;
  entityType: string;
  industry?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [showOnboarding, setShowOnboarding] = useState(searchParams.get("add") === "1");
  const [onboarded, setOnboarded] = useState<ClientOnboardingResult | null>(null);
  function closeOnboarding() {
    setShowOnboarding(false);
    if (searchParams.has("add")) { const next = new URLSearchParams(searchParams); next.delete("add"); setSearchParams(next, { replace: true }); }
  }
  const backendMode = hasApiBaseUrl();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  async function load() {
    if (!backendMode) {
      setLoading(false);
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
      const matchesQuery = !needle || client.name.toLowerCase().includes(needle) || client.entityType.toLowerCase().includes(needle) || (client.industry ?? "").toLowerCase().includes(needle) || client.accountantName.toLowerCase().includes(needle) || (client.email ?? "").toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || client.status.toLowerCase() === statusFilter;
      const assigned = Boolean(client.accountantUserId);
      const matchesAssignment = assignmentFilter === "all" || (assignmentFilter === "assigned" ? assigned : !assigned);
      return matchesQuery && matchesStatus && matchesAssignment;
    });
  }, [assignmentFilter, enrichedClients, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = Boolean(query || statusFilter !== "all" || assignmentFilter !== "all");
  function clearFilters() { setQuery(""); setStatusFilter("all"); setAssignmentFilter("all"); }
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
      <PageHeader
        title="Client management"
        eyebrow="Administration"
        description="Manage your clients, accountant ownership and compliance."
        actions={<><Button variant="secondary" onClick={() => navigate("/firm/admin/assignments")}><UsersRound aria-hidden="true" className="h-4 w-4" />Manage assignments</Button><Button disabled={!backendMode || showOnboarding} onClick={() => { setOnboarded(null); setShowOnboarding(true); }}>Add client</Button></>}
      />

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}
      {showOnboarding && <ClientOnboardingForm onCancel={closeOnboarding} onCreated={result => {
        closeOnboarding(); setOnboarded(result); clearFilters();
        void load().then(() => setFeedback({ tone: result.userCreated && result.invitationDelivery !== "smtp" ? "warning" : "success", title: "Client saved", message: result.message }));
      }} />}
      {onboarded && <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-slate-600">Next: confirm {onboarded.clientName}'s registrations.</span><Button onClick={() => navigate(`/firm/compliance?clientId=${encodeURIComponent(onboarded.clientId)}&setup=1`)}>Set up compliance profile</Button><Button variant="secondary" onClick={() => navigate(`/firm/clients/${onboarded.clientId}/profile`)}>Open business profile</Button></div>}

      <section aria-label="Client register" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-950">All clients</h2>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{loading ? "…" : enrichedClients.length}</span>
          </div>
          {!loading ? <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span><span className={unassignedCount ? "font-semibold text-amber-700" : "font-semibold text-slate-700"}>{unassignedCount}</span> unassigned</span>
            <span title="Clients below 60% compliance health"><span className={atRiskCount ? "font-semibold text-rose-700" : "font-semibold text-slate-700"}>{atRiskCount}</span> below 60% health</span>
          </div> : null}
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="block space-y-2 sm:col-span-2 lg:col-span-1">
            <span className="text-sm font-medium text-slate-700">Search clients</span>
            <span className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100" placeholder="Name, email, industry or accountant" value={query} onChange={(event) => setQuery(event.target.value)} />
            </span>
          </label>
          <SelectField label="Status" onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} value={statusFilter} />
          <SelectField label="Ownership" onChange={(event) => setAssignmentFilter(event.target.value)} options={ownershipOptions} value={assignmentFilter} />
          <button type="button" disabled={!hasFilters} onClick={clearFilters} className="h-11 rounded-lg px-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 disabled:text-slate-400 disabled:hover:bg-transparent">Reset filters</button>
        </div>

        <div className="overflow-x-auto border-y border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Client directory with accountant ownership, compliance health and account actions</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">
              <tr><th scope="col" className="w-[34%] px-4 py-3">Client</th><th scope="col" className="w-[25%] px-4 py-3">Accountant</th><th scope="col" className="px-4 py-3">Compliance</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {!loading && pagedClients.map((client) => {
                const busy = busyClientId === client.id;
                const active = client.status.toLowerCase() === "active";
                return <tr key={client.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-brand-700"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <button type="button" disabled={busy} className="group inline-flex items-center gap-1.5 text-left font-semibold text-slate-950 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" onClick={() => navigate(`/firm/clients/${client.id}/profile`)}>
                          <span className="break-words">{client.name}</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-brand-700" />
                        </button>
                        <p className="mt-1 break-all text-xs text-slate-500">{client.email || client.primaryContact || "No contact recorded"}</p>
                        {client.entityType || client.industry ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {[client.entityType, client.industry].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className={client.accountantUserId ? "font-medium text-slate-700" : "font-medium text-amber-700"}>{client.accountantName}</p>
                    <p className="mt-1 text-xs text-slate-500">{client.assignmentCount} assignment{client.assignmentCount === 1 ? "" : "s"}</p>
                  </td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${healthTone(client.complianceHealth)}`}>{client.complianceHealth}%</span></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium capitalize text-slate-700"><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />{client.status}</span></td>
                  <td className="px-4 py-4 text-right">
                    <RecordActions label={`Actions for ${client.name}`} disabled={busy} actions={[
                      { label: "View profile", onSelect: () => navigate(`/firm/clients/${client.id}/profile`) },
                      { label: "Open monthly pack", onSelect: () => navigate(`/firm/clients/${client.id}/packs`) },
                      { label: "Manage assignment", onSelect: () => navigate("/firm/admin/assignments") },
                      { label: active ? "Deactivate client" : "Activate client", onSelect: () => void toggleStatus(client) },
                      { label: "Delete client", destructive: true, onSelect: () => void deleteClient(client) },
                    ]} />
                  </td>
                </tr>;
              })}
              {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500"><span role="status">Loading clients…</span></td></tr> : null}
              {!loading && pagedClients.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center">
                <p className="font-medium text-slate-700">{hasFilters ? "No matching clients" : "No clients to display"}</p>
                <p className="mt-1 text-sm text-slate-500">{hasFilters ? "Try another name or adjust the filters." : "Client records will appear here when available."}</p>
                {hasFilters ? <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">Clear filters</button> : <button type="button" onClick={() => void load()} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">Refresh register</button>}
              </td></tr> : null}
            </tbody>
          </table>
        </div>

        {!loading ? <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>{filteredClients.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredClients.length)} of ${filteredClients.length}` : "0"} client{filteredClients.length === 1 ? "" : "s"}</span>
          {pageCount > 1 ? <nav aria-label="Client pages" className="flex items-center gap-3">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 disabled:opacity-40">Previous</button>
            <span>Page {currentPage} of {pageCount}</span>
            <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 disabled:opacity-40">Next</button>
          </nav> : null}
        </footer> : null}
      </section>
    </div>
  );
}
