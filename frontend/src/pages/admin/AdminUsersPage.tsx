import { usePortal } from "../../app/portal";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AdminUsersPage() {
  const portal = usePortal();

  return (
    <div className="space-y-6">
      <PageHeader
        description="This user list keeps roles, client access, and account status visible for governance and audit readiness."
        eyebrow="Admin users"
        title="User management"
      />

      <SurfaceCard className="space-y-4">
        {portal.userAccounts.map((user) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={user.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {user.email} / {user.role}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {user.status}
              </span>
            </div>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
