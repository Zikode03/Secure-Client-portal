import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

import { usePortal } from "../../app/portal";

export function AdminAccountantsPage() {
  const portal = usePortal();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Track accountant capacity, open review volume, and whether anyone needs rebalancing before month-end pressure rises."
        eyebrow="Admin accountants"
        title="Manage accountants"
      />

      <SurfaceCard className="space-y-4">
        {portal.managedAccountants.map((accountant) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={accountant.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{accountant.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {accountant.title} / {accountant.email}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {accountant.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {accountant.assignedClientCount} assigned clients / {accountant.openReviews} open reviews
            </p>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
