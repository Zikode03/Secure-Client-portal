import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { RequestBoard } from "../../components/workflow/RequestBoard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

export function ClientRequestsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [selectedRequestId, setSelectedRequestId] = useState(
    portal.clientWorkflow.requests[0]?.id ?? "",
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const selectedRequest = useMemo(
    () =>
      portal.clientWorkflow.requests.find((request) => request.id === selectedRequestId) ??
      portal.clientWorkflow.requests[0] ??
      null,
    [portal.clientWorkflow.requests, selectedRequestId],
  );

  function handleComment(message: string) {
    if (!selectedRequest || !user) {
      return { ok: false, message: "Select a request before replying." };
    }

    const result = portal.addRequestComment(
      selectedRequest.id,
      user.fullName,
      user.role,
      message,
    );
    setFeedbackMessage(result.message);
    return result;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Requests are task-based and document-based. They tell the client exactly what the accountant still needs and when it is due."
        eyebrow="Client requests"
        title="My requests and tasks"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <RequestBoard
          description="These requests keep the workflow moving without turning the portal into an unstructured chat system."
          onOpenRequest={(request) => setSelectedRequestId(request.id)}
          requests={portal.clientWorkflow.requests}
          title="Open workflow requests"
        />

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Request detail</h2>
              <p className="mt-1 text-sm text-slate-500">
                Reply here when the requested document has been corrected or when extra context is needed.
              </p>
            </div>
            {selectedRequest ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{selectedRequest.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedRequest.description}</p>
                <p className="mt-3 text-sm text-slate-400">
                  Due {formatDateLabel(selectedRequest.dueDate)} / Requested by {selectedRequest.requestedBy}
                </p>
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Request comments</h2>
              <p className="mt-1 text-sm text-slate-500">
                Reply with context here. Corrected files must still be uploaded through the structured slot.
              </p>
            </div>
            {selectedRequest ? (
              <CommentThread
                comments={selectedRequest.comments}
                currentAuthor={user?.fullName ?? "Client user"}
                currentRole="client"
                onSubmitComment={handleComment}
              />
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Request audit trail</h2>
              <p className="mt-1 text-sm text-slate-500">
                Follow-up history stays visible so the client and accountant can see what happened and when.
              </p>
            </div>
            {selectedRequest ? <AuditTrail entries={selectedRequest.auditTrail} /> : null}
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
