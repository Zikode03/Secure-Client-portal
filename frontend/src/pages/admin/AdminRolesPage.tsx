import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { getPermissionsForRole } from "../../utils/permissions";
import type { Role } from "../../types/portal";

const roleOrder: Role[] = ["admin", "accountant", "client"];

export function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Frontend role visibility improves product clarity, but backend authorization must still enforce every role and assignment rule."
        eyebrow="Admin roles"
        title="Role permissions"
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {roleOrder.map((role) => (
          <SurfaceCard className="space-y-4" key={role}>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
                {role}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {role === "admin"
                  ? "Full firm control"
                  : role === "accountant"
                    ? "Assigned client scope"
                    : "Own business only"}
              </h2>
            </div>

            <div className="space-y-2">
              {getPermissionsForRole(role).map((permission) => (
                <div
                  className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  key={permission}
                >
                  {permission}
                </div>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
