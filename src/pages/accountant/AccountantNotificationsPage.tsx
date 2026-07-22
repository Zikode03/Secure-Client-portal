// Friendly guide: this module (AccountantNotificationsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import type { NotificationItem, NotificationState, Tone } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel, formatDateTimeLabel } from "../../utils/formatters";

const notificationSnapshotDate = new Date("2026-05-11T00:00:00.000Z");

// Shared shape notes: these types keep UI and data contracts aligned.
type NotificationFilter = "all" | "unread" | "action" | "compliance";

interface BackendNotificationRecord {
  id: string;
  userId: string;
  clientId?: string | null;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAtUtc: string;
  readAtUtc?: string | null;
}

// Component flow: gather data first, then render a focused UI state.
function BellIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
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

function AlertIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 8.5v4m0 3h.01M10.26 4.76 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25H18.8a1.5 1.5 0 0 0 1.3-2.25L12.74 4.76a1.5 1.5 0 0 0-2.48 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
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
  );
}

function LayersIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m12 4.75 7.25 3.75L12 12.25 4.75 8.5 12 4.75Zm0 7.5L19.25 16 12 19.25 4.75 16 12 12.25Zm0 0v7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 12h13m-4.5-4.5 4.5 4.5-4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function priorityLabel(tone: Tone) {
  if (tone === "danger") {
    return "High";
  }

  if (tone === "warning") {
    return "Medium";
  }

  return "Low";
}

function priorityClasses(tone: Tone) {
  if (tone === "danger") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (tone === "warning") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-brand-50 text-brand-700 ring-brand-200";
}

function stateLabel(state?: NotificationState) {
  if (state === "resolved") {
    return "Resolved";
  }

  if (state === "reviewed") {
    return "Reviewed";
  }

  if (state === "snoozed") {
    return "Snoozed";
  }

  return "Unread";
}

