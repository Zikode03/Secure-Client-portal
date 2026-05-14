// Friendly guide: this module (FirmClient360Page) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

// Component flow: gather data first, then render a focused UI state.
export function FirmClient360Page() {
  const { clientId } = useParams();
  const portal = usePortal();

  const workspace = useMemo(() => {
    if (!clientId) {
      return null;
    }

    return portal.getClientWorkspace(clientId);
  }, [clientId, portal]);

  if (!workspace) {
// Render output: this is the visual state users interact with.
    return (
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <EmptyState title="Client not found" description="No client profile is available for this route." />
      </SurfaceCard>
    );
  }

  const openRequests = workspace.requests.filter((request) => !["resolved", "closed"].includes(request.status));

  return (
    <div className="space-y-4">
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h1 className="text-xl font-semibold text-slate-950">Client 360 Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Business, compliance, requests, and risk in one workspace.</p>
      </SurfaceCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Business Profile</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Client</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{workspace.client.clientName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Industry</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{workspace.client.industry}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Accountant</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{workspace.client.assignedAccountant}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Completion</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{workspace.client.completionRate}%</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
          <h2 className="text-sm font-semibold text-slate-900">Compliance Profile</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>Score: {workspace.compliance?.score ?? "N/A"}</p>
            <p>Expired: {workspace.compliance?.expiredCount ?? 0}</p>
            <p>Expiring: {workspace.compliance?.expiringCount ?? 0}</p>
            <p>Missing required: {workspace.compliance?.missingRequiredCount ?? 0}</p>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Open Requests</h2>
        <div className="mt-3 space-y-2">
          {openRequests.map((request) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={request.id}>
              <p className="text-sm font-semibold text-slate-900">{request.title}</p>
              <p className="text-xs text-slate-500">{request.status.replace(/_/g, " ")} · Due {formatDateLabel(request.dueDate)}</p>
            </div>
          ))}
          {openRequests.length === 0 ? <p className="text-sm text-slate-500">No open requests.</p> : null}
        </div>
      </SurfaceCard>
    </div>
  );
}