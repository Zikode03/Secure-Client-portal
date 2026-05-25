import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedRequests } from "../../utils/permissions";

type ThreadFilter = "all" | "unread" | "resolved" | "unresolved";
type ThreadSort = "needs_action" | "newest" | "oldest";

const PREF_KEY = "firm-inbox-preferences-v1";

function defaultInboxDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

function priorityBadgeClass(priority: WorkflowRequest["priority"]) {
  if (priority === "high") return "bg-amber-100 text-amber-800";
  if (priority === "medium") return "bg-brand-100 text-brand-700";
  return "bg-slate-100 text-slate-700";
}

function trailingClientUnreadCount(request: WorkflowRequest) {
  let count = 0;
  for (let index = request.comments.length - 1; index >= 0; index -= 1) {
    if (request.comments[index].role !== "client") break;
    count += 1;
  }
  return count;
}

function lastActivity(request: WorkflowRequest) {
  return request.comments[request.comments.length - 1]?.createdAt ?? request.createdAt;
}

function formatThreadTime(value: string) {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function dueRisk(request: WorkflowRequest) {
  const due = new Date(request.dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (request.status === "resolved" || request.status === "closed") {
    return { label: "Resolved", tone: "text-emerald-700" };
  }
  if (days < 0) {
    return { label: `SLA breached by ${Math.abs(days)}d`, tone: "text-rose-700" };
  }
  if (days <= 1) {
    return { label: "Due soon", tone: "text-amber-700" };
  }
  return { label: `Due in ${days}d`, tone: "text-slate-500" };
}

function isInternalNote(message: string) {
  return message.startsWith("[INTERNAL]");
}

function stripInternalPrefix(message: string) {
  return message.replace(/^\[INTERNAL\]\s*/, "");
}

function ThreadListPane({
  requests,
  selectedRequestId,
  selectedRequestIds,
  onToggleSelect,
  onSelectRequest,
  filter,
  onChangeFilter,
  sort,
  onChangeSort,
  searchValue,
  onChangeSearch,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  selectedRequestIds: string[];
  onToggleSelect: (requestId: string) => void;
  onSelectRequest: (requestId: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  sort: ThreadSort;
  onChangeSort: (value: ThreadSort) => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
}) {
  const unreadTotal = requests.reduce((sum, request) => sum + trailingClientUnreadCount(request), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b border-slate-100 p-4">
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
          onChange={(event) => onChangeSearch(event.target.value)}
          placeholder="Search messages..."
          value={searchValue}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Sort</span>
          {[
            { id: "needs_action" as const, label: "Needs action" },
            { id: "newest" as const, label: "Newest" },
            { id: "oldest" as const, label: "Oldest" },
          ].map((item) => (
            <button
              className={`rounded-full px-2.5 py-1 ${sort === item.id ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}
              key={item.id}
              onClick={() => onChangeSort(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-5 border-b border-slate-100 px-4 py-3 text-sm font-medium">
        <button className={filter === "all" ? "text-emerald-700" : "text-slate-500"} onClick={() => onChangeFilter("all")} type="button">All</button>
        <button className={filter === "unread" ? "text-emerald-700" : "text-slate-500"} onClick={() => onChangeFilter("unread")} type="button">
          Unread <span className="ml-1 rounded-full bg-emerald-600 px-1.5 text-xs text-white">{unreadTotal}</span>
        </button>
        <button className={filter === "resolved" ? "text-emerald-700" : "text-slate-500"} onClick={() => onChangeFilter("resolved")} type="button">Resolved</button>
        <button className={filter === "unresolved" ? "text-emerald-700" : "text-slate-500"} onClick={() => onChangeFilter("unresolved")} type="button">Unresolved</button>
      </div>

      <div className="max-h-[66vh] divide-y divide-slate-100 overflow-y-auto">
        {requests.map((request) => {
          const selected = request.id === selectedRequestId;
          const checked = selectedRequestIds.includes(request.id);
          const lastComment = request.comments[request.comments.length - 1];
          const unread = trailingClientUnreadCount(request);
          const risk = dueRisk(request);

          return (
            <div className={`w-full px-4 py-4 transition ${selected ? "bg-emerald-50/40" : "hover:bg-slate-50"}`} key={request.id}>
              <div className="mb-2 flex items-start gap-2">
                <input checked={checked} onChange={() => onToggleSelect(request.id)} type="checkbox" />
                <button className="w-full text-left" onClick={() => onSelectRequest(request.id)} type="button">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-base font-semibold text-slate-900">{request.title}</p>
                    <p className="text-xs text-slate-500">{formatThreadTime(lastActivity(request))}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{request.clientName}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{lastComment?.message ?? request.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${priorityBadgeClass(request.priority)}`}>
                      {request.priority.toUpperCase()}
                    </span>
                    <span className={`text-xs font-semibold ${risk.tone}`}>{risk.label}</span>
                    {unread > 0 ? <span className="text-xs font-semibold text-emerald-700">{unread} new</span> : null}
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConversationPane({
  request,
  messageDraft,
  isInternal,
  onChangeInternal,
  onChangeMessageDraft,
  onSendMessage,
  onResolve,
  onSetAwaitingClient,
  onSetOpen,
  onSetClosed,
  onOpenLinkedDocument,
  onEscalate,
  onReassign,
  onUpdateAssignment,
}: {
  request: WorkflowRequest;
  messageDraft: string;
  isInternal: boolean;
  onChangeInternal: (value: boolean) => void;
  onChangeMessageDraft: (value: string) => void;
  onSendMessage: () => void;
  onResolve: () => void;
  onSetAwaitingClient: () => void;
  onSetOpen: () => void;
  onSetClosed: () => void;
  onOpenLinkedDocument: () => void;
  onEscalate: () => void;
  onReassign: () => void;
  onUpdateAssignment: (payload: {
    assignedTo: string;
    dueDate: string;
    priority: WorkflowRequest["priority"];
    addAuditNote: boolean;
  }) => void;
}) {
  const [assignedToDraft, setAssignedToDraft] = useState(request.assignedTo);
  const [dueDateDraft, setDueDateDraft] = useState(request.dueDate.slice(0, 10));
  const [priorityDraft, setPriorityDraft] = useState<WorkflowRequest["priority"]>(request.priority);
  const [addAuditNote, setAddAuditNote] = useState(false);

  useEffect(() => {
    setAssignedToDraft(request.assignedTo);
    setDueDateDraft(request.dueDate.slice(0, 10));
    setPriorityDraft(request.priority);
    setAddAuditNote(false);
  }, [request.assignedTo, request.dueDate, request.priority, request.id]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeClass(request.priority)}`}>
            {request.priority.toUpperCase()} PRIORITY
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">{request.title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {request.monthLabel} | Request ID: {request.id}
          </p>
          <p className="mt-2 text-sm text-slate-600">{request.description}</p>
        </div>
        <div className="min-w-[240px] rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Client</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.clientName}</p>
          <p className="text-xs text-slate-500">Requested by {request.requestedBy}</p>
          {request.relatedDocumentId ? (
            <button
              className="mt-3 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onOpenLinkedDocument}
              type="button"
            >
              Open linked document
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-b border-slate-100 p-4">
        <p className="text-sm font-semibold text-slate-900">Lifecycle actions</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSetOpen} variant="secondary">Set open</Button>
          <Button onClick={onSetAwaitingClient} variant="secondary">Set awaiting client</Button>
          <Button onClick={onResolve} variant="secondary">Resolve</Button>
          <Button onClick={onSetClosed} variant="secondary">Close</Button>
          <Button onClick={onEscalate} variant="secondary">Escalate</Button>
          <Button onClick={onReassign} variant="secondary">Reassign note</Button>
        </div>
      </div>

      <div className="space-y-3 border-b border-slate-100 p-4">
        <p className="text-sm font-semibold text-slate-900">Assignment and SLA controls</p>
        <div className="grid gap-3 md:grid-cols-3">
          <TextField id="assigned-to" label="Assigned to" onChange={(event) => setAssignedToDraft(event.target.value)} value={assignedToDraft} />
          <TextField id="due-date" label="Due date" onChange={(event) => setDueDateDraft(event.target.value)} type="date" value={dueDateDraft} />
          <SelectField
            id="priority"
            label="Priority"
            onChange={(event) => setPriorityDraft(event.target.value as WorkflowRequest["priority"])}
            options={[
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
            ]}
            value={priorityDraft}
          />
        </div>
        <div>
          <Button
            onClick={() =>
              onUpdateAssignment({
                assignedTo: assignedToDraft,
                dueDate: new Date(`${dueDateDraft}T17:00:00.000Z`).toISOString(),
                priority: priorityDraft,
                addAuditNote,
              })}
            variant="secondary"
          >
            Save assignment controls
          </Button>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input checked={addAuditNote} onChange={(event) => setAddAuditNote(event.target.checked)} type="checkbox" />
          Also add internal note to audit timeline
        </label>
      </div>

      <div className="max-h-[36vh] space-y-4 overflow-y-auto p-6">
        {request.comments.map((comment) => {
          const internal = isInternalNote(comment.message);
          const cleaned = stripInternalPrefix(comment.message);
          return (
            <article
              className={`max-w-[78%] rounded-2xl border px-4 py-3 ${
                internal
                  ? "ml-auto border-amber-200 bg-amber-50"
                  : comment.role === "client"
                    ? "border-slate-200 bg-slate-50"
                    : "ml-auto border-brand-100 bg-brand-50"
              }`}
              key={comment.id}
            >
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                {internal ? (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-amber-800">
                    Internal note
                  </span>
                ) : null}
                <p className="text-xs text-slate-500">{formatDateLabel(comment.createdAt)}</p>
              </div>
              <p className="text-sm text-slate-700">{cleaned}</p>
            </article>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-slate-100 p-6">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input checked={isInternal} onChange={(event) => onChangeInternal(event.target.checked)} type="checkbox" />
          Send as internal note (not client-facing)
        </label>
        <div className="flex gap-3">
          <input
            className="h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none ring-brand-300 transition focus:ring-2"
            onChange={(event) => onChangeMessageDraft(event.target.value)}
            placeholder={isInternal ? "Type internal note..." : "Type your message to the client..."}
            value={messageDraft}
          />
          <Button disabled={!messageDraft.trim()} onClick={onSendMessage}>
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const portal = usePortal();

  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [user, portal.adminClients]);

  const [selectedClientId, setSelectedClientId] = useState(scopedClients[0]?.id ?? "");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendAsInternal, setSendAsInternal] = useState(false);
  const [inboxNotice, setInboxNotice] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [threadSort, setThreadSort] = useState<ThreadSort>("needs_action");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequestSubject, setNewRequestSubject] = useState("");
  const [newRequestDetails, setNewRequestDetails] = useState("");
  const [newRequestDueDate, setNewRequestDueDate] = useState(defaultInboxDueDate());

  const selectedClient = useMemo(
    () => scopedClients.find((client) => client.id === selectedClientId) ?? scopedClients[0] ?? null,
    [scopedClients, selectedClientId],
  );

  const selectedWorkspace = useMemo(() => {
    if (!selectedClient) return null;
    return portal.getClientWorkspace(selectedClient.id);
  }, [portal, selectedClient]);

  const scopedRequests = useMemo(() => {
    if (!selectedWorkspace) return [] as WorkflowRequest[];
    return getScopedRequests(user, selectedWorkspace.requests, portal.adminClients);
  }, [portal.adminClients, selectedWorkspace, user]);

  useEffect(() => {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        selectedClientId?: string;
        threadFilter?: ThreadFilter;
        threadSort?: ThreadSort;
        threadSearch?: string;
      };
      if (parsed.selectedClientId) setSelectedClientId(parsed.selectedClientId);
      if (parsed.threadFilter) setThreadFilter(parsed.threadFilter);
      if (parsed.threadSort) setThreadSort(parsed.threadSort);
      if (typeof parsed.threadSearch === "string") setThreadSearch(parsed.threadSearch);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ selectedClientId, threadFilter, threadSort, threadSearch }),
    );
  }, [selectedClientId, threadFilter, threadSort, threadSearch]);

  const visibleRequests = useMemo(() => {
    const normalizedSearch = threadSearch.trim().toLowerCase();
    const filtered = scopedRequests.filter((request) => {
      const unreadCount = trailingClientUnreadCount(request);
      if (threadFilter === "unread" && unreadCount === 0) return false;
      if (threadFilter === "resolved" && !["resolved", "closed"].includes(request.status)) return false;
      if (threadFilter === "unresolved" && ["resolved", "closed"].includes(request.status)) return false;
      if (!normalizedSearch) return true;
      const searchBlob = `${request.title} ${request.description} ${request.clientName}`.toLowerCase();
      return searchBlob.includes(normalizedSearch);
    });

    return [...filtered].sort((left, right) => {
      if (threadSort === "newest") return lastActivity(right).localeCompare(lastActivity(left));
      if (threadSort === "oldest") return lastActivity(left).localeCompare(lastActivity(right));
      const leftOpen = ["resolved", "closed"].includes(left.status) ? 1 : 0;
      const rightOpen = ["resolved", "closed"].includes(right.status) ? 1 : 0;
      if (leftOpen !== rightOpen) return leftOpen - rightOpen;
      return lastActivity(right).localeCompare(lastActivity(left));
    });
  }, [scopedRequests, threadFilter, threadSearch, threadSort]);

  const activeRequest = useMemo(
    () => visibleRequests.find((request) => request.id === selectedRequestId) ?? visibleRequests[0] ?? null,
    [selectedRequestId, visibleRequests],
  );

  const slaSummary = useMemo(() => {
    const unresolved = visibleRequests.filter((request) => !["resolved", "closed"].includes(request.status));
    const breached = unresolved.filter((request) => dueRisk(request).label.includes("breached")).length;
    const dueSoon = unresolved.filter((request) => dueRisk(request).label === "Due soon").length;
    return {
      unresolved: unresolved.length,
      breached,
      dueSoon,
      unread: unresolved.reduce((sum, request) => sum + trailingClientUnreadCount(request), 0),
    };
  }, [visibleRequests]);

  useEffect(() => {
    if (!visibleRequests.length) {
      setSelectedRequestId("");
      return;
    }
    if (!visibleRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(visibleRequests[0].id);
    }
  }, [selectedRequestId, visibleRequests]);

  function addLifecycleNote(note: string) {
    if (!activeRequest || !user) return;
    const result = portal.addRequestComment(activeRequest.id, user.fullName, user.role, note);
    setInboxNotice(result.message);
  }

  function handleSendMessage() {
    if (!activeRequest || !user) return;
    const message = messageDraft.trim();
    if (!message) {
      setInboxNotice("Type a message before sending.");
      return;
    }

    const payload = sendAsInternal ? `[INTERNAL] ${message}` : message;
    const result = portal.addRequestComment(activeRequest.id, user.fullName, user.role, payload);
    setInboxNotice(result.message);
    if (result.ok) {
      setMessageDraft("");
      setSendAsInternal(false);
    }
  }

  function handleResolve() {
    if (!activeRequest || !user) return;
    const result = portal.resolveRequest(activeRequest.id, user.fullName);
    setInboxNotice(result.message);
  }

  function handleBulkResolve() {
    if (!user || selectedRequestIds.length === 0) return;
    let count = 0;
    selectedRequestIds.forEach((requestId) => {
      const result = portal.resolveRequest(requestId, user.fullName);
      if (result.ok) count += 1;
    });
    setInboxNotice(`${count} request(s) resolved from bulk action.`);
    setSelectedRequestIds([]);
  }

  function handleBulkNudge() {
    if (!user || selectedRequestIds.length === 0) return;
    selectedRequestIds.forEach((requestId) => {
      void portal.addRequestComment(
        requestId,
        user.fullName,
        user.role,
        "Reminder sent from bulk triage: please action this request.",
      );
    });
    setInboxNotice(`Reminder note posted on ${selectedRequestIds.length} request(s).`);
    setSelectedRequestIds([]);
  }

  function handleUpdateAssignment(payload: {
    assignedTo: string;
    dueDate: string;
    priority: WorkflowRequest["priority"];
    addAuditNote: boolean;
  }) {
    if (!activeRequest || !user) return;
    const result = portal.updateRequestControls(
      activeRequest.id,
      {
        assignedTo: payload.assignedTo,
        dueDate: payload.dueDate,
        priority: payload.priority,
      },
      user.fullName,
      payload.addAuditNote
        ? {
            addAuditNote: true,
            auditNote: `Assignment controls updated: owner -> ${payload.assignedTo}; due -> ${formatDateLabel(
              payload.dueDate,
            )}; priority -> ${payload.priority}.`,
          }
        : { addAuditNote: false },
    );
    setInboxNotice(result.message);
  }

  function handleCreateRequest() {
    if (!user || !selectedClient || !selectedWorkspace) return;
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
      setIsRequestModalOpen(false);
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
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Firm inbox and requests</h1>
          <p className="mt-2 text-lg text-slate-600">Manage client communication and follow-up requests.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRequestModalOpen(true)} variant="secondary">New request</Button>
          <Button
            onClick={() =>
              navigate(
                activeRequest
                  ? `/firm/documents?requestId=${encodeURIComponent(activeRequest.id)}&client=${encodeURIComponent(selectedClient.clientName)}`
                  : `/firm/documents?client=${encodeURIComponent(selectedClient.clientName)}`,
              )}
            variant="secondary"
          >
            Open documents
          </Button>
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Unresolved</p>
          <p className="text-lg font-semibold text-slate-900">{slaSummary.unresolved}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">SLA breached</p>
          <p className="text-lg font-semibold text-rose-700">{slaSummary.breached}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Due soon</p>
          <p className="text-lg font-semibold text-amber-700">{slaSummary.dueSoon}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Unread from clients</p>
          <p className="text-lg font-semibold text-emerald-700">{slaSummary.unread}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <SelectField
          id="inbox-client-select"
          label="Client workspace"
          onChange={(event) => {
            setSelectedClientId(event.target.value);
            setSelectedRequestId("");
            setSelectedRequestIds([]);
            setInboxNotice("");
          }}
          options={scopedClients.map((client) => ({ label: client.clientName, value: client.id }))}
          value={selectedClient.id}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Bulk triage</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={selectedRequestIds.length === 0} onClick={handleBulkResolve} variant="secondary">Bulk resolve</Button>
          <Button disabled={selectedRequestIds.length === 0} onClick={handleBulkNudge} variant="secondary">Bulk nudge client</Button>
          <span className="self-center text-xs text-slate-500">{selectedRequestIds.length} selected</span>
        </div>
      </div>

      {inboxNotice ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{inboxNotice}</div>
      ) : null}

      {visibleRequests.length > 0 && activeRequest ? (
        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <ThreadListPane
            filter={threadFilter}
            onChangeFilter={setThreadFilter}
            onChangeSearch={setThreadSearch}
            onChangeSort={setThreadSort}
            onSelectRequest={setSelectedRequestId}
            onToggleSelect={(requestId) =>
              setSelectedRequestIds((current) =>
                current.includes(requestId) ? current.filter((id) => id !== requestId) : [...current, requestId],
              )}
            requests={visibleRequests}
            searchValue={threadSearch}
            selectedRequestId={activeRequest.id}
            selectedRequestIds={selectedRequestIds}
            sort={threadSort}
          />
          <ConversationPane
            isInternal={sendAsInternal}
            messageDraft={messageDraft}
            onChangeInternal={setSendAsInternal}
            onChangeMessageDraft={setMessageDraft}
            onEscalate={() =>
              addLifecycleNote("[INTERNAL] Escalation requested: SLA risk or blocker identified. Please prioritize.")}
            onOpenLinkedDocument={() =>
              navigate(
                activeRequest.relatedDocumentId
                  ? `/firm/documents?recordId=${encodeURIComponent(activeRequest.relatedDocumentId)}`
                  : `/firm/documents?requestId=${encodeURIComponent(activeRequest.id)}`,
              )}
            onReassign={() =>
              addLifecycleNote("[INTERNAL] Reassignment suggested: please review ownership and assign another accountant.")}
            onResolve={handleResolve}
            onSendMessage={handleSendMessage}
            onSetAwaitingClient={() =>
              addLifecycleNote("Request set to awaiting client. Waiting for client response or upload.")}
            onSetClosed={() => addLifecycleNote("Request set to closed. No further action required unless reopened.")}
            onSetOpen={() => addLifecycleNote("Request reopened for active follow-up.")}
            onUpdateAssignment={handleUpdateAssignment}
            request={activeRequest}
          />
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {scopedRequests.length > 0 ? "No messages match your filters" : "No inbox threads yet"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {scopedRequests.length > 0
              ? "Try clearing search or switching back to All."
              : "Start a thread by creating a new request for this client."}
          </p>
          {scopedRequests.length > 0 ? (
            <div className="mt-4">
              <Button
                onClick={() => {
                  setThreadSearch("");
                  setThreadFilter("all");
                }}
                variant="secondary"
              >
                Back to all
              </Button>
            </div>
          ) : null}
        </section>
      )}

      <Modal
        description="Create a follow-up request and keep it tied to the selected client thread workspace."
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="New client request"
      >
        <div className="space-y-4">
          <TextField
            id="firm-request-subject"
            label="Subject"
            onChange={(event) => setNewRequestSubject(event.target.value)}
            placeholder="e.g. Upload missing bank statement"
            value={newRequestSubject}
          />
          <TextAreaField
            id="firm-request-details"
            label="Details"
            onChange={(event) => setNewRequestDetails(event.target.value)}
            placeholder="Explain exactly what is required from the client."
            value={newRequestDetails}
          />
          <TextField
            id="firm-request-due-date"
            label="Due date"
            onChange={(event) => setNewRequestDueDate(event.target.value)}
            type="date"
            value={newRequestDueDate}
          />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsRequestModalOpen(false)} variant="secondary">Cancel</Button>
            <Button
              disabled={!newRequestSubject.trim() || !newRequestDetails.trim() || !newRequestDueDate}
              onClick={handleCreateRequest}
            >
              Send request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
