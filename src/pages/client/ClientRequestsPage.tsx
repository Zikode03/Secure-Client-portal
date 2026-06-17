import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { Modal } from "../../components/ui/Modal";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

type ThreadFilter = "all" | "unread" | "high_priority" | "resolved" | "unresolved";
const THREADS_PER_PAGE = 8;
const ATTACHMENT_PREFIX = "[[attachment:";
const ATTACHMENT_SUFFIX = "]]";

const inboxPanelClass =
  "rounded-2xl border border-[#dce6ef] bg-white shadow-[0_18px_44px_rgba(4,24,52,0.07)]";

interface ParsedAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

interface ActionResult {
  ok: boolean;
  message: string;
}

function encodeAttachment(attachment: ParsedAttachment) {
  return `${ATTACHMENT_PREFIX}${encodeURIComponent(
    JSON.stringify(attachment),
  )}${ATTACHMENT_SUFFIX}`;
}

function decodeAttachment(message: string): ParsedAttachment | null {
  const start = message.indexOf(ATTACHMENT_PREFIX);
  const end = message.indexOf(ATTACHMENT_SUFFIX, start + ATTACHMENT_PREFIX.length);
  if (start === -1 || end === -1) {
    return null;
  }

  try {
    const raw = message.slice(start + ATTACHMENT_PREFIX.length, end);
    return JSON.parse(decodeURIComponent(raw)) as ParsedAttachment;
  } catch {
    return null;
  }
}

function plainMessageText(message: string) {
  const start = message.indexOf(ATTACHMENT_PREFIX);
  if (start === -1) {
    return message;
  }
  return message.slice(0, start).trim();
}

