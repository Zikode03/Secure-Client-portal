// Friendly guide: this module (AdminAssignmentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useState } from "react";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Component flow: gather data first, then render a focused UI state.
export function AdminAssignmentsPage() {
  const portal = usePortal();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [feedbackMessage, setFeedbackMessage] = useState("");

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-6">
      <PageHeader
        description="Use this page to assign accountants to clients without leaving the firm operations workflow."
        eyebrow="Admin assignments"
        title="Assign accountants"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-4">
        {portal.adminClients.map((client) => (
          <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_260px_auto]" key={client.id}>
            <div>
              <p className="text-sm font-semibold text-slate-950">{client.clientName}</p>
              <p className="mt-1 text-sm text-slate-500">{client.industry}</p>
            </div>
            <SelectField
              label="Assigned accountant"
              onChange={(event) => {
                const result = portal.assignClientAccountant(client.id, event.target.value);
                setFeedbackMessage(result.message);
              }}
              options={portal.managedAccountants.map((accountant) => ({
                label: accountant.name,
                value: accountant.name,
              }))}
              value={client.assignedAccountant}
            />
            <div className="flex items-end">
              <Button
                onClick={() => setFeedbackMessage(`${client.clientName} is assigned to ${client.assignedAccountant}.`)}
                variant="secondary"
              >
                Confirm
              </Button>
            </div>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}