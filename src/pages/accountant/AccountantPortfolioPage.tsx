import { useMemo, useState } from "react";
import { ArrowUpDown, CalendarDays, ChevronDown, Files, FolderOpen, LayoutGrid, MoreVertical, Search, Sparkles, Table2, UserRound } from "lucide-react";
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
type ViewMode = "table" | "list";
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
      healthLabel: "Needs attention",
      pill: "bg-rose-50 text-rose-600 ring-rose-200",
      className: "text-rose-600",
      accent: "bg-rose-500",
      progress: "bg-rose-500",
      text: "text-rose-600",
      dot: "bg-rose-500",
    };
  }
  if (row.status === "attention" || row.missingCount > 0) {
    return {
      label: "Needs attention",
      healthLabel: "Fair",
      pill: "bg-amber-50 text-amber-600 ring-amber-200",
      className: "text-amber-600",
      accent: "bg-amber-500",
      progress: "bg-amber-500",
      text: "text-amber-600",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "On track",
    healthLabel: row.progressPercent >= 90 ? "Excellent" : "Good",
    pill: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    className: "text-emerald-600",
    accent: "bg-emerald-500",
    progress: "bg-emerald-500",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  };
}

function deadlineMeta(row: PortfolioRow) {
  const difference = dayDifference(row.deadline);
  if (difference < 0) return { detail: `${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"} overdue`, className: "text-rose-600" };
  if (difference === 0) return { detail: "Due today", className: "text-rose-600" };
  if (difference <= 7) return { detail: `${difference} day${difference === 1 ? "" : "s"} left`, className: "text-amber-600" };
  return { detail: "On schedule", className: "text-emerald-600" };
}

function docsProgress(row: PortfolioRow) {
  const total = 24;
  const complete = Math.max(0, Math.min(total, Math.round((row.progressPercent / 100) * total)));
  return `${complete}/${total}`;
}

function laneAgingDays(row: PortfolioRow) {
  const dueDays = dayDifference(row.deadline);
  if (dueDays < 0) return Math.abs(dueDays) + 2;
  if (dueDays <= 2) return 3;
  if (dueDays <= 7) return 2;
  return 1;
}

function clientInitials(clientName: string) {
  return clientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDeadline(dateValue: string) {
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateValue));
}

function portfolioRowFromAccount(account: FirmClientAccount): PortfolioRow {
  const hasRisk = account.status === "overdue" || account.completionRate < 70;

  return {
    id: `portfolio-${account.id}`,
    clientId: account.id,
    clientName: account.clientName,
    monthLabel: "April 2026",
    progressPercent: account.completionRate,
    status: account.status,
    assignedAccountant: account.assignedAccountant,
    missingCount: hasRisk ? Math.max(1, Math.round((100 - account.completionRate) / 18)) : 0,
    overdueCount: account.status === "overdue" ? 1 : 0,
    deadline: "06 May 2026",
  };
}

