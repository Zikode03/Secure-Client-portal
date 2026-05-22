import { useEffect, useMemo, useState } from "react";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

function priorityBadgeClass(priority: WorkflowRequest["priority"]) {
  if (priority === "high") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (priority === "medium") {
    return "bg-brand-50 text-brand-700 ring-brand-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function ConversationView({ request }: { request: WorkflowRequest }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${priorityBadgeClass(request.priority)}`}>
                {request.priority} priority
              </p>
              <p className="text-[0.72rem] text-slate-500">Due {formatDateLabel(request.dueDate)}</p>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{request.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{request.description}</p>
          </div>
          <div />
        </div>
      </div>

      <div className="bg-slate-50/70 px-5 py-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          This request is a monthly-pack follow-up. Open Monthly Packs to upload or correct the required document.
        </div>
      </div>
    </section>
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

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-600">Client inbox</p>
            <h1 className="mt-1 text-[1.7rem] font-semibold text-slate-950">Inbox and communication</h1>
            <p className="mt-1 text-sm text-slate-600">
              Coordinate with {assignedAccountantName}, stay updated on monthly-pack follow-ups, and respond in one place.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Request threads are created by accountant/admin.
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
        <section>
          <ConversationView request={activeRequest} />
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No inbox threads yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your accountant will open threads here when they need info or follow-up.
          </p>
        </section>
      )}
    </div>
  );
}
