import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Building2, CalendarDays, Check, CheckCheck, ChevronDown, CircleAlert, Clock3, Download, FileCheck2, FileText, History, LayoutList, MessageSquare, Printer, RefreshCw, Search, ShieldCheck, Upload, X } from "lucide-react";
import { useAuth } from "../../app/auth";
import { apiGetBlob } from "../../services/apiClient";
import { formatDateLabel } from "../../utils/formatters";
import { complianceAutomationApi, complianceStatusLabel, formatCompliancePeriod, type ComplianceHistoryEntry, type ComplianceObligation, type ObligationEvidence } from "./complianceAutomation";
import "./clientComplianceCentre.css";

type Tab = "overview" | "action" | "upcoming" | "history";
type State = "action" | "progress" | "soon" | "complete" | "not_started" | "not_applicable";
const attentionStatuses = new Set(["waiting_for_client", "overdue", "payment_outstanding"]);
const accountantStatuses = new Set(["ready_to_prepare", "in_preparation", "ready_for_review", "ready_to_file"]);
const stateLabels: Record<State, string> = { action: "Action required", progress: "In progress", soon: "Due soon", complete: "Up to date", not_started: "Not started", not_applicable: "Not applicable" };
const tabs = [
  { key: "overview", label: "Overview", icon: LayoutList },
  { key: "action", label: "Action required", icon: CircleAlert },
  { key: "upcoming", label: "Upcoming", icon: CalendarDays },
  { key: "history", label: "History", icon: History },
] as const;

function daysUntil(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const today = new Date();
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
}

function clientState(item: ComplianceObligation): State {
  if (item.workflowStatus === "complete" || item.workflowStatus === "not_applicable") return item.workflowStatus;
  if (attentionStatuses.has(item.workflowStatus)) return "action";
  if (accountantStatuses.has(item.workflowStatus)) return "progress";
  const days = daysUntil(item.dueDateUtc);
  return days != null && days >= 0 && days <= 30 ? "soon" : "not_started";
}

function owner(item: ComplianceObligation) {
  if (attentionStatuses.has(item.workflowStatus)) return "You";
  if (["complete", "not_applicable"].includes(item.workflowStatus)) return "No action required";
  return "Your accountant";
}

function nextAction(item: ComplianceObligation) {
  switch (item.workflowStatus) {
    case "waiting_for_client": return item.missingEvidenceCategories.length ? `Provide ${item.missingEvidenceCategories.map(value => value.replace(/_/g, " ")).join(", ")}` : "Provide the requested information";
    case "payment_outstanding": return "Confirm your outstanding payment with your accountant";
    case "overdue": return "Contact your accountant about this overdue item";
    case "ready_for_review": return "Your accountant is reviewing this item";
    case "ready_to_file": return "Your accountant is preparing to file";
    case "in_preparation": case "ready_to_prepare": return "Your accountant is preparing this item";
    case "complete": return "No further action required";
    case "not_applicable": return "Not applicable to your business";
    default: return item.evidenceFound < item.evidenceRequired ? "Supporting documents are outstanding" : "No immediate action required";
  }
}

function verificationMethod(item: ComplianceObligation) {
  const source = `${item.code} ${item.authority}`.toUpperCase();
  const manuallyConfirmedAuthority = ["CIPC", "SARS", "CSD"].some(value => source.includes(value));
  if (!manuallyConfirmedAuthority) return "Managed by your accountant";
  return item.workflowStatus === "complete" ? "Accountant confirmed" : "Manual check by your accountant";
}

function sortByDueDate(a: ComplianceObligation, b: ComplianceObligation) {
  if (!a.dueDateUtc && !b.dueDateUtc) return a.name.localeCompare(b.name);
  if (!a.dueDateUtc) return 1;
  if (!b.dueDateUtc) return -1;
  return new Date(a.dueDateUtc).getTime() - new Date(b.dueDateUtc).getTime();
}

