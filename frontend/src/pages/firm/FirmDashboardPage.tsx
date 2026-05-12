import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type {
  ComplianceClientStatus,
  FirmClientAccount,
  PortfolioRow,
  SummaryMetric,
  WorkflowRequest,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";
import {
  getScopedClients,
  getScopedComplianceStatuses,
  getScopedRequests,
  getScopedReviewQueue,
  hasPermission,
} from "../../utils/permissions";

type PriorityItemTone = "danger" | "warning" | "info";
type PriorityItemKind = "client" | "request" | "review";

interface PriorityItem {
  id: string;
  title: string;
  detail: string;
  meta: string;
  actionLabel: string;
  actionHref: string;
  tone: PriorityItemTone;
  kind: PriorityItemKind;
}

interface VisibleClientRow {
  client: FirmClientAccount;
  compliance: ComplianceClientStatus | null;
  portfolio: PortfolioRow | null;
  attentionScore: number;
}

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

function uniqueRequests(requests: WorkflowRequest[]) {
  return Array.from(new Map(requests.map((request) => [request.id, request])).values());
}

function buildCompliancePercentage(statuses: ComplianceClientStatus[]) {
  const totals = statuses.reduce(
    (summary, status) => {
      summary.required += status.totalRequiredItems;
      summary.compliant += status.compliantCount;
      return summary;
    },
    { compliant: 0, required: 0 },
  );

  if (totals.required === 0) {
    return 0;
  }

  return Math.round((totals.compliant / totals.required) * 100);
}

function buildAttentionScore(
  client: FirmClientAccount,
  compliance: ComplianceClientStatus | null,
  portfolio: PortfolioRow | null,
) {
  const clientStatusScore =
    client.status === "overdue" ? 40 : client.status === "attention" ? 24 : 8;
  const complianceScore =
    (compliance?.expiredCount ?? 0) * 10 +
    (compliance?.missingRequiredCount ?? 0) * 7 +
    (compliance?.expiringCount ?? 0) * 4;
  const portfolioScore = (portfolio?.missingCount ?? 0) * 6 + (portfolio?.overdueCount ?? 0) * 8;

  return clientStatusScore + complianceScore + portfolioScore;
}

function clientStatusClasses(status: FirmClientAccount["status"]) {
  if (status === "overdue") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "attention") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function clientStatusLabel(status: FirmClientAccount["status"]) {
  if (status === "overdue") {
    return "Overdue";
  }

  if (status === "attention") {
    return "Needs attention";
  }

  return "On track";
}

function priorityToneClasses(tone: PriorityItemTone) {
  if (tone === "danger") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (tone === "warning") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-brand-50 text-brand-700 ring-brand-200";
}

function priorityKindLabel(kind: PriorityItemKind) {
  if (kind === "client") {
    return "Client";
  }

  if (kind === "request") {
    return "Request";
  }

  return "Review";
}

export function FirmDashboardPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const canManageAssignments = hasPermission(user, "manage:assignments");
  const scopedClients = useMemo(
    () => getScopedClients(user, portal.adminClients),
    [portal.adminClients, user],
  );
  const scopedComplianceStatuses = useMemo(
    () =>
      getScopedComplianceStatuses(
        user,
        portal.accountantComplianceCentre.clientStatuses ?? [],
        portal.adminClients,
      ),
    [portal.accountantComplianceCentre.clientStatuses, portal.adminClients, user],
  );
  const scopedReviewQueue = useMemo(
    () => getScopedReviewQueue(user, portal.getReviewQueue(), portal.adminClients),
    [portal, user],
  );
  const scopedRequests = useMemo(() => {
    const allRequests = uniqueRequests(
      portal.adminClients.flatMap((client) => portal.getClientWorkspace(client.id).requests),
    );

    return getScopedRequests(user, allRequests, portal.adminClients);
  }, [portal, user]);

  // Frontend scoping keeps the internal portal honest for UX, but real
  // authorization still has to be enforced by the backend and database.
  const visibleClientRows = useMemo<VisibleClientRow[]>(
    () =>
      scopedClients
        .map((client) => {
          const compliance =
            scopedComplianceStatuses.find(
              (status) =>
                status.clientId === client.id || status.clientName === client.clientName,
            ) ?? null;
          const portfolio =
            portal.accountantDashboard.portfolio.find(
              (row) => row.clientId === client.id || row.clientName === client.clientName,
            ) ?? null;

          return {
            client,
            compliance,
            portfolio,
            attentionScore: buildAttentionScore(client, compliance, portfolio),
          };
        })
        .sort((left, right) => right.attentionScore - left.attentionScore),
    [portal.accountantDashboard.portfolio, scopedClients, scopedComplianceStatuses],
  );

  const portfolioCompliancePercentage = useMemo(
    () => buildCompliancePercentage(scopedComplianceStatuses),
    [scopedComplianceStatuses],
  );

  const outstandingRequests = useMemo(
    () => scopedRequests.filter((request) => request.status !== "resolved" && request.status !== "closed"),
    [scopedRequests],
  );

  const metrics = useMemo<SummaryMetric[]>(() => {
    const clientsNeedingAttention = visibleClientRows.filter(
      (row) => row.client.status !== "on_track",
    ).length;
    const underReviewCount = scopedReviewQueue.filter(
      (item) => item.status === "under_review",
    ).length;
    const accountantBusyCount = portal.managedAccountants.filter(
      (accountant) => accountant.status === "busy",
    ).length;
    const atRiskClients = scopedComplianceStatuses.filter(
      (status) => status.riskStatus !== "compliant",
    ).length;
    const expiredOrMissingCount = scopedComplianceStatuses.reduce(
      (sum, status) => sum + status.expiredCount + status.missingRequiredCount,
      0,
    );
    const waitingOnClientCount = outstandingRequests.filter(
      (request) => request.status === "awaiting_client" || request.status === "open",
    ).length;

    if (isAdmin) {
      return [
        {
          id: "dashboard-clients",
          label: "Firm clients",
          value: String(scopedClients.length),
          helper: `${clientsNeedingAttention} clients need intervention right now.`,
          tone: clientsNeedingAttention > 0 ? "warning" : "success",
        },
        {
          id: "dashboard-accountants",
          label: "Active accountants",
          value: String(portal.managedAccountants.length),
          helper: `${accountantBusyCount} accountants are carrying live review workload.`,
          tone: accountantBusyCount > 0 ? "info" : "success",
        },
        {
          id: "dashboard-reviews",
          label: "Firm review queue",
          value: String(scopedReviewQueue.length),
          helper: `${underReviewCount} records are already under review.`,
          tone: scopedReviewQueue.length > 0 ? "warning" : "success",
        },
        {
          id: "dashboard-compliance",
          label: "Firm compliance",
          value: `${portfolioCompliancePercentage}%`,
          helper: `${expiredOrMissingCount} expired or missing compliance blockers across the firm.`,
          tone: expiredOrMissingCount > 0 ? "danger" : "success",
          progress: portfolioCompliancePercentage,
        },
      ];
    }

    return [
      {
        id: "dashboard-assigned-clients",
        label: "Assigned clients",
        value: String(scopedClients.length),
        helper: `${clientsNeedingAttention} clients currently need your follow-up.`,
        tone: clientsNeedingAttention > 0 ? "warning" : "success",
      },
      {
        id: "dashboard-my-reviews",
        label: "My review queue",
        value: String(scopedReviewQueue.length),
        helper: `${underReviewCount} items are already in review.`,
        tone: scopedReviewQueue.length > 0 ? "warning" : "success",
      },
      {
        id: "dashboard-client-actions",
        label: "Waiting on client",
        value: String(waitingOnClientCount),
        helper: "Missing documents, renewals, and re-uploads still outstanding.",
        tone: waitingOnClientCount > 0 ? "danger" : "success",
      },
      {
        id: "dashboard-portfolio-compliance",
        label: "Portfolio compliance",
        value: `${portfolioCompliancePercentage}%`,
        helper: `${atRiskClients} assigned clients are currently at risk.`,
        tone: atRiskClients > 0 ? "warning" : "success",
        progress: portfolioCompliancePercentage,
      },
    ];
  }, [
    isAdmin,
    outstandingRequests,
    portal.managedAccountants,
    portfolioCompliancePercentage,
    scopedClients.length,
    scopedComplianceStatuses,
    scopedReviewQueue,
    visibleClientRows,
  ]);

  const priorityItems = useMemo<PriorityItem[]>(() => {
    const clientItems = visibleClientRows
      .filter(
        (row) =>
          row.client.status !== "on_track" ||
          (row.compliance?.expiredCount ?? 0) > 0 ||
          (row.compliance?.missingRequiredCount ?? 0) > 0,
      )
      .slice(0, 4)
      .map((row) => ({
        id: `priority-client-${row.client.id}`,
        title: `${row.client.clientName} needs attention`,
        detail: isAdmin
          ? `Assigned to ${row.client.assignedAccountant}`
          : `${row.client.industry} portfolio item`,
        meta: `${row.compliance?.expiredCount ?? 0} expired, ${row.compliance?.missingRequiredCount ?? 0} missing required`,
        actionLabel: "Open client",
        actionHref: `/firm/clients/${row.client.id}`,
        tone:
          row.client.status === "overdue" || (row.compliance?.expiredCount ?? 0) > 0
            ? ("danger" as const)
            : ("warning" as const),
        kind: "client" as const,
      }));

    const requestItems = outstandingRequests
      .slice(0, 3)
      .map((request) => ({
        id: `priority-request-${request.id}`,
        title: request.title,
        detail: `${request.clientName} / ${request.assignedTo}`,
        meta: `${request.status.replace(/_/g, " ")} / Due ${formatDateLabel(request.dueDate)}`,
        actionLabel: "Open request",
        actionHref: "/firm/requests",
        tone:
          request.priority === "high"
            ? ("danger" as const)
            : request.priority === "medium"
              ? ("warning" as const)
              : ("info" as const),
        kind: "request" as const,
      }));

    const reviewItems = scopedReviewQueue.slice(0, 3).map((item) => ({
      id: `priority-review-${item.id}`,
      title: `${item.documentType} review`,
      detail: `${item.clientName} / ${item.assignedAccountant}`,
      meta: `Submitted ${formatDateLabel(item.submittedAt)}`,
      actionLabel: "Open review",
      actionHref: "/firm/review",
      tone: item.status === "under_review" ? ("danger" as const) : ("warning" as const),
      kind: "review" as const,
    }));

    return [...clientItems, ...requestItems, ...reviewItems].slice(0, 6);
  }, [isAdmin, outstandingRequests, scopedReviewQueue, visibleClientRows]);

  const notificationCount = useMemo(
    () =>
      portal.accountantDashboard.notifications.filter(
        (item) => item.state !== "resolved" && item.state !== "reviewed",
      ).length,
    [portal.accountantDashboard.notifications],
  );

  const controlActions = isAdmin
    ? [
        { label: "Open assignments", href: "/firm/admin/assignments" },
        { label: "Manage users", href: "/firm/admin/users" },
        { label: "Open templates", href: "/firm/admin/templates" },
        { label: "System settings", href: "/firm/admin/system-settings" },
      ]
    : [
        { label: "Open review queue", href: "/firm/review" },
        { label: "Open requests", href: "/firm/requests" },
        { label: "Open compliance centre", href: "/firm/compliance" },
        { label: "Open notifications", href: "/firm/notifications" },
      ];

  function handleExport() {
    downloadCsv(isAdmin ? "firm-dashboard-view.csv" : "my-portfolio-view.csv", [
      [
        "Client",
        "Assigned Accountant",
        "Industry",
        "Pack Completion",
        "Compliance Score",
        "Expired",
        "Missing Required",
      ],
      ...visibleClientRows.map((row) => [
        row.client.clientName,
        row.client.assignedAccountant,
        row.client.industry,
        String(row.portfolio?.progressPercent ?? row.client.completionRate),
        String(row.compliance?.score ?? 0),
        String(row.compliance?.expiredCount ?? 0),
        String(row.compliance?.missingRequiredCount ?? 0),
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => navigate("/firm/notifications")}
              size="sm"
              variant="secondary"
            >
              <span>Notifications</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-600">
                {notificationCount}
              </span>
            </Button>
            <Button
              onClick={() =>
                navigate(isAdmin ? "/firm/admin/assignments" : "/firm/review")
              }
              size="sm"
              variant="secondary"
            >
              {isAdmin ? "Open assignments" : "Open review queue"}
            </Button>
            <Button onClick={handleExport} size="sm">
              {isAdmin ? "Export firm view" : "Export my portfolio"}
            </Button>
          </>
        }
        description={
          isAdmin
            ? "One operational view for the whole firm, with client coverage, review pressure, and compliance risk in the same workspace."
            : "The same internal portal, scoped to your assigned portfolio so you can focus on your own reviews, requests, and client risk."
        }
        eyebrow={isAdmin ? "Firm workspace" : "Assigned workspace"}
        title="Dashboard"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Client portfolio</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin
                  ? "All firm clients stay visible here, with the same workspace actions accountants use day to day."
                  : "Only the clients assigned to you are visible here, with the same shared workspace actions as the rest of the firm."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageAssignments ? (
                <Button
                  onClick={() => navigate("/firm/admin/assignments")}
                  size="sm"
                  variant="secondary"
                >
                  Manage assignments
                </Button>
              ) : null}
              <Button onClick={() => navigate("/firm/clients")} size="sm" variant="ghost">
                View all clients
              </Button>
            </div>
          </div>

          {visibleClientRows.length > 0 ? (
            <div className="space-y-3">
              {visibleClientRows.slice(0, 6).map((row) => {
                const completion = row.portfolio?.progressPercent ?? row.client.completionRate;

                return (
                  <div
                    className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4"
                    key={row.client.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-[1rem] font-semibold text-slate-950">
                            {row.client.clientName}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset",
                              clientStatusClasses(row.client.status),
                            )}
                          >
                            {clientStatusLabel(row.client.status)}
                          </span>
                        </div>
                        <p className="text-[0.84rem] text-slate-500">
                          {row.client.industry} / {row.client.assignedAccountant}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[0.82rem] text-slate-600">
                            <span>Pack completion</span>
                            <span>{completion}%</span>
                          </div>
                          <ProgressBar value={completion} />
                        </div>
                      </div>

                      <div className="grid min-w-[250px] gap-3 sm:grid-cols-3 lg:w-[320px]">
                        <div className="rounded-[1rem] border border-white/80 bg-white px-3 py-3">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Compliance
                          </p>
                          <p className="mt-1 text-[1.2rem] font-semibold text-slate-950">
                            {row.compliance?.score ?? 0}%
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-white/80 bg-white px-3 py-3">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Expired
                          </p>
                          <p className="mt-1 text-[1.2rem] font-semibold text-rose-600">
                            {row.compliance?.expiredCount ?? 0}
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-white/80 bg-white px-3 py-3">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Missing
                          </p>
                          <p className="mt-1 text-[1.2rem] font-semibold text-amber-600">
                            {row.compliance?.missingRequiredCount ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[0.8rem] text-slate-500">
                        {row.compliance?.nextBestAction ??
                          "Open the client workspace to review the next action."}
                      </p>
                      <Button
                        onClick={() => navigate(`/firm/clients/${row.client.id}`)}
                        size="sm"
                      >
                        Open workspace
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description={
                isAdmin
                  ? "Client records will appear here once the firm portfolio is populated."
                  : "No clients have been assigned to you yet."
              }
              title={isAdmin ? "No client portfolio yet" : "No assigned clients yet"}
            />
          )}
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Priority queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isAdmin
                    ? "The highest-friction client, request, and review items across the firm."
                    : "The most urgent items across your assigned reviews, requests, and clients."}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {priorityItems.length} visible
              </span>
            </div>

            {priorityItems.length > 0 ? (
              <div className="space-y-3">
                {priorityItems.map((item) => (
                  <div
                    className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ring-inset",
                              priorityToneClasses(item.tone),
                            )}
                          >
                            {priorityKindLabel(item.kind)}
                          </span>
                        </div>
                        <p className="mt-1 text-[0.82rem] text-slate-500">{item.detail}</p>
                        <p className="mt-2 text-[0.78rem] text-slate-400">{item.meta}</p>
                      </div>
                      <Button
                        onClick={() => navigate(item.actionHref)}
                        size="sm"
                        variant="secondary"
                      >
                        {item.actionLabel}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="There are no urgent items in your visible queue right now."
                title="Nothing urgent right now"
              />
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Workspace controls</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin
                  ? "Administrator-only controls stay in the same internal portal, without changing the overall workspace pattern."
                  : "Jump to the internal workspaces you use most often for your assigned portfolio."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {controlActions.map((action) => (
                <Button
                  className="justify-between"
                  key={action.href}
                  onClick={() => navigate(action.href)}
                  variant="secondary"
                >
                  <span>{action.label}</span>
                  <span aria-hidden="true">→</span>
                </Button>
              ))}
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">
                {isAdmin ? "Scope reminder" : "Portfolio scope"}
              </p>
              <p className="mt-2 text-[0.84rem] leading-6 text-slate-600">
                {isAdmin
                  ? "You are viewing the full firm workspace, including firm-wide controls, while accountants only see their assigned portfolio."
                  : "This dashboard is limited to your assigned clients, documents, requests, and compliance records inside the shared firm portal."}
              </p>
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
