import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { CommentThread } from "../../components/workflow/CommentThread";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { DocumentRecord, WorkflowRequest } from "../../types/portal";

type MessageTarget =
  | { id: string; kind: "document"; label: string }
  | { id: string; kind: "request"; label: string };

export function ClientMessagesPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const targets = useMemo<MessageTarget[]>(
    () => [
      ...portal.clientWorkflow.documents.map((document) => ({
        id: document.id,
        kind: "document" as const,
        label: `${document.documentType} / ${document.monthLabel}`,
      })),
      ...portal.clientWorkflow.requests.map((request) => ({
        id: request.id,
        kind: "request" as const,
        label: `Request / ${request.title}`,
      })),
    ],
    [portal.clientWorkflow.documents, portal.clientWorkflow.requests],
  );
  const [selectedTargetId, setSelectedTargetId] = useState(targets[0]?.id ?? "");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const selectedDocument = useMemo<DocumentRecord | null>(
    () =>
      portal.clientWorkflow.documents.find((document) => document.id === selectedTargetId) ??
      null,
    [portal.clientWorkflow.documents, selectedTargetId],
  );
  const selectedRequest = useMemo<WorkflowRequest | null>(
    () =>
      portal.clientWorkflow.requests.find((request) => request.id === selectedTargetId) ??
      null,
    [portal.clientWorkflow.requests, selectedTargetId],
  );

  function handleComment(message: string) {
    if (!user) {
      return { ok: false, message: "You must be signed in to comment." };
    }

    const result = selectedDocument
      ? portal.addDocumentComment(selectedDocument.id, user.fullName, user.role, message)
      : selectedRequest
        ? portal.addRequestComment(selectedRequest.id, user.fullName, user.role, message)
        : { ok: false, message: "Select a document or request first." };

    setFeedbackMessage(result.message);
    return result;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Messages stay attached to the document or request they belong to. Uploads still happen through the structured workflow slot."
        eyebrow="Client messages"
        title="Document and request comments"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Conversation targets</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the exact document or request you want to discuss.
            </p>
          </div>
          <div className="space-y-3">
            {targets.map((target) => (
              <button
                className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                  target.id === selectedTargetId
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-brand-50"
                }`}
                key={target.id}
                onClick={() => setSelectedTargetId(target.id)}
                type="button"
              >
                <p className="text-sm font-semibold">{target.label}</p>
                <p className={`mt-1 text-sm ${target.id === selectedTargetId ? "text-white/75" : "text-slate-500"}`}>
                  {target.kind === "document"
                    ? "Document-specific thread"
                    : "Request-specific thread"}
                </p>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Thread</h2>
            <p className="mt-1 text-sm text-slate-500">
              This thread remains part of the audit-ready workflow for the selected record.
            </p>
          </div>
          <CommentThread
            comments={selectedDocument?.comments ?? selectedRequest?.comments ?? []}
            currentAuthor={user?.fullName ?? "Client user"}
            currentRole="client"
            onSubmitComment={handleComment}
          />
        </SurfaceCard>
      </section>
    </div>
  );
}
