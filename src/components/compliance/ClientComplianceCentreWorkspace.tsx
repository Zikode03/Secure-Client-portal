import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Download, RefreshCw } from "lucide-react";
import { useAuth } from "../../app/auth";
import { portalServiceApi } from "../../services/portalApi";
import type { ComplianceAuditEvent, ComplianceCentreData } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import {
  complianceAutomationApi,
  complianceStatusLabel,
  formatCompliancePeriod,
  type ComplianceObligation,
} from "./complianceAutomation";

type ClientComplianceTab = "overview" | "action" | "upcoming" | "history";

type ClientFacingState = "action" | "progress" | "soon" | "complete" | "not_started";

const attentionStatuses = new Set(["waiting_for_client", "overdue", "payment_outstanding"]);
const accountantStatuses = new Set(["ready_to_prepare", "in_preparation", "ready_for_review", "ready_to_file"]);

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const due = new Date(value);
  const today = startOfToday();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.ceil((dueDay.getTime() - today.getTime()) / 86_400_000);
}

function clientState(item: ComplianceObligation): ClientFacingState {
  if (item.workflowStatus === "complete") return "complete";
  if (attentionStatuses.has(item.workflowStatus)) return "action";
  if (accountantStatuses.has(item.workflowStatus)) return "progress";
  const days = daysUntil(item.dueDateUtc);
  if (days != null && days >= 0 && days <= 30) return "soon";
  return "not_started";
}

function statusLabel(state: ClientFacingState) {
  switch (state) {
    case "action": return "Action required";
    case "progress": return "In progress";
    case "soon": return "Due soon";
    case "complete": return "Up to date";
    default: return "Not started";
  }
}

