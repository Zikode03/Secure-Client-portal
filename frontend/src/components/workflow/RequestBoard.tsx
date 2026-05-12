import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

interface RequestBoardProps {
  title: string;
  description: string;
  requests: WorkflowRequest[];
  onOpenRequest: (request: WorkflowRequest) => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function RequestBoard({
  actionLabel,
  description,
  onAction,
  onOpenRequest,
  requests,
  title,
}: RequestBoardProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="secondary">
            {actionLabel}
          </Button>
        ) : null}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          description="This queue will fill when follow-up work or clarification requests are created."
          title="No requests are open"
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <button
              className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
              key={request.id}
              onClick={() => onOpenRequest(request)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{request.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {request.requestedByRole === "client"
                      ? `Client request from ${request.requestedBy}`
                      : `${request.clientName} / ${request.monthLabel}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {request.priority}
                  </span>
                  <StatusBadge status={request.status === "resolved" ? "accepted" : "under_review"} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{request.description}</p>
              <p className="mt-3 text-sm text-slate-400">
                Due {formatDateLabel(request.dueDate)} / {request.comments.length} comments / {request.requestedByRole === "client" ? `Assigned to ${request.assignedTo}` : request.monthLabel}
              </p>
            </button>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
