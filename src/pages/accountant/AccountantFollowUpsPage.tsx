import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import type { FirmClientAccount, WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedRequests } from "../../utils/permissions";

type ThreadSort = "newest" | "oldest" | "needs_action";
type ThreadFilter = "all" | "unread" | "awaiting_me" | "resolved";

function defaultInboxDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

function statusChipClass(status: WorkflowRequest["status"]) {
  if (status === "open") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "awaiting_client") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "resolved" || status === "closed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function trailingClientUnreadCount(request: WorkflowRequest) {
  let count = 0;
  for (let index = request.comments.length - 1; index >= 0; index -= 1) {
    if (request.comments[index].role !== "client") {
      break;
    }
    count += 1;
  }
  return count;
}

function relativeTimeLabel(value: string) {
  const now = Date.now();
  const time = new Date(value).getTime();
  const minutes = Math.max(0, Math.floor((now - time) / (1000 * 60)));
  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dueHint(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Overdue ${Math.abs(diffDays)}d`, className: "text-rose-600" };
  }
  if (diffDays === 0) {
    return { label: "Due today", className: "text-amber-600" };
  }
  return { label: `Due in ${diffDays}d`, className: "text-slate-500" };
}

function ClientListPanel({
  clients,
  selectedClientId,
  onSelectClient,
}: {
  clients: FirmClientAccount[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
}) {
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Clients</h2>
        <p className="text-xs text-slate-500">Inbox workspace</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {clients.map((client) => {
          const active = client.id === selectedClientId;
          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-brand-300 bg-brand-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{client.clientName}</p>
                <span className="text-xs text-slate-500">{client.completionRate}%</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{client.status.replace(/_/g, " ")}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ThreadListPane({
  requests,
  selectedRequestId,
  onSelect,
  searchValue,
  onChangeSearchValue,
  filter,
  onChangeFilter,
  sort,
  onChangeSort,
  selectedClientName,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelect: (requestId: string) => void;
  searchValue: string;
  onChangeSearchValue: (value: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  sort: ThreadSort;
  onChangeSort: (value: ThreadSort) => void;
  selectedClientName: string;
}) {
  const totalUnread = requests.reduce((sum, request) => sum + trailingClientUnreadCount(request), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="space-y-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Threads</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-600">
            {totalUnread} new
          </span>
        </div>

        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeSearchValue(event.target.value)}
          placeholder="Search subject, client, sender..."
          value={searchValue}
        />

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all" as const, label: "All" },
            { id: "unread" as const, label: "Unread" },
            { id: "awaiting_me" as const, label: "Awaiting me" },
            { id: "resolved" as const, label: "Resolved" },
          ].map((item) => (
            <button
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                filter === item.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              key={item.id}
              onClick={() => onChangeFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-500">Sort</span>
          {[
            { id: "newest" as const, label: "Newest" },
            { id: "oldest" as const, label: "Oldest" },
            { id: "needs_action" as const, label: "Needs my action" },
          ].map((item) => (
            <button
              className={`rounded-full px-2.5 py-1 font-medium transition ${
                sort === item.id ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
              }`}
              key={item.id}
              onClick={() => onChangeSort(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[66vh] divide-y divide-slate-100 overflow-y-auto">
        {requests.map((request) => {
          const active = request.id === selectedRequestId;
          const lastComment = request.comments[request.comments.length - 1] ?? null;
          const lastActivity =
            lastComment?.createdAt ?? request.auditTrail[0]?.timestamp ?? request.createdAt;
          const unreadCount = trailingClientUnreadCount(request);
          const counterparty =
            lastComment?.role === "client"
              ? "From Client"
              : `From ${lastComment?.author ?? selectedClientName}`;
          const dueMeta = dueHint(request.dueDate);

          return (
            <button
              className={`relative w-full px-4 py-3 text-left transition ${
                active ? "bg-brand-50/40 shadow-[inset_3px_0_0_0_#4f46e5]" : "hover:bg-slate-50"
              }`}
              key={request.id}
              onClick={() => onSelect(request.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{request.title}</p>
                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 ? (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-white">
                      {unreadCount} new
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.68rem] font-medium ring-1 ring-inset ${statusChipClass(
                      request.status,
                    )}`}
                  >
                    {request.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {lastComment?.message ?? request.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem] text-slate-400">
                <p title={formatDateLabel(lastActivity)}>Last activity {relativeTimeLabel(lastActivity)}</p>
                <p>{counterparty}</p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[0.72rem]">
                <p className={dueMeta.className}>{dueMeta.label}</p>
                <p className="text-slate-400">Due {formatDateLabel(request.dueDate)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConversationPane({
  request,
  notice,
  messageDraft,
  onChangeMessageDraft,
  onSendMessage,
  currentRole,
}: {
  request: WorkflowRequest;
  notice: string;
  messageDraft: string;
  onChangeMessageDraft: (value: string) => void;
  onSendMessage: () => void;
  currentRole: "admin" | "accountant" | "client";
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">
              {request.priority} priority
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{request.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{request.description}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {request.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="max-h-[48vh] space-y-3 overflow-y-auto px-5 py-4">
        {request.comments.length > 0
          ? request.comments.map((comment) => (
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
            ))
          : null}

        {request.auditTrail.slice(0, 8).map((item) => (
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3" key={item.id}>
            <p className="text-sm font-medium text-slate-900">{item.status}</p>
            {item.note ? <p className="mt-1 text-sm text-slate-600">{item.note}</p> : null}
            <p className="mt-2 text-xs text-slate-500">{item.actor} · {formatDateLabel(item.timestamp)}</p>
          </article>
        ))}
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        {notice ? (
          <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {notice}
          </p>
        ) : null}
        <p className="mb-2 text-sm font-semibold text-slate-900">Reply to client</p>
        <textarea
          className="min-h-[98px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeMessageDraft(event.target.value)}
          placeholder="Type your message to the client..."
          value={messageDraft}
        />
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={onSendMessage}
            type="button"
          >
            Send message
          </button>
        </div>
      </div>
    </section>
  );
}

function MetaPane({ request }: { request: WorkflowRequest }) {
  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Thread details</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>Priority: {request.priority}</p>
          <p>Status: {request.status.replace(/_/g, " ")}</p>
          <p>Due: {formatDateLabel(request.dueDate)}</p>
          <p>Month: {request.monthLabel}</p>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Create document request</h3>
        <p className="mt-1 text-xs text-slate-500">Use the composer below to request missing files from the client.</p>
      </section>
    </aside>
  );
}

function NewRequestComposer({
  subject,
  details,
  dueDate,
  onChangeSubject,
  onChangeDetails,
  onChangeDueDate,
  onSend,
}: {
  subject: string;
  details: string;
  dueDate: string;
  onChangeSubject: (value: string) => void;
  onChangeDetails: (value: string) => void;
  onChangeDueDate: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">New document request</h3>
      <div className="mt-3 space-y-3">
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeSubject(event.target.value)}
          placeholder="Subject"
          value={subject}
        />
        <textarea
          className="min-h-[96px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeDetails(event.target.value)}
          placeholder="Explain what document is needed and why."
          value={details}
        />
        <input
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeDueDate(event.target.value)}
          type="date"
          value={dueDate}
        />
        <button
          className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          onClick={onSend}
          type="button"
        >
          Send request
        </button>
      </div>
    </section>
  );
}

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [user, portal.adminClients]);

  const [selectedClientId, setSelectedClientId] = useState(scopedClients[0]?.id ?? "");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [newRequestSubject, setNewRequestSubject] = useState("");
  const [newRequestDetails, setNewRequestDetails] = useState("");
  const [newRequestDueDate, setNewRequestDueDate] = useState(defaultInboxDueDate());
  const [inboxNotice, setInboxNotice] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [threadSort, setThreadSort] = useState<ThreadSort>("newest");

  const selectedClient = useMemo(
    () => scopedClients.find((client) => client.id === selectedClientId) ?? scopedClients[0] ?? null,
    [scopedClients, selectedClientId],
  );

  const selectedWorkspace = useMemo(() => {
    if (!selectedClient) {
      return null;
    }

    return portal.getClientWorkspace(selectedClient.id);
  }, [portal, selectedClient]);

  const scopedRequests = useMemo(() => {
    if (!selectedWorkspace) {
      return [] as WorkflowRequest[];
    }

    return getScopedRequests(user, selectedWorkspace.requests, portal.adminClients);
  }, [portal.adminClients, selectedWorkspace, user]);

  const visibleRequests = useMemo(() => {
    const normalizedSearch = threadSearch.trim().toLowerCase();
    const filtered = scopedRequests.filter((request) => {
      const unreadCount = trailingClientUnreadCount(request);
      const awaitingMe =
        request.status !== "resolved" &&
        request.status !== "closed" &&
        request.status !== "awaiting_client";

      if (threadFilter === "unread" && unreadCount === 0) {
        return false;
      }
      if (threadFilter === "awaiting_me" && !awaitingMe) {
        return false;
      }
      if (threadFilter === "resolved" && !["resolved", "closed"].includes(request.status)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const latestAuthor = request.comments[request.comments.length - 1]?.author ?? "";
      const searchBlob = `${request.title} ${request.description} ${request.clientName} ${latestAuthor}`.toLowerCase();
      return searchBlob.includes(normalizedSearch);
    });

    return [...filtered].sort((left, right) => {
      const leftActivity =
        left.comments[left.comments.length - 1]?.createdAt ??
        left.auditTrail[0]?.timestamp ??
        left.createdAt;
      const rightActivity =
        right.comments[right.comments.length - 1]?.createdAt ??
        right.auditTrail[0]?.timestamp ??
        right.createdAt;

      if (threadSort === "oldest") {
        return leftActivity.localeCompare(rightActivity);
      }

      if (threadSort === "needs_action") {
        const leftAwaiting =
          left.status !== "resolved" &&
          left.status !== "closed" &&
          left.status !== "awaiting_client"
            ? 0
            : 1;
        const rightAwaiting =
          right.status !== "resolved" &&
          right.status !== "closed" &&
          right.status !== "awaiting_client"
            ? 0
            : 1;

        if (leftAwaiting !== rightAwaiting) {
          return leftAwaiting - rightAwaiting;
        }
      }

      return rightActivity.localeCompare(leftActivity);
    });
  }, [scopedRequests, threadFilter, threadSearch, threadSort]);

  const activeRequest = useMemo(
    () => visibleRequests.find((request) => request.id === selectedRequestId) ?? visibleRequests[0] ?? null,
    [selectedRequestId, visibleRequests],
  );

  function handleSendMessage() {
    if (!activeRequest || !user) {
      return;
    }

    const message = messageDraft.trim();
    if (!message) {
      setInboxNotice("Type a message before sending.");
      return;
    }

    const result = portal.addRequestComment(activeRequest.id, user.fullName, user.role, message);
    setInboxNotice(result.message);
    if (result.ok) {
      setMessageDraft("");
    }
  }

  function handleCreateRequest() {
    if (!user || !selectedClient || !selectedWorkspace) {
      return;
    }

    const subject = newRequestSubject.trim();
    const details = newRequestDetails.trim();
    if (!subject || !details || !newRequestDueDate) {
      setInboxNotice("Add subject, details, and due date before sending a new request.");
      return;
    }

    const result = portal.createFollowUpRequest({
      actor: user,
      clientId: selectedClient.id,
      clientName: selectedClient.clientName,
      monthLabel: activeRequest?.monthLabel ?? selectedWorkspace.monthPack.monthLabel,
      title: subject,
      description: details,
      dueDate: new Date(newRequestDueDate).toISOString(),
      relatedDocumentId: activeRequest?.relatedDocumentId,
    });

    setInboxNotice(result.message);
    if (result.ok) {
      setNewRequestSubject("");
      setNewRequestDetails("");
      setNewRequestDueDate(defaultInboxDueDate());
    }
  }

  if (!selectedClient || !selectedWorkspace) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No accessible clients found for this workspace.
      </div>
    );
  }

  return (
    <div className="bg-[#f7f7fb] text-slate-900">
      <div className="flex flex-col rounded-2xl border border-slate-200 lg:flex-row">
        <ClientListPanel
          clients={scopedClients}
          selectedClientId={selectedClient.id}
          onSelectClient={(clientId) => {
            setSelectedClientId(clientId);
            setSelectedRequestId("");
            setInboxNotice("");
            setThreadSearch("");
            setThreadFilter("all");
            setThreadSort("newest");
          }}
        />

        <main className="flex min-w-0 flex-1 flex-col p-4 md:p-6">
          <header className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-950">{selectedClient.clientName} Inbox</h1>
            <p className="mt-1 text-sm text-slate-500">Message clients, track conversation threads, and request documents.</p>
          </header>

          {visibleRequests.length > 0 && activeRequest ? (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_280px]">
              <ThreadListPane
                filter={threadFilter}
                onChangeFilter={setThreadFilter}
                onChangeSearchValue={setThreadSearch}
                onChangeSort={setThreadSort}
                onSelect={setSelectedRequestId}
                requests={visibleRequests}
                searchValue={threadSearch}
                selectedClientName={selectedClient.clientName}
                selectedRequestId={activeRequest.id}
                sort={threadSort}
              />
              <ConversationPane
                currentRole={user?.role === "admin" ? "admin" : "accountant"}
                messageDraft={messageDraft}
                notice={inboxNotice}
                onChangeMessageDraft={setMessageDraft}
                onSendMessage={handleSendMessage}
                request={activeRequest}
              />
              <div className="space-y-4">
                <MetaPane request={activeRequest} />
                <NewRequestComposer
                  details={newRequestDetails}
                  dueDate={newRequestDueDate}
                  onChangeDetails={setNewRequestDetails}
                  onChangeDueDate={setNewRequestDueDate}
                  onChangeSubject={setNewRequestSubject}
                  onSend={handleCreateRequest}
                  subject={newRequestSubject}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">No Inbox Threads Yet</h2>
                <p className="mt-2 text-sm text-slate-600">Start a conversation by sending a new document request.</p>
                {inboxNotice ? (
                  <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{inboxNotice}</p>
                ) : null}
              </section>
              <NewRequestComposer
                details={newRequestDetails}
                dueDate={newRequestDueDate}
                onChangeDetails={setNewRequestDetails}
                onChangeDueDate={setNewRequestDueDate}
                onChangeSubject={setNewRequestSubject}
                onSend={handleCreateRequest}
                subject={newRequestSubject}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
