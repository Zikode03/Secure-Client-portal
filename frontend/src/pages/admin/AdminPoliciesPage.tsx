import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";

export function AdminPoliciesPage() {
  const portal = usePortal();
  const policies = portal.adminPolicies;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button>Save policy changes</Button>}
        description="Document requirements and deadlines shape the whole portal. This is where the firm decides what every month pack must contain."
        eyebrow="Admin policies"
        title="Required documents and deadline rules"
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <SurfaceCard className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Current policies</h2>
            <p className="mt-1 text-sm text-slate-500">
              These rules are reflected directly in the UI so clients and accountants see the same expectations.
            </p>
          </div>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5" key={policy.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">{policy.name}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {policy.owner}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{policy.description}</p>
                <p className="mt-3 text-sm text-slate-400">
                  Required by {policy.requiredByDay} / Grace period {policy.gracePeriod}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Create or adjust a rule</h2>
            <p className="mt-1 text-sm text-slate-500">
              This form is ready for backend wiring once the policy service is available.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Policy name" placeholder="Monthly VAT pack" />
            <TextField label="Required by day" placeholder="6th working day" />
            <TextField label="Grace period" placeholder="2 business days" />
            <TextField label="Rule owner" placeholder="Operations" />
          </div>

          <TextAreaField
            label="Required document details"
            placeholder="Bank statement, sales invoices, expense invoices, signed filing authorisation, VAT working papers..."
          />

          <TextAreaField
            label="Workflow notes"
            placeholder="Explain what should block month completion and what the review team should enforce."
          />
        </SurfaceCard>
      </section>
    </div>
  );
}
