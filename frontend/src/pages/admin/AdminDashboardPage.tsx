import { usePortal } from "../../app/portal";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AdminDashboardPage() {
  const portal = usePortal();
  const data = {
    summaryMetrics: [
      {
        id: "admin-metric-1",
        label: "Active Clients",
        value: String(portal.adminClients.length),
        helper: "Clients with live portals and monthly workflows.",
        tone: "info" as const,
      },
      {
        id: "admin-metric-2",
        label: "Assigned Accountants",
        value: String(portal.managedAccountants.length),
        helper: "Accountants carrying live pack ownership today.",
        tone: "success" as const,
      },
      {
        id: "admin-metric-3",
        label: "At-Risk Packs",
        value: String(portal.adminClients.filter((client) => client.status !== "on_track").length),
        helper: "Firm-wide packs at risk because of missing or rejected items.",
        tone: "danger" as const,
      },
      {
        id: "admin-metric-4",
        label: "Tracked expiries",
        value: String(portal.accountantDashboard.expiringDocuments.length),
        helper: "Documents with active expiry monitoring across the firm.",
        tone: "warning" as const,
      },
    ],
    clients: portal.adminClients,
    policies: portal.adminPolicies,
    notifications: portal.accountantDashboard.notifications,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description="Firm-wide visibility for client coverage, policy control, accountant assignments, and operational exceptions."
        eyebrow="Admin control"
        title="Firm operations dashboard"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Client coverage</h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep firm assignments, policy alignment, and month-pack health visible in one place.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {data.clients.map((client) => (
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4" key={client.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{client.clientName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {client.industry} / {client.assignedAccountant}
                    </p>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
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
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Policy watch</h2>
              <p className="mt-1 text-sm text-slate-500">
                Deadline and document rules that shape the portal workflow.
              </p>
            </div>
            <div className="space-y-3">
              {data.policies.map((policy) => (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={policy.id}>
                  <p className="text-sm font-semibold text-slate-950">{policy.name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{policy.description}</p>
                  <p className="mt-3 text-sm text-slate-400">
                    Required by {policy.requiredByDay} / Grace {policy.gracePeriod}
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Operational signals</h2>
              <p className="mt-1 text-sm text-slate-500">
                Shared exceptions that need admin attention.
              </p>
            </div>
            <div className="space-y-3">
              {data.notifications.map((item) => (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.message}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
