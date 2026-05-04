import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";

export function AccountantPortfolioPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const visibleClients = useMemo(
    () =>
      portal.adminClients.filter((client) => {
        const assignedToUser =
          client.assignedAccountant === user?.fullName || user?.role === "admin";
        const matchesSearch = `${client.clientName} ${client.industry} ${client.assignedAccountant}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return assignedToUser && matchesSearch;
      }),
    [portal.adminClients, search, user?.fullName, user?.role],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="This portfolio view gives the accountant a clean way to move from client health to the exact workspace, pack, or exception that needs attention."
        eyebrow="Accountant portfolio"
        title="Assigned clients"
      />

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <TextField
            label="Search assigned clients"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by client, industry, or accountant"
            value={search}
          />
          <div className="flex items-end">
            <Button onClick={() => navigate("/accountant/follow-ups")} variant="secondary">
              Open follow-up queue
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {visibleClients.map((client) => (
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5" key={client.id}>
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr_auto]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-950">{client.clientName}</h2>
                    <StatusBadge status={client.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {client.industry} / {client.requiredPack} / {client.deadlinePolicy}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Current month progress</span>
                      <span>{client.completionRate}%</span>
                    </div>
                    <ProgressBar value={client.completionRate} />
                  </div>
                </div>

                <div className="space-y-3 rounded-[1.5rem] border border-white bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">Next action</p>
                  <p className="text-sm leading-6 text-slate-500">
                    {client.status === "overdue"
                      ? "Open the monthly pack and resolve overdue or missing items first."
                      : client.status === "attention"
                        ? "Review the client workspace and send follow-ups where the pack is blocked."
                        : "Open the workspace to continue review or confirm no action is needed."}
                  </p>
                </div>

                <div className="flex flex-col gap-2 xl:items-end">
                  <Button onClick={() => navigate(`/accountant/clients/${client.id}`)}>
                    Open workspace
                  </Button>
                  <Button
                    onClick={() => navigate(`/accountant/clients/${client.id}?tab=packs`)}
                    variant="secondary"
                  >
                    Open month pack
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