export function ClientComplianceCentreWorkspace() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [history, setHistory] = useState<ComplianceHistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [query, setQuery] = useState("");
  const [authority, setAuthority] = useState("all");
  const [metricFilter, setMetricFilter] = useState<"all" | "progress" | "complete">("all");
  const [windowDays, setWindowDays] = useState("90");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError(null);
    setHistoryError(false);
    // Activity availability should not prevent the obligation register from loading.
    const [rows, activity] = await Promise.allSettled([complianceAutomationApi.getObligations(), complianceAutomationApi.getHistory()]);
    if (rows.status === "fulfilled") setObligations(rows.value);
    else setError("Compliance information is unavailable.");
    if (activity.status === "fulfilled") setHistory(activity.value);
    else setHistoryError(true);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const refresh = () => { void load(false); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  const ordered = useMemo(() => [...obligations].sort(sortByDueDate), [obligations]);
  const actionItems = ordered.filter(item => clientState(item) === "action");
  const progressItems = ordered.filter(item => clientState(item) === "progress");
  const completeItems = ordered.filter(item => clientState(item) === "complete");
  const futureItems = ordered.filter(item => {
    const days = daysUntil(item.dueDateUtc);
    return !["complete", "not_applicable"].includes(item.workflowStatus) && days != null && days >= 0;
  });
  const soonItems = futureItems.filter(item => daysUntil(item.dueDateUtc)! <= 30);
  const authorities = [...new Set(ordered.map(item => item.authority))].sort();
  const visibleItems = (tab === "action" ? actionItems : tab === "upcoming" ? futureItems.filter(item => daysUntil(item.dueDateUtc)! <= Number(windowDays)) : ordered).filter(item =>
    (metricFilter === "all" || clientState(item) === metricFilter) && (authority === "all" || item.authority === authority) && `${item.name} ${item.code} ${item.authority} ${nextAction(item)}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const businessName = user?.company || obligations[0]?.clientName || "Your business";
  const lastUpdated = [...obligations.map(item => item.updatedAtUtc), ...(!historyError ? history.map(item => item.timestamp) : [])]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const hasFilters = !!query || authority !== "all" || metricFilter !== "all";
  const heading = tab === "action" ? "Action required" : tab === "upcoming" ? "Upcoming compliance items" : metricFilter === "progress" ? "With your accountant" : metricFilter === "complete" ? "Completed obligations" : "Compliance register";
  function toggle(id: string) { setExpandedId(current => current === id ? null : id); }
  function changeTab(value: Tab) { setTab(value); setExpandedId(null); setQuery(""); setAuthority("all"); setMetricFilter("all"); }
  function selectMetric(tone: string) {
    changeTab(tone === "action" ? "action" : tone === "soon" ? "upcoming" : "overview");
    if (tone === "progress" || tone === "complete") setMetricFilter(tone);
    if (tone === "soon") setWindowDays("30");
  }
  async function uploaded(item: ComplianceObligation) {
    setObligations(rows => rows.map(row => row.id === item.id ? item : row));
    setUploadNotice(`Evidence uploaded for ${item.code}.`);
    await load(false);
  }

  return <div className="client-compliance">
    <header className="cc-heading">
      <div><div className="cc-business"><Building2 size={14} aria-hidden="true" />{businessName}</div><h1>Compliance Centre</h1><p>Your business obligations, in one place.</p></div>
      <div className="cc-header-actions">
        <span className="cc-updated">{lastUpdated && !error ? `Updated ${formatDateLabel(lastUpdated)}` : ""}</span>
        <button className="cc-icon-button" type="button" aria-label="Print summary" title="Print summary" onClick={() => window.print()}><Printer size={18} /></button>
        <button className="cc-icon-button" type="button" aria-label="Refresh" title="Refresh compliance" disabled={loading} onClick={() => void load()}><RefreshCw size={18} className={loading ? "cc-spinning" : ""} /></button>
      </div>
    </header>
    {uploadNotice && <div className="cc-upload-notice" role="status"><Check size={17} aria-hidden="true" /><span>{uploadNotice}</span><button type="button" className="cc-icon-button cc-small" aria-label="Dismiss upload confirmation" title="Dismiss" onClick={() => setUploadNotice(null)}><X size={16} /></button></div>}

    <section className="cc-summary" aria-label="Compliance summary">
      <h2 className="sr-only">Your compliance at a glance</h2>
      {[
        { label: "Needs your attention", value: actionItems.length, icon: CircleAlert, tone: "action", detail: "Action required from you" },
        { label: "With your accountant", value: progressItems.length, icon: Clock3, tone: "progress", detail: "Preparation, review or filing" },
        { label: "Due in 30 days", value: soonItems.length, icon: CalendarDays, tone: "soon", detail: "Upcoming deadlines" },
        { label: "Up to date", value: completeItems.length, icon: ShieldCheck, tone: "complete", detail: "Completed obligations" },
      ].map(({ label, value, icon: Icon, tone, detail }) => <button type="button" className={`cc-metric cc-${tone}`} key={label} aria-label={`View ${label.toLowerCase()}`} title={`View ${label.toLowerCase()}`} disabled={loading || !!error} aria-pressed={tone === "action" ? tab === "action" : tone === "soon" ? tab === "upcoming" && windowDays === "30" : tab === "overview" && metricFilter === tone} aria-controls="cc-content" onClick={() => selectMetric(tone)}><span className="cc-metric-top"><span className="cc-metric-icon"><Icon size={18} aria-hidden="true" /></span><span className="cc-metric-label">{label}</span><ArrowUpRight size={15} className="cc-metric-arrow" aria-hidden="true" /></span><span className="cc-metric-bottom"><strong>{loading || error ? "--" : value}</strong><span className="cc-metric-detail">{detail}</span></span></button>)}
    </section>

    <div className="cc-navigation"><nav className="cc-tabs" aria-label="Compliance sections">{tabs.map(({ key, label, icon: Icon }) => <button type="button" key={key} aria-label={label} aria-pressed={tab === key} aria-controls="cc-content" onClick={() => changeTab(key)}><Icon size={16} aria-hidden="true" />{label}{key === "action" && actionItems.length > 0 && !error && <span className="cc-tab-count">{actionItems.length}</span>}</button>)}</nav><span className="cc-navigation-total">{loading || error ? "" : `${ordered.length} obligations tracked`}</span></div>

    <div id="cc-content" aria-busy={loading}>
      {loading ? <div className="cc-empty" role="status"><RefreshCw size={24} className="cc-spinning" /><h2>Loading compliance information</h2></div>
      : error ? <div className="cc-error" role="alert"><CircleAlert size={22} /><div><h2>{error}</h2><p>Your saved obligations could not be refreshed.</p></div><button type="button" className="cc-button" onClick={() => void load()}><RefreshCw size={15} />Try again</button></div>
      : tab === "history" ? <ActivityHistory items={history} unavailable={historyError} query={historyQuery} filter={historyFilter} onQuery={setHistoryQuery} onFilter={setHistoryFilter} />
      : <div className={tab === "overview" ? "cc-columns" : ""}>
        <section className="cc-register" aria-label={heading}>
          <div className="cc-section-heading"><div><h2>{heading}<span className="cc-count">{visibleItems.length}</span></h2><p>{tab === "action" ? "Documents and information waiting on you." : tab === "upcoming" ? "Deadlines and reviews ahead." : "Current requirements and who is handling them."}</p></div><FileCheck2 size={20} className="cc-muted" aria-hidden="true" /></div>
          <div className="cc-toolbar">
            {metricFilter !== "all" && <button type="button" className="cc-filter-tag" aria-label="Clear status filter" onClick={() => setMetricFilter("all")}>{metricFilter === "progress" ? "With your accountant" : "Up to date"}<X size={14} aria-hidden="true" /></button>}
            <label className="cc-search"><Search size={16} aria-hidden="true" /><input aria-label="Search compliance items" placeholder="Search obligations..." value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" title="Clear search" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label>
            <select aria-label="Filter by authority" value={authority} onChange={event => setAuthority(event.target.value)}><option value="all">All authorities</option>{authorities.map(value => <option key={value}>{value}</option>)}</select>
            {tab === "upcoming" && <select aria-label="Upcoming period" value={windowDays} onChange={event => setWindowDays(event.target.value)}><option value="30">Next 30 days</option><option value="90">Next 90 days</option><option value="365">Next 12 months</option></select>}
          </div>
          {visibleItems.length ? <div className="cc-records"><div className="cc-column-labels" aria-hidden="true"><span>Obligation</span><span>Status & owner</span><span>Due date</span><span /></div>{visibleItems.map(item => <ObligationRow key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => toggle(item.id)} onUploadOpen={() => setExpandedId(item.id)} onUploaded={uploaded} />)}</div>
          : <div className="cc-empty"><FileCheck2 size={28} aria-hidden="true" /><h3>{hasFilters ? "No matching obligations" : tab === "action" ? "Nothing needs your attention" : tab === "upcoming" ? "No deadlines in this period" : "No obligations yet"}</h3><p>{hasFilters ? "Try another name or authority." : tab === "overview" ? "Your obligations will appear once your accountant has confirmed your compliance profile." : "New items will appear here when they are available."}</p>{hasFilters && <button type="button" className="cc-text-button" onClick={() => { setQuery(""); setAuthority("all"); setMetricFilter("all"); }}>Clear filters</button>}</div>}
          <div className="cc-register-footer"><ShieldCheck size={14} aria-hidden="true" /><span>{visibleItems.length} of {tab === "action" ? actionItems.length : ordered.length} obligations</span></div>
        </section>

        {tab === "overview" && <aside className="cc-rail">
          <section><div className="cc-section-heading"><h2><CalendarDays size={17} aria-hidden="true" />Next deadlines</h2><button className="cc-icon-button cc-small" type="button" title="View upcoming items" aria-label="View upcoming items" onClick={() => changeTab("upcoming")}><ArrowUpRight size={17} /></button></div>
            {futureItems.slice(0, 3).map(item => <div className="cc-deadline" key={item.id}><div className="cc-date-stamp"><span>{new Date(item.dueDateUtc!).toLocaleDateString("en-ZA", { month: "short" })}</span><strong>{new Date(item.dueDateUtc!).getDate()}</strong></div><div><strong>{item.name || item.code}</strong><span>{item.authority}</span><small>{daysUntil(item.dueDateUtc) === 0 ? "Due today" : `In ${daysUntil(item.dueDateUtc)} days`}</small></div></div>)}
            {!futureItems.length && <p className="cc-rail-empty">No upcoming deadlines scheduled.</p>}
          </section>
          <section><div className="cc-section-heading"><h2><Building2 size={17} aria-hidden="true" />Compliance areas</h2></div>{authorities.map(value => {
            const rows = ordered.filter(item => item.authority === value);
            const complete = rows.filter(item => clientState(item) === "complete").length;
            return <button className="cc-authority" type="button" key={value} onClick={() => { setAuthority(value); setQuery(""); }}><span><strong>{value}</strong><small>{complete} of {rows.length} complete</small></span><span className="cc-area-bar" aria-hidden="true"><i style={{ width: `${complete / rows.length * 100}%` }} /></span><ArrowRight size={14} aria-hidden="true" /></button>;
          })}{!authorities.length && <p className="cc-rail-empty">No authorities tracked yet.</p>}</section>
          <section className="cc-contact"><MessageSquare size={20} aria-hidden="true" /><h2>A question about an item?</h2><Link to="/client/inbox">Message your accountant<ArrowUpRight size={15} aria-hidden="true" /></Link></section>
        </aside>}
      </div>}
    </div>
  </div>;
}

function ObligationRow({ item, expanded, onToggle, onUploadOpen, onUploaded }: { item: ComplianceObligation; expanded: boolean; onToggle: () => void; onUploadOpen: () => void; onUploaded: (item: ComplianceObligation) => Promise<void> }) {
  const state = clientState(item);
  const days = daysUntil(item.dueDateUtc);
  const inactive = ["complete", "not_applicable"].includes(state);
  const uploadNeeded = item.workflowStatus === "waiting_for_client";
  const detailsId = `cc-details-${item.id}`;
  const evidencePercent = item.evidenceRequired > 0 ? Math.min(100, Math.round(item.evidenceFound / item.evidenceRequired * 100)) : 0;
  return <article className={`cc-record ${expanded ? "is-expanded" : ""}`}>
    <div className="cc-record-row">
      <div className="cc-record-name"><span className={`cc-file-mark cc-${state}`}><FileText size={19} aria-hidden="true" /></span><div><h3>{item.name || item.code}</h3><p><span>{item.code}</span><span className="cc-separator" aria-hidden="true">/</span>{item.authority}</p></div></div>
      <div className="cc-record-status"><span className={`cc-badge cc-${state}`}><i aria-hidden="true" />{stateLabels[state]}</span><small>{owner(item)}</small></div>
      <div className={`cc-due ${days != null && days < 0 && !inactive ? "is-overdue" : ""}`}><span>{item.dueDateUtc ? formatDateLabel(item.dueDateUtc) : "No fixed date"}</span>{days != null && !inactive && <small>{days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `In ${days} days`}</small>}</div>
      <button className="cc-icon-button cc-expand" type="button" aria-label={expanded ? "Close" : "View"} title={expanded ? `Close ${item.code} details` : `View ${item.code} details`} aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle}><ChevronDown size={18} /></button>
    </div>
    <div className="cc-record-foot"><span>{nextAction(item)}</span>{uploadNeeded && <button type="button" className="cc-upload-open" aria-expanded={expanded} aria-controls={detailsId} onClick={onUploadOpen}><Upload size={14} aria-hidden="true" />Upload</button>}{state === "action" && !uploadNeeded && <Link to="/client/inbox"><MessageSquare size={14} aria-hidden="true" />Contact accountant</Link>}</div>
    {expanded && <div className="cc-details" id={detailsId}>
      <dl><div><dt>Period</dt><dd>{item.code === "CSD" ? "Standing registration" : formatCompliancePeriod(item.periodStartUtc, item.periodEndUtc)}</dd></div><div><dt>Current stage</dt><dd>{complianceStatusLabel(item.workflowStatus)}</dd></div><div><dt>Supporting evidence</dt><dd>{item.evidenceFound} of {item.evidenceRequired} received</dd>{item.evidenceRequired > 0 && <progress max={100} value={evidencePercent} aria-label={`${item.code} supporting evidence`} />}</div><div><dt>Verification</dt><dd>{verificationMethod(item)}</dd></div></dl>
      <div className="cc-workflow" aria-label={`${item.code} workflow`}>{[{ label: "Preparation", done: item.preparationStatus === "complete" }, { label: "Review", done: item.reviewStatus === "approved" }, { label: "Filing", done: ["submitted", "not_required"].includes(item.submissionStatus) }, { label: "Payment", done: !item.paymentRequired || item.paymentStatus === "paid" }].map(step => <span className={step.done ? "is-done" : ""} key={step.label}>{step.done ? <Check size={13} aria-hidden="true" /> : <span className="cc-step-dot" />}{step.label}</span>)}</div>
      <p>{nextAction(item)}.</p>{item.submissionReference && <p>Submission reference: <strong>{item.submissionReference}</strong></p>}
      {item.missingEvidenceCategories.some(category => category !== "csd_registration_report") && <p>Required documents count toward readiness once your accountant accepts them for {formatCompliancePeriod(item.periodStartUtc, item.periodEndUtc)}.</p>}
      <div className="cc-record-foot"><span>Related workspace</span><Link to="/client/documents"><FileText size={14} aria-hidden="true" />Documents</Link><Link to="/client/inbox"><MessageSquare size={14} aria-hidden="true" />Requests & messages</Link></div>
      <ObligationEvidencePanel item={item} onUploaded={onUploaded} />
    </div>}
  </article>;
}

function ObligationEvidencePanel({ item, onUploaded }: { item: ComplianceObligation; onUploaded: (item: ComplianceObligation) => Promise<void> }) {
  const [evidence, setEvidence] = useState<ObligationEvidence[] | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const canUpload = !["complete", "not_applicable"].includes(item.workflowStatus);

  async function readEvidence() {
    setEvidenceError(null);
    try { setEvidence(await complianceAutomationApi.getEvidence(item.id)); }
    catch (error) { setEvidenceError(error instanceof Error ? error.message : "Saved evidence is unavailable."); }
  }
  useEffect(() => { void readEvidence(); }, [item.id]);

  async function upload() {
    if (!file || busy) return;
    setBusy(true); setActionError(null);
    try {
      const result = await complianceAutomationApi.uploadEvidence(item.id, file, note);
      setEvidenceError(null);
      setEvidence(current => [result.evidence, ...(current ?? []).filter(row => row.id !== result.evidence.id)]);
      setFile(null); setNote("");
      if (fileInput.current) fileInput.current.value = "";
      await onUploaded(result.obligation);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Evidence upload failed."); }
    finally { setBusy(false); }
  }

  async function download(row: ObligationEvidence) {
    if (busy) return;
    setBusy(true); setActionError(null);
    try {
      const { blob } = await apiGetBlob(`/api/compliance/evidence/${encodeURIComponent(row.id)}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = row.fileName;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Evidence download failed."); }
    finally { setBusy(false); }
  }

  return <section className="cc-evidence" aria-label={`${item.code} evidence`}>
    <h4>Saved evidence</h4>
    {evidenceError ? <div role="alert" className="cc-evidence-error"><span>{evidenceError}</span><button type="button" className="cc-button" onClick={() => void readEvidence()}><RefreshCw size={14} />Retry evidence</button></div>
      : evidence === null ? <p role="status">Loading saved evidence...</p>
      : evidence.length === 0 ? <p>No evidence uploaded yet.</p>
      : <ul className="cc-evidence-list">{evidence.map(row => <li key={row.id}><FileText size={16} aria-hidden="true" /><div><strong>{row.fileName}</strong><small>Version {row.versionNumber} · {formatDateLabel(row.uploadedAtUtc)}</small></div><button type="button" className="cc-icon-button" disabled={busy} aria-label={`Download ${row.fileName}`} title={`Download ${row.fileName}`} onClick={() => void download(row)}><Download size={16} /></button></li>)}</ul>}
    {canUpload && <form className="cc-evidence-form" onSubmit={event => { event.preventDefault(); void upload(); }}>
      <label>Compliance evidence<input ref={fileInput} aria-label={`${item.code} supporting document`} type="file" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <label>Note (optional)<input type="text" maxLength={2000} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label>
      <button type="submit" className="cc-button" disabled={busy || !file}>{busy ? <RefreshCw size={15} className="cc-spinning" /> : <Upload size={15} />}{busy ? "Uploading..." : "Upload evidence"}</button>
    </form>}
    {actionError && <p className="cc-evidence-error" role="alert">{actionError}</p>}
  </section>;
}

