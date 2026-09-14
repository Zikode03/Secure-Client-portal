import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, FileText, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import { hasPermission } from "../../utils/permissions";
import { formatDateLabel } from "../../utils/formatters";
import type { Tone } from "../../types/portal";
import "./complianceCentre.css";
import { ComplianceMonitoringWorkspace } from "../../components/compliance/ComplianceMonitoringWorkspace";

interface ComplianceItem {
  id: string; clientId: string; name: string; status: string;
  categoryId?: string; categoryName?: string | null; ownerName?: string | null;
  dueDateUtc?: string | null; expiryDateUtc?: string | null;
  linkedDocumentId?: string | null; riskLevel?: string; alertLevel?: string | null;
}
interface Client { id: string; name: string }
interface Category { id: string; name: string; isActive?: boolean }
type Notice = { tone: Tone; title: string; message: string };
type Group = "attention" | "review" | "valid";
const blankItem = { clientId: "", categoryId: "", name: "", due: "", expiry: "" };
const labels: Record<string, string> = { valid: "Valid", pending: "Pending review", missing: "Missing evidence", rejected: "Rejected", expired: "Expired", expiring_soon: "Expiring soon" };

function groupFor(item: ComplianceItem): Group {
  if (item.alertLevel || ["missing", "rejected", "expired", "expiring_soon"].includes(item.status)) {
    return item.status === "pending" ? "review" : "attention";
  }
  return item.status === "valid" ? "valid" : item.status === "pending" ? "review" : "attention";
}
function nextStep(item: ComplianceItem) {
  if (item.status === "pending") return "Review the supporting evidence";
  if (item.status === "missing") return "Request supporting evidence";
  if (item.status === "rejected") return "Request corrected evidence";
  if (item.status === "expired" || item.status === "expiring_soon" || item.alertLevel) return "Check dates and arrange renewal";
  if (item.status === "valid") return "No action currently flagged";
  return "Check this record with the responsible accountant";
}
function displayDate(value?: string | null) { return value ? formatDateLabel(value) : "Not set"; }

export function AccountantComplianceCentrePage() {
  return <ComplianceMonitoringWorkspace records={<AccountantComplianceRecordsPage />} />;
}

function AccountantComplianceRecordsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState<Group | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(blankItem);
  const [busy, setBusy] = useState(false);
  const [requestDue, setRequestDue] = useState("");
  const [page, setPage] = useState(1);
  const canManage = hasPermission(user, "review:documents");
  const canRequest = hasPermission(user, "request:documents");
  const canExport = hasPermission(user, "export:firm_reports") || hasPermission(user, "export:client_reports");

  useEffect(() => {
    if (selectedId) document.getElementById("compliance-item-actions")?.focus();
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    Promise.resolve().then(async () => {
      if (!hasApiBaseUrl()) throw new Error("Connect the backend to load compliance records.");
      const [records, clientRows, categoryRows] = await Promise.all([
        apiGetJson<ComplianceItem[]>("/api/compliance/items"),
        apiGetJson<Client[]>("/api/clients"),
        apiGetJson<Category[]>("/api/compliance/categories"),
      ]);
      if (!active) return;
      setItems(records); setClients(clientRows); setCategories(categoryRows); setLoadState("ready");
    }).catch(error => {
      if (!active) return;
      setItems([]); setClients([]); setCategories([]); setLoadState("error");
      setNotice({ tone: "danger", title: "Compliance records unavailable", message: error instanceof Error ? error.message : "Please try again." });
    });
    return () => { active = false; };
  }, [reload, user?.id]);

  const clientName = (id: string) => clients.find(client => client.id === id)?.name ?? "Client unavailable";
  const visible = useMemo(() => items.filter(item => {
    const name = clients.find(client => client.id === item.clientId)?.name ?? "";
    return (clientFilter === "all" || item.clientId === clientFilter)
      && (statusFilter === "all" || item.status === statusFilter)
      && (groupFilter === "all" || groupFor(item) === groupFilter)
      && `${item.name} ${name} ${item.categoryName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => {
    const order = { attention: 0, review: 1, valid: 2 };
    return order[groupFor(a)] - order[groupFor(b)] || a.name.localeCompare(b.name);
  }), [items, clients, query, clientFilter, statusFilter, groupFilter]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visible.length / 10)));
  const selected = items.find(item => item.id === selectedId);
  const ready = loadState === "ready";
  const metrics = [
    { label: "Tracked items", value: items.length, icon: <FileText />, group: "all" as const },
    { label: "Needs attention", value: items.filter(item => groupFor(item) === "attention").length, icon: <AlertTriangle />, group: "attention" as const },
    { label: "Pending review", value: items.filter(item => groupFor(item) === "review").length, icon: <Clock3 />, group: "review" as const },
    { label: "Valid records", value: items.filter(item => groupFor(item) === "valid").length, icon: <ShieldCheck />, group: "valid" as const },
  ];
  function resetFilters() { setQuery(""); setClientFilter("all"); setStatusFilter("all"); setGroupFilter("all"); setPage(1); }
  async function createItem(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !ready || !canManage || !draft.name.trim()) return;
    setBusy(true); setNotice(null);
    try {
      const created = await apiPostJson<ComplianceItem, object>("/api/compliance/items", {
        clientId: draft.clientId, categoryId: draft.categoryId, name: draft.name.trim(),
        status: "missing", ownerUserId: null, riskLevel: "medium", requiredDocumentCategory: null,
        dueDateUtc: draft.due ? new Date(draft.due + "T00:00:00Z").toISOString() : null,
        expiryDateUtc: draft.expiry ? new Date(draft.expiry + "T00:00:00Z").toISOString() : null,
      });
      setItems(rows => [...rows, created]); setCreating(false); setDraft(blankItem); resetFilters();
      setNotice({ tone: "success", title: "Compliance item created", message: "The record is saved with missing evidence. Request the supporting document when you are ready." });
    } catch (error) { setNotice({ tone: "danger", title: "Could not create item", message: error instanceof Error ? error.message : "Your entries are still here." }); }
    finally { setBusy(false); }
  }
  async function requestEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy || !canRequest) return;
    setBusy(true); setNotice(null);
    try {
      await apiPostJson<unknown, object>(`/api/compliance/items/${encodeURIComponent(selected.id)}/request`, {
        requestType: selected.status === "rejected" ? "reupload_required" : ["expired", "expiring_soon"].includes(selected.status) ? "compliance_renewal" : "missing_document",
        dueDateUtc: requestDue ? new Date(requestDue + "T00:00:00Z").toISOString() : null,
        comments: `Please provide supporting evidence for ${selected.name}.`,
      });
      setNotice({ tone: "success", title: "Request created", message: `A document request for ${selected.name} was saved. Track the conversation in Inbox.` });
      setSelectedId(null); setRequestDue("");
    } catch (error) { setNotice({ tone: "danger", title: "Request failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }
  function exportRecords() {
    const rows = visible.map(item => [item.name, clientName(item.clientId), item.categoryName ?? "", labels[item.status] ?? item.status, item.ownerName ?? "Unassigned", displayDate(item.dueDateUtc), displayDate(item.expiryDateUtc), nextStep(item)]);
    const csv = [["Item", "Client", "Category", "Recorded status", "Owner", "Due", "Expiry", "Next step"], ...rows].map(row => row.map(value => {
      const safe = /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "compliance-register.csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  return <div className="firm-compliance space-y-6">
    <PageHeader title="Compliance Centre" eyebrow={user?.role === "admin" ? "Firm oversight" : "Client oversight"}
      description="See which compliance records need evidence, review or renewal."
      actions={<><Button variant="secondary" onClick={() => navigate("/firm/compliance/calendar")}>Open calendar</Button>{canManage && <Button disabled={!ready || busy} onClick={() => setCreating(value => !value)}>{creating ? "Close new item" : "Add compliance item"}</Button>}</>} />

    <details className="compliance-help">
      <summary>How does Compliance Centre work?</summary>
      <div className="compliance-help-grid">
        <div><strong>1. Record the requirement</strong><p>Add the specific obligation or certificate for a client, with the relevant due or expiry date.</p></div>
        <div><strong>2. Collect the evidence</strong><p>Use Request documents for a missing or rejected record. The client supplies supporting documents.</p></div>
        <div><strong>3. Review and follow up</strong><p>The accounting team reviews the evidence and maintains the compliance record. Watch for renewals and unresolved alerts.</p></div>
      </div>
      <p className="compliance-help-note">Document Types define reusable documents. Pack Templates group monthly checklists. This centre tracks individual client compliance records. An uploaded file or a completed pack is not, by itself, proof of compliance.</p>
    </details>
    {notice && <FeedbackBanner {...notice} onDismiss={() => setNotice(null)} />}

    {creating && <form className="compliance-create" aria-label="New compliance item" onSubmit={createItem}>
      <div className="mb-4"><h2 className="text-slate-950">New compliance item</h2><p className="mt-1 text-sm text-slate-500">Create a record for one client. This does not send a document request yet.</p></div>
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-3">
        <SelectField label="Client" required options={[{ label: "Choose client", value: "" }, ...clients.map(client => ({ label: client.name, value: client.id }))]} value={draft.clientId} onChange={event => setDraft(value => ({ ...value, clientId: event.target.value }))} />
        <SelectField label="Category" required options={[{ label: "Choose category", value: "" }, ...categories.filter(category => category.isActive !== false).map(category => ({ label: category.name, value: category.id }))]} value={draft.categoryId} onChange={event => setDraft(value => ({ ...value, categoryId: event.target.value }))} />
        <TextField label="Requirement name" required placeholder="e.g. Tax clearance certificate" value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} />
        <TextField label="Due date" type="date" hint="When the action is due. Optional." value={draft.due} onChange={event => setDraft(value => ({ ...value, due: event.target.value }))} />
        <TextField label="Expiry date" type="date" hint="When existing evidence expires. Optional." value={draft.expiry} onChange={event => setDraft(value => ({ ...value, expiry: event.target.value }))} />
      </fieldset>
      {!categories.length && <p className="mt-3 text-sm text-amber-700">No compliance categories are configured. An administrator must configure them before items can be added.</p>}
      <div className="portal-page-header mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" disabled={busy || !categories.length || !clients.length}>{busy ? "Saving…" : "Create record"}</Button></div>
    </form>}

    <section aria-label="Compliance totals" className="compliance-metrics grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(metric =>
      <KpiCard key={metric.label} label={metric.label} icon={metric.icon} value={ready ? metric.value : "—"} accent={metric.group === "attention" && metric.value > 0} onClick={() => { resetFilters(); setGroupFilter(metric.group); }} />
    )}</section>

    <section className="compliance-register" aria-labelledby="compliance-register-title">
      <div className="compliance-register-heading"><div><h2 id="compliance-register-title" className="text-slate-950">Compliance register</h2><p className="mt-1 text-sm text-slate-500">Recorded statuses and backend alerts—not a monthly-pack completion score.</p></div>
        <div className="portal-page-header flex gap-3"><Button variant="secondary" disabled={loadState === "loading" || busy} onClick={() => { setNotice(null); setReload(value => value + 1); }}>Refresh</Button>{canExport && <Button variant="secondary" disabled={!ready || !visible.length} onClick={exportRecords}>Export</Button>}</div>
      </div>
      <div className="compliance-filters">
        <TextField label="Search records" placeholder="Requirement, client or category" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />
        <SelectField label="Client filter" options={[{ label: "All clients", value: "all" }, ...clients.map(client => ({ label: client.name, value: client.id }))]} value={clientFilter} onChange={event => { setClientFilter(event.target.value); setPage(1); }} />
        <SelectField label="Recorded status" options={[{ label: "All statuses", value: "all" }, ...[...new Set([...Object.keys(labels), ...items.map(item => item.status)])].map(status => ({ label: labels[status] ?? status, value: status }))]} value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }} />
      </div>
      {(query || clientFilter !== "all" || statusFilter !== "all" || groupFilter !== "all") && <div className="compliance-filter-note"><span>{groupFilter === "all" ? "Filters applied" : metrics.find(metric => metric.group === groupFilter)?.label}</span><button type="button" onClick={resetFilters}>Clear filters</button></div>}
      {loadState === "loading" ? <p role="status" className="compliance-empty">Loading compliance records…</p> : loadState === "error" ? <div className="compliance-empty"><p>Records could not be loaded. No compliance conclusion can be shown.</p><Button variant="secondary" onClick={() => setReload(value => value + 1)}>Retry</Button></div> : !visible.length ? <div className="compliance-empty"><FileText aria-hidden="true" size={28} /><h3 className="text-slate-950">{items.length ? "No matching records" : "No compliance records yet"}</h3><p>{items.length ? "Change or clear the filters." : "Add the requirements that apply to each client. An empty register does not mean the client is compliant."}</p></div> : <div className="overflow-x-auto">
        <table className="compliance-table"><thead><tr><th scope="col">Requirement / client</th><th scope="col">Recorded status</th><th scope="col">Dates</th><th scope="col">Next step</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {visible.slice((currentPage - 1) * 10, currentPage * 10).map(item => <tr key={item.id}>
            <th scope="row"><strong>{item.name}</strong><small>{clientName(item.clientId)} · {item.categoryName || "Uncategorised"}</small><small>Owner: {item.ownerName || "Unassigned"}</small></th>
            <td><span className={`compliance-state is-${groupFor(item)}`}>{labels[item.status] ?? item.status}</span>{item.alertLevel && <small>Alert: {item.alertLevel}</small>}</td>
            <td><small>Due: {displayDate(item.dueDateUtc)}</small><small>Expires: {displayDate(item.expiryDateUtc)}</small></td>
            <td className="compliance-next-step">{nextStep(item)}</td>
            <td><button type="button" className="compliance-open" aria-label={`Open ${item.name} for ${clientName(item.clientId)}`} onClick={() => { setSelectedId(item.id); setRequestDue(""); }}>Open <ArrowRight size={15} aria-hidden="true" /></button></td>
          </tr>)}
        </tbody></table>
      </div>}
      {ready && visible.length > 10 && <nav aria-label="Compliance pages" className="compliance-pagination"><span>Page {currentPage} of {Math.ceil(visible.length / 10)}</span><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button disabled={currentPage * 10 >= visible.length} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}
    </section>

    {selected && ready && <section id="compliance-item-actions" tabIndex={-1} className="compliance-detail" aria-label={`Actions for ${selected.name}`}>
      <div className="compliance-register-heading"><div><p className="text-xs text-slate-500">{clientName(selected.clientId)}</p><h2 className="text-slate-950">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">{nextStep(selected)}</p></div><button type="button" disabled={busy} onClick={() => setSelectedId(null)}>Close</button></div>
      <div className="portal-page-header flex flex-wrap gap-3"><Button variant="secondary" onClick={() => navigate(`/firm/clients/${selected.clientId}`)}>Open client workspace</Button>{canManage && <Button variant="secondary" onClick={() => navigate("/firm/review")}>Open review queue</Button>}<Button variant="secondary" onClick={() => navigate("/firm/inbox")}>Open inbox</Button></div>
      {canRequest && <form className="compliance-request" onSubmit={requestEvidence}><TextField label="Request due date" type="date" required value={requestDue} onChange={event => setRequestDue(event.target.value)} /><p className="text-xs text-slate-500">Send {clientName(selected.clientId)} a request for evidence for this item.</p><div className="portal-page-header"><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Request documents"}</Button></div></form>}
    </section>}
  </div>;
}
