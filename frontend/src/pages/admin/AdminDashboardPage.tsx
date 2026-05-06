import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AdminDashboardPage() {
  const portal = usePortal();
  const navigate = useNavigate();
  const data = useMemo(() => {
    const totalClients = portal.adminClients.length;
    const onTrackClients = portal.adminClients.filter(
      (client) => client.status === "on_track",
    ).length;
    const attentionClients = portal.adminClients.filter(
      (client) => client.status === "attention",
    ).length;
    const overdueClients = portal.adminClients.filter(
      (client) => client.status === "overdue",
    ).length;
    const averageCompletion =
      totalClients > 0
        ? Math.round(
            portal.adminClients.reduce((sum, client) => sum + client.completionRate, 0) /
              totalClients,
          )
        : 0;
    const reviewLoad = portal.accountantDashboard.reviewQueue.length;
    const expiringCount = portal.accountantDashboard.expiringDocuments.length;

    return {
      summaryMetrics: [
        {
          id: "admin-metric-1",
          label: "Firm completion",
          value: `${averageCompletion}%`,
          helper: `${onTrackClients} of ${totalClients} clients are currently on track.`,
          tone: "info" as const,
          progress: averageCompletion,
        },
        {
          id: "admin-metric-2",
          label: "At-risk clients",
          value: String(attentionClients + overdueClients),
          helper: `${overdueClients} overdue and ${attentionClients} need intervention.`,
          tone: attentionClients + overdueClients > 0 ? ("danger" as const) : ("success" as const),
        },
        {
          id: "admin-metric-3",
          label: "Review load",
          value: String(reviewLoad),
          helper: `${portal.managedAccountants.length} accountants are covering live workflow reviews.`,
          tone: reviewLoad > 0 ? ("warning" as const) : ("success" as const),
        },
        {
          id: "admin-metric-4",
          label: "Compliance exposure",
          value: String(expiringCount),
          helper: `${portal.accountantDashboard.notifications.length} active operational signals across the firm.`,
          tone: expiringCount > 0 ? ("warning" as const) : ("success" as const),
        },
      ],
      clients: portal.adminClients,
      policies: portal.adminPolicies,
      notifications: portal.accountantDashboard.notifications,
    };
  }, [portal]);
  const clientPreview = useMemo(() => data.clients.slice(0, 4), [data.clients]);
  const policyPreview = useMemo(() => data.policies.slice(0, 3), [data.policies]);
  const notificationPreview = useMemo(
    () => data.notifications.slice(0, 3),
    [data.notifications],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        description="Firm-wide visibility for client coverage, policy control, accountant assignments, and operational exceptions."
        eyebrow="Admin control"
        title="Firm operations dashboard"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Client coverage</h2>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Keep firm assignments, policy alignment, and month-pack health visible in one place.
              </p>
            </div>
            <Button onClick={() => navigate("/admin/clients")} size="sm" variant="ghost">
              View all
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {clientPreview.map((client) => (
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4" key={client.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[0.92rem] font-semibold text-slate-950">{client.clientName}</p>
                    <p className="mt-1 text-[0.82rem] text-slate-500">
                      {client.industry} / {client.assignedAccountant}
                    </p>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[0.82rem] text-slate-600">
                    <span>{client.requiredPack}</span>
                    <span>{client.completionRate}% complete</span>
                  </div>
                  <ProgressBar value={client.completionRate} />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Policy watch</h2>
                <p className="mt-1 text-[0.84rem] text-slate-500">
                  Deadline and document rules that shape the portal workflow.
                </p>
              </div>
              <Button onClick={() => navigate("/admin/policies")} size="sm" variant="ghost">
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {policyPreview.map((policy) => (
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4" key={policy.id}>
                  <p className="text-[0.88rem] font-semibold text-slate-950">{policy.name}</p>
                  <p className="mt-1 text-[0.82rem] leading-5.5 text-slate-500">{policy.description}</p>
                  <p className="mt-2.5 text-[0.76rem] text-slate-400">
                    Required by {policy.requiredByDay} / Grace {policy.gracePeriod}
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Operational signals</h2>
                <p className="mt-1 text-[0.84rem] text-slate-500">
                  Shared exceptions that need admin attention.
                </p>
              </div>
              <Button onClick={() => navigate("/admin/compliance")} size="sm" variant="ghost">
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {notificationPreview.map((item) => (
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
                  <p className="text-[0.88rem] font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-[0.82rem] leading-5.5 text-slate-500">{item.message}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
