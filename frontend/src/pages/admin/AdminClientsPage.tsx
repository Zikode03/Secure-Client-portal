import { useState } from "react";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SelectField } from "../../components/ui/SelectField";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";

export function AdminClientsPage() {
  const portal = usePortal();
  const clients = portal.adminClients;
  const [search, setSearch] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const visibleClients = clients.filter((client) =>
    `${client.clientName} ${client.industry} ${client.assignedAccountant}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button>Add new client</Button>}
        description="Manage clients, confirm accountant ownership, and keep the right deadline policy attached to the right type of work."
        eyebrow="Admin client management"
        title="Client assignments"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <TextField
            label="Search clients"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, industry, or accountant"
            value={search}
          />
          <div className="flex items-end">
            <Button variant="secondary">Bulk assign</Button>
          </div>
        </div>

        <div className="space-y-4">
          {visibleClients.map((client) => (
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5" key={client.id}>
              <div className="grid gap-5 xl:grid-cols-[1fr_220px_220px]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-950">{client.clientName}</h2>
                    <StatusBadge status={client.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {client.industry} / {client.requiredPack}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Current month progress</span>
                      <span>{client.completionRate}%</span>
                    </div>
                    <ProgressBar value={client.completionRate} />
                  </div>
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
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
