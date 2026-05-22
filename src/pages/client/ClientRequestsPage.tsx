import { useEffect, useMemo, useState } from "react";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import { CommentThread } from "../../components/workflow/CommentThread";
import { RequestListSidebar } from "../../components/workflow/RequestListSidebar";
import { ReplyInput } from "../../components/workflow/ReplyInput";
import { portalServiceApi } from "../../services/portalApi";
import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel, formatDateTimeLabel } from "../../utils/formatters";
import { Button } from "../../components/ui/Button";

function priorityBadgeClass(priority: WorkflowRequest["priority"]) {
  if (priority === "high") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (priority === "medium") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusBadgeClass(status: string) {
  if (status === "resolved") {
    return "bg-green-50 text-green-700 ring-green-200";
  }
  if (status === "awaiting_client") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getRequestTypeLabel(requestType?: string): string {
  if (requestType === "monthly_pack_follow_up") return "Monthly Pack Follow-up";
  if (requestType === "document_review") return "Document Review";
  if (requestType === "compliance_item") return "Compliance Item";
  return "Request";
}

function getDaysUntilDue(dueDate: string): { days: number; status: "overdue" | "due_soon" | "on_track" } {
  const due = new Date(dueDate);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { days: Math.abs(days), status: "overdue" };
  if (days <= 3) return { days, status: "due_soon" };
  return { days, status: "on_track" };
}

function RequestDetailView({ request, onReply, isLoadingReply }: { 
  request: WorkflowRequest; 
  onReply: (message: string) => Promise<{ ok: boolean; message: string }>;
  isLoadingReply: boolean;
}) {
  const { days, status } = getDaysUntilDue(request.dueDate);
  const dueDateColor = status === "overdue" ? "text-red-600" : status === "due_soon" ? "text-amber-600" : "text-slate-600";

  return (
    <div className="space-y-5">
      {/* Request Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset ${priorityBadgeClass(request.priority)}`}>
                  {request.priority} priority
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset ${statusBadgeClass(request.status)}`}>
                  {request.status.replace(/_/g, " ")}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-950">{request.title}</h1>
              <p className="mt-2 text-slate-600">{request.description}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">From</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{request.requestedBy}</p>
              <p className="text-xs text-slate-500 capitalize">{request.requestedByRole}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Created</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTimeLabel(request.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Due</p>
              <p className={`mt-1 text-sm font-medium ${dueDateColor}`}>
                {formatDateLabel(request.dueDate)}
              </p>
              <p className={`text-xs ${status === "overdue" ? "text-red-600" : status === "due_soon" ? "text-amber-600" : "text-slate-500"}`}>
                {status === "overdue" ? `${days} days overdue` : `${days} days left`}
              </p>
            </div>
            {request.requestType && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Type</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{getRequestTypeLabel(request.requestType)}</p>
              </div>
            )}
            {request.monthLabel && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Month</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{request.monthLabel}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comments Thread */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Conversation ({request.comments.length})</h2>
        <CommentThread
          comments={request.comments}
          currentRole="client"
          currentAuthor="You"
          emptyTitle="No replies yet"
          emptyDescription="Start the conversation below. Your accountant will see your response."
          composerLabel="Reply to request"
          composerPlaceholder="Type your reply here..."
          submitLabel="Send reply"
          onSubmitComment={(message) => {
            // Will be connected to API in integration phase
            console.log("Reply:", message);
            return { ok: true, message: "" };
          }}
        />
      </section>

      {/* Reply Input */}
      <ReplyInput
        onSubmit={onReply}
        placeholder="Share your thoughts, ask clarifying questions, or provide the information requested..."
        label="Your reply"
        isLoading={isLoadingReply}
      />

      {/* Action Buttons */}
      {request.status !== "resolved" && (
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <Button variant="secondary">Mark as resolved</Button>
          <Button variant="secondary">Archive request</Button>
        </div>
      )}
    </div>
  );
}

export function ClientRequestsPage() {
  const {
    assignedAccountantName,
    dismissFeedbackNotice,
    feedbackNotice,
    requests,
  } = useClientWorkflow();
  
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  
  const orderedRequests = useMemo(
    () => [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests],
  );

  const activeRequest = useMemo(
    () => orderedRequests.find((request) => request.id === selectedRequestId) ?? orderedRequests[0] ?? null,
    [orderedRequests, selectedRequestId],
  );

  useEffect(() => {
    if (!orderedRequests.length) {
      setSelectedRequestId("");
      return;
    }

    if (!orderedRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(orderedRequests[0].id);
    }
  }, [orderedRequests, selectedRequestId]);

  async function handleReplySubmit(message: string) {
    if (!activeRequest) {
      return { ok: false, message: "No request selected" };
    }

    setLoadingReply(true);
    try {
      // TODO: Call API endpoint to add comment
      // const result = await portalServiceApi.addRequestComment(activeRequest.id, message);
      
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 500));
      return { ok: true, message: "Reply sent" };
    } catch (error) {
      return { ok: false, message: "Failed to send reply" };
    } finally {
      setLoadingReply(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-600">Client workspace</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Inbox & Communication</h1>
            <p className="mt-1 text-sm text-slate-600">
              Collaborate with {assignedAccountantName}, respond to requests, and track all communication in one place.
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            {orderedRequests.length} {orderedRequests.length === 1 ? "request" : "requests"}
          </div>
        </div>
      </header>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      {orderedRequests.length > 0 && activeRequest ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          {/* Sidebar - Request List */}
          <div className="lg:col-span-1">
            <RequestListSidebar
              requests={orderedRequests}
              selectedRequestId={activeRequest.id}
              onSelectRequest={setSelectedRequestId}
            />
          </div>

          {/* Main - Request Detail */}
          <div className="lg:col-span-3">
            <RequestDetailView
              request={activeRequest}
              onReply={handleReplySubmit}
              isLoadingReply={loadingReply}
            />
          </div>
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No inbox threads yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your accountant will open threads here when they need info, follow-up, or want to discuss next steps.
          </p>
        </section>
      )}
    </div>
  );
}