function historyActionLabel(action: string) {
  return complianceStatusLabel(action.replace(/^compliance\.(?:automation\.)?/, "").replace(/\./g, " "));
}

function ActivityHistory({ items, unavailable, query, filter, onQuery, onFilter }: { items: ComplianceHistoryEntry[]; unavailable: boolean; query: string; filter: string; onQuery: (value: string) => void; onFilter: (value: string) => void }) {
  const visible = [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).filter(item => (filter === "all" || item.action === filter) && `${item.action} ${item.detail} ${item.actor}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="cc-history"><div className="cc-section-heading"><div><h2>Compliance history</h2><p>Updates and decisions on your business obligations.</p></div></div>
    {unavailable ? <div className="cc-error" role="alert"><CircleAlert size={20} /><p>Compliance history is unavailable. Refresh to try again.</p></div> : <>
      <div className="cc-toolbar"><label className="cc-search"><Search size={16} aria-hidden="true" /><input aria-label="Search compliance history" placeholder="Search activity..." value={query} onChange={event => onQuery(event.target.value)} /></label><select aria-label="Filter activity" value={filter} onChange={event => onFilter(event.target.value)}><option value="all">All activity</option>{[...new Set(items.map(item => item.action))].sort().map(action => <option key={action} value={action}>{historyActionLabel(action)}</option>)}</select></div>
      <ol className="cc-timeline">{visible.map(item => <li key={item.id}><span className="cc-activity-icon"><CheckCheck size={17} aria-hidden="true" /></span><div><h3>{historyActionLabel(item.action)}</h3><p>{item.detail}</p><small>{item.actor}</small></div><time dateTime={item.timestamp}>{formatDateLabel(item.timestamp)}<span>{new Date(item.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span></time></li>)}</ol>
      {!visible.length && <div className="cc-empty"><History size={28} aria-hidden="true" /><h3>No matching activity</h3><p>{query || filter !== "all" ? "Try another search or activity type." : "Compliance updates will appear here."}</p></div>}
    </>}
  </section>;
}
