import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

interface RequestListSidebarProps {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (id: string) => void;
}

function getPriorityBadgeClass(priority: string): string {
  if (priority === "high") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (priority === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getStatusBadgeClass(status: string): string {
  if (status === "resolved") {
    return "bg-green-50 text-green-700";
  }
  if (status === "awaiting_client") {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-slate-50 text-slate-700";
}

export function RequestListSidebar({
  requests,
  selectedRequestId,
  onSelectRequest,
}: RequestListSidebarProps) {
  return (
    <aside className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Requests ({requests.length})
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-600">No requests yet</p>
            <p className="mt-1 text-xs">Your accountant will send requests here</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {requests.map((request) => (
              <button
                key={request.id}
                onClick={() => onSelectRequest(request.id)}
                className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                  selectedRequestId === request.id
                    ? "border-brand-300 bg-brand-50"
                    : "border-transparent bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex-1 text-sm font-semibold text-slate-950 line-clamp-2">
                    {request.title}
                  </h3>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                      request.comments.length > 0 ? "bg-brand-600" : "bg-slate-300"
                    }`}
                  >
                    {request.comments.length}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-medium ${getPriorityBadgeClass(request.priority)}`}
                  >
                    {request.priority}
                  </span>
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(request.status)}`}
                  >
                    {request.status.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-600">
                  {request.requestedBy} • {formatDateLabel(request.createdAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
