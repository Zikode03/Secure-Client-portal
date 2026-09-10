import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { InboxStatusBadge, type InboxAudience } from "./InboxStatusBadge";

function requestTypeLabel(type: WorkflowRequest["requestType"]) {
  if (type === "missing_document_request") return "Document request";
  if (type === "re_upload_request") return "Document correction";
  if (type === "renewal_request") return "Compliance renewal";
  return "General query";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1.5 break-words text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export function InboxContextDrawer({
  audience,
  isOpen,
  onClose,
  request,
}: {
  audience: InboxAudience;
  isOpen: boolean;
  onClose: () => void;
  request: WorkflowRequest;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30" onClick={onClose} role="presentation">
      <aside
        aria-label="Conversation details"
        className="ml-auto h-full w-full max-w-[380px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Thread context</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Conversation details</h2>
          </div>
          <button
            aria-label="Close conversation details"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-600">Current status</span>
            <InboxStatusBadge audience={audience} status={request.status} />
          </div>
          <Detail label="Client" value={request.clientName} />
          <Detail label="Request type" value={requestTypeLabel(request.requestType)} />
          <Detail label="Assigned to" value={request.assignedTo || "Unassigned"} />
          <Detail label="Priority" value={`${request.priority.charAt(0).toUpperCase()}${request.priority.slice(1)}`} />
          <Detail label="Due date" value={formatDateLabel(request.dueDate)} />
          <Detail label="Period" value={request.monthLabel} />
          <Detail label="Messages" value={String(request.comments.length)} />
          <Detail label="Linked document" value={request.relatedDocumentId || "No document linked"} />
        </div>
      </aside>
    </div>
  );
}