function statusClasses(state: ClientFacingState) {
  switch (state) {
    case "action": return "border-red-200 bg-red-50 text-red-700";
    case "soon": return "border-amber-200 bg-amber-50 text-amber-700";
    case "progress": return "border-blue-200 bg-blue-50 text-blue-700";
    case "complete": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default: return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function responsibility(item: ComplianceObligation) {
  if (attentionStatuses.has(item.workflowStatus)) return "You";
  if (item.workflowStatus === "complete") return "No action required";
  return "Your accountant";
}

function whatIsNeeded(item: ComplianceObligation) {
  if (item.workflowStatus === "waiting_for_client") {
    if (item.missingEvidenceCategories.length) {
      return `Provide ${item.missingEvidenceCategories.join(", ")}`;
    }
    return "Provide the requested information or document";
  }
  if (item.workflowStatus === "payment_outstanding") return "Payment is still outstanding";
  if (item.workflowStatus === "overdue") return "This item is overdue and needs attention";
  if (item.workflowStatus === "ready_for_review") return "Your accountant is reviewing this item";
  if (item.workflowStatus === "ready_to_file") return "Your accountant is preparing to file this item";
  if (item.workflowStatus === "in_preparation" || item.workflowStatus === "ready_to_prepare") {
    return "Your accountant is preparing this item";
  }
  if (item.workflowStatus === "complete") return "No action required";
  return item.evidenceFound < item.evidenceRequired
    ? `${item.evidenceRequired - item.evidenceFound} supporting item(s) still required`
    : "No immediate action required";
}

function sortByDueDate(a: ComplianceObligation, b: ComplianceObligation) {
  if (!a.dueDateUtc && !b.dueDateUtc) return a.name.localeCompare(b.name);
  if (!a.dueDateUtc) return 1;
  if (!b.dueDateUtc) return -1;
  return new Date(a.dueDateUtc).getTime() - new Date(b.dueDateUtc).getTime();
}

export function ClientComplianceCentreWorkspace() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ClientComplianceTab>("overview");
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [centre, setCentre] = useState<ComplianceCentreData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [windowDays, setWindowDays] = useState("90");
  const [authorityFilter, setAuthorityFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rows, centreData] = await Promise.all([
        complianceAutomationApi.getObligations(),
        portalServiceApi.getClientComplianceCentre(),
      ]);
      setObligations(rows);
      setCentre(centreData as ComplianceCentreData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Compliance information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const ordered = useMemo(() => [...obligations].sort(sortByDueDate), [obligations]);
  const actionItems = useMemo(() => ordered.filter(item => clientState(item) === "action"), [ordered]);
  const completeItems = useMemo(() => ordered.filter(item => clientState(item) === "complete"), [ordered]);
  const comingSoon = useMemo(() => ordered.filter(item => {
    const state = clientState(item);
    const days = daysUntil(item.dueDateUtc);
    return state !== "complete" && state !== "action" && days != null && days >= 0 && days <= 30;
  }), [ordered]);

  const authorities = useMemo(() => Array.from(new Set(ordered.map(item => item.authority))).sort(), [ordered]);
  const authoritySummary = useMemo(() => authorities.map(authority => {
    const rows = ordered.filter(item => item.authority === authority);
    const attention = rows.filter(item => clientState(item) === "action").length;
    const soon = rows.filter(item => clientState(item) === "soon").length;
    const complete = rows.filter(item => clientState(item) === "complete").length;
    return { authority, total: rows.length, attention, soon, complete };
  }), [authorities, ordered]);

  const upcoming = useMemo(() => {
    const maxDays = Number(windowDays);
    return ordered.filter(item => {
      if (!item.dueDateUtc || clientState(item) === "complete") return false;
      if (authorityFilter !== "all" && item.authority !== authorityFilter) return false;
      const days = daysUntil(item.dueDateUtc);
      return days != null && days >= 0 && days <= maxDays;
    });
  }, [ordered, windowDays, authorityFilter]);

  const history = useMemo(() => {
    const events = [...(centre?.auditTrail ?? [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const query = historyQuery.trim().toLowerCase();
    return events.filter(event => {
      const matchesQuery = !query || `${event.action} ${event.actor} ${event.detail}`.toLowerCase().includes(query);
      const matchesFilter = historyFilter === "all" || event.action === historyFilter;
      return matchesQuery && matchesFilter;
    });
  }, [centre, historyFilter, historyQuery]);

  const businessName = user?.company || obligations[0]?.clientName || "Your business";
  const lastUpdated = centre?.snapshotDate || obligations[0]?.updatedAtUtc || null;

  return (
    <div className="portal-page space-y-6">
      <PageHeader
        eyebrow="Your compliance"
        title="Compliance Centre"
        description="Keep track of what needs attention, what is coming up and what your accountant is handling."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Download size={16} /> Print summary
            </Button>
            <Button variant="secondary" disabled={loading} onClick={() => void load()}>
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-950">{businessName}</p>
          <p className="mt-1 text-sm text-slate-500">
            {actionItems.length} need attention · {comingSoon.length} coming up · {completeItems.length} up to date
          </p>
        </div>
        {lastUpdated && <p className="text-xs text-slate-400">Last updated {formatDateLabel(lastUpdated)}</p>}
      </div>

      {error && (
        <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Compliance information is unavailable.</strong> {error}
        </div>
      )}

      <nav className="flex gap-7 overflow-x-auto border-b border-slate-200" aria-label="Compliance sections">
        {([
          ["overview", "Overview"],
          ["action", "Action required"],
          ["upcoming", "Upcoming"],
          ["history", "History"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              tab === value ? "border-[#0a2f66] text-[#0a2f66]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="py-14 text-sm text-slate-500">Loading compliance information…</div>
      ) : tab === "overview" ? (
        <OverviewTab
          actionItems={actionItems}
          authoritySummary={authoritySummary}
          upcoming={ordered.filter(item => item.dueDateUtc && clientState(item) !== "complete").slice(0, 4)}
          completeCount={completeItems.length}
          comingSoonCount={comingSoon.length}
          expandedId={expandedId}
          onToggle={id => setExpandedId(current => current === id ? null : id)}
          onShowAllActions={() => setTab("action")}
          onShowUpcoming={() => setTab("upcoming")}
        />
      ) : tab === "action" ? (
        <ActionTab
          items={actionItems}
          expandedId={expandedId}
          onToggle={id => setExpandedId(current => current === id ? null : id)}
        />
      ) : tab === "upcoming" ? (
        <UpcomingTab
          items={upcoming}
          authorities={authorities}
          authorityFilter={authorityFilter}
          windowDays={windowDays}
          onAuthorityChange={setAuthorityFilter}
          onWindowChange={setWindowDays}
          expandedId={expandedId}
          onToggle={id => setExpandedId(current => current === id ? null : id)}
        />
      ) : (
        <HistoryTab
          items={history}
          query={historyQuery}
          filter={historyFilter}
          onQueryChange={setHistoryQuery}
          onFilterChange={setHistoryFilter}
        />
      )}
    </div>
  );
}

function OverviewTab({
  actionItems,
  authoritySummary,
  upcoming,
  completeCount,
  comingSoonCount,
  expandedId,
  onToggle,
  onShowAllActions,
  onShowUpcoming,
}: {
  actionItems: ComplianceObligation[];
  authoritySummary: { authority: string; total: number; attention: number; soon: number; complete: number }[];
  upcoming: ComplianceObligation[];
  completeCount: number;
  comingSoonCount: number;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onShowAllActions: () => void;
  onShowUpcoming: () => void;
}) {
  return <div className="space-y-8">
    <section>
      <h2 className="text-slate-950">Your compliance at a glance</h2>
      <p className="mt-1 text-sm text-slate-500">A simple summary of what requires your attention right now.</p>
      <div className="mt-4 grid border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        <SummaryNumber value={completeCount} label="Up to date" />
        <SummaryNumber value={actionItems.length} label="Need your attention" />
        <SummaryNumber value={comingSoonCount} label="Coming up" />
      </div>
    </section>

    <section>
      <SectionHeading title="Needs your attention" description="Only items that currently require something from you." action="View all" onAction={onShowAllActions} />
      <ComplianceRows items={actionItems.slice(0, 3)} empty="You have no compliance actions waiting for you." expandedId={expandedId} onToggle={onToggle} />
    </section>

    <section>
      <SectionHeading title="Compliance areas" description="See where each authority stands without opening every item." />
      <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
        {authoritySummary.map(row => (
          <div key={row.authority} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-slate-950">{row.authority}</p>
              <p className="mt-1 text-sm text-slate-500">{row.total} tracked item{row.total === 1 ? "" : "s"}</p>
            </div>
            <p className="text-sm text-slate-600">
              {row.attention ? `${row.attention} need attention` : row.soon ? `${row.soon} coming up` : `${row.complete} up to date`}
            </p>
          </div>
        ))}
        {authoritySummary.length === 0 && <EmptyLine text="No compliance areas have been generated yet." />}
      </div>
    </section>

    <section>
      <SectionHeading title="Upcoming important dates" description="The next deadlines and review dates on your compliance schedule." action="View all" onAction={onShowUpcoming} />
      <UpcomingRows items={upcoming} compact expandedId={expandedId} onToggle={onToggle} />
    </section>
  </div>;
}

function ActionTab({ items, expandedId, onToggle }: { items: ComplianceObligation[]; expandedId: string | null; onToggle: (id: string) => void }) {
  return <section>
    <SectionHeading title="Action required" description="These items need information, documents or another action from you." />
    <ComplianceRows items={items} empty="Nothing needs your attention right now." expandedId={expandedId} onToggle={onToggle} />
  </section>;
}

function UpcomingTab({ items, authorities, authorityFilter, windowDays, onAuthorityChange, onWindowChange, expandedId, onToggle }: {
  items: ComplianceObligation[];
  authorities: string[];
  authorityFilter: string;
  windowDays: string;
  onAuthorityChange: (value: string) => void;
  onWindowChange: (value: string) => void;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return <section>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-slate-950">Upcoming compliance items</h2>
        <p className="mt-1 text-sm text-slate-500">Plan ahead for deadlines and reviews before they become urgent.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" value={windowDays} onChange={event => onWindowChange(event.target.value)}>
          <option value="30">Next 30 days</option>
          <option value="90">Next 90 days</option>
          <option value="365">Next 12 months</option>
        </select>
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" value={authorityFilter} onChange={event => onAuthorityChange(event.target.value)}>
          <option value="all">All authorities</option>
          {authorities.map(authority => <option key={authority} value={authority}>{authority}</option>)}
        </select>
      </div>
    </div>
    <UpcomingRows items={items} expandedId={expandedId} onToggle={onToggle} />
  </section>;
}

function HistoryTab({ items, query, filter, onQueryChange, onFilterChange }: {
  items: ComplianceAuditEvent[];
  query: string;
  filter: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}) {
  return <section>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-slate-950">Compliance history</h2>
        <p className="mt-1 text-sm text-slate-500">A record of compliance activity and updates for your business.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Search compliance history"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Search history…"
          className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0a2f66]"
        />
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" value={filter} onChange={event => onFilterChange(event.target.value)}>
          <option value="all">All activity</option>
          <option value="uploaded">Uploads</option>
          <option value="reviewed">Reviews</option>
          <option value="approved">Approvals</option>
          <option value="rejected">Rejections</option>
          <option value="request_sent">Requests</option>
          <option value="renewed">Renewals</option>
        </select>
      </div>
    </div>

    <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
      {items.map(item => (
        <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
          <div className="text-sm text-slate-500">
            <p>{formatDateLabel(item.timestamp)}</p>
            <p className="mt-1 text-xs text-slate-400">{new Date(item.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div>
            <p className="font-medium text-slate-950">{complianceStatusLabel(item.action)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
            <p className="mt-1 text-xs text-slate-400">{item.actor}</p>
          </div>
        </div>
      ))}
      {items.length === 0 && <EmptyLine text="No compliance history matches your filters." />}
    </div>
  </section>;
}

function SummaryNumber({ value, label }: { value: number; label: string }) {
  return <div className="flex items-baseline gap-3 py-4 sm:px-6 first:sm:pl-0">
    <span className="text-2xl font-semibold text-slate-950">{value}</span>
    <span className="text-sm text-slate-600">{label}</span>
  </div>;
}

function SectionHeading({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="flex items-end justify-between gap-4">
    <div>
      <h2 className="text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    {action && onAction && <button type="button" onClick={onAction} className="shrink-0 text-sm font-medium text-[#0a2f66] hover:underline">{action}</button>}
  </div>;
}

function ComplianceRows({ items, empty, expandedId, onToggle }: { items: ComplianceObligation[]; empty: string; expandedId: string | null; onToggle: (id: string) => void }) {
  return <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
    {items.map(item => <ComplianceRow key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => onToggle(item.id)} />)}
    {items.length === 0 && <EmptyLine text={empty} />}
  </div>;
}

function ComplianceRow({ item, expanded, onToggle }: { item: ComplianceObligation; expanded: boolean; onToggle: () => void }) {
  const state = clientState(item);
  const owner = responsibility(item);
  return <div>
    <div className="grid gap-3 py-4 lg:grid-cols-[1.45fr_.65fr_1.5fr_.7fr_.8fr_auto] lg:items-center">
      <div>
        <p className="font-medium text-slate-950">{item.name || item.code}</p>
        <p className="mt-1 text-xs text-slate-400">{item.code}</p>
      </div>
      <p className="text-sm text-slate-600">{item.authority}</p>
      <p className="text-sm text-slate-600">{whatIsNeeded(item)}</p>
      <p className="text-sm text-slate-600">{item.dueDateUtc ? formatDateLabel(item.dueDateUtc) : "No fixed date"}</p>
      <div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(state)}`}>{statusLabel(state)}</span>
        <p className="mt-1 text-xs text-slate-400">{owner}</p>
      </div>
      <div className="flex items-center gap-2 lg:justify-end">
        {owner === "You" && <Link to="/client/documents" className="rounded-lg bg-[#0a2f66] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#07244f]">Upload</Link>}
        <button type="button" onClick={onToggle} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {expanded ? "Close" : "View"}
        </button>
      </div>
    </div>
    {expanded && <ObligationDetails item={item} />}
  </div>;
}

function ObligationDetails({ item }: { item: ComplianceObligation }) {
  return <div className="mb-4 ml-0 border-l-2 border-slate-200 bg-slate-50 px-4 py-4 sm:ml-5">
    <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <Detail label="Period" value={item.code === "CSD" ? "Standing registration" : formatCompliancePeriod(item.periodStartUtc, item.periodEndUtc)} />
      <Detail label="Responsibility" value={responsibility(item)} />
      <Detail label="Supporting evidence" value={`${item.evidenceFound} of ${item.evidenceRequired} received`} />
      <Detail label="Current stage" value={complianceStatusLabel(item.workflowStatus)} />
    </div>
    <p className="mt-4 text-sm leading-6 text-slate-600">{whatIsNeeded(item)}.</p>
  </div>;
}

function UpcomingRows({ items, compact = false, expandedId, onToggle }: { items: ComplianceObligation[]; compact?: boolean; expandedId: string | null; onToggle: (id: string) => void }) {
  const groups = useMemo(() => {
    const result = new Map<string, ComplianceObligation[]>();
    items.forEach(item => {
      if (!item.dueDateUtc) return;
      const key = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(new Date(item.dueDateUtc));
      const current = result.get(key) ?? [];
      current.push(item);
      result.set(key, current);
    });
    return Array.from(result.entries());
  }, [items]);

  return <div className="mt-4 space-y-6">
    {groups.map(([month, rows]) => (
      <div key={month}>
        {!compact && <p className="mb-2 text-sm font-semibold text-slate-800">{month}</p>}
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {rows.map(item => (
            <div key={item.id}>
              <div className="grid gap-3 py-4 sm:grid-cols-[5rem_1.2fr_.7fr_1.3fr_auto] sm:items-center">
                <div className="text-sm text-slate-500">
                  <p className="font-semibold text-slate-800">{new Date(item.dueDateUtc!).getDate()}</p>
                  <p className="text-xs">{new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(new Date(item.dueDateUtc!))}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-950">{item.name || item.code}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.authority}</p>
                </div>
                <p className="text-sm text-slate-600">{item.workflowStatus === "ready_to_file" ? "Filing deadline" : "Review / deadline"}</p>
                <p className="text-sm text-slate-600">{responsibility(item)}</p>
                <button type="button" onClick={() => onToggle(item.id)} className="inline-flex items-center gap-1 text-sm font-medium text-[#0a2f66] hover:underline">
                  View <ChevronRight size={15} />
                </button>
              </div>
              {expandedId === item.id && <ObligationDetails item={item} />}
            </div>
          ))}
        </div>
      </div>
    ))}
    {groups.length === 0 && <div className="border-y border-slate-200"><EmptyLine text="There are no upcoming items in this period." /></div>}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-slate-700">{value}</p></div>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className="py-8 text-sm text-slate-500">{text}</div>;
}
