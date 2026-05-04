import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { DocumentPreviewPane } from "../../components/workflow/DocumentPreviewPane";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { formatDateLabel } from "../../utils/formatters";

export function AccountantReviewPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const queue = portal.getReviewQueue();
  const [selectedRecordId, setSelectedRecordId] = useState(queue[0]?.id ?? "");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const selectedDocument = useMemo(
    () => portal.getReviewRecord(selectedRecordId),
    [portal, selectedRecordId],
  );

  function handleAction(action: "accepted" | "rejected" | "under_review") {
    const result = portal.reviewRecord({
      recordId: selectedRecordId,
      action,
      reviewer: user?.fullName ?? "Accountant",
      reason: reviewReason,
    });
    setReviewMessage(result.message);
  }

  function handleComment(message: string) {
    const result = portal.addDocumentComment(
      selectedDocument.id,
      user?.fullName ?? "Accountant",
      "accountant",
      message,
    );
    setReviewMessage(result.message);
    return result;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review one record at a time, leave file-specific feedback, and move the lifecycle forward without losing the audit trail."
        eyebrow="Accountant review desk"
        title="Document review workspace"
      />

      <SurfaceCard className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a document or invoice to inspect. The preview, comments, and audit trail all update together.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {queue.map((item) => (
            <button
              className={`rounded-[1.75rem] border p-4 text-left transition ${
                selectedRecordId === item.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-brand-50"
              }`}
              key={item.id}
              onClick={() => setSelectedRecordId(item.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{item.clientName}</p>
                <StatusBadge status={item.status} />
              </div>
              <p
                className={`mt-2 text-sm ${
                  selectedRecordId === item.id ? "text-white/75" : "text-slate-500"
                }`}
              >
                {item.documentType} / {item.monthLabel}
              </p>
              <p
                className={`mt-2 text-sm ${
                  selectedRecordId === item.id ? "text-white/60" : "text-slate-400"
                }`}
              >
                Submitted {formatDateLabel(item.submittedAt)}
              </p>
            </button>
          ))}
        </div>
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <DocumentPreviewPane document={selectedDocument} />

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Record details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Status actions are controlled here so the lifecycle stays consistent across review.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Uploaded by</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{selectedDocument.uploadedBy}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDateLabel(selectedDocument.uploadedAt)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Reviewed by</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {selectedDocument.reviewedBy ?? "Unassigned"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedDocument.reviewedAt
                    ? formatDateLabel(selectedDocument.reviewedAt)
                    : "Waiting"}
                </p>
              </div>
            </div>

            <TextAreaField
              hint="This is required when rejecting a document."
              label="Review reason"
              onChange={(event) => setReviewReason(event.target.value)}
              placeholder="Explain what is missing or what should happen next."
              value={reviewReason}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => handleAction("accepted")}>Accept document</Button>
              <Button onClick={() => handleAction("under_review")} variant="secondary">
                Mark as under review
              </Button>
              <Button onClick={() => handleAction("rejected")} variant="danger">
                Reject with reason
              </Button>
            </div>

            {reviewMessage ? (
              <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
                {reviewMessage}
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Record comments</h2>
              <p className="mt-1 text-sm text-slate-500">
                No general chat. Every note stays tied to the file that caused the question.
              </p>
            </div>
            <CommentThread
              comments={selectedDocument.comments}
              currentAuthor={user?.fullName ?? "Accountant"}
              currentRole="accountant"
              onSubmitComment={handleComment}
            />
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Audit trail</h2>
              <p className="mt-1 text-sm text-slate-500">
                Uploaded by, reviewed by, and every status handoff is visible here.
              </p>
            </div>
            <AuditTrail entries={selectedDocument.auditTrail} />
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
