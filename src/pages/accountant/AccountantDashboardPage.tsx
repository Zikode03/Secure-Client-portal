import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, ArrowRight, UsersRound, ClipboardCheck, Clock3, Folders } from "lucide-react";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { portalServiceApi } from "../../services/portalApi";
import { getScopedClients } from "../../utils/permissions";
import type { FirmClientAccount } from "../../types/portal";
import "./accountantDashboard.css";

interface Pack { id: string; clientId: string; year: number; month: number; status: string }
interface Slot { id: string; monthlyPackId: string; clientId: string; label: string; category: string; isRequired: boolean; status: string; dueDateUtc?: string | null }
interface Review { documentId: string; clientId: string; clientName: string; documentName: string; documentCategory: string; documentStatus: string; slotStatus?: string | null; year?: number | null; month?: number | null; reviewPriority: string; submittedAtUtc?: string | null; uploadedAtUtc: string }
interface Snapshot { clients: FirmClientAccount[]; packs: Pack[]; slots: Record<string, Slot[]>; reviews: Review[]; failed: number; checked: string }
const accepted = (slot: Slot) => ["accepted", "approved", "filed"].includes(slot.status);
const required = (slot: Slot) => slot.isRequired && slot.status !== "not_applicable";
const waiting = (slot: Slot) => required(slot) && ["not_started", "missing", "draft", "partial", "pending", "pending_signature", "rejected", "reupload_required"].includes(slot.status);
const period = (pack: {year?: number|null; month?: number|null}) => !pack.year||!pack.month ? "Non-monthly record" : new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric" }).format(new Date(pack.year, pack.month - 1, 1));
const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not specified";
const pending = (item: Review) => !["accepted", "approved", "filed", "rejected", "reupload_required", "deleted", "archived"].includes(item.documentStatus) && ["submitted", "under_review"].includes(item.slotStatus || item.documentStatus);

