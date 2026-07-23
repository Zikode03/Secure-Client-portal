import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type {
  AdminDashboardData,
  DocumentPolicy,
  FirmClientAccount,
  ManagedAccountant,
  NotificationItem,
  SummaryMetric,
  Tone,
} from "../../types/portal";
import { cn } from "../../utils/cn";

interface BackendAdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  securityStatus?: string | null;
}

interface BackendClientRecord {
  id: string;
  name: string;
  entityType: string;
  status: string;
  complianceHealth: number;
  assignedAccountantId: string;
  primaryContact: string;
  email: string;
}

interface BackendAssignmentRecord {
  id: string;
  clientId: string;
  clientName?: string | null;
  accountantUserId: string;
  accountantName?: string | null;
  isPrimary: boolean;
}

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
}

interface BackendReviewQueueRecord {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  status?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const livePolicies: DocumentPolicy[] = [
  {
    id: "policy-client-access",
    name: "Client assignment control",
    description: "Primary accountant ownership determines who should carry the live client workload.",
    requiredByDay: "Immediate",
    gracePeriod: "No grace period",
    owner: "Admin",
  },
  {
    id: "policy-review-age",
    name: "Review queue ageing",
    description: "Review items older than three days should be escalated before the month-end bottleneck grows.",
    requiredByDay: "3 days",
    gracePeriod: "4 extra days",
    owner: "Operations",
  },
  {
    id: "policy-request-sla",
    name: "Request SLA visibility",
    description: "Waiting-on-client and overdue requests stay visible in admin oversight until they are resolved.",
    requiredByDay: "Daily",
    gracePeriod: "N/A",
    owner: "Admin",
  },
  {
    id: "policy-compliance-risk",
    name: "Compliance risk watch",
    description: "Inactive and low-health clients should surface quickly so assignments and reviews can be rebalanced.",
    requiredByDay: "Weekly",
    gracePeriod: "2 days",
    owner: "Compliance",
  },
];

function normalizeAccountantStatus(status?: string | null): ManagedAccountant["status"] {
  switch ((status ?? "").trim().toLowerCase()) {
    case "invited":
      return "capacity_available";
    case "disabled":
    case "locked":
      return "busy";
    default:
      return "active";
  }
}

function mapLiveAccountants(
  users: BackendAdminUserRecord[],
  assignments: BackendAssignmentRecord[],
  reviewQueue: BackendReviewQueueRecord[],
): ManagedAccountant[] {
  return users
    .filter((user) => user.role.trim().toLowerCase() === "accountant")
    .map((user) => {
      const assignedClientCount = assignments.filter(
        (assignment) => assignment.accountantUserId === user.id,
      ).length;
      const openReviews = reviewQueue.filter((item) => {
        const status = (item.status ?? "").trim().toLowerCase();
        return item.assignedToUserId === user.id && status !== "approved" && status !== "rejected";
      }).length;

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        title: "Accountant",
        assignedClientCount,
        openReviews,
        status:
          openReviews >= 8
            ? "busy"
            : assignedClientCount <= 2
              ? "capacity_available"
              : normalizeAccountantStatus(user.securityStatus),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function mapLiveClients(
  clients: BackendClientRecord[],
  assignments: BackendAssignmentRecord[],
  accountants: ManagedAccountant[],
): FirmClientAccount[] {
  return clients.map((client) => {
    const clientAssignments = assignments.filter((assignment) => assignment.clientId === client.id);
    const primaryAssignment = clientAssignments.find((assignment) => assignment.isPrimary) ?? null;

    return {
      id: client.id,
      clientName: client.name,
      industry: client.entityType,
      assignedAccountant:
        primaryAssignment?.accountantName ??
        accountants.find((accountant) => accountant.id === client.assignedAccountantId)?.name ??
        "Unassigned",
      assignedAccountantUserId:
        primaryAssignment?.accountantUserId ?? (client.assignedAccountantId || undefined),
      requiredPack: "Current month pack",
      completionRate: client.complianceHealth,
      deadlinePolicy: "Monthly",
      status:
        client.status === "active"
          ? client.complianceHealth < 60
            ? "attention"
            : "on_track"
          : client.status === "inactive"
            ? "attention"
            : "overdue",
      isActive: client.status === "active",
    };
  });
}

function mapNotificationTone(type: string): Tone {
  const value = type.trim().toLowerCase();
  if (value.includes("rejected") || value.includes("overdue") || value.includes("exception")) {
    return "danger";
  }

  if (value.includes("missing") || value.includes("deadline") || value.includes("expiring")) {
    return "warning";
  }

  if (value.includes("review") || value.includes("request")) {
    return "info";
  }

  return "neutral";
}

function mapNotificationKind(type: string): NotificationItem["kind"] {
  const value = type.trim().toLowerCase();
  if (value.includes("rejected")) return "rejected_documents";
  if (value.includes("deadline") || value.includes("expiring")) return "deadline_reminder";
  if (value.includes("missing")) return "missing_documents";
  return "expiring_documents";
}

function buildSummaryMetrics(
  clients: FirmClientAccount[],
  accountants: ManagedAccountant[],
  notifications: NotificationItem[],
  reviewQueue: BackendReviewQueueRecord[],
): SummaryMetric[] {
  const activeClients = clients.filter((client) => client.isActive ?? true).length;
  const attentionClients = clients.filter((client) => client.status !== "on_track").length;
  const openReviews = reviewQueue.filter((item) => {
    const status = (item.status ?? "").trim().toLowerCase();
    return status !== "approved" && status !== "rejected";
  }).length;
  const busyAccountants = accountants.filter((accountant) => accountant.status === "busy").length;

  return [
    {
      id: "active-clients",
      label: "Active clients",
      value: String(activeClients),
      helper: `${attentionClients} need attention`,
      tone: attentionClients > 0 ? "warning" : "success",
    },
    {
      id: "open-reviews",
      label: "Open reviews",
      value: String(openReviews),
      helper: `${reviewQueue.length} total review records loaded`,
      tone: openReviews >= 5 ? "warning" : "info",
    },
    {
      id: "team-capacity",
      label: "Busy accountants",
      value: String(busyAccountants),
      helper: `${accountants.length - busyAccountants} still have capacity`,
      tone: busyAccountants > 0 ? "warning" : "success",
    },
    {
      id: "firm-alerts",
      label: "Recent alerts",
      value: String(notifications.length),
      helper: notifications.length > 0 ? "Latest workflow events surfaced" : "No recent firm alerts",
      tone: notifications.length > 0 ? "info" : "neutral",
    },
  ];
}

function statusTone(status: "on_track" | "attention" | "overdue") {
  if (status === "on_track") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "overdue") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function workloadTone(openReviews: number) {
  if (openReviews >= 5) {
    return "text-rose-600";
  }

  if (openReviews >= 3) {
    return "text-amber-600";
  }

  return "text-emerald-600";
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveDashboard, setLiveDashboard] = useState<AdminDashboardData | null>(null);
  const [liveAccountants, setLiveAccountants] = useState<ManagedAccountant[] | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isMounted = true;

    async function loadAdminDashboard() {
      const results = await Promise.allSettled([
        apiGetJson<BackendAdminUserRecord[]>("/api/admin/users"),
        apiGetJson<BackendClientRecord[]>("/api/clients"),
        apiGetJson<BackendAssignmentRecord[]>("/api/assignments"),
        apiGetJson<BackendNotificationRecord[]>("/api/notifications"),
        apiGetJson<BackendReviewQueueRecord[]>("/api/review-queue"),
      ]);

      if (!isMounted) {
        return;
      }

      const [usersResult, clientsResult, assignmentsResult, notificationsResult, reviewQueueResult] = results;

      if (
        usersResult.status !== "fulfilled" ||
        clientsResult.status !== "fulfilled" ||
        assignmentsResult.status !== "fulfilled"
      ) {
        const firstError = [usersResult, clientsResult, assignmentsResult]
          .find((result) => result.status === "rejected");
        const error = firstError?.status === "rejected" ? firstError.reason : null;

        setFeedbackNotice({
          tone: "warning",
          title: "Live admin dashboard unavailable",
          message:
            error instanceof ApiError
              ? error.message
              : "The admin dashboard could not load the live backend data, so the seeded workspace view is still shown.",
        });
        return;
      }

      const users = usersResult.value;
      const clients = clientsResult.value;
      const assignments = assignmentsResult.value;
      const reviewQueue = reviewQueueResult.status === "fulfilled" ? reviewQueueResult.value : [];
      const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value : [];
      const mappedAccountants = mapLiveAccountants(users, assignments, reviewQueue);
      const mappedClients = mapLiveClients(clients, assignments, mappedAccountants);
      const mappedNotifications: NotificationItem[] = notifications
        .slice(0, 8)
        .map((item) => ({
          id: item.id,
          kind: mapNotificationKind(item.type),
          title: item.title,
          message: item.message,
          createdAt: item.createdAtUtc,
          tone: mapNotificationTone(item.type),
          actionLabel: item.linkUrl ? "Open" : "Review",
          actionHref: item.linkUrl ?? "/admin/assignments",
          state: item.isRead ? "reviewed" : "unread",
          activity: [],
        }));

      setLiveAccountants(mappedAccountants);
      setLiveDashboard({
        summaryMetrics: buildSummaryMetrics(mappedClients, mappedAccountants, mappedNotifications, reviewQueue),
        clients: mappedClients,
        policies: livePolicies,
        notifications: mappedNotifications,
      });
      setFeedbackNotice(
        notificationsResult.status === "rejected" || reviewQueueResult.status === "rejected"
          ? {
              tone: "warning",
              title: "Partial live dashboard",
              message: "Some secondary dashboard feeds could not be loaded, so a few admin tiles are using limited live data.",
            }
          : null,
      );
    }

    void loadAdminDashboard();

    return () => {
      isMounted = false;
    };
  }, [backendMode]);

  const dashboard = backendMode && liveDashboard ? liveDashboard : portal.adminDashboard;
  const managedAccountants = backendMode && liveAccountants ? liveAccountants : portal.managedAccountants;

  const criticalClients = useMemo(
    () =>
      [...dashboard.clients]
        .sort((left, right) => {
          const leftRank =
            left.status === "overdue" ? 3 : left.status === "attention" ? 2 : 1;
          const rightRank =
            right.status === "overdue" ? 3 : right.status === "attention" ? 2 : 1;
          return rightRank - leftRank || left.completionRate - right.completionRate;
        })
        .slice(0, 5),
    [dashboard.clients],
  );

  const capacityRows = useMemo(
    () =>
      [...managedAccountants].sort(
        (left, right) =>
          right.assignedClientCount - left.assignedClientCount ||
          right.openReviews - left.openReviews,
      ),
    [managedAccountants],
  );

  const recentAlerts = useMemo(
    () => dashboard.notifications.slice(0, 4),
    [dashboard.notifications],
  );

  const systemRules = useMemo(() => dashboard.policies.slice(0, 4), [dashboard.policies]);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate("/admin/assignments")} variant="secondary">
              Open assignments
            </Button>
            <Button onClick={() => navigate("/admin/system-settings")}>
              Open system settings
            </Button>
          </>
        }
        description="See firm health, team capacity, client risk, and governance actions from one admin-first home."
        eyebrow="Admin workspace"
        title="Firm dashboard"
      />

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.summaryMetrics.map((metric) => (
          <SurfaceCard className="space-y-3" key={metric.id}>
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="text-[2rem] font-semibold tracking-tight text-slate-950">
              {metric.value}
            </p>
            <p className="text-sm leading-6 text-slate-500">{metric.helper}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Clients needing attention</h2>
              <p className="mt-1 text-sm text-slate-500">
                Prioritise the client relationships most likely to affect firm delivery.
              </p>
            </div>
            <Button onClick={() => navigate("/admin/system-settings")} size="sm" variant="secondary">
              Manage clients
            </Button>
          </div>

          <div className="space-y-3">
            {criticalClients.map((client) => (
              <div
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_0.75fr_0.7fr_auto] md:items-center"
                key={client.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {client.clientName}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {client.industry} / {client.requiredPack}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Accountant
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {client.assignedAccountant || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Completion
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {client.completionRate}%
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                    statusTone(client.status),
                  )}
                >
                  {client.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Worker capacity</h2>
              <p className="mt-1 text-sm text-slate-500">
                Check who is carrying the heaviest portfolio and review load.
              </p>
            </div>
            <Button onClick={() => navigate("/admin/accountants")} size="sm" variant="secondary">
              Open team view
            </Button>
          </div>

          <div className="space-y-3">
            {capacityRows.map((accountant) => (
              <div
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                key={accountant.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{accountant.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{accountant.title}</p>
                  </div>
                  <span className={cn("text-sm font-semibold", workloadTone(accountant.openReviews))}>
                    {accountant.openReviews} open reviews
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <span>{accountant.assignedClientCount} assigned clients</span>
                  <span className="capitalize">{accountant.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Recent firm alerts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Issues and changes that should stay visible at the admin layer.
              </p>
            </div>
            <Button onClick={() => navigate("/firm/notifications")} size="sm" variant="secondary">
              Open notifications
            </Button>
          </div>

          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                key={alert.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{alert.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(alert.createdAt).toLocaleDateString("en-ZA")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Governance shortcuts</h2>
              <p className="mt-1 text-sm text-slate-500">
                The controls admins use most often to keep the firm running cleanly.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="justify-start"
              onClick={() => navigate("/admin/system-settings")}
              variant="secondary"
            >
              Users and roles
            </Button>
            <Button
              className="justify-start"
              onClick={() => navigate("/admin/accountants")}
              variant="secondary"
            >
              Team capacity
            </Button>
            <Button
              className="justify-start"
              onClick={() => navigate("/admin/assignments")}
              variant="secondary"
            >
              Client assignments
            </Button>
            <Button
              className="justify-start"
              onClick={() => navigate("/admin/request-state-machine")}
              variant="secondary"
            >
              Request SLA rules
            </Button>
            <Button
              className="justify-start"
              onClick={() => navigate("/firm/review")}
              variant="secondary"
            >
              Open review queue
            </Button>
            <Button
              className="justify-start"
              onClick={() => navigate("/firm/compliance")}
              variant="secondary"
            >
              Open compliance centre
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Active control rules</h3>
              <p className="mt-1 text-sm text-slate-500">
                Policy areas shaping the firm’s current operational workflow.
              </p>
            </div>
            {systemRules.map((policy) => (
              <div key={policy.id}>
                <p className="text-sm font-semibold text-slate-900">{policy.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{policy.description}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
