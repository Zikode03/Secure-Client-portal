// Friendly guide: this module (AdminAssignmentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Component flow: gather data first, then render a focused UI state.
export function AdminAssignmentsPage() {
  const navigate = useNavigate();
  const portal = usePortal();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [handoverByClientId, setHandoverByClientId] = useState<
    Record<string, { reason: string; message: string; effectiveDate: string }>
  >({});

  function getHandover(clientId: string) {
    return (
      handoverByClientId[clientId] ?? {
        reason: "",
        message: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      }
    );
  }

  function updateHandover(
    clientId: string,
    key: "reason" | "message" | "effectiveDate",
    value: string,
  ) {
    const current = getHandover(clientId);
    setHandoverByClientId((state) => ({
      ...state,
      [clientId]: {
        ...current,
        [key]: value,
      },
    }));
  }

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
          <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_220px_220px_auto]" key={client.id}>
            <div>
              <p className="text-sm font-semibold text-slate-950">{client.clientName}</p>
              <p className="mt-1 text-sm text-slate-500">{client.industry}</p>
              <p className="mt-1 text-xs text-slate-500">
                Backup: {client.backupAccountant ?? "None"} / {(client.isActive ?? true) ? "Active" : "Inactive"}
              </p>
              {client.lastAssignmentReason ? (
                <p className="mt-2 text-xs text-slate-500">
                  Last handover: {client.lastAssignmentReason} / {client.lastAssignmentEffectiveDate?.slice(0, 10)} by {client.lastAssignmentBy}
                </p>
              ) : null}
            </div>
            <SelectField
              label="Primary accountant"
              onChange={(event) => {
                const selectedAccountant = portal.managedAccountants.find(
                  (accountant) => accountant.id === event.target.value,
                );
                const handover = getHandover(client.id);
                if (!handover.reason.trim() || !handover.message.trim() || !handover.effectiveDate) {
                  setFeedbackMessage("Provide assignment reason, handover message, and effective date before assigning.");
                  return;
                }
                const result = portal.assignClientAccountant(
                  client.id,
                  selectedAccountant?.name ?? event.target.value,
                  selectedAccountant?.id,
                  {
                    reason: handover.reason.trim(),
                    message: handover.message.trim(),
                    effectiveDate: new Date(handover.effectiveDate).toISOString(),
                    assignedBy: "Admin",
                  },
                );
                setFeedbackMessage(result.message);
              }}
              options={portal.managedAccountants.map((accountant) => ({
                label: accountant.name,
                value: accountant.id,
              })).concat([{ label: "Unassigned", value: "" }])}
              value={
                client.assignedAccountantUserId ??
                portal.managedAccountants.find(
                  (accountant) => accountant.name === client.assignedAccountant,
                )?.id ??
                ""
              }
            />
            <SelectField
              label="Backup accountant"
              onChange={(event) => {
                const selectedAccountant = portal.managedAccountants.find(
                  (accountant) => accountant.id === event.target.value,
                );
                const result = portal.assignClientAccountantBackup(
                  client.id,
                  selectedAccountant?.name ?? event.target.value,
                  selectedAccountant?.id,
                );
                setFeedbackMessage(result.message);
              }}
              options={[
                { label: "None", value: "" },
                ...portal.managedAccountants.map((accountant) => ({
                  label: accountant.name,
                  value: accountant.id,
                })),
              ]}
              value={client.backupAccountantUserId ?? ""}
            />
            <div className="flex items-end">
              <Button
                onClick={() => navigate(`/firm/clients/${client.id}`)}
                variant="secondary"
              >
                Open client
              </Button>
            </div>
            <div className="md:col-span-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_180px]">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => updateHandover(client.id, "reason", event.target.value)}
                placeholder="Assignment reason (required)"
                value={getHandover(client.id).reason}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => updateHandover(client.id, "message", event.target.value)}
                placeholder="Message to accountant (required)"
                value={getHandover(client.id).message}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => updateHandover(client.id, "effectiveDate", event.target.value)}
                type="date"
                value={getHandover(client.id).effectiveDate}
              />
            </div>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
