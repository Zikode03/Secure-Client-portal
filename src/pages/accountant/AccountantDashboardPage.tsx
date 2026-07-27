// Friendly guide: this module (AccountantDashboardPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { DeadlineItem, NotificationItem, PortfolioRow, ReviewQueueItem } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedReviewQueue } from "../../utils/permissions";

const accountantDashboardDate = "2026-05-07T08:00:00.000Z";
const panelClass =
  "h-full rounded-2xl border border-[#dce6ef] bg-white shadow-[0_16px_38px_rgba(4,24,52,0.08)]";
const iconTileClass =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee]";
const dashboardLinkClass =
  "client-dashboard-link font-semibold transition";
const dashboardActionButtonClass =
  "client-dashboard-action-button inline-flex items-center justify-center rounded-lg font-bold transition hover:-translate-y-0.5 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

// Shared shape notes: these types keep UI and data contracts aligned.
type QueueTab = "deadlines" | "reviews";
type QueueTone = "brand" | "emerald" | "orange" | "rose";

interface WorkQueueItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  priority: "high" | "medium" | "low";
  tone: QueueTone;
  tab: QueueTab;
  onOpen: () => void;
}

// Component flow: gather data first, then render a focused UI state.
function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function portfolioRank(row: PortfolioRow) {
  const statusScore = row.status === "overdue" ? 3 : row.status === "attention" ? 2 : 1;
  return statusScore * 100 + row.missingCount * 10 + row.overdueCount;
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 1)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function rowAccentClass(index: number) {
  const classes = [
    "bg-[#e8f0ff] text-brand-700 ring-[#d8e4ff]",
    "bg-[#fff0e1] text-orange-600 ring-[#ffe0bd]",
    "bg-[#ffe8ec] text-rose-600 ring-[#ffd3da]",
    "bg-[#e4f8ef] text-emerald-600 ring-[#c9eedc]",
    "bg-[#fff3df] text-amber-600 ring-[#ffe3b6]",
  ];

  return classes[index % classes.length];
}

function dayDifference(dateValue: string) {
  const currentDate = new Date(accountantDashboardDate);
  const targetDate = new Date(dateValue);
  const difference = targetDate.getTime() - currentDate.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function rowDueMeta(row: PortfolioRow) {
  if (row.status === "on_track" && row.progressPercent >= 95) {
    return {
      label: "On track",
      textClass: "text-emerald-600",
      detail: row.deadline === "-" ? "No immediate deadline" : row.deadline,
    };
  }

  const difference = dayDifference(row.deadline);

  if (difference < 0) {
    return {
      label: `Overdue by ${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"}`,
      textClass: "text-rose-600",
      detail: row.deadline,
    };
  }

  if (difference === 0) {
    return {
      label: "Due today",
      textClass: "text-rose-600",
      detail: row.deadline,
    };
  }

  if (difference === 1) {
    return {
      label: "Due tomorrow",
      textClass: "text-rose-600",
      detail: row.deadline,
    };
  }

  return {
    label: `Due in ${difference} days`,
    textClass: "text-slate-700",
    detail: row.deadline,
  };
}

function rowRiskMeta(row: PortfolioRow) {
  if (row.status === "overdue" || row.overdueCount > 0) {
    return {
      label: "High",
      className: "bg-rose-50 text-rose-600 ring-rose-200",
    };
  }

  if (row.status === "attention" || row.missingCount > 0) {
    return {
      label: "Medium",
      className: "bg-amber-50 text-amber-600 ring-amber-200",
    };
  }

  return {
    label: "Low",
    className: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  };
}

function rowStatusMeta(isActive = true) {
  return isActive
    ? {
        label: "Active",
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-600",
      }
    : {
        label: "Inactive",
        dotClass: "bg-slate-400",
        textClass: "text-slate-500",
      };
}

function monthPreviewLabel(dateValue: string) {
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(new Date(dateValue));
}

function weekDayShortLabels() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function compactMonthDays(dateValue: string) {
  const activeDate = new Date(dateValue);
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: Array<{ day: number | null; isActive: boolean }> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, isActive: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, isActive: day === activeDate.getDate() });
  }

  return cells;
}

function isSameCalendarMonth(dateValue: string, monthDate: Date) {
  const date = new Date(dateValue);
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
}

function notificationToneClasses(tone: NotificationItem["tone"]) {
  switch (tone) {
    case "danger":
      return {
        accent: "bg-rose-500",
        icon: "bg-rose-50 text-rose-600 ring-rose-100",
        badge: "bg-rose-50 text-rose-600 ring-rose-200",
        panel: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fffafb_100%)]",
      };
    case "warning":
      return {
        accent: "bg-amber-500",
        icon: "bg-amber-50 text-amber-600 ring-amber-100",
        badge: "bg-amber-50 text-amber-600 ring-amber-200",
        panel: "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)]",
      };
    case "success":
      return {
        accent: "bg-emerald-500",
        icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
        badge: "bg-emerald-50 text-emerald-600 ring-emerald-200",
        panel: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f9fffc_100%)]",
      };
    default:
      return {
        accent: "bg-brand-500",
        icon: "bg-brand-50 text-brand-600 ring-brand-100",
        badge: "bg-brand-50 text-brand-600 ring-brand-200",
        panel: "bg-[radial-gradient(circle_at_top_left,rgba(84,66,255,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)]",
      };
  }
}

