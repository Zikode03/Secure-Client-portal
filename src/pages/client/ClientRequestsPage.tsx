import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mail,
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

type ThreadFilter = "all" | "unread" | "resolved" | "unresolved";
const THREADS_PER_PAGE = 8;
const ATTACHMENT_PREFIX = "[[attachment:";
const ATTACHMENT_SUFFIX = "]]";

const inboxPanelClass =
  "rounded-2xl border border-[#dce6ef] bg-white shadow-[0_16px_38px_rgba(4,24,52,0.08)]";

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
    return "bg-amber-100 text-amber-800";
  }
  if (priority === "medium") {
    return "bg-brand-100 text-brand-700";
  }
  return "bg-slate-100 text-slate-700";
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

function requestGuidance(request: WorkflowRequest) {
  if (request.requestType === "renewal_request") {
    return "Renewal request: upload the latest compliance renewal files with date evidence.";
  }
  if (request.requestType === "re_upload_request") {
    return "Re-upload request: replace the rejected version in Documents or Monthly Packs.";
  }
  if (request.requestType === "clarification_request") {
    return "Clarification request: reply in this thread with details the accountant asked for.";
  }
  return "Monthly-pack follow-up: upload or correct the required supporting document.";
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const unreadTotal = requests.reduce((sum, request) => sum + unreadFromAccountantCount(request), 0);

  return (
    <section className={`${inboxPanelClass} overflow-hidden`}>
      <div className="border-b border-[#edf0f6] p-4">
        <div className="flex items-center gap-2 rounded-xl border border-[#dce6ef] bg-[#fbfcff] px-3 shadow-sm">
          <Search aria-hidden="true" className="h-4 w-4 text-[#53617f]" />
          <input
            className="h-11 w-full bg-transparent text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="Search messages..."
            value={searchValue}
          />
          <button
            className="client-dashboard-link inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white"
            aria-controls="advanced-thread-filters"
            aria-expanded={showAdvancedFilters}
            aria-haspopup="true"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f6] px-4 py-3 text-sm font-semibold">
        <button
          className={`rounded-full px-3 py-1.5 transition ${filter === "all" ? "client-dashboard-action-button" : "client-dashboard-link"}`}
          onClick={() => onChangeFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={`rounded-full px-3 py-1.5 transition ${filter === "unread" ? "client-dashboard-action-button" : "client-dashboard-link"}`}
          onClick={() => onChangeFilter("unread")}
          type="button"
        >
          Unread <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{unreadTotal}</span>
        </button>
        <button
          className={`rounded-full px-3 py-1.5 transition ${filter === "resolved" ? "client-dashboard-action-button" : "client-dashboard-link"}`}
          onClick={() => onChangeFilter("resolved")}
          type="button"
        >
          Resolved
        </button>
        <button
          className={`rounded-full px-3 py-1.5 transition ${filter === "unresolved" ? "client-dashboard-action-button" : "client-dashboard-link"}`}
          onClick={() => onChangeFilter("unresolved")}
          type="button"
        >
          Unresolved
        </button>
        {(filter === "resolved" || filter === "unresolved") ? (
          <button
            className="client-dashboard-link ml-auto rounded-lg px-2 py-1 text-xs font-semibold transition"
            onClick={() => onChangeFilter("all")}
            type="button"
          >
            Back to all
          </button>
        ) : null}
      </div>

      {showAdvancedFilters ? (
        <div className="flex items-center gap-2 border-b border-[#edf0f6] bg-[#fbfcff] px-4 py-3 text-xs" id="advanced-thread-filters" role="group">
          <span className="inline-flex items-center gap-1 font-semibold text-[#53617f]">
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            Quick:
          </span>
          <button
            className="client-dashboard-link rounded-full px-2 py-1 font-semibold transition"
            onClick={() => onChangeFilter("unread")}
            type="button"
          >
            Only unread
          </button>
          <button
            className="client-dashboard-link rounded-full px-2 py-1 font-semibold transition"
            onClick={() => onChangeFilter("unresolved")}
            type="button"
          >
            Needs action
          </button>
        </div>
      ) : null}

      <div className="max-h-[66vh] divide-y divide-[#edf0f6] overflow-y-auto">
        {requests.map((request) => {
          const selected = request.id === selectedRequestId;
          const lastComment = request.comments[request.comments.length - 1];
          const unread = unreadFromAccountantCount(request);
          return (
            <button
              className={`w-full px-4 py-4 text-left transition ${
                selected ? "bg-[#eef4fa]" : "hover:bg-[#fbfcff]"
              }`}
              key={request.id}
              onClick={() => onSelectRequest(request.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-base font-semibold text-[#091333]">{request.title}</p>
                <p className="text-xs font-medium text-[#53617f]">{formatThreadTime(lastActivity(request))}</p>
              </div>
              <p className="mt-1 text-sm font-medium text-[#53617f]">{request.requestedBy}</p>
              <p className="mt-1 line-clamp-1 text-sm text-[#7b879e]">
                {plainMessageText(lastComment?.message ?? request.description)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${priorityBadgeClass(request.priority)}`}>
                  {request.priority.toUpperCase()}
                </span>
                {unread > 0 ? <span className="text-xs font-semibold text-emerald-700">{unread} new</span> : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-[#edf0f6] px-4 py-3 text-xs font-medium text-[#53617f]">
        <span>
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex gap-2">
          <button
            className="client-dashboard-link rounded-lg px-2 py-1 font-semibold disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={onPrevPage}
            type="button"
          >
            Prev
          </button>
          <button
            className="client-dashboard-link rounded-lg px-2 py-1 font-semibold disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={onNextPage}
            type="button"
          >
            Next
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
    <section className={`${inboxPanelClass} overflow-hidden`}>
      <div className="flex items-start justify-between gap-4 border-b border-[#edf0f6] bg-[#fbfcff] p-6">
        <div>
          <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeClass(request.priority)}`}>
            {request.priority.toUpperCase()} PRIORITY
          </p>
          <h2 className="mt-3 text-[1.7rem] font-semibold tracking-tight text-[#091333]">{request.title}</h2>
          <p className="mt-2 text-sm text-[#53617f]">
            {request.monthLabel} | Pack ID: {request.id}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#53617f]">{requestGuidance(request)}</p>
        </div>
        <div className="min-w-[200px] rounded-xl border border-[#dce6ef] bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-[#53617f]">Assigned accountant</p>
          <p className="mt-1 text-sm font-semibold text-[#091333]">{assignedAccountantName}</p>
          <p className="text-xs text-[#7b879e]">{request.requestedBy}</p>
        </div>
      </div>

      <div className="max-h-[46vh] space-y-4 overflow-y-auto p-6">
        {request.comments.map((comment, index) => {
          const attachment = decodeAttachment(comment.message);
          const text = plainMessageText(comment.message);
          const status = messageStatus(request, index);
          return (
            <article
              className={`max-w-[78%] rounded-2xl border px-4 py-3 ${
                comment.role === "client"
                  ? "ml-auto border-emerald-100 bg-emerald-50"
                  : "border-[#dce6ef] bg-[#fbfcff]"
              }`}
              key={comment.id}
            >
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold text-[#091333]">{comment.author}</p>
                <p className="text-xs text-[#53617f]">{formatDateLabel(comment.createdAt)}</p>
              </div>
              {text ? <p className="text-sm leading-6 text-[#53617f]">{text}</p> : null}
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
              {status ? <p className="mt-2 text-xs text-[#7b879e]">{status}</p> : null}
            </article>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-[#edf0f6] bg-[#fbfcff] p-6">
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
        <div className="flex gap-3">
          <label className="client-dashboard-link inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold">
            <Paperclip aria-hidden="true" className="h-4 w-4" />
            Attach
            <input
              className="hidden"
              onChange={(event) => void handleAttachmentSelected(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <input
            className="h-12 flex-1 rounded-xl border border-[#dce6ef] bg-white px-4 text-sm text-[#091333] outline-none ring-brand-300 transition placeholder:text-[#7b879e] focus:ring-2"
            onChange={(event) => setReplyMessage(event.target.value)}
            placeholder="Type your message..."
            value={replyMessage}
          />
          <Button
            className="client-dashboard-action-button h-12 rounded-xl border-0 px-4 font-semibold ring-0"
            disabled={!replyMessage.trim() && !attachedFile}
            onClick={handleSend}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Send
          </Button>
          <Button
            className="client-dashboard-action-button h-12 rounded-xl border-0 px-4 font-semibold ring-0"
            onClick={() => onResolve(request.id)}
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Resolve
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
  const openRequestCount = useMemo(
    () => requests.filter((request) => request.status !== "resolved" && request.status !== "closed").length,
    [requests],
  );
  const resolvedRequestCount = useMemo(
    () => requests.filter((request) => request.status === "resolved" || request.status === "closed").length,
    [requests],
  );
  const unreadRequestCount = useMemo(
    () => requests.reduce((sum, request) => sum + unreadFromAccountantCount(request), 0),
    [requests],
  );
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
    <div className="client-inbox-page mx-auto max-w-[1280px] space-y-5 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
            Client Inbox
          </p>
          <h1 className="mt-1 text-[2.05rem] font-semibold tracking-tight text-[#091333]">Messages</h1>
          <p className="mt-2 max-w-2xl text-[0.96rem] leading-7 text-[#53617f]">
            Review accountant follow-ups, reply with context, and keep document requests moving.
          </p>
        </div>
        <div className="relative flex gap-2">
          <Button
            className="client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <MessageSquare aria-hidden="true" className="h-4 w-4" />
            Request document
          </Button>
          <Button
            className="client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
            onClick={() =>
              navigate(
                activeRequest
                  ? `/client/documents?requestId=${encodeURIComponent(activeRequest.id)}&from=inbox`
                  : "/client/documents?from=inbox",
              )}
          >
            <UploadCloud aria-hidden="true" className="h-4 w-4" />
            Upload document
          </Button>
          <button
            className="client-dashboard-action-button inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:-translate-y-0.5 active:translate-y-px"
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

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Open threads", value: openRequestCount, helper: "Waiting for action", icon: <Mail aria-hidden="true" className="h-5 w-5" /> },
          { label: "Unread replies", value: unreadRequestCount, helper: "From accountant", icon: <MessageSquare aria-hidden="true" className="h-5 w-5" /> },
          { label: "Resolved", value: resolvedRequestCount, helper: "Completed threads", icon: <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> },
        ].map((metric) => (
          <section className={`${inboxPanelClass} grid grid-cols-[auto_1fr] items-center gap-3 p-4`} key={metric.label}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee]">
              {metric.icon}
            </div>
            <div>
              <p className="text-[0.78rem] font-semibold text-[#53617f]">{metric.label}</p>
              <p className="mt-1 text-[1.45rem] font-semibold leading-none text-[#091333]">{metric.value}</p>
              <p className="mt-1 text-[0.78rem] text-[#7b879e]">{metric.helper}</p>
            </div>
          </section>
        ))}
      </section>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      {visibleRequests.length > 0 && activeRequest ? (
        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
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
