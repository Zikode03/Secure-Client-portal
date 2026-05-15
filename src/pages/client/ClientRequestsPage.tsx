import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { Modal } from "../../components/ui/Modal";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type { RequestPriority, WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

function ThreadList({
  requests,
  selectedId,
  onSelect,
}: {
  requests: WorkflowRequest[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Inbox threads</h2>
      </div>
      <div className="max-h-[68vh] divide-y divide-slate-100 overflow-y-auto">
        {requests.map((request) => {
          const active = request.id === selectedId;
          const lastComment = request.comments[request.comments.length - 1] ?? null;
          const lastMessage = lastComment?.message;
          const lastActivity = lastComment?.createdAt ?? request.auditTrail[0]?.timestamp ?? request.createdAt;
          const hasUnread = lastComment?.role !== "client" && !["resolved", "closed"].includes(request.status);
          return (
            <button
              className={`w-full px-4 py-3 text-left transition ${active ? "bg-brand-50/40" : "hover:bg-slate-50"}`}
              key={request.id}
              onClick={() => onSelect(request.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{request.title}</p>
                <div className="flex items-center gap-1.5">
                  {hasUnread ? (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-white">
                      Unread
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-medium text-slate-600">
                    {request.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{lastMessage ?? request.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem] text-slate-400">
                <p>Last message {formatDateLabel(lastActivity)}</p>
                <p>Due {formatDateLabel(request.dueDate)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConversationView({
  request,
  messageDraft,
  onChangeMessageDraft,
  onSend,
  currentRole,
}: {
  request: WorkflowRequest;
  messageDraft: string;
  onChangeMessageDraft: (value: string) => void;
  onSend: () => void;
  currentRole: "client" | "accountant" | "admin";
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">{request.priority} priority</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{request.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{request.description}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {request.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="max-h-[48vh] space-y-3 overflow-y-auto px-5 py-4">
        {request.comments.map((comment) => (
          <article
            className={`rounded-xl border px-3.5 py-3 ${
              comment.role === currentRole
                ? "ml-8 border-brand-100 bg-brand-50/70"
                : "mr-8 border-emerald-100 bg-emerald-50/70"
            }`}
            key={comment.id}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-[0.05em] text-slate-600 ring-1 ring-slate-200">
                  {comment.role === "client" ? "Client" : comment.role === "admin" ? "Admin" : "Accountant"}
                </span>
              </div>
              <p className="text-xs text-slate-500">{formatDateLabel(comment.createdAt)}</p>
            </div>
            <p className="mt-2 text-sm text-slate-700">{comment.message}</p>
          </article>
        ))}

        {request.auditTrail.slice(0, 6).map((entry) => (
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3" key={entry.id}>
            <p className="text-sm font-medium text-slate-900">{entry.status}</p>
            {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
            <p className="mt-2 text-xs text-slate-500">{entry.actor} · {formatDateLabel(entry.timestamp)}</p>
          </article>
        ))}
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Reply in thread</p>
        <textarea
          className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeMessageDraft(event.target.value)}
          placeholder="Type your message to your accountant..."
          value={messageDraft}
        />
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={onSend}
            type="button"
          >
            Send message
          </button>
        </div>
      </div>
    </section>
  );
}

function MetaPane({ request, onResolve }: { request: WorkflowRequest; onResolve: () => void }) {
  const canResolve = !["resolved", "closed"].includes(request.status);
  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Thread details</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>Priority: {request.priority}</p>
          <p>Status: {request.status.replace(/_/g, " ")}</p>
          <p>Due: {formatDateLabel(request.dueDate)}</p>
          <p>Requested by: {request.requestedBy}</p>
        </div>
        {canResolve ? (
          <Button className="mt-4 h-9 w-full rounded-lg" onClick={onResolve}>
            Mark resolved
          </Button>
        ) : null}
      </section>
    </aside>
  );
}

export function ClientRequestsPage() {
  const { user } = useAuth();
  const {
    assignedAccountantName,
    createClientRequest,
    dismissFeedbackNotice,
    feedbackNotice,
    replyToRequest,
    requests,
    resolveRequest,
    showFeedbackNotice,
  } = useClientWorkflow();

  const requestModal = useDisclosure();
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestPriority, setRequestPriority] = useState<RequestPriority>("medium");
  const [requestDueDate, setRequestDueDate] = useState(defaultDueDate());

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

  function handleSendMessage() {
    if (!activeRequest || !user) {
      return;
    }

    const message = messageDraft.trim();
    if (!message) {
      showFeedbackNotice("warning", "Message required", "Type a message before sending.");
      return;
    }

    replyToRequest(activeRequest.id, user.role, user.fullName, message);
    setMessageDraft("");
  }

  function handleCreateRequest() {
    if (!user) {
      return;
    }

    const title = requestTitle.trim();
    const description = requestDescription.trim();
    if (!title || !description || !requestDueDate) {
      showFeedbackNotice("danger", "Missing details", "Add subject, details, and due date before sending.");
      return;
    }

    const result = createClientRequest(
      {
        title,
        description,
        dueDate: new Date(requestDueDate).toISOString(),
        priority: requestPriority,
        monthLabel: "Current month",
      },
      user,
    );

    if (result.ok) {
      setRequestTitle("");
      setRequestDescription("");
      setRequestPriority("medium");
      setRequestDueDate(defaultDueDate());
      requestModal.close();
    }
  }

  function handleResolve() {
    if (!activeRequest) {
      return;
    }

    resolveRequest(activeRequest.id);
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-600">Client inbox</p>
            <h1 className="mt-1 text-[1.7rem] font-semibold text-slate-950">Inbox and communication</h1>
            <p className="mt-1 text-sm text-slate-600">
              Talk to {assignedAccountantName}, track thread updates, and request support from one place.
            </p>
          </div>
          <Button className="h-10 rounded-lg" onClick={requestModal.open}>
            New request
          </Button>
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
        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
          <ThreadList onSelect={setSelectedRequestId} requests={orderedRequests} selectedId={activeRequest.id} />
          <ConversationView
            currentRole={user?.role === "admin" ? "admin" : user?.role === "accountant" ? "accountant" : "client"}
            messageDraft={messageDraft}
            onChangeMessageDraft={setMessageDraft}
            onSend={handleSendMessage}
            request={activeRequest}
          />
          <MetaPane onResolve={handleResolve} request={activeRequest} />
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No inbox threads yet</h2>
          <p className="mt-1 text-sm text-slate-600">Start a new conversation with your accountant.</p>
        </section>
      )}

      <Modal
        description={`Send a tracked request to ${assignedAccountantName}.`}
        isOpen={requestModal.isOpen}
        onClose={requestModal.close}
        title="New inbox request"
      >
        <div className="space-y-4">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
            onChange={(event) => setRequestTitle(event.target.value)}
            placeholder="Subject"
            value={requestTitle}
          />
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
            onChange={(event) => setRequestDescription(event.target.value)}
            placeholder="Explain what you need from your accountant."
            value={requestDescription}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
              onChange={(event) => setRequestPriority(event.target.value as RequestPriority)}
              value={requestPriority}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
              onChange={(event) => setRequestDueDate(event.target.value)}
              type="date"
              value={requestDueDate}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button className="h-9 rounded-lg" onClick={requestModal.close} variant="secondary">
              Cancel
            </Button>
            <Button className="h-9 rounded-lg" onClick={handleCreateRequest}>
              Send request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

