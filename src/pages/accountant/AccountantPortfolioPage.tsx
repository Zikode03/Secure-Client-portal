import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { FirmClientAccount, PortfolioRow } from "../../types/portal";
import { cn } from "../../utils/cn";
import { getScopedClients } from "../../utils/permissions";

const portfolioSnapshotDate = "2026-05-07T08:00:00.000Z";

type SortMode = "priority" | "deadline" | "progress";
type ViewMode = "table" | "kanban";
type LaneKey = "waitingOnClient" | "inReview" | "atRisk" | "done";
type SavedFilter = "all" | "my_urgent" | "due_48h" | "blocked_3d";
type PortfolioView = { account: FirmClientAccount | null; row: PortfolioRow };

function getFirstName(value: string | undefined) {
  return value?.split(" ").filter(Boolean)[0] ?? "there";
}

function portfolioRank(row: PortfolioRow) {
  const statusScore = row.status === "overdue" ? 3 : row.status === "attention" ? 2 : 1;
  return statusScore * 100 + row.missingCount * 10 + row.overdueCount;
}

function dayDifference(dateValue: string) {
  const currentDate = new Date(portfolioSnapshotDate);
  const dueDate = new Date(dateValue);
  return Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
}

function riskMeta(row: PortfolioRow) {
  if (row.status === "overdue" || row.overdueCount > 0) {
    return {
      label: "Overdue",
      pill: "bg-rose-50 text-rose-600 ring-rose-200",
      className: "text-rose-600",
      accent: "bg-rose-500",
      progress: "bg-rose-500",
      text: "text-rose-600",
    };
  }
  if (row.status === "attention" || row.missingCount > 0) {
    return {
      label: "Needs attention",
      pill: "bg-amber-50 text-amber-600 ring-amber-200",
      className: "text-amber-600",
      accent: "bg-amber-500",
      progress: "bg-amber-500",
      text: "text-amber-600",
    };
  }
  return {
    label: "On track",
    pill: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    className: "text-emerald-600",
    accent: "bg-emerald-500",
    progress: "bg-emerald-500",
    text: "text-emerald-600",
  };
}

