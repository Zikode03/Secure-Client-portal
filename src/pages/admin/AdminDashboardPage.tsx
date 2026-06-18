import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { cn } from "../../utils/cn";

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
  const dashboard = portal.adminDashboard;

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
      [...portal.managedAccountants].sort(
        (left, right) =>
          right.assignedClientCount - left.assignedClientCount ||
          right.openReviews - left.openReviews,
      ),
    [portal.managedAccountants],
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
