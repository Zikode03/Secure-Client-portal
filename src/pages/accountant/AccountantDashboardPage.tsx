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
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
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
      detail: row.deadline === "—" ? "No immediate deadline" : row.deadline,
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

function packBarClass(status: PortfolioRow["status"]) {
  if (status === "overdue") {
    return "bg-rose-500";
  }

  if (status === "attention") {
    return "bg-amber-500";
  }

  return "bg-emerald-500";
}

function queuePriorityMeta(priority: WorkQueueItem["priority"]) {
  if (priority === "high") {
    return "bg-rose-50 text-rose-600 ring-rose-200";
  }

  if (priority === "medium") {
    return "bg-amber-50 text-amber-600 ring-amber-200";
  }

  return "bg-brand-50 text-brand-600 ring-brand-200";
}

function queueToneClasses(tone: QueueTone) {
  switch (tone) {
    case "rose":
      return {
        border: "bg-rose-500",
        icon: "bg-rose-50 text-rose-500 ring-rose-100",
      };
    case "orange":
      return {
        border: "bg-amber-500",
        icon: "bg-amber-50 text-amber-500 ring-amber-100",
      };
    case "emerald":
      return {
        border: "bg-emerald-500",
        icon: "bg-emerald-50 text-emerald-500 ring-emerald-100",
      };
    default:
      return {
        border: "bg-brand-500",
        icon: "bg-brand-50 text-brand-600 ring-brand-100",
      };
  }
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

function FocusIcon({ tone }: { tone: QueueTone }) {
  const classes = queueToneClasses(tone);

// Render output: this is the visual state users interact with.
  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1", classes.icon)}>
      {tone === "rose" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 7.5v4m0 4h.01M7 4.75h10l2.25 2.25v10L17 19.25H7L4.75 17V7L7 4.75Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : tone === "orange" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 8v4l2.5 2.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : tone === "brand" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="m7.5 12.5 2.75 2.75L16.5 9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )}
    </div>
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

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function QueueIcon({ tone }: { tone: QueueTone }) {
  const classes = queueToneClasses(tone);

  return (
    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1", classes.icon)}>
      {tone === "rose" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M13.75 3.75V8h4.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : tone === "orange" ? (
        <CalendarIcon />
      ) : tone === "emerald" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
    </div>
  );
}

function buildReviewQueueItems(
  items: ReviewQueueItem[],
  onOpen: () => void,
): WorkQueueItem[] {
  return items.map((item) => ({
    id: item.id,
    title: `${item.documentType} review`,
    subtitle: `${item.clientName} • ${item.monthLabel}`,
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
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [portal.adminClients, user]);
  const scopedClientIds = useMemo(
    () => new Set(scopedClients.map((client) => client.id)),
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
        .slice(0, 6),
    [scopedPortfolio],
  );

  const assignedClients = priorityClients;

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

    return [
      {
        id: "focus-overdue",
        value: overdueClients,
        label: "Overdue clients",
        helper: "Require action",
        tone: "rose" as const,
      },
      {
        id: "focus-reviews",
        value: reviewsWaiting,
        label: "Reviews waiting",
        helper: "Need your review",
        tone: "orange" as const,
      },
      {
        id: "focus-client-action",
        value: clientActionDue,
        label: "Client action due",
        helper: "Missing or corrected files",
        tone: clientActionDue > 0 ? ("brand" as const) : ("emerald" as const),
      },
      {
        id: "focus-track",
        value: clientsOnTrack,
        label: "Clients on track",
        helper: "Everything good",
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
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">
            {isAdmin ? "Firm workspace" : "Accountant workspace"}
          </h1>
          <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">
            {isAdmin
              ? "Focus on the clients and operational work that need attention across the firm."
              : "Focus on the clients and tasks that need your attention."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <button
            className="inline-flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
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
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
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
                className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
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
                      className="shrink-0 text-sm font-medium text-brand-600 transition hover:text-brand-700"
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
                                  <span className="text-[0.78rem] font-medium text-brand-600">
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

      <SurfaceCard className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white px-0 py-0 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
        <div className="space-y-5 px-6 pb-6 pt-6">
          <div>
            <h2 className="text-[1.35rem] font-semibold text-slate-950">Today&apos;s focus</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {focusMetrics.map((metric, index) => (
              <div
                className={cn(
                  "flex items-center gap-4",
                  index !== focusMetrics.length - 1 && "lg:border-r lg:border-slate-100 lg:pr-5",
                )}
                key={metric.id}
              >
                <FocusIcon tone={metric.tone} />
                <div className="space-y-1">
                  <p className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                  <p className="text-[0.9rem] font-medium text-slate-800">{metric.label}</p>
                  <p className="text-[0.82rem] text-slate-500">{metric.helper}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] xl:items-start">
        <SurfaceCard className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white p-0 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 pb-5 pt-5">
            <div>
              <h2 className="text-[1.2rem] font-semibold text-slate-950">
                {isAdmin ? "Firm clients" : "My assigned clients"}
              </h2>
              <p className="mt-1 text-[0.86rem] text-slate-500">
                {isAdmin
                  ? "Overview of the firm client portfolio and current pack progress."
                  : "Overview of your clients and pack progress."}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {isAdmin ? (
                <Button
                  className="h-10 rounded-xl px-4 text-brand-600"
                  onClick={() => navigate("/firm/admin/assignments")}
                  variant="secondary"
                >
                  <span>Manage assignments</span>
                  <ChevronRightIcon />
                </Button>
              ) : null}
              <Button
                className="h-10 rounded-xl px-4 text-brand-600"
                onClick={() => navigate("/firm/clients")}
                variant="secondary"
              >
                <span>View all clients</span>
                <ChevronRightIcon />
              </Button>
              <Button className="h-10 rounded-xl px-4" onClick={handleExportView} variant="ghost">
                Export CSV
              </Button>
            </div>
          </div>

          {assignedClients.length > 0 ? (
            <>
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_auto] gap-4 border-b border-slate-100 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <div>Client</div>
                <div>Pack progress</div>
                <div>Due date</div>
                <div>Risk</div>
              </div>

              <div className="divide-y divide-slate-100">
                {assignedClients.map((row) => {
                  const due = rowDueMeta(row);
                  const risk = rowRiskMeta(row);

                  return (
                    <button
                      className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(180px,1fr)_minmax(160px,0.8fr)_auto] gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                      key={row.id}
                      onClick={() => openClientWorkspace(row)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                          {getInitials(row.clientName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[0.95rem] font-semibold text-slate-950">
                            {row.clientName}
                          </p>
                          <p className="mt-1 text-[0.82rem] text-slate-500">
                            {row.monthLabel} Pack
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-0.5">
                        <div className="flex items-center justify-between text-[0.88rem] font-semibold text-slate-900">
                          <span>{row.progressPercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className={cn("h-2 rounded-full transition-all", packBarClass(row.status))}
                            style={{ width: `${Math.min(Math.max(row.progressPercent, 0), 100)}%` }}
                          />
                        </div>
                        <p className="text-[0.78rem] text-slate-500">
                          {row.missingCount} missing <span className="text-slate-300">•</span>{" "}
                          <span className={row.overdueCount > 0 ? "text-rose-600" : "text-slate-500"}>
                            {row.overdueCount} overdue
                          </span>
                        </p>
                      </div>

                      <div className="space-y-1 pt-0.5">
                        <p className={cn("text-[0.88rem] font-semibold", due.textClass)}>{due.label}</p>
                        <p className="text-[0.8rem] text-slate-500">{due.detail}</p>
                      </div>

                      <div className="flex items-start justify-end gap-3 pt-0.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                            risk.className,
                          )}
                        >
                          {risk.label}
                        </span>
                        <span className="pt-1 text-slate-300">
                          <MoreIcon />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-50/50"
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

        <SurfaceCard className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white p-0 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
          <div className="space-y-4 border-b border-slate-100 px-5 pb-5 pt-5">
            <div>
              <h2 className="text-[1.2rem] font-semibold text-slate-950">
                {isAdmin ? "Firm work queue" : "My work queue"}
              </h2>
              <p className="mt-1 text-[0.86rem] text-slate-500">
                {isAdmin
                  ? "Reviews and deadline items visible across the firm."
                  : "Tasks that need your attention."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              {[
                { id: "reviews" as const, label: "Reviews", count: queueCounts.reviews },
                { id: "deadlines" as const, label: "Deadlines", count: queueCounts.deadlines },
              ].map((item) => (
                <button
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-0.5 pb-2 text-sm font-medium transition",
                    activeQueueTab === item.id
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-slate-500 hover:text-slate-700",
                  )}
                  key={item.id}
                  onClick={() => setActiveQueueTab(item.id)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-500">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {workQueueByTab[activeQueueTab].length > 0 ? (
            <>
              <div className="divide-y divide-slate-100">
                {workQueueByTab[activeQueueTab].map((item) => {
                  const tone = queueToneClasses(item.tone);

                  return (
                    <button
                      className="relative flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                      key={item.id}
                      onClick={item.onOpen}
                      type="button"
                    >
                      <span className={cn("absolute left-0 top-5 h-10 w-1 rounded-r-full", tone.border)} />
                      <QueueIcon tone={item.tone} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[0.96rem] font-semibold text-slate-950">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[0.82rem] text-slate-500">{item.subtitle}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                              queuePriorityMeta(item.priority),
                            )}
                          >
                            {item.priority[0].toUpperCase()}
                            {item.priority.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <p className="text-[0.8rem] text-slate-500">{item.meta}</p>
                          <span className="text-slate-400">
                            <ChevronRightIcon />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-50/50"
                onClick={() =>
                  navigate(activeQueueTab === "reviews" ? "/firm/review" : "/firm/compliance")
                }
                type="button"
              >
                <span>View all tasks</span>
                <ChevronRightIcon />
              </button>
            </>
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

    </div>
  );
}
