// Friendly guide: this module (AccountantPortfolioPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { FirmClientAccount, PortfolioRow } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients } from "../../utils/permissions";

const portfolioSnapshotDate = "2026-05-07T08:00:00.000Z";

// Shared shape notes: these types keep UI and data contracts aligned.
type SortMode = "priority" | "deadline" | "progress";
type PortfolioView = {
  account: FirmClientAccount | null;
  row: PortfolioRow;
};

// Component flow: gather data first, then render a focused UI state.
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
  const difference = dueDate.getTime() - currentDate.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function riskMeta(row: PortfolioRow) {
  if (row.status === "overdue" || row.overdueCount > 0) {
    return {
      label: "Overdue",
      accent: "bg-rose-500",
      pill: "bg-rose-50 text-rose-600 ring-rose-200",
      progress: "bg-rose-500",
      text: "text-rose-600",
    };
  }

  if (row.status === "attention" || row.missingCount > 0) {
    return {
      label: "Needs attention",
      accent: "bg-amber-500",
      pill: "bg-amber-50 text-amber-600 ring-amber-200",
      progress: "bg-amber-500",
      text: "text-amber-600",
    };
  }

  return {
    label: "On track",
    accent: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    progress: "bg-emerald-500",
    text: "text-emerald-600",
  };
}

function deadlineMeta(row: PortfolioRow) {
  const difference = dayDifference(row.deadline);

  if (row.status === "on_track" && row.progressPercent >= 95) {
    return {
      title: `Deadline: ${formatDateLabel(row.deadline)}`,
      detail: "On track",
      className: "text-emerald-600",
    };
  }

  if (difference < 0) {
    return {
      title: `Deadline: ${formatDateLabel(row.deadline)}`,
      detail: `${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"} overdue`,
      className: "text-rose-600",
    };
  }

  if (difference === 0) {
    return {
      title: `Deadline: ${formatDateLabel(row.deadline)}`,
      detail: "Due today",
      className: "text-rose-600",
    };
  }

  if (difference <= 7) {
    return {
      title: `Deadline: ${formatDateLabel(row.deadline)}`,
      detail: `${difference} day${difference === 1 ? "" : "s"} left`,
      className: "text-amber-600",
    };
  }

  if (difference <= 14) {
    return {
      title: `Deadline: ${formatDateLabel(row.deadline)}`,
      detail: "In 2 weeks",
      className: "text-emerald-600",
    };
  }

  return {
    title: `Deadline: ${formatDateLabel(row.deadline)}`,
    detail: "In 3 weeks",
    className: "text-emerald-600",
  };
}

function industryTone(industry: string | undefined) {
  switch (industry) {
    case "Retail":
      return "bg-rose-50 text-rose-500 ring-rose-100";
    case "Manufacturing":
    case "Transport":
      return "bg-amber-50 text-amber-500 ring-amber-100";
    case "Professional Services":
    case "Property":
      return "bg-emerald-50 text-emerald-500 ring-emerald-100";
    default:
      return "bg-brand-50 text-brand-600 ring-brand-100";
  }
}

function SearchIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 8.5A2.75 2.75 0 0 1 7.5 5.75h2.78l1.56 1.75h4.66a2.75 2.75 0 0 1 2.75 2.75v6A2.75 2.75 0 0 1 16.5 19h-9A2.75 2.75 0 0 1 4.75 16.25v-7.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RecordsIcon({ industry }: { industry: string | undefined }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-[1.1rem] ring-1",
        industryTone(industry),
      )}
    >
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M7.75 4.75h8.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M9.5 9.5h5M9.5 13h5M9.5 16.5h3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function TopMetric({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: "brand" | "rose" | "amber" | "emerald";
  value: number;
}) {
  const classes =
    tone === "rose"
      ? "bg-rose-50 text-rose-500 ring-rose-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-500 ring-amber-100"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-500 ring-emerald-100"
          : "bg-brand-50 text-brand-600 ring-brand-100";

  return (
    <SurfaceCard className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="space-y-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-[0.95rem] ring-1", classes)}>
          {tone === "rose" ? (
            <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 8v4l2.5 2.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          ) : tone === "amber" ? (
            <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 8.5v4m0 3h.01M10.26 4.76 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25H18.8a1.5 1.5 0 0 0 1.3-2.25L12.74 4.76a1.5 1.5 0 0 0-2.48 0Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          ) : tone === "emerald" ? (
            <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
              <path
                d="m7.5 12.5 2.75 2.75L16.5 9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
              <path
                d="M5.75 12c0-1.54 1.25-2.8 2.8-2.8h1.15a2.3 2.3 0 0 0 4.6 0h1.15c1.55 0 2.8 1.26 2.8 2.8v3.2a1.8 1.8 0 0 1-1.8 1.8H7.55a1.8 1.8 0 0 1-1.8-1.8V12Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="7.4" r="2.65" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[0.8rem] font-medium text-slate-500">{label}</p>
          <p className="text-[1.55rem] font-semibold tracking-tight text-slate-950">{value}</p>
          <p
            className={cn(
              "text-[0.76rem] font-medium",
              tone === "rose"
                ? "text-rose-600"
                : tone === "amber"
                  ? "text-amber-600"
                  : tone === "emerald"
                    ? "text-emerald-600"
                    : "text-brand-600",
            )}
          >
            {helper}
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

export function AccountantPortfolioPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  const accountById = useMemo(
    () => new Map(portal.adminClients.map((client) => [client.id, client])),
    [portal.adminClients],
  );
  const scopedClients = useMemo(
    () => getScopedClients(user, portal.adminClients),
    [portal.adminClients, user],
  );
  const scopedClientIds = useMemo(
    () => new Set(scopedClients.map((client) => client.id)),
    [scopedClients],
  );

  const assignedPortfolio = useMemo(() => {
    const visibleRows = portal.accountantDashboard.portfolio.filter(
      (row) => scopedClientIds.has(row.clientId),
    );

    return visibleRows.map<PortfolioView>((row) => ({
      row,
      account: accountById.get(row.clientId) ?? null,
    }));
  }, [accountById, portal.accountantDashboard.portfolio, scopedClientIds]);

  const visibleClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = assignedPortfolio.filter(({ account, row }) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${row.clientName} ${account?.industry ?? ""} ${row.assignedAccountant} ${row.monthLabel}`
        .toLowerCase()
        .includes(normalizedSearch);
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === "progress") {
        return right.row.progressPercent - left.row.progressPercent;
      }

      if (sortMode === "deadline") {
        return new Date(left.row.deadline).getTime() - new Date(right.row.deadline).getTime();
      }

      return portfolioRank(right.row) - portfolioRank(left.row);
    });
  }, [assignedPortfolio, search, sortMode]);

  const summary = useMemo(() => {
    const overdue = assignedPortfolio.filter(({ row }) => row.status === "overdue").length;
    const attention = assignedPortfolio.filter(({ row }) => row.status === "attention").length;
    const onTrack = assignedPortfolio.filter(({ row }) => row.status === "on_track").length;

    return {
      assigned: assignedPortfolio.length,
      overdue,
      attention,
      onTrack,
    };
  }, [assignedPortfolio]);

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">
          Good morning, {getFirstName(user?.fullName)}
        </h1>
        <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">
          {isAdmin
            ? "Here&apos;s the firm client portfolio overview for May 2026."
            : "Here&apos;s your client portfolio overview for May 2026."}
        </p>
      </div>

      {isAdmin ? (
        <div className="flex flex-wrap gap-2.5">
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/firm/admin/assignments")}
            size="sm"
            variant="secondary"
          >
            Manage assignments
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-4">
        <TopMetric
          helper={isAdmin ? "Total clients visible across the firm" : "Total clients assigned to you"}
          label={isAdmin ? "Firm Clients" : "Assigned Clients"}
          tone="brand"
          value={summary.assigned}
        />
        <TopMetric
          helper="Require immediate attention"
          label="Overdue"
          tone="rose"
          value={summary.overdue}
        />
        <TopMetric
          helper="At risk of becoming overdue"
          label="Needs Attention"
          tone="amber"
          value={summary.attention}
        />
        <TopMetric
          helper="Progressing as expected"
          label="On Track"
          tone="emerald"
          value={summary.onTrack}
        />
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-[13.5rem] text-[0.95rem] text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by client name, industry, or accountant..."
          value={search}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <div className="relative">
            <select
              className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-9 text-[0.82rem] font-medium text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option value="priority">Priority</option>
              <option value="deadline">Due date</option>
              <option value="progress">Progress</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDownIcon />
            </span>
          </div>
        </div>
      </div>

      {visibleClients.length > 0 ? (
        <div className="space-y-4">
          {visibleClients.map(({ account, row }) => {
            const risk = riskMeta(row);
            const deadline = deadlineMeta(row);
            const packLabel = account?.requiredPack ?? "Monthly Pack";

            return (
              <SurfaceCard
                className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white p-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]"
                key={row.id}
              >
                <span className={cn("absolute left-0 top-0 h-full w-1 rounded-r-full", risk.accent)} />

                <div className="grid gap-5 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.68fr)_minmax(220px,0.72fr)_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <RecordsIcon industry={account?.industry} />
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="truncate text-[1.08rem] font-semibold tracking-tight text-slate-950">
                        {row.clientName}
                      </h2>
                      <p className="text-[0.84rem] text-slate-500">
                        {account?.industry ?? "Client"} <span className="text-slate-300">•</span>{" "}
                        Assigned to {row.assignedAccountant}
                      </p>
                      <p className={cn("text-[0.86rem] font-medium", deadline.className)}>
                        {deadline.title} ({deadline.detail})
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 lg:border-l lg:border-slate-100 lg:pl-5">
                    <p className="text-[0.86rem] font-semibold text-slate-900">Monthly Pack</p>
                    <p className="text-[0.84rem] text-slate-500">
                      {row.monthLabel} - {packLabel}
                    </p>
                    <p className="text-[0.84rem] text-slate-500">
                      {row.progressPercent >= 100
                        ? "24 / 24 documents"
                        : `${Math.max(0, Math.round((row.progressPercent / 100) * 24))} / 24 documents`}
                    </p>
                  </div>

                  <div className="space-y-2.5 lg:border-l lg:border-slate-100 lg:pl-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.84rem] font-medium text-slate-500">Progress</span>
                      <span className={cn("text-[0.95rem] font-semibold", risk.text)}>
                        {row.progressPercent}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div
                        className={cn("h-2.5 rounded-full transition-all", risk.progress)}
                        style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset",
                          risk.pill,
                        )}
                      >
                        {risk.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:min-w-[162px]">
                    {isAdmin ? (
                      <>
                        <Button
                          className="h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => navigate("/firm/admin/assignments")}
                          size="sm"
                          variant="secondary"
                        >
                          <span>Manage Assignment</span>
                        </Button>
                        <Button
                          className="h-10 rounded-xl bg-[linear-gradient(135deg,#2f54ff,#315cff)] shadow-[0_14px_26px_rgba(47,84,255,0.16)] hover:bg-[linear-gradient(135deg,#2849eb,#2f54ff)]"
                          onClick={() => navigate(`/firm/clients/${row.clientId}`)}
                          size="sm"
                        >
                          <span>Open Workspace</span>
                          <ChevronRightIcon />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className="h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => navigate(`/firm/clients/${row.clientId}/packs`)}
                          size="sm"
                          variant="secondary"
                        >
                          <FolderIcon />
                          <span>Open Pack</span>
                        </Button>
                        <Button
                          className="h-10 rounded-xl bg-[linear-gradient(135deg,#2f54ff,#315cff)] shadow-[0_14px_26px_rgba(47,84,255,0.16)] hover:bg-[linear-gradient(135deg,#2849eb,#2f54ff)]"
                          onClick={() => navigate(`/firm/clients/${row.clientId}`)}
                          size="sm"
                        >
                          <span>Open Workspace</span>
                          <ChevronRightIcon />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SurfaceCard>
            );
          })}

          <p className="text-center text-[0.88rem] text-slate-500">
            Showing {visibleClients.length} of {assignedPortfolio.length} clients
          </p>
        </div>
      ) : (
        <SurfaceCard>
          <EmptyState
            description="Try another search or change the filter to review a different slice of your portfolio."
            title="No assigned clients found"
          />
        </SurfaceCard>
      )}
    </div>
  );
}