function notificationKindLabel(kind: NotificationItem["kind"]) {
  if (kind === "missing_documents") {
    return "Missing evidence";
  }

  if (kind === "rejected_documents") {
    return "Rejected file";
  }

  if (kind === "deadline_reminder") {
    return "Deadline risk";
  }

  return "Compliance expiry";
}

function notificationRelativeLabel(createdAt: string) {
  const snapshot = new Date(accountantDashboardDate);
  const difference = snapshot.getTime() - new Date(createdAt).getTime();
  const hours = Math.max(1, Math.floor(difference / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function FocusGlyph({ tone }: { tone: QueueTone }) {
  if (tone === "rose") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 7.5v4m0 4h.01M7 4.75h10l2.25 2.25v10L17 19.25H7L4.75 17V7L7 4.75Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (tone === "orange") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8v4l2.5 2.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (tone === "brand") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path
          d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path
        d="m7.5 12.5 2.75 2.75L16.5 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6.5" />
      <path
        d="M8 4.5v4m8-4v4M4 10.5h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 18.5h8m-9-2V11a5 5 0 1 1 10 0v5.5l1.5 2H5.5l1.5-2Z"
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

function ClientRiskProfileChart({ rows }: { rows: PortfolioRow[] }) {
  const totalClients = Math.max(rows.length, 1);
  const [activeSegmentId, setActiveSegmentId] = useState("attention");
  const segments = [
    {
      id: "attention",
      label: "Attention Needed",
      count: rows.filter((row) => row.status === "attention").length,
      color: "var(--client-risk-attention)",
    },
    {
      id: "compliant",
      label: "Compliant",
      count: rows.filter((row) => row.status === "on_track").length,
      color: "var(--client-risk-compliant)",
    },
    {
      id: "high-risk",
      label: "High Risk",
      count: rows.filter((row) => row.status === "overdue").length,
      color: "var(--client-risk-high)",
    },
  ];
  const activeSegment = segments.find((segment) => segment.id === activeSegmentId) ?? segments[0];
  const activePercentage = Math.round((activeSegment.count / totalClients) * 100);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <SurfaceCard className={cn(panelClass, "client-risk-profile relative min-h-[760px] overflow-hidden p-0 sm:min-h-[850px]")}>
      <div className="border-b border-[#e7ebf0] px-8 pb-7 pt-8">
        <h2 className="text-xl font-medium text-[#091333]">Client risk profile</h2>
        <p className="mt-3 text-base text-[#667085]">Distribution of client compliance status.</p>
      </div>
      <div className="m-7 rounded-3xl border border-[#e2e7ed] bg-[#fcfdff] px-6 py-12 sm:m-8 sm:px-8">
      <div className="flex justify-center">
        <svg aria-label="Client risk profile chart" className="h-[280px] w-[280px]" role="img" viewBox="0 0 140 140">
          <circle cx="70" cy="70" fill="none" r={radius} stroke="var(--client-risk-track)" strokeWidth="26" />
          {segments.map((segment) => {
            const length = (segment.count / totalClients) * circumference;
            const dashOffset = -offset;
            const percentage = Math.round((segment.count / totalClients) * 100);
            const isActive = activeSegmentId === segment.id;
            offset += length;

            return segment.count > 0 ? (
              <g
                className="cursor-pointer"
                key={segment.id}
                onMouseEnter={() => setActiveSegmentId(segment.id)}
                onMouseLeave={() => undefined}
              >
                <title>{`${segment.label}: ${segment.count} client${segment.count === 1 ? "" : "s"} (${percentage}%)`}</title>
                <circle
                  cx="70"
                  cy="70"
                  fill="none"
                  opacity={!isActive ? 0.88 : 1}
                  r={radius}
                  stroke={segment.color}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  strokeWidth="26"
                  transform="rotate(-90 70 70)"
                />
              </g>
            ) : null;
          })}
          <circle cx="70" cy="70" fill="var(--client-risk-centre)" pointerEvents="none" r="33" />
          <text fill="var(--client-risk-muted)" fontSize="6" letterSpacing="1.4" textAnchor="middle" x="70" y="61">FOCUS</text>
          <text fill="var(--client-risk-heading)" fontSize="17" fontWeight="500" textAnchor="middle" x="70" y="77">{activePercentage}%</text>
          <text fill="var(--client-risk-muted)" fontSize="7" textAnchor="middle" x="70" y="91">{activeSegment.id === "attention" ? "Needs attention" : activeSegment.label}</text>
        </svg>
      </div>
      <div className="mx-auto mt-10 max-w-[460px] overflow-hidden rounded-3xl border border-[#dfe5ec] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7a8498]">Current focus</p>
              <p className="mt-3 text-lg font-medium text-[#091333]">{activeSegment.label}</p>
            </div>
            <span className="rounded-full border border-[#dfe4eb] bg-[#f8fafc] px-4 py-2 text-sm text-[#667085]">{activePercentage}% of portfolio</span>
          </div>
          <div className="my-6 h-px bg-[#e7ebf0]" />
          <p className="text-sm leading-7 text-[#667085]">Hover over the chart or use the rows below to inspect each client-status segment.</p>
        </div>
        {segments.map((segment) => (
          <button
            className={cn("flex w-full items-center gap-4 border-t border-[#e7ebf0] px-6 py-5 text-left transition hover:bg-[#f8fafc]", activeSegmentId === segment.id && "bg-[#fbfcfe]")}
            key={segment.id}
            onFocus={() => setActiveSegmentId(segment.id)}
            onMouseEnter={() => setActiveSegmentId(segment.id)}
            type="button"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-[#091333]">{segment.label}</span>
              <span className="mt-1 block text-sm text-[#667085]">{segment.count} client{segment.count === 1 ? "" : "s"}</span>
            </span>
            <span className="text-sm text-[#53617f]">{Math.round((segment.count / totalClients) * 100)}%</span>
          </button>
        ))}
      </div>
      </div>
    </SurfaceCard>
  );
}

function ComplianceHealthTrendChart({ rows }: { rows: PortfolioRow[] }) {
  const averageProgress =
    rows.length > 0
      ? Math.round(rows.reduce((total, row) => total + row.progressPercent, 0) / rows.length)
      : 0;
  const values = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => ({
    month,
    value: Math.max(0, Math.min(100, averageProgress - 12 + index * 2.4)),
  }));
  const yTicks = [40, 55, 70, 85, 100];
  const width = 760;
  const height = 390;
  const padding = { top: 52, right: 28, bottom: 44, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const minValue = 40;
  const maxValue = 100;
  const points = values.map((item, index) => {
    const x = padding.left + (chartWidth / (values.length - 1)) * index;
    const y = padding.top + ((maxValue - item.value) / (maxValue - minValue)) * chartHeight;
    return { ...item, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <SurfaceCard className={cn(panelClass, "relative min-h-[560px] overflow-hidden p-0")}>
      <div className="px-10 pt-10">
        <h2 className="text-xl font-medium text-[#091333]">Compliance health trend</h2>
        <p className="mt-4 text-base text-[#667085]">Monthly compliance performance across all clients.</p>
      </div>
      <div className="px-4 pb-8 pt-6 sm:px-10">
        <svg aria-label="Compliance health trend chart" className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
          {yTicks.map((tick) => {
            const y = padding.top + ((maxValue - tick) / (maxValue - minValue)) * chartHeight;
            return (
              <g key={tick}>
                <line
                  stroke="#d7dee7"
                  strokeDasharray="4 5"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#53617f" fontSize="12" fontWeight="600" textAnchor="end" x={padding.left - 10} y={y + 4}>
                  {tick}%
                </text>
              </g>
            );
          })}
          <polyline fill="none" points={linePoints} stroke="#0a2f66" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          {points.map((point) => (
            <g className="group cursor-pointer" key={`point-${point.month}`}>
              <title>{`${point.month}: ${Math.round(point.value)}% compliance health`}</title>
              <line
                className="opacity-0 transition-opacity group-hover:opacity-100"
                stroke="#0a2f66"
                strokeDasharray="4 4"
                strokeWidth="1.5"
                x1={point.x}
                x2={point.x}
                y1={padding.top}
                y2={height - padding.bottom}
              />
              <circle cx={point.x} cy={point.y} fill="#ffffff" r="4.5" stroke="#0a2f66" strokeWidth="2.5" />
              <circle cx={point.x} cy={point.y} fill="transparent" r="18" />
              <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
                <rect fill="#091333" height="37" rx="7" width="118" x={Math.min(Math.max(point.x - 59, 44), width - 154)} y={Math.max(point.y - 52, 8)} />
                <text fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle" x={Math.min(Math.max(point.x, 103), width - 95)} y={Math.max(point.y - 35, 25)}>
                  {point.month}
                </text>
                <text fill="#dbeafe" fontSize="10" fontWeight="700" textAnchor="middle" x={Math.min(Math.max(point.x, 103), width - 95)} y={Math.max(point.y - 20, 40)}>
                  {Math.round(point.value)}% compliance
                </text>
              </g>
            </g>
          ))}
          {points.map((point) => (
            <text fill="#53617f" fontSize="12" fontWeight="600" key={point.month} textAnchor="middle" x={point.x} y={height - 18}>
              {point.month}
            </text>
          ))}
        </svg>
      </div>
    </SurfaceCard>
  );
}

function buildReviewQueueItems(
  items: ReviewQueueItem[],
  onOpen: () => void,
): WorkQueueItem[] {
  return items.map((item) => ({
    id: item.id,
    title: `${item.documentType} review`,
    subtitle: `${item.clientName} | ${item.monthLabel}`,
    meta: `Submitted ${formatDateLabel(item.submittedAt)}`,
    priority: item.status === "under_review" ? "high" : "medium",
    tone: item.status === "under_review" ? "rose" : "orange",
    tab: "reviews",
    onOpen,
  }));
}

function buildDeadlineQueueItems(
  items: DeadlineItem[],
  onOpen: () => void,
): WorkQueueItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.label,
    subtitle: `Owner: ${item.owner}`,
    meta: `Due ${formatDateLabel(item.dueDate)}`,
    priority: item.tone === "danger" ? "high" : item.tone === "warning" ? "medium" : "low",
    tone: item.tone === "danger" ? "rose" : item.tone === "warning" ? "orange" : "brand",
    tab: "deadlines",
    onOpen,
  }));
}

export function AccountantDashboardPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const data = portal.accountantDashboard;
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [activeQueueTab, setActiveQueueTab] = useState<QueueTab>("reviews");
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [calendarPreviewDate, setCalendarPreviewDate] = useState(() => new Date(accountantDashboardDate));
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [portal.adminClients, user]);
  const scopedClientIds = useMemo(
    () => new Set(scopedClients.map((client) => client.id)),
    [scopedClients],
  );
  const scopedClientById = useMemo(
    () => new Map(scopedClients.map((client) => [client.id, client])),
    [scopedClients],
  );
  const scopedClientNames = useMemo(
    () => new Set(scopedClients.map((client) => client.clientName)),
    [scopedClients],
  );
  const scopedPortfolio = useMemo(
    () => data.portfolio.filter((row) => scopedClientIds.has(row.clientId)),
    [data.portfolio, scopedClientIds],
  );
  const scopedReviewQueue = useMemo(
    () => getScopedReviewQueue(user, data.reviewQueue, portal.adminClients),
    [data.reviewQueue, portal.adminClients, user],
  );
  const scopedDeadlines = useMemo(
    () => (isAdmin ? data.deadlines : data.deadlines.filter((item) => item.owner === user?.fullName)),
    [data.deadlines, isAdmin, user?.fullName],
  );
  const scopedMissingDocuments = useMemo(
    () =>
      data.missingDocuments.filter(
        (item) => !item.clientName || scopedClientNames.has(item.clientName),
      ),
    [data.missingDocuments, scopedClientNames],
  );
  const scopedRejectedDocuments = useMemo(
    () =>
      data.rejectedDocuments.filter(
        (item) => !item.clientName || scopedClientNames.has(item.clientName),
      ),
    [data.rejectedDocuments, scopedClientNames],
  );
  const priorityClients = useMemo(
    () =>
      [...scopedPortfolio]
        .sort((left, right) => portfolioRank(right) - portfolioRank(left))
        .slice(0, 3),
    [scopedPortfolio],
  );

  const assignedClients = priorityClients;

  const visibleAssignedClients = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return assignedClients;
    }

    return assignedClients.filter((row) => {
      const account = scopedClientById.get(row.clientId);
      const statusLabel = account?.isActive === false ? "inactive" : "active";

      return `${row.clientName} ${row.monthLabel} ${row.assignedAccountant} ${row.status} ${statusLabel}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [assignedClients, clientSearch, scopedClientById]);

  const reviewQueueItems = useMemo(
    () => buildReviewQueueItems(scopedReviewQueue.slice(0, 5), () => navigate("/firm/review")),
    [navigate, scopedReviewQueue],
  );

  const deadlineQueueItems = useMemo(
    () => buildDeadlineQueueItems(scopedDeadlines.slice(0, 5), () => navigate("/firm/compliance")),
    [navigate, scopedDeadlines],
  );

  const workQueueByTab = useMemo<Record<QueueTab, WorkQueueItem[]>>(
    () => ({
      reviews: reviewQueueItems,
      deadlines: deadlineQueueItems,
    }),
    [deadlineQueueItems, reviewQueueItems],
  );

  const queueCounts = useMemo(
    () => ({
      reviews: reviewQueueItems.length,
      deadlines: deadlineQueueItems.length,
    }),
    [deadlineQueueItems.length, reviewQueueItems.length],
  );

  const sortedCalendarDeadlines = useMemo(
    () =>
      [...scopedDeadlines]
        .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()),
    [scopedDeadlines],
  );

  const calendarEventDays = useMemo(
    () =>
      new Set(
        sortedCalendarDeadlines
          .filter((item) => isSameCalendarMonth(item.dueDate, calendarPreviewDate))
          .map((item) => new Date(item.dueDate).getDate()),
      ),
    [calendarPreviewDate, sortedCalendarDeadlines],
  );
  const calendarMonthDeadlines = useMemo(
    () => sortedCalendarDeadlines.filter((item) => isSameCalendarMonth(item.dueDate, calendarPreviewDate)),
    [calendarPreviewDate, sortedCalendarDeadlines],
  );
  const nextCalendarDeadline = calendarMonthDeadlines[0];

  const notificationPreview = useMemo(() => data.notifications.slice(0, 4), [data.notifications]);

  const unreadNotificationCount = useMemo(
    () =>
      data.notifications.filter(
        (item) => item.state !== "reviewed" && item.state !== "resolved",
      ).length,
    [data.notifications],
  );

  const actionNotificationCount = useMemo(
    () =>
      data.notifications.filter(
        (item) =>
          item.kind !== "expiring_documents" &&
          item.state !== "reviewed" &&
          item.state !== "resolved",
      ).length,
    [data.notifications],
  );

  const complianceNotificationCount = useMemo(
    () =>
      data.notifications.filter(
        (item) =>
          item.kind === "expiring_documents" &&
          item.state !== "reviewed" &&
          item.state !== "resolved",
      ).length,
    [data.notifications],
  );

  const focusMetrics = useMemo(() => {
    const overdueClients = scopedPortfolio.filter((row) => row.status === "overdue").length;
    const reviewsWaiting = scopedReviewQueue.length;
    const clientActionDue = scopedMissingDocuments.length + scopedRejectedDocuments.length;
    const clientsOnTrack = scopedPortfolio.filter((row) => row.status === "on_track").length;
    const totalClients = Math.max(scopedPortfolio.length, 1);

    return [
      {
        id: "focus-overdue",
        value: overdueClients,
        label: "Overdue clients",
        helper: "Require action",
        progress: Math.min((overdueClients / totalClients) * 100, 100),
        tone: "rose" as const,
      },
      {
        id: "focus-reviews",
        value: reviewsWaiting,
        label: "Reviews waiting",
        helper: "Need your review",
        progress: Math.min(reviewsWaiting * 18, 100),
        tone: "orange" as const,
      },
      {
        id: "focus-client-action",
        value: clientActionDue,
        label: "Client action due",
        helper: "Missing or corrected files",
        progress: Math.min(clientActionDue * 14, 100),
        tone: clientActionDue > 0 ? ("brand" as const) : ("emerald" as const),
      },
      {
        id: "focus-track",
        value: clientsOnTrack,
        label: "Clients on track",
        helper: "Everything good",
        progress: Math.min((clientsOnTrack / totalClients) * 100, 100),
        tone: "emerald" as const,
      },
    ];
  }, [
    scopedMissingDocuments.length,
    scopedPortfolio,
    scopedRejectedDocuments.length,
    scopedReviewQueue.length,
  ]);

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    if (!isNotificationPanelOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node)
      ) {
        setIsNotificationPanelOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationPanelOpen]);

  function handleExportView() {
    downloadCsv(isAdmin ? "firm-portfolio-view.csv" : "accountant-portfolio-view.csv", [
      ["Client Name", "Month", "Progress %", "Status", "Assigned Accountant"],
      ...scopedPortfolio.map((row) => [
        row.clientName,
        row.monthLabel,
        String(row.progressPercent),
        row.status,
        row.assignedAccountant,
      ]),
    ]);
  }

  function openClientWorkspace(row: PortfolioRow) {
    navigate(`/firm/clients/${row.clientId}`);
  }

  function openNotificationCentre(notificationId?: string) {
    setIsNotificationPanelOpen(false);
    navigate(
      notificationId
        ? `/firm/notifications?notification=${encodeURIComponent(notificationId)}`
        : "/firm/notifications",
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <section className="relative overflow-visible rounded-2xl border border-[#dce6ef] bg-[linear-gradient(135deg,#062044_0%,#0a2f66_54%,#1d8b66_100%)] p-5 text-white shadow-[0_24px_60px_rgba(4,24,52,0.18)] md:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -left-16 top-4 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-8 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
        </div>
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/80 ring-1 ring-white/15">
              {isAdmin ? "Firm Workspace" : "Accountant Workspace"}
            </span>
            <div className="space-y-1.5">
              <h1 className="text-[2.05rem] font-semibold tracking-tight text-white">
                Welcome, {user?.name ?? "Accountant"}
              </h1>
              <p className="max-w-3xl text-[0.96rem] leading-7 text-white/78">
                {isAdmin
                  ? "Focus on the clients and operational work that need attention across the firm."
                  : "Focus on the clients and tasks that need your attention."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            <button
              className="inline-flex h-12 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white shadow-[0_10px_30px_rgba(2,12,27,0.18)] backdrop-blur transition hover:bg-white/16"
              onClick={() => undefined}
              type="button"
            >
              <CalendarIcon />
              <span>{formatDateLabel(accountantDashboardDate)}</span>
              <ChevronDownIcon />
            </button>
            <div className="relative" ref={notificationPanelRef}>
              <button
                aria-expanded={isNotificationPanelOpen}
                aria-haspopup="dialog"
                aria-label={isAdmin ? "Open firm alerts" : "Open accountant alerts"}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_10px_30px_rgba(2,12,27,0.18)] backdrop-blur transition hover:bg-white/16"
                onClick={() => setIsNotificationPanelOpen((current) => !current)}
                type="button"
              >
                <BellIcon />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.66rem] font-semibold text-white shadow-[0_6px_16px_rgba(244,63,94,0.28)]">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                ) : null}
              </button>

              {isNotificationPanelOpen ? (
                <div
                  aria-label={isAdmin ? "Firm notifications" : "Accountant notifications"}
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(420px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
                  role="dialog"
                >
                <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(84,66,255,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] px-5 pb-4 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[1rem] font-semibold text-slate-950">Notifications</h2>
                      <p className="mt-1 text-[0.82rem] text-slate-500">
                        {unreadNotificationCount} active item
                        {unreadNotificationCount === 1 ? "" : "s"} need your attention.
                      </p>
                    </div>
                    <button
                      className={cn(dashboardLinkClass, "shrink-0 text-sm")}
                      onClick={() => openNotificationCentre()}
                      type="button"
                    >
                      View more
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      { id: "notif-unread", label: "Unread", value: unreadNotificationCount, tone: "text-brand-600" },
                      { id: "notif-action", label: "Action", value: actionNotificationCount, tone: "text-rose-600" },
                      { id: "notif-compliance", label: "Compliance", value: complianceNotificationCount, tone: "text-amber-600" },
                    ].map((item) => (
                      <div
                        className="rounded-[1rem] border border-white/80 bg-white/90 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                        key={item.id}
                      >
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {item.label}
                        </p>
                        <p className={cn("mt-1 text-[1.25rem] font-semibold", item.tone)}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {notificationPreview.length > 0 ? (
                  <div className="max-h-[440px] overflow-y-auto px-4 py-4">
                    <div className="space-y-2">
                      {notificationPreview.map((item) => {
                        const tone = notificationToneClasses(item.tone);
                        const unread = item.state !== "reviewed" && item.state !== "resolved";

                        return (
                          <button
                            className={cn(
                              "w-full rounded-[1.2rem] border border-slate-200/80 px-4 py-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50/80",
                              tone.panel,
                            )}
                            key={item.id}
                            onClick={() => openNotificationCentre(item.id)}
                            type="button"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1",
                                  tone.icon,
                                )}
                              >
                                <BellIcon />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[0.92rem] font-semibold leading-6 text-slate-950">
                                      {item.title}
                                    </p>
                                    <p className="mt-1 text-[0.8rem] text-slate-500">
                                      {item.linkedRecordLabel ?? notificationKindLabel(item.kind)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {unread ? (
                                      <span
                                        className={cn(
                                          "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ring-inset",
                                          tone.badge,
                                        )}
                                      >
                                        New
                                      </span>
                                    ) : null}
                                    <span className="text-[0.74rem] text-slate-400">
                                      {notificationRelativeLabel(item.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-2 line-clamp-2 text-[0.82rem] leading-5 text-slate-500">
                                  {item.message}
                                </p>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[0.68rem] font-medium text-slate-600 ring-1 ring-slate-200">
                                    {notificationKindLabel(item.kind)}
                                  </span>
                                  <span className={cn(dashboardLinkClass, "text-[0.78rem]")}>
                                    Open
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-6">
                    <EmptyState
                      description="New accountant workflow alerts will appear here."
                      title="No notifications"
                    />
                  </div>
                )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Today's focus">
        <div className="grid items-stretch gap-5 md:grid-cols-2">
          {focusMetrics.map((metric) => (
            <article
              className={cn(panelClass, "flex min-h-[152px] flex-col justify-between p-5")}
              key={metric.id}
            >
              <div className="flex items-start gap-4">
                <div className={iconTileClass}>
                  <FocusGlyph tone={metric.tone} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.82rem] font-semibold text-[#091333]">{metric.label}</p>
                  <p
                    className={cn(
                      "mt-2 text-[1.7rem] font-semibold tracking-tight",
                      metric.tone === "emerald" || metric.tone === "brand" ? "text-brand-700" : "text-[#091333]",
                    )}
                  >
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[0.78rem] leading-5 text-[#53617f]">{metric.helper}</p>
                </div>
              </div>
              <div className="client-dashboard-progress-track mt-4 h-1.5 rounded-full">
                <div
                  className="client-dashboard-progress-fill h-1.5 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(metric.progress, 100))}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <SurfaceCard className={cn(panelClass, "min-w-0 overflow-hidden p-0")}>
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#e7ebf0] px-8 pb-7 pt-8">
            <div>
              <h2 className="text-xl font-medium text-[#091333]">
                {isAdmin ? "Firm clients" : "My assigned clients"}
              </h2>
              <p className="mt-3 text-base text-[#667085]">
                {isAdmin
                  ? "Overview of the firm client portfolio and current pack progress."
                  : "Overview of your clients and pack progress."}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <label className="relative min-w-[250px] flex-1 sm:flex-none">
                <span className="sr-only">Search clients</span>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-500">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </span>
                <input
                  className="h-12 w-full rounded-xl border border-[#dce6ef] bg-white pl-11 pr-4 text-sm text-[#091333] outline-none transition placeholder:text-[#7d8aa3] focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:w-[270px]"
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search clients..."
                  value={clientSearch}
                />
              </label>
              {isAdmin ? (
                <Button
                  className={cn(dashboardActionButtonClass, "h-9 rounded-lg border-0 px-3 text-[0.74rem] ring-0")}
                  onClick={() => navigate("/firm/admin/assignments")}
                >
                  <span>Manage assignments</span>
                  <ChevronRightIcon />
                </Button>
              ) : null}
              <Button
                className="assigned-clients-export-button h-12 rounded-xl border-0 px-5 text-sm ring-0"
                onClick={handleExportView}
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <path d="M12 3v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="M5 17v1.5A2.5 2.5 0 0 0 7.5 21h9A2.5 2.5 0 0 0 19 18.5V17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                Export CSV
              </Button>
            </div>
          </div>

          {assignedClients.length > 0 ? (
            <>
              <div className="hidden grid-cols-[minmax(180px,1.45fr)_minmax(150px,0.95fr)_minmax(135px,0.78fr)_minmax(80px,0.48fr)_minmax(85px,0.5fr)] gap-5 border-b border-[#edf2f7] px-8 py-5 text-xs font-medium uppercase tracking-[0.12em] text-[#73809a] lg:grid">
                <div>Client</div>
                <div>Pack progress</div>
                <div>Due date</div>
                <div>Risk</div>
                <div>Status</div>
              </div>

              {visibleAssignedClients.length > 0 ? (
              <div className="divide-y divide-[#edf2f7]">
                {visibleAssignedClients.map((row, index) => {
                  const due = rowDueMeta(row);
                  const risk = rowRiskMeta(row);
                  const status = rowStatusMeta(scopedClientById.get(row.clientId)?.isActive);

                  return (
                    <button
                      className="w-full space-y-4 px-8 py-7 text-left transition hover:bg-slate-50 lg:grid lg:grid-cols-[minmax(180px,1.45fr)_minmax(150px,0.95fr)_minmax(135px,0.78fr)_minmax(80px,0.48fr)_minmax(85px,0.5fr)] lg:items-center lg:gap-5 lg:space-y-0"
                      key={row.id}
                      onClick={() => openClientWorkspace(row)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-medium ring-1", rowAccentClass(index))}>
                          {getInitials(row.clientName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium leading-6 text-[#091333]">
                            {row.clientName}
                          </p>
                          <p className="mt-1 truncate text-sm text-[#667085]">
                            {row.monthLabel} Pack
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm font-medium text-[#091333]">
                          <span>{row.progressPercent}%</span>
                        </div>
                        <div className="client-dashboard-progress-track h-1.5 overflow-hidden rounded-full">
                          <div
                            className="client-dashboard-progress-fill h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }}
                          />
                        </div>
                        <p className="truncate text-sm text-[#667085]">
                          {row.missingCount} missing <span className="text-slate-300">|</span>{" "}
                          <span className={row.overdueCount > 0 ? "text-rose-600" : "text-slate-500"}>
                            {row.overdueCount} overdue
                          </span>
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <p className={cn("truncate text-sm font-medium", due.textClass)}>{due.label}</p>
                        <p className="mt-2 truncate text-sm text-[#667085]">{due.detail}</p>
                      </div>

                      <div className="flex items-center justify-start">
                        <span className={cn("inline-flex rounded-full px-3 py-2 text-sm font-medium ring-1 ring-inset", risk.className)}>
                          {risk.label}
                        </span>
                      </div>

                      <div className={cn("flex items-center gap-2 text-sm font-medium", status.textClass)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dotClass)} />
                        <span>{status.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              ) : (
                <div className="px-5 py-8">
                  <EmptyState
                    description="Try another search term or clear the search field."
                    title="No matching clients"
                  />
                </div>
              )}

              <button
                className={cn(dashboardLinkClass, "flex w-full items-center justify-center gap-2 border-t border-[#edf2f7] px-5 py-4 text-sm")}
                onClick={() => navigate("/firm/clients")}
                type="button"
              >
                <span>View all clients</span>
                <ChevronRightIcon />
              </button>
            </>
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                description="Assigned clients will appear here once work is routed to your accountant workspace."
                title="No clients assigned"
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className={cn(panelClass, "min-w-0 overflow-hidden p-0")}>
          <div className="border-b border-[#e7ebf0] px-8 pb-6 pt-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-5">
                  <h2 className="text-xl font-medium text-[#091333]">
                    {isAdmin ? "Firm work queue" : "My work queue"}
                  </h2>
                  <button className="text-sm font-medium text-[#25324d] hover:text-brand-600" onClick={() => navigate(activeQueueTab === "reviews" ? "/firm/review" : "/firm/compliance")} type="button">View all tasks</button>
                </div>
                <p className="mt-3 text-base text-[#667085]">
                {isAdmin
                  ? "Reviews and deadline items visible across the firm."
                  : "Your next three tasks, in the order to tackle them."}
                </p>
              </div>
              <span className="rounded-full border border-[#dfe4eb] bg-[#f8fafc] px-4 py-2 text-sm text-[#667085]">Showing {Math.min(3, workQueueByTab[activeQueueTab].length)} tasks</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              {[
                { id: "reviews" as const, label: "Reviews", count: queueCounts.reviews },
                { id: "deadlines" as const, label: "Deadlines", count: queueCounts.deadlines },
              ].map((item) => (
                <button
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-0.5 pb-3 text-base transition",
                    activeQueueTab === item.id
                      ? "border-[#253b70] text-[#253b70]"
                      : "border-transparent text-[#667085]",
                  )}
                  key={item.id}
                  onClick={() => setActiveQueueTab(item.id)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {workQueueByTab[activeQueueTab].length > 0 ? (
              <div className="px-8 pb-6">
                <div className="hidden grid-cols-[minmax(260px,1.3fr)_minmax(210px,0.9fr)_90px] gap-8 border-b border-[#e7ebf0] px-5 py-5 text-xs font-medium uppercase tracking-[0.14em] text-[#7a8498] lg:grid">
                  <span>Task</span><span>Details</span><span>Action</span>
                </div>
                <div className="divide-y divide-[#e7ebf0]">
                {workQueueByTab[activeQueueTab].slice(0, 3).map((item) => (
                    <button
                      className="grid w-full gap-5 px-5 py-6 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(260px,1.3fr)_minmax(210px,0.9fr)_90px] lg:items-center lg:gap-8"
                      key={item.id}
                      onClick={item.onOpen}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dfe4eb] bg-[#f8fafc] text-[#42557f]">
                          <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24"><path d="M7.5 3.75h6.25l3.75 3.75v12.75H7.5a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7"/><path d="M13.5 3.75V8h4M9 12h5.5M9 15.5h5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-[#091333]">{item.title}</p>
                          <p className="mt-2 truncate text-sm text-[#667085]">{item.subtitle}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-[#667085]">{item.meta}</p>
                        <p className="mt-3 text-xs font-medium uppercase tracking-[0.1em] text-[#8a94a8]">{item.tab === "reviews" ? "Review" : "Deadline"} · {item.priority} priority</p>
                      </div>
                      <span className="text-sm font-medium text-[#25324d]">Open</span>
                    </button>
                ))}
                </div>
              </div>
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                description="The selected work queue is clear right now."
                title="No active tasks"
              />
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <SurfaceCard className={cn(panelClass, "min-w-0 overflow-hidden p-0")}>
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[#e7ebf0] px-8 pb-7 pt-8">
            <div>
              <h2 className="text-xl font-medium text-[#091333]">Compliance calendar</h2>
              <p className="mt-3 text-base text-[#667085]">
                {calendarMonthDeadlines.length} deadline{calendarMonthDeadlines.length === 1 ? "" : "s"} in {monthPreviewLabel(calendarPreviewDate.toISOString())}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="rounded-full border border-[#dfe4eb] px-5 py-3 text-sm font-medium text-[#25324d] transition hover:bg-slate-50" onClick={() => setCalendarPreviewDate(new Date(accountantDashboardDate))} type="button">Today</button>
              <button className="text-sm font-medium text-[#25324d] transition hover:text-brand-600" onClick={() => navigate("/firm/compliance/calendar")} type="button">View full calendar</button>
            </div>
          </div>

          <div className="min-w-0 px-8 py-7">
              <div className="mb-6 flex flex-wrap gap-3 text-sm text-[#667085]">
                <span className="rounded-full border border-[#dfe4eb] bg-[#f8fafc] px-4 py-2">{calendarMonthDeadlines.length} deadline{calendarMonthDeadlines.length === 1 ? "" : "s"} this month</span>
                {nextCalendarDeadline ? <span className="rounded-full border border-[#dfe4eb] px-4 py-2">Next due {formatDateLabel(nextCalendarDeadline.dueDate)}</span> : null}
              </div>
              <div className="mb-7 flex items-center justify-between rounded-3xl border border-[#e2e7ed] bg-[#fcfdff] px-5 py-3">
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dfe4eb] text-[#314268] transition hover:bg-white"
                  onClick={() =>
                    setCalendarPreviewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                  }
                  type="button"
                  aria-label="Previous month"
                >
                  <span className="inline-flex rotate-180">
                    <ChevronRightIcon />
                  </span>
                </button>
                <p className="text-lg font-medium tracking-wide text-[#091333]">{monthPreviewLabel(calendarPreviewDate.toISOString())}</p>
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dfe4eb] text-[#314268] transition hover:bg-white"
                  onClick={() =>
                    setCalendarPreviewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                  }
                  type="button"
                  aria-label="Next month"
                >
                  <ChevronRightIcon />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-x-2 gap-y-4 rounded-3xl border border-[#e2e7ed] px-4 py-6 text-center sm:px-6">
                {weekDayShortLabels().map((label) => (
                  <div className="py-1 text-xs font-medium uppercase tracking-[0.1em] text-[#73809a]" key={label}>
                    {label}
                  </div>
                ))}
                {compactMonthDays(calendarPreviewDate.toISOString()).map((cell, index) => (
                  <div className="flex h-10 items-center justify-center" key={`${cell.day ?? "blank"}-${index}`}>
                    {cell.day ? (
                      <span
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium",
                          cell.isActive
                            ? "bg-[#091333] text-white"
                            : calendarEventDays.has(cell.day) ? "border border-amber-300 bg-amber-50 text-[#091333]" : "text-[#53617f]",
                        )}
                      >
                        {cell.day}
                        {calendarEventDays.has(cell.day) ? (
                          <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-[#e7ebf0] pt-7">
                <p className="mb-5 text-xs font-medium uppercase tracking-[0.16em] text-[#7a8498]">Agenda</p>
                {calendarMonthDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {calendarMonthDeadlines.slice(0, 3).map((item) => {
                      const days = dayDifference(item.dueDate);
                      return <button className="w-full rounded-3xl border border-[#e2e7ed] p-5 text-left transition hover:bg-[#fbfcfe]" key={item.id} onClick={() => navigate("/firm/compliance")} type="button">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-3 text-sm font-medium text-[#091333]"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{formatDateLabel(item.dueDate)}</span>
                          <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due in ${days}d`}</span>
                        </div>
                        <p className="mt-4 text-lg font-medium text-[#091333]">{item.label}</p>
                        <p className="mt-2 text-sm text-[#667085]">Owner: {item.owner}</p>
                      </button>;
                    })}
                  </div>
                ) : <p className="text-sm text-[#667085]">No deadlines scheduled for this month.</p>}
              </div>
          </div>
        </SurfaceCard>

        <ClientRiskProfileChart rows={scopedPortfolio} />
      </section>

      <section>
        <ComplianceHealthTrendChart rows={scopedPortfolio} />
      </section>

    </div>
  );
}
