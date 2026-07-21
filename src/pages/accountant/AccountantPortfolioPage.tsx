import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Files, FolderOpen, LayoutGrid, MoreVertical, Search, Sparkles, Table2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { FirmClientAccount, PortfolioRow } from "../../types/portal";
import { cn } from "../../utils/cn";
import { getScopedClients } from "../../utils/permissions";

const portfolioSnapshotDate = "2026-05-07T08:00:00.000Z";

type SortMode = "priority" | "deadline" | "progress";
type ViewMode = "grid" | "list";
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
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!openActionMenuId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenActionMenuId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionMenuId]);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <p className="text-[0.82rem] uppercase tracking-[0.12em] text-brand-700">Accountant Workspace</p>
          <h1 className="text-[1.95rem] tracking-tight text-slate-950">{isAdmin ? "Firm Clients" : "Assigned Clients"}</h1>
          <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">
            Manage client compliance health, monthly packs and filing progress for May 2026. Good morning, {getFirstName(user?.fullName)}.
          </p>
        </div>
        {isAdmin ? (
          <Button className="h-12 rounded-xl px-5" onClick={() => navigate("/firm/admin/assignments")} variant="secondary">
            <UserRound className="h-4 w-4" />
            Manage assignments
          </Button>
        ) : null}
      </div>

      <SurfaceCard className="rounded-[1.75rem] border border-slate-200/90 bg-white/95 p-4 shadow-[0_22px_48px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:items-start">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {[
                { id: "all" as const, label: "All Clients", count: summary.assigned },
                { id: "my_urgent" as const, label: "Urgent", count: summary.overdue + summary.attention },
                { id: "due_48h" as const, label: "Due This Week", count: assignedPortfolio.filter(({ row }) => dayDifference(row.deadline) >= 0 && dayDifference(row.deadline) <= 7).length },
                { id: "blocked_3d" as const, label: "Blocked", count: assignedPortfolio.filter(({ row }) => row.missingCount > 0 && laneAgingDays(row) >= 3).length },
              ].map((filter) => (
                <button
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-[0.94rem] transition",
                    savedFilter === filter.id
                      ? "border-brand-700 bg-brand-700 text-white shadow-[0_12px_24px_rgba(10,47,102,0.18)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/30",
                  )}
                  key={filter.id}
                  onClick={() => setSavedFilter(filter.id)}
                  type="button"
                >
                  <span className="whitespace-nowrap">{filter.label}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.76rem]", savedFilter === filter.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500")}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative min-w-0 xl:justify-self-end">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-full border border-slate-200 bg-slate-50/35 pl-12 pr-4 text-[0.96rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100 xl:w-[380px]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients, industry, or accountant..."
                value={search}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[0.88rem] text-slate-600">Assigned {summary.assigned}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[0.88rem] text-slate-600">Overdue {summary.overdue}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[0.88rem] text-slate-600">On track {summary.onTrack}</span>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="relative">
                <select
                  className="h-10 min-w-[132px] appearance-none rounded-full border border-slate-200 bg-white pl-4 pr-10 text-[0.88rem] text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  value={sortMode}
                >
                  <option value="priority">Priority</option>
                  <option value="deadline">Due date</option>
                  <option value="progress">Progress</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="inline-flex w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1.5 sm:w-auto">
                {[
                  { id: "list" as const, label: "List", icon: Table2 },
                  { id: "grid" as const, label: "Grid", icon: LayoutGrid },
                ].map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id)}
                      type="button"
                      className={cn(
                        "inline-flex h-9 min-w-[96px] flex-1 items-center justify-center gap-2 rounded-full px-4 text-[0.9rem] transition sm:flex-none",
                        viewMode === mode.id
                          ? "bg-brand-700 text-white shadow-[0_8px_20px_rgba(10,47,102,0.18)]"
                          : "bg-transparent text-slate-500 hover:bg-white hover:text-slate-800",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {visibleClients.length === 0 ? (
        <SurfaceCard className="rounded-[1.75rem] border border-slate-200/90 px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/55 px-6 py-10 text-center">
            <p className="text-[0.8rem] uppercase tracking-[0.12em] text-slate-400">Clients Workspace</p>
            <h2 className="mt-3 text-[1.22rem] tracking-tight text-slate-950">No assigned clients found</h2>
            <p className="mt-3 text-[0.96rem] text-slate-500">Try another search, switch the active filter, or assign clients to this accountant workspace.</p>
          </div>
        </SurfaceCard>
      ) : viewMode === "grid" ? (
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
                        <span className="flex h-full w-full items-center justify-center text-base font-medium">{clientInitials(row.clientName)}</span>
                        <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white", risk.dot)} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[1rem] tracking-tight text-slate-950">{row.clientName}</h2>
                        <p className="mt-1 truncate text-[0.9rem] text-slate-500">{account?.industry ?? "Client"}</p>
                        <p className="mt-1 text-[0.82rem] text-slate-400">Assigned to {row.assignedAccountant}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border-r border-slate-100 pr-3">
                        <p className="text-[0.82rem] text-slate-500">Compliance Health</p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <span className={cn("text-[1.7rem]", risk.text)}>{row.progressPercent}%</span>
                          <div className="h-2 flex-1 rounded-full bg-slate-100">
                            <div className={cn("h-2 rounded-full", risk.progress)} style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }} />
                          </div>
                        </div>
                        <p className={cn("mt-1 text-[0.88rem]", risk.text)}>{risk.healthLabel}</p>
                      </div>
                      <div>
                        <p className="text-[0.82rem] text-slate-500">Monthly Pack</p>
                        <p className="mt-1.5 text-[0.94rem] text-slate-900">{row.monthLabel}</p>
                        <p className="mt-1 text-[0.86rem] text-slate-500">{docsProgress(row)} documents</p>
                        <p className="mt-1 truncate text-[0.8rem] text-slate-400">{packLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-2.5">
                    <div className="border-r border-slate-100 pr-3">
                      <p className="text-[0.82rem] text-slate-500">Open Items</p>
                      <p className="mt-1.5 text-[0.94rem] text-slate-900">{row.missingCount} open</p>
                      <p className={cn("mt-1 text-[0.84rem]", row.overdueCount > 0 ? "text-rose-600" : "text-slate-500")}>{row.overdueCount} overdue</p>
                    </div>
                    <div>
                      <p className="text-[0.82rem] text-slate-500">Next Deadline</p>
                      <p className="mt-1.5 flex items-center gap-2 text-[0.94rem] text-slate-900"><CalendarDays className="h-4 w-4 text-brand-700" />{formatDeadline(row.deadline)}</p>
                      <p className={cn("mt-1 text-[0.84rem]", deadline.className)}>{deadline.detail}</p>
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
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-slate-50/90">
                <tr className="h-12 border-b border-slate-200 text-[0.76rem] uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-4 text-left align-middle">Client name</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Status</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Compliance %</th>
                  <th className="whitespace-nowrap px-4 text-center align-middle">Total documents</th>
                  <th className="whitespace-nowrap px-4 text-left align-middle">Assigned accountant</th>
                  <th className="whitespace-nowrap px-6 text-center align-middle">Actions</th>
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
                            <span className="flex h-full w-full items-center justify-center text-sm font-medium">{clientInitials(row.clientName)}</span>
                            <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white", risk.dot)} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.96rem] text-slate-950">{row.clientName}</p>
                            <p className="mt-0.5 truncate text-[0.84rem] text-slate-500">{account?.industry ?? "Client"}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex flex-col items-center">
                          <span className={cn("inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[0.76rem] ring-1 ring-inset", risk.pill)}>
                            {risk.label}
                          </span>
                          <p className="mt-1 text-[0.8rem] text-slate-500">{deadlineMeta(row).detail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <p className={cn("text-[0.96rem]", risk.text)}>{row.progressPercent}%</p>
                        <div className="mx-auto mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn("h-1.5 rounded-full", risk.progress)}
                            style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <p className="truncate text-[0.88rem] text-slate-900">{docsProgress(row)} documents</p>
                        <p className={cn("mt-1 text-[0.82rem]", row.missingCount > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {row.missingCount} open
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[0.78rem] text-brand-700">
                            {clientInitials(row.assignedAccountant)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.88rem] text-slate-900">{row.assignedAccountant}</p>
                            <p className="mt-0.5 text-[0.78rem] text-slate-500">Primary owner</p>
                          </div>
                        </div>
                      </td>
                      <td className="relative px-6 py-3 text-center align-middle" ref={openActionMenuId === row.id ? actionMenuRef : undefined}>
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
                          <div className="absolute right-6 top-11 z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-left shadow-[0_18px_38px_rgba(15,23,42,0.16)]">
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/clients/${row.clientId}`);
                              }}
                              type="button"
                            >
                              <UserRound className="h-4 w-4 text-brand-700" />
                              Open client
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/filing?client=${row.clientId}`);
                              }}
                              type="button"
                            >
                              <Files className="h-4 w-4 text-brand-700" />
                              Client Filing
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/inbox?client=${row.clientId}`);
                              }}
                              type="button"
                            >
                              <FolderOpen className="h-4 w-4 text-brand-700" />
                              Open inbox
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/firm/clients/${row.clientId}/profile`);
                              }}
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