export function AccountantDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    if (!hasApiBaseUrl()) { setLoading(false); setError("Connect the backend to load your assigned clients and work."); return; }
    void (async () => {
      const [allClients, allPacks, allReviews] = await Promise.all([
        portalServiceApi.getAdminClients(),
        apiGetJson("/api/monthly-packs"),
        apiGetJson("/api/review-queue"),
      ]);
      if (![allClients, allPacks, allReviews].every(Array.isArray)) throw new Error("The dashboard response is incomplete. Please refresh.");
      const clients = getScopedClients(user, allClients).filter(client => client.isActive !== false);
      const ids = new Set(clients.map(client => client.id));
      const accessiblePacks = allPacks.filter(pack => ids.has(pack.clientId));
      const packs = clients.flatMap(client => {
        const history = accessiblePacks.filter(pack => pack.clientId === client.id).sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));
        const open = history.filter(pack => !["closed", "complete"].includes(pack.status));
        return open.length ? open : history.slice(0, 1);
      });
      const slots: Record<string, Slot[]> = {};
      let failed = 0;
      let index = 0;
      // Bound checklist requests so a large portfolio cannot flood the API.
      await Promise.all(Array.from({ length: Math.min(4, packs.length) }, async () => {
        while (active && index < packs.length) {
          const pack = packs[index++];
          try {
            const result = await apiGetJson(`/api/document-slots/${encodeURIComponent(pack.id)}`);
            if (!Array.isArray(result)) throw new Error("Invalid checklist");
            slots[pack.id] = result;
          } catch { failed++; }
        }
      }));
      if (active) setSnapshot({ clients, packs, slots, reviews: allReviews.filter(item => ids.has(item.clientId) && pending(item)), failed, checked: new Date().toISOString() });
    })().catch(reason => {
      if (active) setError(reason instanceof ApiError || reason instanceof Error ? reason.message : "The dashboard could not be loaded. Please refresh.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Session changes reset the data load; counters and search do not trigger API requests.
  }, [userId, revision]);

  const rows = useMemo(() => (snapshot?.clients ?? []).map(client => {
    const packs = snapshot!.packs.filter(pack => pack.clientId === client.id);
    const slots = packs.flatMap(pack => snapshot!.slots[pack.id] ?? []);
    const incomplete = packs.some(pack => !Object.prototype.hasOwnProperty.call(snapshot!.slots, pack.id));
    const requirements = slots.filter(required);
    return { client, packs, incomplete, total: requirements.length, approved: requirements.filter(accepted).length, missing: slots.filter(waiting).length, reviews: snapshot!.reviews.filter(item => item.clientId === client.id).length };
  }), [snapshot]);
  const reviews = useMemo(() => [...(snapshot?.reviews ?? [])].sort((a, b) => {
    const rank = (priority: string) => ({ high: 3, medium: 2, normal: 1 }[priority] ?? 0);
    return rank(b.reviewPriority) - rank(a.reviewPriority) || Date.parse(a.submittedAtUtc || a.uploadedAtUtc) - Date.parse(b.submittedAtUtc || b.uploadedAtUtc);
  }), [snapshot]);
  const due = useMemo(() => (snapshot?.packs ?? []).flatMap(pack => (snapshot!.slots[pack.id] ?? []).filter(slot => required(slot) && !accepted(slot) && slot.dueDateUtc && Number.isFinite(Date.parse(slot.dueDateUtc))).map(slot => ({ slot, pack, client: snapshot!.clients.find(client => client.id === pack.clientId) }))).sort((a, b) => a.slot.dueDateUtc!.localeCompare(b.slot.dueDateUtc!)), [snapshot]);
  const visible = rows.filter(row => row.client.clientName.toLowerCase().includes(query.trim().toLowerCase()));
  const firstReview = reviews[0];
  const openReview = (id: string) => navigate(`/firm/review?documentId=${encodeURIComponent(id)}`);
  return <div className="accountant-dashboard">
    <header className="accountant-dashboard-header"><div><p className="accountant-dashboard-eyebrow">Your work overview</p><h1>Welcome, {user?.name ?? "Accountant"}</h1><p>Review submissions, follow up on missing documents and track your clients' monthly work.</p></div><div className="accountant-dashboard-actions"><Button variant="secondary" size="sm" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} />Refresh</Button><Button size="sm" disabled={!firstReview || loading} onClick={() => firstReview && openReview(firstReview.documentId)}>Review next<ArrowRight size={15} /></Button></div></header>
    {error ? <p className="accountant-dashboard-notice" role="alert">{snapshot ? "Refresh failed. Showing the previous snapshot. " : "Dashboard unavailable. "}{error}</p> : null}
    {!snapshot ? <section className="accountant-dashboard-panel"><h2>{loading ? "Loading dashboard" : "Dashboard unavailable"}</h2><p>{loading ? "Loading your assigned work securely..." : "Use Refresh to try again."}</p></section> : <>
      {snapshot.failed > 0 ? <p className="accountant-dashboard-notice" role="status">Checklist data for {snapshot.failed} monthly pack(s) could not be loaded. Affected progress is unavailable; refresh to retry.</p> : null}
      <dl className="accountant-dashboard-metrics">
        <div><span className="accountant-metric-icon"><UsersRound size={18} aria-hidden="true" /></span><dt>Assigned clients</dt><dd>{snapshot.clients.length}</dd></div>
        <div><span className="accountant-metric-icon"><ClipboardCheck size={18} aria-hidden="true" /></span><dt>Awaiting review</dt><dd>{reviews.length}</dd></div>
        <div><span className="accountant-metric-icon"><Clock3 size={18} aria-hidden="true" /></span><dt>Waiting on clients</dt><dd>{snapshot.failed ? "Unavailable" : rows.reduce((sum, row) => sum + row.missing, 0)}</dd></div>
        <div><span className="accountant-metric-icon"><Folders size={18} aria-hidden="true" /></span><dt>Open months</dt><dd>{snapshot.packs.filter(pack => !["closed", "complete"].includes(pack.status)).length}</dd></div>
      </dl>
      <div className="accountant-dashboard-focus">
        <section className="accountant-dashboard-panel"><div className="accountant-dashboard-section-heading"><div><h2>Ready for review</h2><p>Priority first, then oldest submission.</p></div><Button variant="ghost" size="sm" onClick={() => navigate("/firm/review")}>Work Queue<ArrowRight size={14} /></Button></div>{reviews.length ? <ul className="accountant-dashboard-review-list">{reviews.slice(0, 5).map(item => <li key={item.documentId}><div><strong>{item.clientName}</strong><span>{item.documentName}</span><small>{period(item)}{item.reviewPriority === "high" ? " / High priority" : ""}</small></div><Button variant="secondary" size="sm" onClick={() => openReview(item.documentId)} aria-label={`Review ${item.documentName}`}>Review</Button></li>)}</ul> : <p className="accountant-dashboard-empty">No documents awaiting a decision.</p>}</section>
        <section className="accountant-dashboard-panel"><div className="accountant-dashboard-section-heading"><div><h2>Recorded deadlines</h2><p>Outstanding requirements with a configured due date.</p></div></div>{due.length ? <ul className="accountant-dashboard-deadlines">{due.slice(0, 5).map(({ slot, pack, client }) => <li key={slot.id}><div><strong>{slot.label || slot.category}</strong><span>{client?.clientName} / {period(pack)}</span></div><button type="button" onClick={() => navigate(`/firm/clients/${encodeURIComponent(pack.clientId)}/packs`)}>{date(slot.dueDateUtc!)}{Date.parse(slot.dueDateUtc!) < Date.now() ? <small>Overdue</small> : null}</button></li>)}</ul> : <p className="accountant-dashboard-empty">{snapshot.failed ? "Deadlines may be incomplete while checklists are unavailable." : "No outstanding requirements have a recorded deadline."}</p>}</section>
      </div>
      <section className="accountant-dashboard-panel accountant-client-panel">
        <div className="accountant-dashboard-section-heading">
          <div><h2>My assigned clients</h2><p>Review progress and outstanding documents.</p></div>
          <label className="accountant-dashboard-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Find assigned client" placeholder="Find a client" value={query} onChange={event => setQuery(event.target.value)} /></label>
        </div>
        {visible.length ? <div className="accountant-dashboard-table"><table>
          <thead><tr><th scope="col">Client</th><th scope="col">Approved items</th><th scope="col">Outstanding</th><th scope="col">Actions</th></tr></thead>
          <tbody>{visible.map(row => <tr key={row.client.id}>
            <th scope="row"><span className="accountant-client-name">{row.client.clientName}</span>

            </th>
            <td>{row.incomplete ? <span className="accountant-client-muted">Unavailable</span> : row.total ? <div className="accountant-client-progress"><span>{row.approved} / {row.total}</span><progress value={row.approved} max={row.total} aria-label={`Approved requirements for ${row.client.clientName}`} /></div> : <span className="accountant-client-muted">Not applicable</span>}</td>
            <td><div className="accountant-client-outstanding"><span>{row.incomplete ? "Client items unavailable" : `${row.missing} waiting on client`}</span><span className={row.reviews ? "has-reviews" : ""}>{row.reviews} to review</span></div></td>
            <td className="accountant-client-open"><Button variant="ghost" size="sm" onClick={() => navigate(`/firm/clients/${encodeURIComponent(row.client.id)}`)} aria-label={`Open ${row.client.clientName}`}>Open<ArrowRight size={14} /></Button></td>
          </tr>)}</tbody>
        </table></div> : <p className="accountant-dashboard-empty">{query ? "No clients match your search." : "No clients are assigned to you yet."}</p>}
        <p className="accountant-client-footnote">Only approved required items count towards progress.</p>
      </section>
      <p className="accountant-dashboard-checked">Last loaded {new Date(snapshot.checked).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}. Refresh for the latest saved work.</p>
    </>}
  </div>;
}