export function AccountantPortfolioPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [savedFilter, setSavedFilter] = useState<SavedFilter>("all");
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const accountById = useMemo(() => new Map(portal.adminClients.map((client) => [client.id, client])), [portal.adminClients]);
  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [portal.adminClients, user]);
  const scopedClientIds = useMemo(() => new Set(scopedClients.map((client) => client.id)), [scopedClients]);

  const assignedPortfolio = useMemo(() => {
    const portfolioRows = isAdmin
      ? [
          ...portal.accountantDashboard.portfolio,
          ...portal.adminClients
            .filter((client) => !portal.accountantDashboard.portfolio.some((row) => row.clientId === client.id))
            .map(portfolioRowFromAccount),
        ]
      : portal.accountantDashboard.portfolio;
    const visibleRows = isAdmin ? portfolioRows : portfolioRows.filter((row) => scopedClientIds.has(row.clientId));
    return visibleRows.map<PortfolioView>((row) => ({ row, account: accountById.get(row.clientId) ?? null }));
  }, [accountById, isAdmin, portal.accountantDashboard.portfolio, portal.adminClients, scopedClientIds]);

  const visibleClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = assignedPortfolio.filter(({ account, row }) => {
      if (savedFilter === "my_urgent" && !(row.overdueCount > 0 || row.status === "overdue" || row.missingCount > 0)) return false;
      if (savedFilter === "due_48h") {
        const days = dayDifference(row.deadline);
        if (!(days >= 0 && days <= 7)) return false;
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

  const gridPreviewClients = useMemo(() => {
    if (visibleClients.length === 0 || visibleClients.length >= 4) {
      return visibleClients;
    }

    const preview = [...visibleClients];
    let sourceIndex = 0;
    while (preview.length < 4) {
      preview.push(visibleClients[sourceIndex % visibleClients.length]);
      sourceIndex += 1;
    }

    return preview;
  }, [visibleClients]);

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-5">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.24em] text-slate-400">Accountant Workspace</p>
            <div className="space-y-5">
              <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">{isAdmin ? "Firm Clients" : "Assigned Clients"}</h1>
              <p className="max-w-5xl text-[0.96rem] leading-7 text-slate-500">
                Manage client compliance health, monthly packs and filing progress for May 2026. Good morning, {getFirstName(user?.fullName)}.
              </p>
            </div>
          </div>
          {isAdmin ? (
            <Button className="h-12 rounded-xl px-5" onClick={() => navigate("/firm/admin/assignments")} variant="secondary">
              <UserRound className="h-4 w-4" />
              Manage assignments
            </Button>
          ) : null}
        </div>
      </div>

      <SurfaceCard className="rounded-[1.9rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { id: "all" as const, label: "All Clients", count: summary.assigned },
              { id: "my_urgent" as const, label: "Urgent", count: summary.overdue + summary.attention },
              { id: "due_48h" as const, label: "Due This Week", count: assignedPortfolio.filter(({ row }) => dayDifference(row.deadline) >= 0 && dayDifference(row.deadline) <= 7).length },
              { id: "blocked_3d" as const, label: "Blocked", count: assignedPortfolio.filter(({ row }) => row.missingCount > 0 && laneAgingDays(row) >= 3).length },
            ].map((filter) => (
              <button
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                  savedFilter === filter.id ? "border-brand-700 bg-brand-700 text-white shadow-[0_14px_30px_rgba(10,47,102,0.22)]" : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/40",
                )}
                key={filter.id}
                onClick={() => setSavedFilter(filter.id)}
                type="button"
              >
                <span className="whitespace-nowrap">{filter.label}</span>
                <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[0.7rem]", savedFilter === filter.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400")}>{filter.count}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input className="h-11 w-full rounded-full border border-slate-200 bg-white pl-14 pr-5 text-[0.9rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" onChange={(event) => setSearch(event.target.value)} placeholder="Search clients, industry, or accountant..." value={search} />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex flex-col gap-4 min-[980px]:flex-row min-[980px]:items-center min-[980px]:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[0.82rem] font-semibold text-slate-500">Assigned {summary.assigned}</span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[0.82rem] font-semibold text-slate-500">Overdue {summary.overdue}</span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[0.82rem] font-semibold text-slate-500">On track {summary.onTrack}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 min-[980px]:justify-end">
                <div
                  className="relative"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setIsSortMenuOpen(false);
                    }
                  }}
                >
                  <button
                    aria-expanded={isSortMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Sort clients"
                    className={cn(
                      "inline-flex h-10 min-w-[148px] items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-4 text-[0.82rem] font-semibold shadow-sm transition",
                      isSortMenuOpen || sortMode !== "priority"
                        ? "text-[#00856f] ring-1 ring-[#0a2f66]/10"
                        : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]",
                    )}
                    onClick={() => setIsSortMenuOpen((current) => !current)}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      {sortMode === "priority" ? "Priority" : sortMode === "deadline" ? "Due date" : "Progress"}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition", isSortMenuOpen ? "rotate-180" : "")} />
                  </button>
                  {isSortMenuOpen ? (
                    <div className="absolute right-0 top-12 z-50 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
                      {[
                        { id: "priority" as const, label: "Priority" },
                        { id: "deadline" as const, label: "Due date" },
                        { id: "progress" as const, label: "Progress" },
                      ].map((option) => (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition",
                            sortMode === option.id
                              ? "bg-[#eaf7f0] text-[#087d69]"
                              : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]",
                          )}
                          key={option.id}
                          onClick={() => {
                            setSortMode(option.id);
                            setIsSortMenuOpen(false);
                          }}
                          role="menuitem"
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {[
              { id: "list" as const, label: "List", icon: Table2 },
              { id: "table" as const, label: "Grid", icon: LayoutGrid },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button key={mode.id} onClick={() => setViewMode(mode.id)} type="button" className={cn("inline-flex h-10 min-w-[84px] items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition", viewMode === mode.id ? "bg-brand-700 text-white shadow-[0_10px_22px_rgba(10,47,102,0.2)]" : "text-slate-500 hover:text-slate-800")}>
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {visibleClients.length === 0 ? (
        <SurfaceCard><EmptyState description="Try another search or change the filter." title="No assigned clients found" /></SurfaceCard>
      ) : viewMode === "table" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {gridPreviewClients.map(({ account, row }, index) => {
            const risk = riskMeta(row);
            const deadline = deadlineMeta(row);
            const packLabel = account?.requiredPack ?? "Monthly Pack";
            return (
              <SurfaceCard className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_22px_52px_rgba(10,47,102,0.1)]" key={`${row.id}-grid-preview-${index}`}>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-[0_12px_24px_rgba(10,47,102,0.24)]">
                        <span className="flex h-full w-full items-center justify-center text-base font-bold">{clientInitials(row.clientName)}</span>
                        <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white", risk.dot)} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[1.05rem] font-bold tracking-tight text-slate-950">{row.clientName}</h2>
                        <p className="mt-1 truncate text-[0.86rem] text-slate-500">{account?.industry ?? "Client"}</p>
                        <p className="mt-1 text-[0.75rem] font-medium text-slate-400">Assigned to {row.assignedAccountant}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border-r border-slate-100 pr-3">
                        <p className="text-[0.78rem] font-semibold text-slate-500">Compliance Health</p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <span className={cn("text-2xl font-bold", risk.text)}>{row.progressPercent}%</span>
                          <div className="h-2 flex-1 rounded-full bg-slate-100">
                            <div className={cn("h-2 rounded-full", risk.progress)} style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }} />
                          </div>
                        </div>
                        <p className={cn("mt-1 text-[0.82rem] font-semibold", risk.text)}>{risk.healthLabel}</p>
                      </div>
                      <div>
                        <p className="text-[0.78rem] font-semibold text-slate-500">Monthly Pack</p>
                        <p className="mt-1.5 text-[0.9rem] font-bold text-slate-900">{row.monthLabel}</p>
                        <p className="mt-1 text-[0.82rem] text-slate-500">{docsProgress(row)} documents</p>
                        <p className="mt-1 truncate text-[0.75rem] text-slate-400">{packLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-2.5">
                    <div className="border-r border-slate-100 pr-3">
                      <p className="text-[0.78rem] font-semibold text-slate-500">Open Items</p>
                      <p className="mt-1.5 text-[0.9rem] font-bold text-slate-900">{row.missingCount} open</p>
                      <p className={cn("mt-1 text-[0.8rem] font-semibold", row.overdueCount > 0 ? "text-rose-600" : "text-slate-500")}>{row.overdueCount} overdue</p>
                    </div>
                    <div>
                      <p className="text-[0.78rem] font-semibold text-slate-500">Next Deadline</p>
                      <p className="mt-1.5 flex items-center gap-2 text-[0.9rem] font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-brand-700" />{formatDeadline(row.deadline)}</p>
                      <p className={cn("mt-1 text-[0.8rem] font-semibold", deadline.className)}>{deadline.detail}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Button className="h-9 rounded-lg border border-[#062044] !bg-[#062044] !bg-none !text-white shadow-[0_12px_24px_rgba(6,32,68,0.22)] hover:!bg-[#0a2f66] hover:!bg-none" onClick={() => navigate(`/firm/clients/${row.clientId}?tab=packs`)} size="sm">
                      <FolderOpen className="h-4 w-4" />
                      Monthly Pack
                    </Button>
                    <Button className="h-9 rounded-lg border border-[#062044] !bg-[#062044] !bg-none !text-white shadow-[0_12px_24px_rgba(6,32,68,0.22)] hover:!bg-[#0a2f66] hover:!bg-none" onClick={() => navigate(`/firm/filing?client=${row.clientId}`)} size="sm">
                      <Files className="h-4 w-4" />
                      Client Filing
                    </Button>
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      ) : (
        <div className="relative rounded-xl border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
          <div>
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[20%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-slate-50/90">
                <tr className="h-12 border-b border-slate-200 text-[0.7rem] font-bold uppercase tracking-normal text-slate-500">
                  <th className="whitespace-nowrap px-4 text-left align-middle">Client name</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Status</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Compliance %</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Total documents</th>
                  <th className="whitespace-nowrap px-4 text-left align-middle">Assigned accountant</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleClients.map(({ account, row }) => {
                  const risk = riskMeta(row);

                  return (
                    <tr className="h-[76px] group transition hover:bg-brand-50/35" key={row.id}>
                      <td className="px-4 py-3 align-middle">
                        <button className="flex w-full min-w-0 items-center gap-3 text-left" onClick={() => navigate(`/firm/clients/${row.clientId}`)} type="button">
                          <div className="relative h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-[0_12px_24px_rgba(10,47,102,0.18)]">
                            <span className="flex h-full w-full items-center justify-center text-sm font-bold">{clientInitials(row.clientName)}</span>
                            <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white", risk.dot)} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.9rem] font-bold text-slate-950">{row.clientName}</p>
                            <p className="mt-0.5 truncate text-[0.78rem] text-slate-500">{account?.industry ?? "Client"}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex flex-col items-center">
                          <span className={cn("inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[0.68rem] font-bold ring-1 ring-inset", risk.pill)}>
                            {risk.label}
                          </span>
                          <p className="mt-1 text-[0.74rem] text-slate-500">{row.monthLabel}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <p className={cn("text-[0.9rem] font-bold", risk.text)}>{row.progressPercent}%</p>
                        <p className={cn("mt-1 text-[0.76rem] font-semibold", risk.text)}>{risk.healthLabel}</p>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <p className="truncate text-[0.84rem] font-bold text-slate-900">{docsProgress(row)} documents</p>
                        <p className={cn("mt-1 text-[0.76rem] font-semibold", row.missingCount > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {row.missingCount} open
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[0.72rem] font-bold text-brand-700">
                            {clientInitials(row.assignedAccountant)}
                          </div>
                          <p className="min-w-0 truncate text-[0.84rem] font-semibold text-slate-900">{row.assignedAccountant}</p>
                        </div>
                      </td>
                      <td className="relative px-4 py-3 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <button
                            aria-expanded={openActionMenuId === row.id}
                            aria-label={`Actions for ${row.clientName}`}
                            className={cn(
                              "inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50",
                              openActionMenuId === row.id ? "bg-brand-50" : "",
                            )}
                            onClick={() => setOpenActionMenuId((current) => (current === row.id ? null : row.id))}
                            type="button"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                        {openActionMenuId === row.id ? (
                          <div className="absolute right-4 top-11 z-50 w-44 rounded-lg border border-slate-200 bg-white p-1.5 text-left shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/clients/${row.clientId}`);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              <UserRound className="h-4 w-4 text-brand-700" />
                              Open client
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/filing?client=${row.clientId}`);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              <Files className="h-4 w-4 text-brand-700" />
                              Client Filing
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/inbox?client=${encodeURIComponent(row.clientName)}`);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              <FolderOpen className="h-4 w-4 text-brand-700" />
                              Open inbox
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/clients/${row.clientId}/profile`);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              <Sparkles className="h-4 w-4 text-brand-700" />
                              Generate client summary
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {visibleClients.length > 0 ? <p className="text-center text-[0.88rem] text-slate-500">Showing {visibleClients.length} of {assignedPortfolio.length} clients</p> : null}
    </div>
  );
}
