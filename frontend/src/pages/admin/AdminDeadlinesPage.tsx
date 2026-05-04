import { useState } from "react";
import { usePortal } from "../../app/portal";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AdminDeadlinesPage() {
  const portal = usePortal();
  const [feedbackMessage, setFeedbackMessage] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Deadline rules shape when clients are late, when accountants escalate, and when months become overdue."
        eyebrow="Admin deadlines"
        title="Deadline rules"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-4">
        {portal.adminClients.map((client) => (
          <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_260px]" key={client.id}>
            <div>
              <p className="text-sm font-semibold text-slate-950">{client.clientName}</p>
              <p className="mt-1 text-sm text-slate-500">{client.requiredPack}</p>
            </div>
            <SelectField
              label="Deadline policy"
              onChange={(event) => {
                const result = portal.updateClientDeadlinePolicy(client.id, event.target.value);
                setFeedbackMessage(result.message);
              }}
              options={[
                { label: "5th working day", value: "5th working day" },
                { label: "6th working day", value: "6th working day" },
                { label: "7th working day", value: "7th working day" },
              ]}
              value={client.deadlinePolicy}
            />
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
