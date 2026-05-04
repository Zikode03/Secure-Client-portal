import { usePortal } from "../../app/portal";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AdminCompliancePage() {
  const portal = usePortal();
  const clientStatuses = portal.accountantComplianceCentre.clientStatuses ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        description="Firm-wide compliance health shows which clients are missing required records, carrying expiries, or falling behind the controlled workflow."
        eyebrow="Admin compliance"
        title="Firm-wide compliance dashboard"
      />

      <SurfaceCard className="space-y-4">
        {clientStatuses.map((client) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={client.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{client.clientName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Report ready {client.reportReadyAt}
                </p>
              </div>
              <p className="text-2xl font-semibold text-slate-950">{client.score}%</p>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {client.expiredCount} expired / {client.expiringSoonCount} expiring soon / {client.missingRequiredCount} missing required
            </p>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
