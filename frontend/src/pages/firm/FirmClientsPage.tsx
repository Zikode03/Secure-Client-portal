import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SelectField } from "../../components/ui/SelectField";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { getScopedClients, hasPermission } from "../../utils/permissions";

export function FirmClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const portal = usePortal();
  const [search, setSearch] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const canManageAssignments = hasPermission(user, "manage:assignments");
  const canManageDeadlineRules = hasPermission(user, "manage:deadline_rules");
  const scopedClients = useMemo(
    () => getScopedClients(user, portal.adminClients),
    [portal.adminClients, user],
  );
  const visibleClients = scopedClients.filter((client) =>
    `${client.clientName} ${client.industry} ${client.assignedAccountant} ${client.requiredPack}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          canManageAssignments ? (
            <Button onClick={() => setFeedbackMessage("Client onboarding will be wired to the admin workflow next.")}>
              Add client
            </Button>
          ) : undefined
        }
        description={
          canManageAssignments
            ? "View all firm clients, keep ownership current, and adjust delivery rules without leaving the shared portal."
            : "See only the clients assigned to your portfolio and open the right workspace quickly."
        }
        eyebrow={canManageAssignments ? "Firm operations" : "My portfolio"}
        title={canManageAssignments ? "Clients" : "My clients"}
      />

      {feedbackMessage ? (
        <div className="rounded-[1.35rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <TextField
          label="Search clients"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by client name, industry, or accountant"
          value={search}
        />

        {visibleClients.length > 0 ? (
          <div className="space-y-4">
            {visibleClients.map((client) => (
              <div
                className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5"
                key={client.id}
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_240px_240px_auto] xl:items-center">
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

                  {canManageAssignments ? (
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
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[0.78rem] font-medium text-slate-500">Assigned accountant</p>
                      <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        {client.assignedAccountant}
                      </div>
                    </div>
                  )}

                  {canManageDeadlineRules ? (
                    <SelectField
                      label="Deadline rule"
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
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[0.78rem] font-medium text-slate-500">Deadline rule</p>
                      <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        {client.deadlinePolicy}
                      </div>
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button
                      className="w-full xl:w-auto"
                      onClick={() => navigate(`/firm/clients/${client.id}`)}
                    >
                      Open workspace
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description={
              canManageAssignments
                ? "No clients match your current search."
                : "No clients have been assigned to you yet."
            }
            title={canManageAssignments ? "No clients found" : "No assigned clients yet"}
          />
        )}
      </SurfaceCard>
    </div>
  );
}
