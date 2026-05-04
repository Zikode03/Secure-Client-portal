import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { usePortal } from "../../app/portal";

export function AdminTemplatesPage() {
  const portal = usePortal();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Required document templates define what every month pack and compliance collection should contain before work is accepted."
        eyebrow="Admin templates"
        title="Required document templates"
      />

      <SurfaceCard className="space-y-4">
        {portal.adminPolicies.map((policy) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={policy.id}>
            <p className="text-sm font-semibold text-slate-950">{policy.name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{policy.description}</p>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