function deadlineMeta(row: PortfolioRow) {
  const difference = dayDifference(row.deadline);
  if (difference < 0) return { detail: `${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"} overdue`, className: "text-rose-600" };
  if (difference === 0) return { detail: "Due today", className: "text-rose-600" };
  if (difference <= 7) return { detail: `${difference} day${difference === 1 ? "" : "s"} left`, className: "text-amber-600" };
  return { detail: "On schedule", className: "text-emerald-600" };
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function laneForRow(row: PortfolioRow): { lane: LaneKey; rule: string } {
  if (row.overdueCount > 0 || row.status === "overdue") return { lane: "atRisk", rule: "Auto: overdue risk" };
  if (row.progressPercent >= 95 && row.missingCount === 0) return { lane: "done", rule: "Auto: near completion" };
  if (row.missingCount > 0) return { lane: "waitingOnClient", rule: "Auto: waiting on missing records" };
  return { lane: "inReview", rule: "Auto: ready for accountant review" };
}

function docsProgress(row: PortfolioRow) {
  const total = 24;
  const complete = Math.max(0, Math.min(total, Math.round((row.progressPercent / 100) * total)));
  return `${complete}/${total}`;
}

function blockerTag(row: PortfolioRow) {
  if (row.overdueCount > 0) return "Waiting on manager";
  if (row.missingCount > 0) return "Waiting on client";
  if (row.status === "attention") return "Waiting on docs";
  return "No blockers";
}

function nextAction(row: PortfolioRow) {
  if (row.overdueCount > 0) return "Escalate overdue items";
  if (row.missingCount > 0) return "Send client reminder";
  if (row.status === "attention") return "Review reconciliations";
  return "Prepare final sign-off";
}

function laneAgingDays(row: PortfolioRow) {
  const dueDays = dayDifference(row.deadline);
  if (dueDays < 0) return Math.abs(dueDays) + 2;
  if (dueDays <= 2) return 3;
  if (dueDays <= 7) return 2;
  return 1;
}

function agingTone(days: number) {
  if (days >= 4) return "bg-rose-50";
  if (days >= 3) return "bg-amber-50";
  return "bg-slate-50";
}

export function AccountantPortfolioPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [savedFilter, setSavedFilter] = useState<SavedFilter>("all");

  const accountById = useMemo(() => new Map(portal.adminClients.map((client) => [client.id, client])), [portal.adminClients]);
  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [portal.adminClients, user]);
  const scopedClientIds = useMemo(() => new Set(scopedClients.map((client) => client.id)), [scopedClients]);

  const assignedPortfolio = useMemo(() => {
    const visibleRows = portal.accountantDashboard.portfolio.filter((row) => scopedClientIds.has(row.clientId));
    return visibleRows.map<PortfolioView>((row) => ({ row, account: accountById.get(row.clientId) ?? null }));
  }, [accountById, portal.accountantDashboard.portfolio, scopedClientIds]);

  const visibleClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = assignedPortfolio.filter(({ account, row }) => {
      if (savedFilter === "my_urgent" && !(row.overdueCount > 0 || row.status === "overdue" || row.missingCount > 0)) return false;
      if (savedFilter === "due_48h") {
        const days = dayDifference(row.deadline);
        if (!(days >= 0 && days <= 2)) return false;
      }
      if (savedFilter === "blocked_3d") {
        const age = laneAgingDays(row);
        if (!(row.missingCount > 0 && age >= 3)) return false;
      }
      if (!normalizedSearch) return true;
      return `${row.clientName} ${account?.industry ?? ""} ${row.assignedAccountant} ${row.monthLabel}`.toLowerCase().includes(normalizedSearch);
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === "progress") return right.row.progressPercent - left.row.progressPercent;
      if (sortMode === "deadline") return new Date(left.row.deadline).getTime() - new Date(right.row.deadline).getTime();
      return portfolioRank(right.row) - portfolioRank(left.row);
    });
  }, [assignedPortfolio, savedFilter, search, sortMode]);

  const summary = useMemo(() => {
    const overdue = assignedPortfolio.filter(({ row }) => row.status === "overdue").length;
    const attention = assignedPortfolio.filter(({ row }) => row.status === "attention").length;
    const onTrack = assignedPortfolio.filter(({ row }) => row.status === "on_track").length;
    return { assigned: assignedPortfolio.length, overdue, attention, onTrack };
  }, [assignedPortfolio]);

  const kanbanColumns = useMemo(() => {
    const mapped = visibleClients.map((item) => ({ ...item, routing: laneForRow(item.row) }));
    return {
      waitingOnClient: mapped.filter((item) => item.routing.lane === "waitingOnClient"),
      inReview: mapped.filter((item) => item.routing.lane === "inReview"),
      atRisk: mapped.filter((item) => item.routing.lane === "atRisk"),
      done: mapped.filter((item) => item.routing.lane === "done"),
    };
  }, [visibleClients]);

  const laneMeta: Record<LaneKey, { title: string; helper: string; tone: string; wip: number; slaDays: number }> = {
    waitingOnClient: { title: "Waiting on client", helper: "Missing uploads or corrections", tone: "border-l-brand-300", wip: 10, slaDays: 3 },
    inReview: { title: "In review", helper: "Ready for accountant checks", tone: "border-l-amber-300", wip: 8, slaDays: 2 },
    atRisk: { title: "At risk", helper: "Overdue or likely to slip", tone: "border-l-rose-300", wip: 6, slaDays: 1 },
    done: { title: "Done", helper: "On track and nearly complete", tone: "border-l-emerald-300", wip: 999, slaDays: 5 },
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">Good morning, {getFirstName(user?.fullName)}</h1>
        <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">{isAdmin ? "Firm client portfolio for May 2026." : "Your client portfolio for May 2026."}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>Assigned: {summary.assigned}</span><span>Overdue: {summary.overdue}</span><span>Needs attention: {summary.attention}</span><span>On track: {summary.onTrack}</span>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[{ id: "table" as const, label: "Table" }, { id: "kanban" as const, label: "Kanban" }].map((mode) => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)} type="button" className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", viewMode === mode.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>{mode.label}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[{ id: "all" as const, label: "All" }, { id: "my_urgent" as const, label: "My urgent" }, { id: "due_48h" as const, label: "Due in 48h" }, { id: "blocked_3d" as const, label: "Blocked >3d" }].map((filter) => (
          <button
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition", savedFilter === filter.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
            key={filter.id}
            onClick={() => setSavedFilter(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
        <input className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-[13.5rem] text-[0.95rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" onChange={(event) => setSearch(event.target.value)} placeholder="Search by client name, industry, or accountant..." value={search} />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2"><div className="relative"><select className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-9 text-[0.82rem] font-medium text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option value="priority">Priority</option><option value="deadline">Due date</option><option value="progress">Progress</option></select><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><ChevronDownIcon /></span></div></div>
      </div>

      {visibleClients.length === 0 ? (
        <SurfaceCard><EmptyState description="Try another search or change the filter." title="No assigned clients found" /></SurfaceCard>
      ) : viewMode === "table" ? (
        <div className="space-y-4">
          {visibleClients.map(({ account, row }) => {
            const risk = riskMeta(row);
            const deadline = deadlineMeta(row);
            const packLabel = account?.requiredPack ?? "Monthly Pack";
            return (
              <SurfaceCard className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white p-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]" key={row.id}>
                <span className={cn("absolute left-0 top-0 h-full w-1 rounded-r-full", risk.accent)} />
                <div className="grid gap-5 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.68fr)_minmax(220px,0.72fr)_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-4"><div className="min-w-0 space-y-1.5"><h2 className="truncate text-[1.08rem] font-semibold tracking-tight text-slate-950">{row.clientName}</h2><p className="text-[0.84rem] text-slate-500">{account?.industry ?? "Client"} <span className="text-slate-300">•</span> Assigned to {row.assignedAccountant}</p><p className={cn("text-[0.86rem] font-medium", deadline.className)}>{deadline.detail}</p></div></div>
                  <div className="space-y-1.5 lg:border-l lg:border-slate-100 lg:pl-5"><p className="text-[0.86rem] font-semibold text-slate-900">Monthly Pack</p><p className="text-[0.84rem] text-slate-500">{row.monthLabel} - {packLabel}</p><p className="text-[0.84rem] text-slate-500">{row.progressPercent >= 100 ? "24 / 24 documents" : `${Math.max(0, Math.round((row.progressPercent / 100) * 24))} / 24 documents`}</p></div>
                  <div className="space-y-2.5 lg:border-l lg:border-slate-100 lg:pl-5"><div className="flex items-center justify-between gap-3"><span className="text-[0.84rem] font-medium text-slate-500">Progress</span><span className={cn("text-[0.95rem] font-semibold", risk.text)}>{row.progressPercent}%</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className={cn("h-2.5 rounded-full transition-all", risk.progress)} style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }} /></div><div className="flex items-center justify-between gap-3"><span className={cn("inline-flex rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset", risk.pill)}>{risk.label}</span></div></div>
                  <div className="flex flex-col gap-2 lg:min-w-[196px]"><Button className="h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => navigate(`/firm/clients/${row.clientId}?tab=packs`)} size="sm" variant="secondary">Open Monthly Pack</Button><Button className="h-10 rounded-xl" onClick={() => navigate(`/firm/filing?client=${row.clientId}`)} size="sm">Open Client Filing</Button></div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-4">
          {(["waitingOnClient", "inReview", "atRisk", "done"] as LaneKey[]).map((laneKey) => {
            const column = kanbanColumns[laneKey];
            const meta = laneMeta[laneKey];
            const overWip = column.length > meta.wip;
            const laneMissing = column.reduce((sum, item) => sum + item.row.missingCount, 0);
            const laneOverdue = column.reduce((sum, item) => sum + item.row.overdueCount, 0);
            return (
              <div className={cn("rounded-2xl border border-slate-200 border-l-4 bg-white", meta.tone)} key={laneKey}>
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{meta.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", overWip ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>WIP {column.length}/{meta.wip === 999 ? "∞" : meta.wip}</span>
                  </div>
                  <p className="text-xs text-slate-500">{meta.helper}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Lane totals: {laneMissing} missing · {laneOverdue} overdue</p>
                </div>
                <div className="space-y-2 p-2.5">
                  {column.length === 0 ? <p className="px-2 py-3 text-xs text-slate-400">No clients</p> : null}
                  {column.map(({ account, row, routing }) => {
                    const risk = riskMeta(row);
                    const deadline = deadlineMeta(row);
                    const age = laneAgingDays(row);
                    const atSlaRisk = age > meta.slaDays;
                    return (
                      <div className={cn("rounded-xl border border-slate-200 px-3 py-2.5", agingTone(age))} key={row.id}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">{row.clientName}</p>
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ring-inset", risk.pill)}>{risk.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{account?.industry ?? "Client"} · Owner: {row.assignedAccountant}</p>
                        <p className="mt-1 text-xs text-slate-500">Checklist: Docs {docsProgress(row)} · Bank Rec {row.progressPercent >= 60 ? "done" : "pending"} · VAT {row.progressPercent >= 85 ? "done" : "pending"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[0.64rem] font-medium text-slate-600 ring-1 ring-slate-200">{blockerTag(row)}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[0.64rem] font-medium text-slate-600 ring-1 ring-slate-200">{routing.rule}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[0.64rem] font-medium ring-1", atSlaRisk ? "bg-rose-50 text-rose-600 ring-rose-200" : "bg-emerald-50 text-emerald-600 ring-emerald-200")}>SLA: {age}d in lane</span>
                        </div>
                        <p className="mt-2 text-[0.7rem] text-slate-600">Next action: <span className="font-semibold text-slate-800">{nextAction(row)}</span> · {deadline.detail}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[0.68rem] font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => navigate(`/firm/inbox?client=${encodeURIComponent(row.clientName)}`)} type="button">Send reminder</button>
                          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[0.68rem] font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => navigate(`/firm/clients/${row.clientId}/packs`)} type="button">Mark received</button>
                          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[0.68rem] font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => navigate(`/firm/clients/${row.clientId}`)} type="button">Request correction</button>
                          <button className="rounded-lg bg-slate-900 px-2 py-1 text-[0.68rem] font-medium text-white transition hover:bg-slate-800" onClick={() => navigate(`/firm/review?client=${encodeURIComponent(row.clientName)}`)} type="button">Escalate</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleClients.length > 0 ? <p className="text-center text-[0.88rem] text-slate-500">Showing {visibleClients.length} of {assignedPortfolio.length} clients</p> : null}
    </div>
  );
}
