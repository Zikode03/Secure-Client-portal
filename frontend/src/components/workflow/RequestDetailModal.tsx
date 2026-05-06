import type { Role, WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";
import { AuditTrail } from "./AuditTrail";
import { CommentThread } from "./CommentThread";

interface RequestDetailModalProps {
  currentAuthor: string;
  currentRole: Role;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (requestId: string) => void;
  onSubmitComment: (requestId: string, message: string) => { ok: boolean; message: string };
  onUploadRequestedDocument: (request: WorkflowRequest) => void;
  request: WorkflowRequest | null;
}

export function RequestDetailModal({
  currentAuthor,
  currentRole,
  isOpen,
  onClose,
  onResolve,
  onSubmitComment,
  onUploadRequestedDocument,
  request,
}: RequestDetailModalProps) {
  if (!request) {
    return null;
  }

  const canResolve = request.status !== "resolved" && request.status !== "closed";

  return (
    <Modal
      description="Requests stay attached to the monthly pack so the client always knows what the accountant still needs and what will unblock submission."
      isOpen={isOpen}
      onClose={onClose}
      title={request.title}
    >
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{request.clientName}</p>
              <p className="mt-1 text-sm text-slate-500">{request.monthLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {request.priority}
              </span>
              <StatusBadge status={request.status === "resolved" ? "accepted" : "under_review"} />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{request.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>Requested by {request.requestedBy}</span>
            <span>Due {formatDateLabel(request.dueDate)}</span>
            <span>{request.comments.length} comments</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => onUploadRequestedDocument(request)}>
            Upload requested document
          </Button>
          {canResolve ? (
            <Button onClick={() => onResolve(request.id)} variant="secondary">
              Mark as resolved
            </Button>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Request comments</h3>
            <p className="mt-1 text-sm text-slate-500">
              Reply with context here. Corrected files still go through the structured slot.
            </p>
          </div>
          <CommentThread
            comments={request.comments}
            currentAuthor={currentAuthor}
            currentRole={currentRole}
            onSubmitComment={(message) => onSubmitComment(request.id, message)}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Request audit trail</h3>
            <p className="mt-1 text-sm text-slate-500">
              Follow-up history stays visible so the client and accountant can see what happened and when.
            </p>
          </div>
          <AuditTrail entries={request.auditTrail} />
        </div>
      </div>
    </Modal>
  );
}