function priorityBadgeClass(priority: WorkflowRequest["priority"]) {
  if (priority === "high") {
    return "bg-red-50 text-red-700";
  }
  if (priority === "medium") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

function requestIconClass(priority: WorkflowRequest["priority"], isResolved: boolean) {
  if (isResolved) {
    return "bg-emerald-50 text-emerald-600";
  }
  if (priority === "medium") {
    return "bg-amber-50 text-amber-600";
  }
  return "bg-blue-50 text-blue-700";
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DM";
}

function unreadFromAccountantCount(request: WorkflowRequest) {
  let count = 0;
  for (let index = request.comments.length - 1; index >= 0; index -= 1) {
    if (request.comments[index].role === "client") {
      break;
    }
    count += 1;
  }
  return count;
}

function lastActivity(request: WorkflowRequest) {
  return request.comments[request.comments.length - 1]?.createdAt ?? request.createdAt;
}

function formatThreadTime(value: string) {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function formatShortThreadTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return formatDateLabel(value);
}

function messageStatus(request: WorkflowRequest, commentIndex: number) {
  const comment = request.comments[commentIndex];
  if (!comment || comment.role !== "client") {
    return "";
  }

  const hasAccountantResponseAfter = request.comments
    .slice(commentIndex + 1)
    .some((next) => next.role !== "client");
  return hasAccountantResponseAfter ? "Seen by accountant" : "Sent";
}

function ThreadListPane({
  requests,
  selectedRequestId,
  onSelectRequest,
  filter,
  onChangeFilter,
  searchValue,
  onChangeSearch,
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (requestId: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}) {
  const unreadTotal = requests.reduce((sum, request) => sum + unreadFromAccountantCount(request), 0);

  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden`}>
      <div className="border-b border-[#edf0f6] p-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#dce6ef] bg-white px-4 shadow-sm">
          <Search aria-hidden="true" className="h-5 w-5 text-[#53617f]" />
          <input
            className="h-12 w-full bg-transparent text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="Search messages..."
            value={searchValue}
          />
        </div>
      </div>

      <div className="flex flex-nowrap items-center gap-2 border-b border-[#edf0f6] px-4 py-3 text-sm font-semibold">
        <button
          className={`shrink-0 rounded-lg px-3.5 py-2 transition ${filter === "all" ? "bg-[#061b41] text-white shadow-[0_10px_20px_rgba(6,27,65,0.2)]" : "text-[#0a2f66] hover:bg-[#f4f8fb]"}`}
          onClick={() => onChangeFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={`shrink-0 rounded-lg px-3.5 py-2 transition ${filter === "unread" ? "bg-[#061b41] text-white shadow-[0_10px_20px_rgba(6,27,65,0.2)]" : "text-[#0a2f66] hover:bg-[#f4f8fb]"}`}
          onClick={() => onChangeFilter("unread")}
          type="button"
        >
          Unread <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{unreadTotal}</span>
        </button>
        <button
          className={`shrink-0 rounded-lg px-3.5 py-2 transition ${filter === "high_priority" ? "bg-[#061b41] text-white shadow-[0_10px_20px_rgba(6,27,65,0.2)]" : "text-[#0a2f66] hover:bg-[#f4f8fb]"}`}
          onClick={() => onChangeFilter("high_priority")}
          type="button"
        >
          High Priority
        </button>
        <button
          className={`shrink-0 rounded-lg px-3.5 py-2 transition ${filter === "resolved" ? "bg-[#061b41] text-white shadow-[0_10px_20px_rgba(6,27,65,0.2)]" : "text-[#0a2f66] hover:bg-[#f4f8fb]"}`}
          onClick={() => onChangeFilter("resolved")}
          type="button"
        >
          Resolved
        </button>
        {(filter === "resolved" || filter === "unresolved" || filter === "high_priority") ? (
          <button
            className="client-dashboard-link ml-auto rounded-lg px-2 py-1 text-xs font-semibold transition"
            onClick={() => onChangeFilter("all")}
            type="button"
          >
            Back to all
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 divide-y divide-[#edf0f6] overflow-y-auto">
        {requests.map((request) => {
          const selected = request.id === selectedRequestId;
          const lastComment = request.comments[request.comments.length - 1];
          const unread = unreadFromAccountantCount(request);
          const isResolved = request.status === "resolved" || request.status === "closed";
          return (
            <button
              className={`relative grid w-full grid-cols-[auto_1fr] gap-3 px-4 py-4 text-left transition ${
                selected ? "bg-[#f5f8ff]" : "hover:bg-[#fbfcff]"
              }`}
              key={request.id}
              onClick={() => onSelectRequest(request.id)}
              type="button"
            >
              {selected ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-600" /> : null}
              <span className={`mt-1 flex h-11 w-11 items-center justify-center rounded-full ${requestIconClass(request.priority, isResolved)}`}>
                {isResolved ? <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> : <MessageSquare aria-hidden="true" className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-[0.94rem] font-semibold text-[#091333]">{request.title}</p>
                  <p className="shrink-0 text-xs font-medium text-[#53617f]">{formatShortThreadTime(lastActivity(request))}</p>
                </div>
                <p className="mt-1 text-sm font-medium text-[#394a78]">{request.requestedBy}</p>
                <p className="mt-1 line-clamp-1 text-sm text-[#53617f]">
                  {plainMessageText(lastComment?.message ?? request.description)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold ${priorityBadgeClass(request.priority)}`}>
                    {request.priority.toUpperCase()} PRIORITY
                  </span>
                  {unread > 0 ? <span className="shrink-0 text-xs font-semibold text-emerald-700">{unread} new</span> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex min-h-[96px] items-center justify-between border-t border-[#edf0f6] px-4 py-5 text-xs font-medium text-[#53617f]">
        <span>
          Showing {requests.length ? `1 to ${requests.length}` : "0"} of {requests.length}
        </span>
        <div className="flex gap-2">
          <button
            className="client-dashboard-link inline-flex h-8 w-8 items-center justify-center rounded-lg font-semibold disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={onPrevPage}
            type="button"
          >
            &lsaquo;
          </button>
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#dce6ef] bg-white px-2 font-semibold text-[#091333]">
            {currentPage}
          </span>
          <button
            className="client-dashboard-link inline-flex h-8 w-8 items-center justify-center rounded-lg font-semibold disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={onNextPage}
            type="button"
          >
            &rsaquo;
          </button>
        </div>
      </div>
    </section>
  );
}

function ConversationPane({
  request,
  onReply,
  onResolve,
  assignedAccountantName,
}: {
  request: WorkflowRequest;
  onReply: (requestId: string, message: string) => ActionResult;
  onResolve: (requestId: string) => void;
  assignedAccountantName: string;
}) {
  const [replyMessage, setReplyMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<ParsedAttachment | null>(null);
  const [sendError, setSendError] = useState("");
  const [lastFailedPayload, setLastFailedPayload] = useState<{ requestId: string; message: string } | null>(null);

  async function handleAttachmentSelected(file: File | null) {
    if (!file) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });

    setAttachedFile({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
    });
  }

  function submitPayload(payload: { requestId: string; message: string }) {
    const result = onReply(payload.requestId, payload.message);
    if (!result.ok) {
      setSendError(result.message);
      setLastFailedPayload(payload);
      return;
    }
    setSendError("");
    setLastFailedPayload(null);
    setReplyMessage("");
    setAttachedFile(null);
  }

  function handleSend() {
    const value = replyMessage.trim();
    if (!value && !attachedFile) {
      return;
    }
    const composedMessage = attachedFile
      ? `${value || "Attached file for review."}\n\n${encodeAttachment(attachedFile)}`
      : value;
    submitPayload({ requestId: request.id, message: composedMessage });
  }

  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f6] bg-white p-6">
        <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <MessageSquare aria-hidden="true" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[1.45rem] font-semibold tracking-tight text-[#091333]">{request.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#53617f]">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeClass(request.priority)}`}>
                {request.priority.toUpperCase()} PRIORITY
              </span>
              <span className="h-5 w-px bg-[#edf0f6]" />
              <span>Pack ID: {request.id}</span>
              <span className="h-5 w-px bg-[#edf0f6]" />
              <span>Due {formatDateLabel(request.dueDate)}</span>
              <span className="h-5 w-px bg-[#edf0f6]" />
              <span>
                Assigned accountant: <span className="font-semibold text-[#091333]">{assignedAccountantName}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        <div className="flex items-center gap-4 text-xs font-semibold text-[#53617f]">
          <span className="h-px flex-1 bg-[#edf0f6]" />
          Today
          <span className="h-px flex-1 bg-[#edf0f6]" />
        </div>
        {request.comments.map((comment, index) => {
          const attachment = decodeAttachment(comment.message);
          const text = plainMessageText(comment.message);
          const status = messageStatus(request, index);
          const isClient = comment.role === "client";
          return (
            <div className={`flex items-start gap-3 ${isClient ? "justify-end" : ""}`} key={comment.id}>
              {!isClient ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {initials(comment.author)}
                </span>
              ) : null}
              <article
                className={`max-w-[78%] rounded-2xl border px-4 py-3 shadow-[0_10px_24px_rgba(4,24,52,0.05)] ${
                  isClient
                    ? "border-emerald-100 bg-emerald-50"
                    : "border-[#dce6ef] bg-[#f7f9ff]"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#091333]">{comment.author}</p>
                  <p className="text-xs text-[#53617f]">{formatThreadTime(comment.createdAt)}</p>
                </div>
                {text ? <p className="text-sm leading-6 text-[#1e2f5b]">{text}</p> : null}
                {attachment ? (
                  <a
                    className="client-dashboard-link mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold"
                    download={attachment.name}
                    href={attachment.dataUrl}
                  >
                    <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
                    Download: {attachment.name}
                  </a>
                ) : null}
                {status ? <p className="mt-2 text-right text-xs text-[#53617f]">{status}</p> : null}
              </article>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-[#edf0f6] bg-white p-5">
        {attachedFile ? (
          <div className="rounded-xl border border-[#dce6ef] bg-white px-3 py-2 text-sm text-[#53617f]">
            Attached: {attachedFile.name}
          </div>
        ) : null}
        {sendError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {sendError}
            {lastFailedPayload ? (
              <button
                className="ml-2 rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold"
                onClick={() => submitPayload(lastFailedPayload)}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-nowrap items-center gap-3">
          <label className="client-dashboard-link inline-flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#dce6ef] bg-white text-sm font-semibold">
            <Paperclip aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Attach</span>
            <input
              className="hidden"
              onChange={(event) => void handleAttachmentSelected(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <input
            className="h-14 min-w-[220px] flex-1 rounded-xl border border-[#dce6ef] bg-white px-4 text-sm text-[#091333] outline-none ring-brand-300 transition placeholder:text-[#7b879e] focus:ring-2"
            onChange={(event) => setReplyMessage(event.target.value)}
            placeholder="Type your message..."
            value={replyMessage}
          />
          <Button
            className="client-inbox-primary-button h-14 rounded-xl border-0 px-5 font-semibold ring-0"
            disabled={!replyMessage.trim() && !attachedFile}
            onClick={handleSend}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Send
          </Button>
          <Button
            className="client-inbox-primary-button h-14 rounded-xl border-0 px-5 font-semibold ring-0"
            onClick={() => onResolve(request.id)}
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Resolve thread
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ClientRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    assignedAccountantName,
    createClientRequest,
    dismissFeedbackNotice,
    feedbackNotice,
    replyToRequest,
    requests,
    resolveRequest,
  } = useClientWorkflow();

  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestPriority, setRequestPriority] = useState<WorkflowRequest["priority"]>("medium");
  const [requestDueDate, setRequestDueDate] = useState("");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [requestFormError, setRequestFormError] = useState("");
  const [lastFailedRequestPayload, setLastFailedRequestPayload] = useState<{
    title: string;
    description: string;
    dueDate: string;
    priority: WorkflowRequest["priority"];
    monthLabel: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const orderedRequests = useMemo(
    () => [...requests].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))),
    [requests],
  );

  const visibleRequests = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return orderedRequests.filter((request) => {
      if (filter === "unread" && unreadFromAccountantCount(request) === 0) {
        return false;
      }
      if (filter === "high_priority" && request.priority !== "high") {
        return false;
      }
      if (filter === "resolved" && request.status !== "resolved" && request.status !== "closed") {
        return false;
      }
      if (filter === "unresolved" && (request.status === "resolved" || request.status === "closed")) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const blob = `${request.title} ${request.description} ${request.requestedBy} ${request.clientName}`.toLowerCase();
      return blob.includes(normalizedSearch);
    });
  }, [filter, orderedRequests, searchValue]);

  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / THREADS_PER_PAGE));
  const pagedRequests = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * THREADS_PER_PAGE;
    return visibleRequests.slice(start, start + THREADS_PER_PAGE);
  }, [currentPage, totalPages, visibleRequests]);

  const activeRequest = useMemo(
    () => pagedRequests.find((request) => request.id === selectedRequestId) ?? pagedRequests[0] ?? null,
    [pagedRequests, selectedRequestId],
  );

  useEffect(() => {
    if (!pagedRequests.length) {
      setSelectedRequestId("");
      return;
    }
    if (!pagedRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(pagedRequests[0].id);
    }
  }, [pagedRequests, selectedRequestId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchValue]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleCreateRequest() {
    if (!user) {
      return;
    }
    const title = requestTitle.trim();
    const description = requestDetails.trim();
    if (!title || !description || !requestDueDate) {
      setRequestFormError("Fill in all fields before sending the request.");
      return;
    }

    const monthLabel = activeRequest?.monthLabel ?? requests[0]?.monthLabel ?? formatDateLabel(new Date().toISOString());
    const payload = {
      title: `Document request: ${title}`,
      description,
      dueDate: new Date(`${requestDueDate}T17:00:00.000Z`).toISOString(),
      priority: requestPriority,
      monthLabel,
    };
    const result = createClientRequest(payload, user);
    if (!result.ok) {
      setRequestFormError(result.message);
      setLastFailedRequestPayload(payload);
      return;
    }
    setRequestFormError("");
    setLastFailedRequestPayload(null);
    setIsRequestModalOpen(false);
    setRequestTitle("");
    setRequestDetails("");
    setRequestPriority("medium");
    setRequestDueDate("");
  }

  return (
    <div className="client-inbox-page mx-auto max-w-[1500px] space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
            Client Workspace
          </p>
          <h1 className="mt-1 text-[2.05rem] font-semibold tracking-tight text-[#091333]">Inbox</h1>
          <p className="mt-2 max-w-2xl text-[0.96rem] leading-7 text-[#53617f]">
            Review accountant follow-ups, reply with context, and keep document requests moving.
          </p>
        </div>
        <div className="relative flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex h-12 items-center rounded-xl border border-[#cdd8ea] bg-white px-5 text-sm font-semibold text-[#091333] shadow-sm transition hover:bg-[#f8fbff]"
            type="button"
          >
            {user?.company ?? "Apex Trading Ltd"}
          </button>
          <Button
            className="client-inbox-primary-button h-12 rounded-xl border-0 px-5 text-sm font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <MessageSquare aria-hidden="true" className="h-4 w-4" />
            Request document
          </Button>
          <Button
            className="client-inbox-primary-button h-12 rounded-xl border-0 px-5 text-sm font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
            onClick={() =>
              navigate(
                activeRequest
                  ? `/client/documents?requestId=${encodeURIComponent(activeRequest.id)}&from=inbox`
                  : "/client/documents?from=inbox",
              )}
          >
            <UploadCloud aria-hidden="true" className="h-4 w-4 text-emerald-600" />
            Upload document
          </Button>
          <button
            className="client-inbox-primary-button inline-flex h-12 w-12 items-center justify-center rounded-xl border-0 transition hover:-translate-y-0.5 active:translate-y-px"
            aria-controls="messages-header-menu"
            aria-expanded={showHeaderMenu}
            aria-haspopup="menu"
            onClick={() => setShowHeaderMenu((current) => !current)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </button>
          {showHeaderMenu ? (
            <div className="absolute right-0 top-12 z-20 w-48 rounded-xl border border-[#dce6ef] bg-white p-2 shadow-lg" id="messages-header-menu" role="menu">
              <button
                className="client-dashboard-link block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold"
                onClick={() => {
                  setFilter("unresolved");
                  setShowHeaderMenu(false);
                }}
                type="button"
                role="menuitem"
              >
                Show unresolved
              </button>
              <button
                className="client-dashboard-link block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold"
                onClick={() => {
                  setFilter("resolved");
                  setShowHeaderMenu(false);
                }}
                type="button"
                role="menuitem"
              >
                Show resolved
              </button>
              <button
                className="client-dashboard-link block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold"
                onClick={() => {
                  setFilter("all");
                  setShowHeaderMenu(false);
                }}
                type="button"
                role="menuitem"
              >
                Back to all
              </button>
            </div>
          ) : null}
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

      {visibleRequests.length > 0 && activeRequest ? (
        <div className="grid items-stretch gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <ThreadListPane
            currentPage={currentPage}
            filter={filter}
            onChangeFilter={setFilter}
            onChangeSearch={setSearchValue}
            onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            onSelectRequest={setSelectedRequestId}
            requests={pagedRequests}
            searchValue={searchValue}
            selectedRequestId={activeRequest.id}
            totalPages={totalPages}
          />
          <ConversationPane
            assignedAccountantName={assignedAccountantName}
            onReply={(requestId, message) =>
              replyToRequest(requestId, "client", user?.fullName ?? "Client", message)}
            onResolve={resolveRequest}
            request={activeRequest}
          />
        </div>
      ) : (
        <section className={`${inboxPanelClass} px-6 py-10 text-center`}>
          <h2 className="text-xl font-semibold text-[#091333]">
            {requests.length > 0 ? "No messages match your filters" : "No messages yet"}
          </h2>
          <p className="mt-2 text-sm text-[#53617f]">
            {requests.length > 0
              ? "Try clearing search or switching back to All."
              : "Your accountant will start threads here when action is needed."}
          </p>
          {requests.length > 0 ? (
          <div className="mt-4">
              <Button onClick={() => {
                setSearchValue("");
                setFilter("all");
                setCurrentPage(1);
              }}
              className="client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0"
            >
                Back to all
              </Button>
            </div>
          ) : null}
        </section>
      )}

      <Modal
        description="Send a formal request to your accountant for a specific document."
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request a document"
      >
        <div className="space-y-4">
          <TextField
            id="client-request-title"
            label="Document needed"
            onChange={(event) => setRequestTitle(event.target.value)}
            placeholder="e.g. Signed annual financial statements"
            value={requestTitle}
          />
          <TextAreaField
            id="client-request-details"
            label="Request details"
            onChange={(event) => setRequestDetails(event.target.value)}
            placeholder="Explain what document you need and why."
            value={requestDetails}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="client-request-due-date"
              label="Needed by"
              onChange={(event) => setRequestDueDate(event.target.value)}
              type="date"
              value={requestDueDate}
            />
            <SelectField
              id="client-request-priority"
              label="Priority"
              onChange={(event) => setRequestPriority(event.target.value as WorkflowRequest["priority"])}
              options={[
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
              ]}
              value={requestPriority}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsRequestModalOpen(false)} variant="secondary">Cancel</Button>
            <Button
              disabled={!requestTitle.trim() || !requestDetails.trim() || !requestDueDate}
              onClick={handleCreateRequest}
            >
              Send request
            </Button>
          </div>
          {requestFormError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {requestFormError}
              {lastFailedRequestPayload ? (
                <button
                  className="ml-2 rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold"
                  onClick={() => {
                    if (!user) {
                      return;
                    }
                    const retry = createClientRequest(lastFailedRequestPayload, user);
                    if (retry.ok) {
                      setRequestFormError("");
                      setLastFailedRequestPayload(null);
                      setIsRequestModalOpen(false);
                      setRequestTitle("");
                      setRequestDetails("");
                      setRequestPriority("medium");
                      setRequestDueDate("");
                    } else {
                      setRequestFormError(retry.message);
                    }
                  }}
                  type="button"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
