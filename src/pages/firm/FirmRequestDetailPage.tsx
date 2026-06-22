// Friendly guide: this module (FirmRequestDetailPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedRequests } from "../../utils/permissions";

// Component flow: gather data first, then render a focused UI state.
export function FirmRequestDetailPage() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const portal = usePortal();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [comment, setComment] = useState("");
  const [flash, setFlash] = useState("");

  const allRequests = useMemo(
    () => portal.adminClients.flatMap((client) => portal.getClientWorkspace(client.id).requests),
    [portal],
  );

  const scoped = useMemo(
    () => getScopedRequests(user, allRequests, portal.adminClients),
    [allRequests, portal.adminClients, user],
  );

  const request = scoped.find((item) => item.id === requestId) ?? null;

  function postComment() {
    if (!request || !user) {
      return;
    }

    const result = portal.addRequestComment(request.id, user.fullName, user.role, comment);
    setFlash(result.message);
    if (result.ok) {
      setComment("");
    }
  }

  function resolve() {
    if (!request || !user) {
      return;
    }

    const result = portal.resolveRequest(request.id, user.fullName);
    setFlash(result.message);
  }

  function addActionNote(action: "escalate" | "reassign") {
    if (!request || !user) {
      return;
    }

    const template =
      action === "escalate"
        ? "Escalation requested: SLA risk or blocker identified. Please prioritize."
        : "Reassignment suggested: please review ownership and assign another accountant.";
    const result = portal.addRequestComment(request.id, user.fullName, user.role, template);
    setFlash(result.message);
  }

  if (!request) {
// Render output: this is the visual state users interact with.
    return (
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <EmptyState
          title="Request not found"
          description="The request may be outside your scope or no longer available."
        />
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4">
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Inbox item detail</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{request.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {request.clientName} · {request.monthLabel} · {request.id}
            </p>
          </div>
          <Link
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            to="/firm/inbox"
          >
            Back to inbox
          </Link>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
        <p className="mt-2 text-sm text-slate-700">{request.description}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{request.status.replace(/_/g, " ")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Priority</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{request.priority}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Due</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateLabel(request.dueDate)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Assigned</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{request.assignedTo}</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
        <div className="mt-3 space-y-3">
          {request.auditTrail.map((entry) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={entry.id}>
              <p className="text-sm font-medium text-slate-900">{entry.status}</p>
              {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
              <p className="mt-1 text-xs text-slate-500">
                {entry.actor} · {formatDateLabel(entry.timestamp)}
              </p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button className="h-10 rounded-xl" onClick={resolve}>
            Mark resolved
          </Button>
          <Button className="h-10 rounded-xl" onClick={() => addActionNote("escalate")} variant="secondary">
            Escalate
          </Button>
          <Button className="h-10 rounded-xl" onClick={() => addActionNote("reassign")} variant="secondary">
            Reassign note
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="request-comment-input">
            Add comment
          </label>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            id="request-comment-input"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Write an update for this request thread."
            value={comment}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Posting as {user?.fullName ?? "Unknown user"}</p>
            <Button className="h-9 rounded-xl px-3" onClick={postComment} size="sm">
              Post comment
            </Button>
          </div>
        </div>
        {flash ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {flash}
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