function stateClasses(state?: NotificationState) {
  if (state === "resolved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (state === "reviewed") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (state === "snoozed") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-brand-50 text-brand-700 ring-brand-200";
}

function toneClasses(tone: Tone) {
  if (tone === "danger") {
    return {
      icon: "bg-rose-50 text-rose-500 ring-rose-100",
      accent: "border-rose-200 bg-rose-50/35",
      stat: "text-rose-600",
    };
  }

  if (tone === "warning") {
    return {
      icon: "bg-amber-50 text-amber-500 ring-amber-100",
      accent: "border-amber-200 bg-amber-50/35",
      stat: "text-amber-600",
    };
  }

  return {
    icon: "bg-brand-50 text-brand-600 ring-brand-100",
    accent: "border-brand-200 bg-brand-50/35",
    stat: "text-brand-600",
  };
}

function notificationGlyph(notification: NotificationItem) {
  if (notification.kind === "deadline_reminder") {
    return <CalendarIcon />;
  }

  if (notification.kind === "expiring_documents") {
    return <ClockIcon />;
  }

  if (notification.kind === "rejected_documents") {
    return <AlertIcon />;
  }

  return <BellIcon />;
}

function notificationKindLabel(notification: NotificationItem) {
  if (notification.kind === "missing_documents") {
    return "Missing evidence";
  }

  if (notification.kind === "rejected_documents") {
    return "Rejected file";
  }

  if (notification.kind === "deadline_reminder") {
    return "Deadline risk";
  }

  return "Compliance expiry";
}

function relativeLabel(createdAt: string) {
  const difference = notificationSnapshotDate.getTime() - new Date(createdAt).getTime();
  const hours = Math.max(1, Math.floor(difference / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function isUnread(notification: NotificationItem) {
  return notification.state !== "reviewed" && notification.state !== "resolved";
}

function isActionNotification(notification: NotificationItem) {
  return notification.kind !== "expiring_documents";
}

function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "unread") {
    return isUnread(notification);
  }

  if (filter === "action") {
    return isActionNotification(notification);
  }

  return notification.kind === "expiring_documents";
}

function destinationFor(notification: NotificationItem) {
  if (notification.kind === "rejected_documents") {
    return {
      href: "/firm/review",
      label: "Open review queue",
      workspace: "Review queue",
    };
  }

  if (notification.kind === "expiring_documents") {
    return {
      href: "/firm/compliance",
      label: "Open compliance centre",
      workspace: "Compliance centre",
    };
  }

  return {
    href: "/firm/clients",
    label: "Open client workspace",
    workspace: "Client portfolio",
  };
}

function mapBackendNotification(notification: BackendNotificationRecord): NotificationItem {
  const type = notification.type.trim().toLowerCase();
  const title = notification.title.trim();
  const message = notification.message.trim();

  const kind =
    type.includes("compliance")
      ? "expiring_documents"
      : type.includes("rejected") || type.includes("reupload")
        ? "rejected_documents"
        : type.includes("deadline")
          ? "deadline_reminder"
          : "missing_documents";

  const tone: Tone =
    kind === "rejected_documents"
      ? "danger"
      : kind === "expiring_documents" || kind === "deadline_reminder"
        ? "warning"
        : "info";

  const actionHref =
    notification.linkUrl && notification.linkUrl.startsWith("/")
      ? notification.linkUrl.startsWith("/requests/")
        ? "/firm/inbox"
        : notification.linkUrl.startsWith("/documents/")
          ? "/firm/review"
          : notification.linkUrl.startsWith("/compliance")
            ? "/firm/compliance"
            : notification.linkUrl
      : kind === "expiring_documents"
        ? "/firm/compliance"
        : kind === "rejected_documents"
          ? "/firm/review"
          : "/firm/clients";

  return {
    id: notification.id,
    kind,
    title,
    message,
    createdAt: notification.createdAtUtc,
    dueDate: undefined,
    tone,
    actionLabel:
      kind === "expiring_documents"
        ? "Open compliance centre"
        : kind === "rejected_documents"
          ? "Open review queue"
          : "Open client workspace",
    actionHref,
    linkedRecordLabel: title,
    linkedWorkspace:
      kind === "expiring_documents"
        ? "compliance"
        : kind === "rejected_documents"
          ? "documents"
          : "requests",
    state: notification.isRead ? "reviewed" : "unread",
    activity: notification.readAtUtc
      ? [
          {
            id: `${notification.id}-read`,
            title: "Notification reviewed",
            detail: "This notification has been read.",
            timestamp: notification.readAtUtc,
            tone: "info",
          },
        ]
      : [],
  };
}

interface FeedbackState {
  message: string;
  title: string;
  tone: Tone;
}

export function AccountantNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([]);
  const notifications = backendMode ? liveNotifications : portal.accountantDashboard.notifications;
  const focusedNotificationId = searchParams.get("notification") ?? "";
  const isAdmin = user?.role === "admin";
  const actorName = user?.fullName ?? user?.name ?? "Firm reviewer";

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    void (async () => {
      try {
        const data = await apiGetJson<BackendNotificationRecord[]>("/api/notifications");
        setLiveNotifications(data.map(mapBackendNotification));
      } catch (error) {
        setFeedback({
          title: "Notifications unavailable",
          message: error instanceof ApiError ? error.message : "The live notification inbox could not be loaded.",
          tone: "danger",
        });
      }
    })();
  }, [backendMode]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => isUnread(item)).length,
    [notifications],
  );

  const actionCount = useMemo(
    () => notifications.filter((item) => isActionNotification(item) && isUnread(item)).length,
    [notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      notifications
        .filter((item) => matchesFilter(item, filter))
        .filter((item) => {
          if (!searchQuery.trim()) {
            return true;
          }

          const query = searchQuery.trim().toLowerCase();
          return (
            item.title.toLowerCase().includes(query) ||
            item.message.toLowerCase().includes(query) ||
            (item.linkedRecordLabel ?? "").toLowerCase().includes(query)
          );
        }),
    [filter, notifications, searchQuery],
  );

  const orderedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((left, right) => {
      if (left.id === focusedNotificationId) {
        return -1;
      }

      if (right.id === focusedNotificationId) {
        return 1;
      }

      if (isUnread(left) !== isUnread(right)) {
        return isUnread(left) ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [filteredNotifications, focusedNotificationId]);

  const groupedNotifications = useMemo(() => {
    const now = notificationSnapshotDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    return {
      today: orderedNotifications.filter((item) => now - new Date(item.createdAt).getTime() <= oneDayMs),
      thisWeek: orderedNotifications.filter((item) => {
        const age = now - new Date(item.createdAt).getTime();
        return age > oneDayMs && age <= sevenDaysMs;
      }),
      earlier: orderedNotifications.filter((item) => now - new Date(item.createdAt).getTime() > sevenDaysMs),
    };
  }, [orderedNotifications]);

  function focusNotification(notificationId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("notification", notificationId);
    setSearchParams(next, { replace: true });
  }

  function handleStateUpdate(
    notification: NotificationItem,
    state: NotificationState,
    title: string,
    tone: Tone,
  ) {
    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/notifications/${encodeURIComponent(notification.id)}/mark-read`, {});
          setLiveNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    state,
                    activity: [
                      ...(item.activity ?? []),
                      {
                        id: `${item.id}-${state}`,
                        title: state === "resolved" ? "Notification resolved" : "Notification reviewed",
                        detail:
                          state === "resolved"
                            ? `${actorName} completed the required action for this notification.`
                            : `${actorName} reviewed this notification.`,
                        timestamp: new Date().toISOString(),
                        tone: state === "resolved" ? "success" : "info",
                        actor: actorName,
                      },
                    ],
                  }
                : item,
            ),
          );
          setFeedback({
            message: state === "resolved" ? "Notification marked as resolved." : "Notification marked as reviewed.",
            title,
            tone,
          });
          focusNotification(notification.id);
        } catch (error) {
          setFeedback({
            title: "Update failed",
            message: error instanceof ApiError ? error.message : "The notification could not be updated.",
            tone: "danger",
          });
        }
      })();
      return;
    }

    const result = portal.updateNotificationState(notification.id, state, actorName);
    setFeedback({
      message: result.message,
      title,
      tone,
    });
    focusNotification(notification.id);
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      {feedback ? (
        <FeedbackBanner
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
          title={feedback.title}
          tone={feedback.tone}
        />
      ) : null}

      <section className="space-y-2">
        <div>
          <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-brand-600">Inbox</p>
          <h1 className="mt-2 text-[2.2rem] font-semibold tracking-tight text-slate-950">
            {isAdmin ? "Firm alert inbox" : "My alert inbox"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isAdmin
              ? "Track operational alerts, open the right workspace, and close the loop quickly."
              : "Review assigned alerts, open the linked record, and clear what needs attention."}
          </p>
        </div>
      </section>

      <section className="rounded-[1.2rem] border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Search inbox
            </span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search alerts, records, or keywords..."
              value={searchQuery}
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all" as const, label: "All", count: notifications.length },
          { id: "unread" as const, label: "Unread", count: unreadCount },
          { id: "action" as const, label: "Action", count: actionCount },
          {
            id: "compliance" as const,
            label: "Compliance",
            count: notifications.filter((item) => item.kind === "expiring_documents").length,
          },
        ].map((option) => (
          <button
            aria-pressed={filter === option.id}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
              filter === option.id
                ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800",
            )}
            key={option.id}
            onClick={() => setFilter(option.id)}
            type="button"
          >
            <span>{option.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.72rem] font-semibold",
                filter === option.id ? "bg-white/12 text-white" : "bg-slate-100 text-slate-500",
              )}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {orderedNotifications.length > 0 ? (
        <div className="space-y-6">
          {[
            { key: "today", label: "Today", items: groupedNotifications.today },
            { key: "this-week", label: "This week", items: groupedNotifications.thisWeek },
            { key: "earlier", label: "Earlier", items: groupedNotifications.earlier },
          ].map((group) => (
            group.items.length > 0 ? (
              <section className="space-y-3" key={group.key}>
                <h2 className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </h2>
                {group.items.map((notification) => {
            const destination = destinationFor(notification);
            const tone = toneClasses(notification.tone);
            const focused = focusedNotificationId === notification.id;
            const latestActivity =
              notification.activity && notification.activity.length > 0
                ? notification.activity[notification.activity.length - 1]
                : null;

            return (
              <SurfaceCard
                className={cn(
                  "rounded-[1.45rem] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]",
                  focused
                    ? "border-brand-300 bg-brand-50/20 ring-1 ring-brand-200"
                    : "border-slate-200/85 bg-white",
                )}
                key={notification.id}
              >
                <div className="space-y-4">
                  <button
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => focusNotification(notification.id)}
                    type="button"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1",
                        tone.icon,
                      )}
                    >
                      {notificationGlyph(notification)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-[1.02rem] font-semibold text-slate-950">
                              {notification.title}
                            </h2>
                            {focused ? (
                              <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-[0.68rem] font-semibold text-brand-700">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {notification.message}
                          </p>
                        </div>
                        <p className="shrink-0 text-[0.78rem] font-medium text-slate-400">
                          {relativeLabel(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset",
                        priorityClasses(notification.tone),
                      )}
                    >
                      {priorityLabel(notification.tone)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset",
                        stateClasses(notification.state),
                      )}
                    >
                      {stateLabel(notification.state)}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.72rem] font-medium text-slate-600">
                      {notificationKindLabel(notification)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className={cn("rounded-[1rem] border px-4 py-3", tone.accent)}>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Related record
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {notification.linkedRecordLabel ?? notificationKindLabel(notification)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Due
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {notification.dueDate ? formatDateLabel(notification.dueDate) : "No due date"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <LayersIcon />
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em]">
                          Open in
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {destination.workspace}
                      </p>
                    </div>
                  </div>

                  {latestActivity ? (
                    <p className="text-[0.8rem] text-slate-500">
                      Latest update: {latestActivity.title} on {formatDateTimeLabel(latestActivity.timestamp)}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      className="h-10 rounded-xl"
                      onClick={() => navigate(backendMode ? notification.actionHref : destination.href)}
                    >
                      <span>{backendMode ? notification.actionLabel : destination.label}</span>
                    </Button>

                    {notification.state !== "reviewed" && notification.state !== "resolved" ? (
                      <Button
                        className="h-10 rounded-xl"
                        onClick={() =>
                          handleStateUpdate(
                            notification,
                            "reviewed",
                            "Notification reviewed",
                            "info",
                          )
                        }
                        variant="secondary"
                      >
                        Mark reviewed
                      </Button>
                    ) : null}

                    {notification.state !== "resolved" ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() =>
                          handleStateUpdate(
                            notification,
                            "resolved",
                            "Notification resolved",
                            "success",
                          )
                        }
                        type="button"
                      >
                        Resolve
                        <ArrowRightIcon />
                      </button>
                    ) : null}
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
              </section>
            ) : null
          ))}
        </div>
      ) : (
        <SurfaceCard className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
          <EmptyState
            description="No notifications match this filter right now."
            title="Nothing to review"
          />
        </SurfaceCard>
      )}
    </div>
  );
}
