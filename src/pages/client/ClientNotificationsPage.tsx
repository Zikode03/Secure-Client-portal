// Friendly guide: this module (ClientNotificationsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import type { NotificationItem, NotificationKind, Tone } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";

const notificationSnapshotDate = new Date();

// Shared shape notes: these types keep UI and data contracts aligned.
type NotificationFilter = "all" | "unread" | "action";
type NotificationSection = "today" | "this_week" | "earlier";

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
      <rect
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="6.5"
      />
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

function CheckIcon() {
  return (
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

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
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
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 6.5h15l-6 6v5l-3 1v-6l-6-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
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

function toneClasses(tone: Tone) {
  if (tone === "danger") {
    return {
      icon: "bg-rose-50 text-rose-500 ring-rose-100",
      edge: "before:bg-rose-500",
      stat: "text-rose-600",
    };
  }

  if (tone === "warning") {
    return {
      icon: "bg-amber-50 text-amber-500 ring-amber-100",
      edge: "before:bg-amber-500",
      stat: "text-amber-600",
    };
  }

  return {
    icon: "bg-brand-50 text-brand-600 ring-brand-100",
    edge: "before:bg-brand-500",
    stat: "text-brand-600",
  };
}

function notificationGlyph(kind: NotificationKind) {
  if (kind === "deadline_reminder") {
    return <CalendarIcon />;
  }

  if (kind === "expiring_documents") {
    return <ClockIcon />;
  }

  if (kind === "rejected_documents") {
    return <AlertIcon />;
  }

  return <BellIcon />;
}

function relativeLabel(createdAt: string) {
  const difference = notificationSnapshotDate.getTime() - new Date(createdAt).getTime();
  const hours = Math.max(1, Math.floor(difference / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours}:${String((new Date(createdAt).getMinutes())).padStart(2, "0")}`;
  }

  const day = new Date(createdAt).getDate();
  const month = new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(new Date(createdAt));
  return `${day} ${month}`;
}

function getSection(createdAt: string): NotificationSection {
  const date = new Date(createdAt);
  const diff = notificationSnapshotDate.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days <= 1) {
    return "today";
  }

  if (days <= 7) {
    return "this_week";
  }

  return "earlier";
}

function matchesFilter(
  item: NotificationItem,
  filter: NotificationFilter,
  reviewedIds: Set<string>,
) {
  const reviewed = item.state === "reviewed" || item.state === "resolved" || reviewedIds.has(item.id);

  if (filter === "all") {
    return true;
  }

  if (filter === "unread") {
    return !reviewed;
  }

  return item.kind === "missing_documents" || item.kind === "rejected_documents";
}

function mapBackendNotification(notification: BackendNotificationRecord): NotificationItem {
  const type = notification.type.trim().toLowerCase();

  const kind: NotificationKind =
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
        ? "/client/inbox"
        : notification.linkUrl.startsWith("/documents/")
          ? "/client/documents"
          : notification.linkUrl.startsWith("/compliance")
            ? "/client/compliance"
            : notification.linkUrl
      : kind === "expiring_documents"
        ? "/client/compliance"
        : kind === "rejected_documents"
          ? "/client/documents"
          : "/client/packs";

  return {
    id: notification.id,
    kind,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAtUtc,
    tone,
    actionLabel:
      kind === "expiring_documents"
        ? "Open compliance centre"
        : kind === "rejected_documents"
          ? "Open documents"
          : kind === "deadline_reminder"
            ? "Open monthly pack"
            : "Open request inbox",
    actionHref,
    linkedRecordLabel: notification.title,
    linkedWorkspace:
      kind === "expiring_documents"
        ? "compliance"
        : kind === "rejected_documents"
          ? "documents"
          : kind === "deadline_reminder"
            ? "monthly_packs"
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

function kindDescription(kind: NotificationKind) {
  switch (kind) {
    case "missing_documents":
      return "A required structured slot in the monthly pack is still empty, so the month cannot move through review and submission yet.";
    case "rejected_documents":
      return "The accountant reviewed the uploaded file and needs a corrected version before it can move forward.";
    case "deadline_reminder":
      return "The month-end deadline is approaching and there are still incomplete workflow items that need your attention.";
    default:
      return "A controlled compliance record is nearing expiry and should be refreshed before the validity window closes.";
  }
}

function linkedItemLabel(notification: NotificationItem) {
  return notification.linkedRecordLabel?.trim() || notification.title;
}

function impactLabel(notification: NotificationItem) {
  if (notification.kind === "missing_documents") {
    return "Month-end filing cannot proceed";
  }

  if (notification.kind === "rejected_documents") {
    return "Reviewed file still needs correction";
  }

  if (notification.kind === "deadline_reminder") {
    return "Submission window is approaching";
  }

  return "Compliance status may fall out of date";
}

function blockingLabel(notification: NotificationItem) {
  if (notification.kind === "expiring_documents") {
    return "Compliance Centre";
  }

  return notification.linkedRecordLabel?.trim() || "Monthly Pack";
}

function needLabel(notification: NotificationItem) {
  if (notification.kind === "missing_documents") {
    return "Upload the missing required record into the correct structured slot.";
  }

  if (notification.kind === "rejected_documents") {
    return "Re-upload the corrected file with clearer supporting evidence.";
  }

  if (notification.kind === "deadline_reminder") {
    return "Review the checklist and finish the remaining blocked items before the deadline.";
  }

  return "Review the expiring record and upload a renewed version if required.";
}

function Illustration({ tone }: { tone: Tone }) {
  const badgeClasses =
    tone === "danger"
      ? "bg-rose-500 shadow-[0_20px_40px_rgba(244,63,94,0.22)]"
      : tone === "warning"
        ? "bg-amber-500 shadow-[0_20px_40px_rgba(245,158,11,0.22)]"
        : "bg-brand-500 shadow-[0_20px_40px_rgba(84,66,255,0.22)]";

  return (
    <div className="relative hidden h-[220px] items-center justify-center overflow-hidden rounded-[1.7rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.96),rgba(250,250,255,0.84)_56%,rgba(248,248,252,0.42)_100%)] lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.07),transparent_52%)]" />
      <div className="absolute h-[180px] w-[180px] rounded-full border border-slate-100" />
      <div className="absolute h-[240px] w-[240px] rounded-full border border-slate-100/90" />
      <div className="relative">
        <div className="h-[132px] w-[100px] rounded-[1.7rem] border border-slate-100 bg-white shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
          <div className="flex h-full flex-col gap-2 px-5 py-5">
            <div className="h-3 w-10 rounded-full bg-slate-100" />
            <div className="h-2.5 w-14 rounded-full bg-slate-100" />
            <div className="h-2.5 w-12 rounded-full bg-slate-100" />
            <div className="h-2.5 w-16 rounded-full bg-slate-100" />
            <div className="h-2.5 w-11 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className={cn("absolute -bottom-5 -right-6 flex h-16 w-16 items-center justify-center rounded-full text-white", badgeClasses)}>
          <AlertIcon />
        </div>
      </div>
    </div>
  );
}

export function ClientNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([]);
  const notifications = backendMode ? liveNotifications : portal.clientWorkflow.notifications;
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedNotificationId, setSelectedNotificationId] = useState(
    notifications[0]?.id ?? "",
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<Tone>("info");
  const [liveLoadStatus, setLiveLoadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function loadNotifications() {
    if (!backendMode) {
      return;
    }

    setLiveLoadStatus("loading");
    try {
      const data = await apiGetJson<BackendNotificationRecord[]>("/api/notifications");
      setLiveNotifications(data.map(mapBackendNotification));
      setLiveLoadStatus("ready");
      setFeedbackMessage("");
    } catch (error) {
      setLiveNotifications([]);
      setLiveLoadStatus("error");
      setFeedbackTone("danger");
      setFeedbackMessage(
        error instanceof ApiError ? error.message : "The live notification inbox could not be loaded.",
      );
    }
  }

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    void loadNotifications();
  }, [backendMode]);

  useEffect(() => {
    if (!notifications.length) {
      setSelectedNotificationId("");
      return;
    }

    if (!notifications.some((item) => item.id === selectedNotificationId)) {
      setSelectedNotificationId(notifications[0].id);
    }
  }, [notifications, selectedNotificationId]);

  const reviewedSet = useMemo(() => new Set(reviewedIds), [reviewedIds]);

  const filteredNotifications = useMemo(
    () => notifications.filter((item) => matchesFilter(item, filter, reviewedSet)),
    [filter, notifications, reviewedSet],
  );

  const groupedNotifications = useMemo(() => {
    return {
      today: filteredNotifications.filter((item) => getSection(item.createdAt) === "today"),
      thisWeek: filteredNotifications.filter((item) => getSection(item.createdAt) === "this_week"),
      earlier: filteredNotifications.filter((item) => getSection(item.createdAt) === "earlier"),
    };
  }, [filteredNotifications]);

  const selectedNotification = useMemo(
    () =>
      filteredNotifications.find((item) => item.id === selectedNotificationId) ??
      filteredNotifications[0] ??
      null,
    [filteredNotifications, selectedNotificationId],
  );

  const filterCounts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((item) => !reviewedSet.has(item.id)).length,
      action: notifications.filter(
        (item) => item.kind === "missing_documents" || item.kind === "rejected_documents",
      ).length,
    }),
    [notifications, reviewedSet],
  );

  function handleOpenSelected() {
    if (!selectedNotification) {
      return;
    }

    navigate(selectedNotification.actionHref);
  }

  function markNotificationRead(notificationId: string) {
    if (!backendMode) {
      setReviewedIds((current) => (current.includes(notificationId) ? current : [...current, notificationId]));
      return;
    }

    void (async () => {
      try {
        await apiPostJson(`/api/notifications/${encodeURIComponent(notificationId)}/mark-read`, {});
        setLiveNotifications((current) =>
          current.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  state: "reviewed",
                  activity: [
                    ...(item.activity ?? []),
                    {
                      id: `${item.id}-reviewed`,
                      title: "Notification reviewed",
                      detail: `${user?.fullName ?? "Client"} reviewed this notification.`,
                      timestamp: new Date().toISOString(),
                      tone: "info",
                      actor: user?.fullName ?? "Client",
                    },
                  ],
                }
              : item,
          ),
        );
      } catch (error) {
        setFeedbackTone("danger");
        setFeedbackMessage(
          error instanceof ApiError ? error.message : "The notification could not be marked as read.",
        );
      }
    })();
  }

  if (backendMode && liveLoadStatus !== "ready") {
    const isLoading = liveLoadStatus === "idle" || liveLoadStatus === "loading";
    return (
      <div className="portal-page mx-auto max-w-[1280px] space-y-4">
        {feedbackMessage ? (
          <FeedbackBanner
            message={feedbackMessage}
            onDismiss={() => setFeedbackMessage("")}
            title="Notifications unavailable"
            tone="danger"
          />
        ) : null}
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            description={isLoading ? "Your live notifications are being loaded." : "The notification inbox could not be loaded. No demo notifications are being shown."}
            title={isLoading ? "Loading notifications" : "Notifications unavailable"}
          />
          {!isLoading ? (
            <div className="mt-5 flex justify-center">
              <Button onClick={() => void loadNotifications()}>Try again</Button>
            </div>
          ) : null}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="portal-page mx-auto max-w-[1280px] space-y-4">
      <div className="space-y-1.5">
        <h1 className="portal-page-title text-slate-950">Notifications</h1>
        <p className="max-w-2xl text-[0.94rem] leading-6 text-slate-500">
          Review updates, required actions, and linked client records.
        </p>
      </div>
      {feedbackMessage ? (
        <FeedbackBanner
          message={feedbackMessage}
          onDismiss={() => setFeedbackMessage("")}
          title={feedbackTone === "danger" ? "Notification update failed" : "Notification updated"}
          tone={feedbackTone}
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:items-start">
        <SurfaceCard className="rounded-[1.65rem] border border-slate-200/80 bg-white p-0 shadow-[0_24px_50px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { id: "all" as const, label: "All", count: filterCounts.all },
                  { id: "unread" as const, label: "Unread", count: filterCounts.unread },
                  { id: "action" as const, label: "Action", count: filterCounts.action },
                ].map((option) => (
                  <button
                    aria-pressed={filter === option.id}
                    className={cn(
                      "relative inline-flex items-center gap-2 px-1 py-1.5 text-[0.86rem] font-medium transition",
                      filter === option.id ? "text-brand-600" : "text-slate-500 hover:text-slate-700",
                    )}
                    key={option.id}
                    onClick={() => setFilter(option.id)}
                    type="button"
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.72rem] font-semibold",
                        filter === option.id ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {option.count}
                    </span>
                    {filter === option.id ? (
                      <span className="absolute inset-x-0 -bottom-[0.95rem] h-0.5 rounded-full bg-brand-500" />
                    ) : null}
                  </button>
                ))}
              </div>

              <button
                aria-label="Filter notifications"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={() => {
                  setFilter("action");
                  setFeedbackMessage("Showing action-required notifications only.");
                }}
                type="button"
              >
                <FilterIcon />
              </button>
            </div>
          </div>

          <div className="space-y-5 px-4 pb-4 pt-5">
            {([
              { id: "today" as const, label: "Today", items: groupedNotifications.today },
              { id: "this_week" as const, label: "This Week", items: groupedNotifications.thisWeek },
              { id: "earlier" as const, label: "Earlier", items: groupedNotifications.earlier },
            ] as const).map((section) =>
              section.items.length > 0 ? (
                <div className="space-y-3" key={section.id}>
                  <div className="flex items-center gap-2 px-2">
                    <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {section.label}
                    </h2>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.7rem] font-semibold text-rose-500">
                      {section.items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const selected = selectedNotification?.id === item.id;
                      const tone = toneClasses(item.tone);

                      return (
                        <button
                          className={cn(
                            "relative w-full overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.04)] before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-full",
                            tone.edge,
                            selected
                              ? "border-brand-200 bg-brand-50/35 ring-1 ring-inset ring-brand-200"
                              : "hover:border-slate-300 hover:bg-slate-50/90",
                          )}
                          key={item.id}
                          onClick={() => {
                            setSelectedNotificationId(item.id);
                            markNotificationRead(item.id);
                          }}
                          type="button"
                        >
                          <div className="flex items-start gap-3 pl-2">
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1",
                                tone.icon,
                              )}
                            >
                              {notificationGlyph(item.kind)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[0.98rem] font-semibold text-slate-950">
                                    {item.title}
                                  </p>
                                  <p className="mt-1 text-[0.84rem] text-slate-500">
                                    {linkedItemLabel(item)}
                                  </p>
                                </div>
                                <div className="space-y-1 text-right">
                                  <p className="text-[0.76rem] font-medium text-slate-400">
                                    {relativeLabel(item.createdAt)}
                                  </p>
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ring-1",
                                      priorityClasses(item.tone),
                                    )}
                                  >
                                    {priorityLabel(item.tone)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}

            {filteredNotifications.length === 0 ? (
              <EmptyState
                description="No notifications match this filter right now."
                title="Nothing to review"
              />
            ) : null}

            <button
              className="flex items-center gap-2 px-2 text-sm font-medium text-brand-600 transition hover:text-brand-700"
              onClick={() => navigate("/client/notifications")}
              type="button"
            >
              View all notifications
              <ArrowRightIcon />
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-white p-0 shadow-[0_24px_50px_rgba(15,23,42,0.06)]">
          {selectedNotification ? (
            <>
              <div className="border-b border-slate-100 px-6 pb-5 pt-5">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.95fr)] lg:items-start">
                  <div className="space-y-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] ring-1",
                        priorityClasses(selectedNotification.tone),
                      )}
                    >
                      {priorityLabel(selectedNotification.tone)} priority
                    </span>
                    <div>
                      <h2 className="portal-detail-title text-slate-950">
                        {selectedNotification.title}
                      </h2>
                      <p className="mt-2 text-[1rem] text-slate-600">
                        {linkedItemLabel(selectedNotification)}
                      </p>
                    </div>
                    <p className="max-w-2xl text-[0.95rem] leading-7 text-slate-600">
                      {selectedNotification.message}
                    </p>
                  </div>

                  <Illustration tone={selectedNotification.tone} />
                </div>
              </div>

              <div className="grid gap-0 border-b border-slate-100 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 px-5 py-4 xl:border-r xl:border-slate-100">
                  <div className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <CalendarIcon />
                    <span>Deadline</span>
                  </div>
                  <p className="text-[1.02rem] font-semibold text-slate-950">
                    {formatDateLabel(selectedNotification.createdAt)}
                  </p>
                  <p className="text-[0.84rem] text-rose-500">
                    {selectedNotification.kind === "deadline_reminder" ? "Approaching close" : "Action window open"}
                  </p>
                </div>

                <div className="space-y-2 px-5 py-4 xl:border-r xl:border-slate-100">
                  <div className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <DocumentIcon />
                    <span>Impact</span>
                  </div>
                  <p className="text-[1.02rem] font-semibold text-slate-950">{impactLabel(selectedNotification)}</p>
                </div>

                <div className="space-y-2 px-5 py-4 xl:border-r xl:border-slate-100">
                  <div className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <LayersIcon />
                    <span>Blocking</span>
                  </div>
                  <p className="text-[1.02rem] font-semibold text-slate-950">{blockingLabel(selectedNotification)}</p>
                </div>

                <div className="space-y-2 px-5 py-4">
                  <div className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <AlertIcon />
                    <span>Risk Level</span>
                  </div>
                  <p className={cn("text-[1.02rem] font-semibold", toneClasses(selectedNotification.tone).stat)}>
                    {priorityLabel(selectedNotification.tone)}
                  </p>
                  <p className="text-[0.84rem] text-rose-500">Requires action</p>
                </div>
              </div>

              <div className="border-b border-slate-100 px-6">
                <div className="flex flex-wrap items-center gap-8">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "needed", label: "What's needed" },
                    { id: "documents", label: "Related documents" },
                    { id: "activity", label: "Activity" },
                  ].map((tab, index) => (
                    <button
                      className={cn(
                        "border-b-2 px-1 py-4 text-[0.92rem] font-medium transition",
                        index === 0
                          ? "border-brand-500 text-brand-600"
                          : "border-transparent text-slate-500 hover:text-slate-700",
                      )}
                      key={tab.id}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,0.92fr)]">
                <div className="rounded-[1.35rem] border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-950">Why you are seeing this</h2>
                  <p className="mt-3 text-[0.9rem] leading-7 text-slate-600">
                    {kindDescription(selectedNotification.kind)}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)] p-5">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckIcon />
                    <h2 className="text-sm font-semibold">Recommended next step</h2>
                  </div>
                  <p className="mt-3 text-[0.9rem] leading-7 text-slate-600">
                    {needLabel(selectedNotification)}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] p-5">
                  <h2 className="text-sm font-semibold text-slate-950">Take action</h2>
                  <div className="mt-4 space-y-3">
                    <Button className="h-11 w-full rounded-xl justify-center" onClick={handleOpenSelected}>
                      <span>{selectedNotification.actionLabel}</span>
                    </Button>
                    <Button
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white justify-center text-slate-700 hover:bg-slate-50"
                      onClick={() => navigate("/client/packs")}
                      variant="secondary"
                    >
                      <span>Open monthly pack</span>
                    </Button>
                    <button
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                      onClick={() => navigate("/client/compliance")}
                      type="button"
                    >
                      View compliance centre
                      <ArrowRightIcon />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 px-6 py-4">
                <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <MessageIcon />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Need help?
                        <span className="ml-2 font-normal text-slate-500">
                          Your accountant can assist with uploads or workflow questions.
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate("/client/inbox")}
                    variant="secondary"
                  >
                    <MessageIcon />
                    <span>Message accountant</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-8">
              <EmptyState
                description="Select a notification to see the full details and next action."
                title="No notification selected"
              />
            </div>
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
