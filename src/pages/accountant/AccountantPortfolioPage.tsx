import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { portalServiceApi } from "../../services/portalApi";
import { getScopedClients } from "../../utils/permissions";
import type { FirmClientAccount } from "../../types/portal";
import "./accountantPortfolio.css";

interface Pack { id: string; clientId: string; year: number; month: number; status: string }
interface Slot { id: string; isRequired: boolean; status: string; dueDateUtc?: string | null }
interface ClientWork { client: FirmClientAccount; packs: Pack[]; slots: Slot[]; incomplete: boolean }
type Filter = "all" | "review" | "waiting" | "overdue";
const isApproved = (slot: Slot) => ["accepted", "approved", "filed"].includes(slot.status);
const isRequired = (slot: Slot) => slot.isRequired && slot.status !== "not_applicable";
const isWaiting = (slot: Slot) => isRequired(slot) && ["not_started", "missing", "draft", "partial", "pending", "pending_signature", "rejected", "reupload_required"].includes(slot.status);
const deadlineLabel = (value: string) => new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export function AccountantPortfolioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [work, setWork] = useState<ClientWork[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(0);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("attention");
  const isAdmin = user?.role === "admin";
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    if (!hasApiBaseUrl()) { setError("Connect the backend to view your assigned clients."); setLoading(false); return; }
    void (async () => {
      const [accounts, packs] = await Promise.all([portalServiceApi.getAdminClients(), apiGetJson("/api/monthly-packs")]);
      if (!Array.isArray(accounts) || !Array.isArray(packs)) throw new Error("The client list response is incomplete. Please refresh.");
      const clients = getScopedClients(user, accounts);
      const selected = clients.map(client => {
        const history = packs.filter(pack => pack.clientId === client.id).sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));
        const open = history.filter(pack => !["closed", "complete"].includes(pack.status));
        return { client, packs: open.length ? open : history.slice(0, 1) };
      });
      const queue = selected.flatMap(row => row.packs);
      const slots = new Map<string, Slot[]>();
      let index = 0;
      let failures = 0;
      await Promise.all(Array.from({ length: Math.min(queue.length, 4) }, async () => {
        while (active && index < queue.length) {
          const pack = queue[index++];
          try {
            const result = await apiGetJson(`/api/document-slots/${encodeURIComponent(pack.id)}`);
            if (!Array.isArray(result)) throw new Error("Invalid checklist");
            slots.set(pack.id, result);
          } catch { failures++; }
        }
      }));
      if (active) {
        setWork(selected.map(row => ({ ...row, slots: row.packs.flatMap(pack => slots.get(pack.id) ?? []), incomplete: row.packs.some(pack => !slots.has(pack.id)) })));
        setFailed(failures);
      }
    })().catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load assigned clients. Please refresh."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, revision]);

  const rows = useMemo(() => (work ?? []).map(row => {
    const requirements = row.slots.filter(isRequired);
    const approved = requirements.filter(isApproved).length;
    const waiting = row.slots.filter(isWaiting).length;
    const review = row.slots.filter(slot => ["submitted", "under_review"].includes(slot.status)).length;
    const dates = requirements.filter(slot => !isApproved(slot) && slot.dueDateUtc && Number.isFinite(Date.parse(slot.dueDateUtc))).map(slot => slot.dueDateUtc!).sort();
    const overdue = dates.filter(due => Date.parse(due) < Date.now()).length;
    const label = row.incomplete ? "Unavailable" : !row.packs.length ? "No monthly pack" : overdue ? "Overdue" : review ? "Ready for review" : waiting ? "Waiting on client" : requirements.length ? "Up to date" : "No required items";
    const rank = row.incomplete ? 4 : overdue ? 3 : review ? 2 : waiting ? 1 : 0;
    return { ...row, total: requirements.length, approved, waiting, review, overdue, due: dates[0], label, rank };
  }), [work]);
  const visible = rows.filter(row => {
    const matches = `${row.client.clientName} ${row.client.industry} ${row.client.assignedAccountant}`.toLowerCase().includes(search.trim().toLowerCase());
    return matches && (filter === "all" || !row.incomplete && (filter === "review" ? row.review > 0 : filter === "waiting" ? row.waiting > 0 : row.overdue > 0));
  }).sort((a, b) => sort === "name" ? a.client.clientName.localeCompare(b.client.clientName) : sort === "deadline" ? (a.due ? Date.parse(a.due) : Infinity) - (b.due ? Date.parse(b.due) : Infinity) || a.client.clientName.localeCompare(b.client.clientName) : b.rank - a.rank || a.client.clientName.localeCompare(b.client.clientName));
  const filtered = search.trim() || filter !== "all";

  return <div className="accountant-clients">
    <header className="accountant-clients-header"><div><h1 className="workspace-duplicate-title ">{isAdmin ? "Firm Clients" : "Assigned Clients"}</h1><p>{isAdmin ? "Client assignments and monthly work across the firm." : "Your clients, outstanding documents and the next work to complete."}</p></div><div className="accountant-clients-actions"><Button size="sm" variant="secondary" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} />Refresh</Button>{isAdmin ? <Button size="sm" onClick={() => navigate("/firm/admin/assignments")}>Manage assignments</Button> : null}</div></header>
    {error ? <p role="alert" className="accountant-clients-notice">{work ? "Refresh failed; showing the previous snapshot. " : "Client list unavailable. "}{error}</p> : null}
    {failed > 0 ? <p role="status" className="accountant-clients-notice">{failed} checklist(s) could not load. Affected progress is unavailable; refresh to retry.</p> : null}
    <section className="accountant-clients-panel" aria-label="Assigned client list">
      <div className="accountant-clients-toolbar">
        <label className="accountant-clients-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search assigned clients" placeholder="Find a client" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label>Status<select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">All clients</option><option value="review">Ready for review</option><option value="waiting">Waiting on client</option><option value="overdue">Overdue</option></select></label>
        <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="attention">Needs attention</option><option value="name">Client name</option><option value="deadline">Next deadline</option></select></label>
      </div>
      {work ? <div className="accountant-clients-count"><span>{visible.length} of {rows.length} {rows.length === 1 ? "client" : "clients"}</span>{filtered ? <button type="button" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button> : <span>Progress counts approved required items.</span>}</div> : null}
      {!work ? <div className="accountant-clients-empty"><h2>{loading ? "Loading assigned clients" : "Client list unavailable"}</h2><p>{loading ? "Loading your client records securely..." : "Select Refresh to try again."}</p></div> : visible.length ? <div className="accountant-clients-table"><table><thead><tr><th scope="col">Client</th><th scope="col">Due date</th><th scope="col">Approved items</th><th scope="col">Next step</th><th scope="col">Actions</th></tr></thead><tbody>{visible.map(row => <tr key={row.client.id}>
        <th scope="row"><strong>{row.client.clientName}</strong>{row.client.industry && row.client.industry !== "Not specified" ? <small>{row.client.industry}</small> : null}{isAdmin ? <small>{row.client.assignedAccountant || "Accountant unassigned"}</small> : row.client.backupAccountantUserId === userId && row.client.assignedAccountantUserId !== userId ? <small>Backup coverage</small> : null}</th>
        <td>{row.incomplete ? <span className="accountant-clients-muted">Unavailable</span> : row.due ? <span>{deadlineLabel(row.due)}</span> : <span className="accountant-clients-muted">No deadline set</span>}</td>
        <td>{row.incomplete ? <span className="accountant-clients-muted">Unavailable</span> : row.total ? <div className="accountant-clients-progress"><span>{row.approved} / {row.total}</span><progress max={row.total} value={row.approved} aria-label={`Approved required items for ${row.client.clientName}`} /></div> : <span className="accountant-clients-muted">Not applicable</span>}</td>
        <td><span className={`accountant-clients-status ${row.overdue ? "is-overdue" : ""}`}>{row.label}</span>{!row.incomplete && (row.waiting > 0 || row.review > 0) ? <small>{[row.waiting > 0 ? `${row.waiting} waiting on client` : "", row.review > 0 ? `${row.review} to review` : ""].filter(Boolean).join(" / ")}</small> : null}</td>
        <td className="accountant-clients-open"><Button size="sm" variant="ghost" aria-label={`Open ${row.client.clientName}`} onClick={() => navigate(`/firm/clients/${encodeURIComponent(row.client.id)}`)}>Open<ArrowRight size={14} /></Button></td>
      </tr>)}</tbody></table></div> : <div className="accountant-clients-empty"><h2>{filtered ? "No matching clients" : "No assigned clients yet"}</h2><p>{filtered ? "Try another client name or clear the filters." : "Assigned clients will appear here when an administrator assigns them."}</p></div>}
    </section>
  </div>;
}
