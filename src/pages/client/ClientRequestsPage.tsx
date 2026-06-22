import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Copy,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
  SlidersHorizontal,
  Star,
} from "lucide-react";
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
type SortDirection = "desc" | "asc";
const THREADS_PER_PAGE = 8;
const ATTACHMENT_PREFIX = "[[attachment:";
const ATTACHMENT_SUFFIX = "]]";

const inboxPanelClass =
  "border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(4,24,52,0.07)]";

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

interface MessageContextMenuState {
  commentId: string;
  x: number;
  y: number;
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
    return "bg-amber-50 text-amber-700";
  }
  return "bg-emerald-50 text-emerald-700";
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

  if (date.toDateString() === now.toDateString()) {
    return formatThreadTime(value);
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function inboxSectionLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (daysAgo <= 0) {
    return "Today";
  }
  if (daysAgo <= 7) {
    return "This week";
  }
  return "Last week";
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

function requestTypeHelperText(request: WorkflowRequest) {
  if (request.requestType === "clarification_request") {
    return "Clarification request: reply in this thread with details the accountant asked for.";
  }
  if (request.requestType === "renewal_request") {
    return "Renewal request: upload the latest compliance renewal files with date evidence.";
  }
  if (request.requestType === "re_upload_request") {
    return "Re-upload request: replace the rejected file so review can continue.";
  }
  if (request.requestType === "missing_document_request") {
    return "Document request: upload the requested file or reply if the document is not available.";
  }
  return "";
}

function accountantEmail(name: string) {
  const localPart = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return `${localPart || "accountant"}@apex.co.za`;
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
  onRefreshInbox,
  totalPages,
  onNextPage,
  onPrevPage,
  onToggleSort,
  sortDirection,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (requestId: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  currentPage: number;
  onRefreshInbox: () => void;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleSort: () => void;
  sortDirection: SortDirection;
}) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const unreadTotal = requests.reduce((sum, request) => sum + unreadFromAccountantCount(request), 0);
  const visibleThreadCount = requests.length;
  const filterOptions: Array<{ label: string; value: ThreadFilter; count?: number }> = [
    { label: "Inbox", value: "all" },
    { label: "Unread", value: "unread", count: unreadTotal },
    { label: "Resolved", value: "resolved" },
    { label: "Unresolved", value: "unresolved" },
  ];

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isFilterMenuOpen]);

  return (
    <section className={`${inboxPanelClass} flex min-h-[720px] self-start flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(2,8,23,0.08)]`}>
      <div className="border-b border-slate-200 bg-white px-4 py-3 text-[#091333]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-[0.95rem] font-semibold">
            <button
              className="relative pb-2 text-[#091333]"
              onClick={() => onChangeFilter("all")}
              type="button"
            >
              Inbox
              <span className="absolute inset-x-0 -bottom-0 h-0.5 rounded-full bg-[#00856f]" />
            </button>
            <span className="whitespace-nowrap rounded-full bg-[#eef4fa] px-3 py-1 text-[0.72rem] font-semibold text-[#41506f]">
              {visibleThreadCount} thread{visibleThreadCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="relative flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[#061b41]" ref={filterMenuRef}>
            <button
              aria-label="Refresh inbox"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white"
              onClick={() => {
                setCollapsedSections({});
                setIsFilterMenuOpen(false);
                onRefreshInbox();
              }}
              title="Refresh inbox"
              type="button"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-expanded={isFilterMenuOpen}
              aria-haspopup="menu"
              aria-label="Filter threads"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${filter !== "all" || isFilterMenuOpen ? "bg-[#0a2f66]/10 text-[#00856f]" : "hover:bg-white"}`}
              onClick={() => setIsFilterMenuOpen((current) => !current)}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Sort threads"
              aria-pressed={sortDirection === "asc"}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${sortDirection === "asc" ? "bg-[#0a2f66]/10 text-[#00856f]" : "hover:bg-white"}`}
              onClick={onToggleSort}
              title={sortDirection === "desc" ? "Newest first" : "Oldest first"}
              type="button"
            >
              <ArrowUpDown aria-hidden="true" className="h-4 w-4" />
            </button>
            {isFilterMenuOpen ? (
              <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
                {filterOptions.map((option) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition ${
                      filter === option.value ? "bg-[#eef4fa] text-[#0a2f66]" : "text-[#41506f] hover:bg-slate-50 hover:text-[#091333]"
                    }`}
                    key={option.value}
                    onClick={() => {
                      onChangeFilter(option.value);
                      setIsFilterMenuOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span>{option.label}</span>
                    {option.count ? <span className="text-[#091333]">{option.count}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-[0_10px_22px_rgba(4,24,52,0.05)]">
          <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
          <input
            className="h-full w-full bg-transparent text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="Search threads..."
            value={searchValue}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {requests.map((request) => {
          const selected = request.id === selectedRequestId;
          const unread = unreadFromAccountantCount(request);
          const lastComment = request.comments[request.comments.length - 1];
          const preview = plainMessageText(lastComment?.message ?? request.description);
          const sectionLabel = inboxSectionLabel(lastActivity(request));
          const previousRequest = requests[requests.indexOf(request) - 1];
          const previousSection = previousRequest ? inboxSectionLabel(lastActivity(previousRequest)) : "";
          const showSection = requests.indexOf(request) === 0 || sectionLabel !== previousSection;
          const isSectionCollapsed = Boolean(collapsedSections[sectionLabel]);
          return (
            <div key={request.id}>
              {showSection ? (
                <button
                  aria-expanded={!isSectionCollapsed}
                  className="flex h-14 w-full items-center gap-2 border-y border-slate-100 bg-[#f7fafc] px-5 text-left text-[0.95rem] font-semibold text-[#091333] transition hover:bg-[#eef4fa]"
                  onClick={() =>
                    setCollapsedSections((current) => ({
                      ...current,
                      [sectionLabel]: !current[sectionLabel],
                    }))
                  }
                  type="button"
                >
                  {isSectionCollapsed ? (
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-[#53617f]" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#53617f]" />
                  )}
                  {sectionLabel}
                </button>
              ) : null}
              {isSectionCollapsed ? null : (
              <button
                className={`relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border-b px-4 py-4 text-left transition ${
                  selected
                    ? "border-[#c8d6ee] bg-[#eef4fb] text-[#091333]"
                    : "border-slate-100 bg-white text-[#091333] hover:bg-slate-50"
                }`}
                onClick={() => onSelectRequest(request.id)}
                type="button"
              >
                {selected ? <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-[#0a2f66]/60" /> : null}
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold shadow-sm ${
                  selected ? "bg-[#061b41] text-white ring-2 ring-[#0a2f66]/10" : "bg-[#061b41] text-white"
                }`}>
                  {initials(request.requestedBy)}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 min-w-0 text-[0.98rem] font-semibold leading-5 text-[#091333]">{request.requestedBy}</p>
                    <p className={`shrink-0 text-[0.8rem] font-medium leading-4 ${selected ? "text-[#061b41]" : "text-[#53617f]"}`}>{formatShortThreadTime(lastActivity(request))}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[0.9rem] font-semibold leading-5 text-[#091333]">{request.title}</p>
                  <p className={`mt-1 line-clamp-1 text-[0.82rem] font-medium leading-5 ${selected ? "text-[#41506f]" : "text-[#53617f]"}`}>{preview}</p>
                </div>
                <div className="flex min-h-12 shrink-0 flex-col items-end justify-between gap-1 pt-0.5">
                  <span className="block h-4" />
                  {unread > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#087d69] px-1.5 text-[0.62rem] font-bold leading-none text-white">
                      {unread}
                    </span>
                  ) : null}
                </div>
              </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex min-h-[72px] items-center justify-between border-t border-slate-100 bg-white px-5 py-4 text-xs font-medium text-[#53617f]">
        <span className="font-semibold text-[#091333]">Page {currentPage} of {totalPages}</span>
        <div className="flex items-center gap-7">
          <button
            className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#061b41] transition hover:text-[#0a2f66] disabled:pointer-events-none disabled:text-[#9aa8ba] disabled:opacity-70"
            disabled={currentPage <= 1}
            onClick={onPrevPage}
            type="button"
          >
            Prev
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#061b41] transition hover:text-[#0a2f66] disabled:pointer-events-none disabled:text-[#9aa8ba] disabled:opacity-70"
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
  onToggleStar,
}: {
  request: WorkflowRequest;
  onReply: (requestId: string, message: string) => ActionResult;
  onResolve: (requestId: string) => void;
  onToggleStar: (requestId: string) => void;
}) {
  const [replyMessage, setReplyMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<ParsedAttachment | null>(null);
  const [sendError, setSendError] = useState("");
  const [lastFailedPayload, setLastFailedPayload] = useState<{ requestId: string; message: string } | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenuState | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);
  const contextComment = useMemo(
    () => request.comments.find((comment) => comment.id === messageContextMenu?.commentId) ?? null,
    [messageContextMenu?.commentId, request.comments],
  );

  useEffect(() => {
    setMessageContextMenu(null);
  }, [request.id]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMessageContextMenu(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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

  function focusReplyInput() {
    replyInputRef.current?.focus();
  }

  function handleMessageContextMenu(event: MouseEvent, commentId: string) {
    event.preventDefault();
    setMessageContextMenu({ commentId, x: event.clientX, y: event.clientY });
  }

  function handleReplyToMessage() {
    if (!contextComment) {
      return;
    }
    setReplyMessage(`Replying to ${contextComment.author}: `);
    setMessageContextMenu(null);
    window.setTimeout(() => focusReplyInput(), 0);
  }

  function handleCopyMessage() {
    if (!contextComment) {
      return;
    }
    void navigator.clipboard?.writeText(plainMessageText(contextComment.message));
    setMessageContextMenu(null);
  }

  return (
    <section className={`${inboxPanelClass} flex min-h-[720px] self-start flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(2,8,23,0.08)]`} onClick={() => setMessageContextMenu(null)}>
      <p className="sr-only">{requestTypeHelperText(request)}</p>
      <div className="border-b border-slate-100 bg-white px-5 py-4 text-[#091333]">
        <h2 className="line-clamp-1 text-[1.1rem] font-semibold">{request.title}</h2>
      </div>

      <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-7 py-6">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-3 py-1 text-[0.7rem] font-semibold ${priorityBadgeClass(request.priority)}`}>
              {request.priority.toUpperCase()} PRIORITY
            </span>
            <h2 className="mt-4 max-w-3xl text-[1.35rem] font-semibold leading-[1.32] tracking-[-0.01em] text-[#091333] md:text-[1.45rem]">
              {request.title}
            </h2>
            <div className="mt-5 text-xs font-medium text-[#7b879e]">
              <p>
                Assigned accountant: <span className="font-semibold text-[#35466d]">{request.requestedBy} ({accountantEmail(request.requestedBy)})</span>
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:items-end">
            <div className="flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-[#061b41] shadow-sm lg:self-end">
              <button
                aria-label={request.isStarred ? "Unstar thread" : "Star thread"}
                aria-pressed={request.isStarred}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                  request.isStarred ? "bg-[#eef4fa] text-[#0a2f66]" : "text-[#061b41] hover:bg-slate-50 hover:text-[#0a2f66]"
                }`}
                onClick={() => onToggleStar(request.id)}
                title={request.isStarred ? "Unstar thread" : "Star thread"}
                type="button"
              >
                <Star aria-hidden="true" className={`h-4 w-4 ${request.isStarred ? "fill-current" : ""}`} />
              </button>
              <button
                aria-label="Reply to thread"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#0a2f66] transition hover:bg-[#eef4fa] hover:text-[#061b41]"
                onClick={focusReplyInput}
                title="Reply to thread"
                type="button"
              >
                <Reply aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm font-semibold text-[#091333] lg:text-right">{formatDateLabel(lastActivity(request))}, {formatThreadTime(lastActivity(request))}</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-7 py-8">
            <div className="flex items-center gap-4 text-xs font-semibold text-[#53617f]">
              <span className="h-px flex-1 bg-slate-200" />
              Today
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            {request.comments.map((comment, index) => {
              const attachment = decodeAttachment(comment.message);
              const text = plainMessageText(comment.message);
              const status = messageStatus(request, index);
              const isClient = comment.role === "client";
              return (
                <div className={`flex items-start gap-3 ${isClient ? "justify-end" : ""}`} key={comment.id}>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isClient ? "order-2 bg-[#d9efe6] text-[#047857]" : "bg-[#061b41] text-white"}`}>
                    {initials(comment.author)}
                  </span>
                  <article
                    className={`w-full max-w-[720px] rounded-xl border px-6 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.12)] ${
                      isClient
                        ? "border-emerald-100 bg-[#eaf7f0]"
                        : "border-slate-200 bg-white"
                    }`}
                    onContextMenu={(event) => handleMessageContextMenu(event, comment.id)}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#091333]">{comment.author}</p>
                      <p className="text-xs text-[#53617f]">{formatThreadTime(comment.createdAt)}</p>
                    </div>
                    {text ? <p className={`text-sm leading-6 ${isClient ? "text-[#1f513f]" : "text-[#1e2f5b]"}`}>{text}</p> : null}
                    {attachment ? (
                      <a
                        className="client-dashboard-link mt-3 inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold"
                        download={attachment.name}
                        href={attachment.dataUrl}
                      >
                        <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
                        Download: {attachment.name}
                      </a>
                    ) : null}
                    {status ? <p className="mt-2 text-right text-xs text-emerald-700">{status}</p> : null}
                  </article>
                </div>
              );
            })}
            {messageContextMenu && contextComment ? (
              <div
                className="fixed z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-[0_18px_44px_rgba(4,24,52,0.16)]"
                onClick={(event) => event.stopPropagation()}
                role="menu"
                style={{ left: messageContextMenu.x, top: messageContextMenu.y }}
              >
                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#091333] transition hover:bg-[#0a2f66]/10" onClick={handleReplyToMessage} role="menuitem" type="button">
                  <Reply aria-hidden="true" className="h-4 w-4" />
                  Reply
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#091333] transition hover:bg-[#0a2f66]/10" onClick={handleCopyMessage} role="menuitem" type="button">
                  <Copy aria-hidden="true" className="h-4 w-4" />
                  Copy
                </button>
              </div>
            ) : null}
          </div>

          <div className="min-h-[92px] space-y-3 border-t border-slate-100 bg-white px-7 py-[18px]">
            {attachedFile ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#53617f]">
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
              <div className="flex h-14 min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:ring-2 focus-within:ring-[#0a2f66]/20">
                <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#061b41] transition hover:bg-[#0a2f66]/10">
                  <Paperclip aria-hidden="true" className="h-5 w-5" />
                  <span className="sr-only">Attach</span>
                  <input
                    className="hidden"
                    onChange={(event) => void handleAttachmentSelected(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <input
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
                  onChange={(event) => setReplyMessage(event.target.value)}
                  placeholder="Type your message..."
                  ref={replyInputRef}
                  value={replyMessage}
                />
              </div>
              <Button
                aria-label="Send"
                className="client-inbox-primary-button h-14 w-14 shrink-0 rounded-lg border-0 p-0 ring-0 disabled:opacity-100"
                disabled={!replyMessage.trim() && !attachedFile}
                onClick={handleSend}
                title="Send"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Resolve"
                className="client-inbox-primary-button h-14 w-14 shrink-0 rounded-lg border-0 p-0 ring-0"
                onClick={() => onResolve(request.id)}
                title="Resolve"
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
      </div>
    </section>
  );
}

export function ClientRequestsPage() {
  const { user } = useAuth();
  const {
    createClientRequest,
    dismissFeedbackNotice,
    feedbackNotice,
    replyToRequest,
    requests,
    resolveRequest,
    toggleRequestStar,
  } = useClientWorkflow();

  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestPriority, setRequestPriority] = useState<WorkflowRequest["priority"]>("medium");
  const [requestDueDate, setRequestDueDate] = useState("");
  const [requestFormError, setRequestFormError] = useState("");
  const [lastFailedRequestPayload, setLastFailedRequestPayload] = useState<{
    title: string;
    description: string;
    dueDate: string;
    priority: WorkflowRequest["priority"];
    monthLabel: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isDesktopInboxLayout, setIsDesktopInboxLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );

  const orderedRequests = useMemo(
    () =>
      [...requests].sort((a, b) =>
        sortDirection === "desc"
          ? lastActivity(b).localeCompare(lastActivity(a))
          : lastActivity(a).localeCompare(lastActivity(b)),
      ),
    [requests, sortDirection],
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

  useEffect(() => {
    function handleResize() {
      setIsDesktopInboxLayout(window.innerWidth >= 1024);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleRefreshInbox() {
    setSearchValue("");
    setFilter("all");
    setCurrentPage(1);
    setSortDirection("desc");
  }

  function handleSelectInboxRequest(requestId: string) {
    setSelectedRequestId(requestId);
  }

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
    <div className="client-inbox-page mx-auto max-w-[1700px] px-6 space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#8190ab]">
            Client communications
          </p>
          <p className="max-w-2xl text-[0.95rem] leading-6 text-[#53617f]">
            Review accountant follow-ups, reply with context, and keep document requests moving.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            className="client-inbox-primary-button h-11 rounded-xl border-0 px-4 text-sm font-semibold ring-0"
            onClick={() => setIsRequestModalOpen(true)}
          >
            Request document
          </Button>
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-[#41506f] shadow-[0_10px_24px_rgba(4,24,52,0.06)] ring-1 ring-slate-200">
            {visibleRequests.length} active thread{visibleRequests.length === 1 ? "" : "s"}
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

      {visibleRequests.length > 0 && activeRequest ? (
        <div
          className="client-inbox-layout grid items-start gap-4"
          style={{
            gridTemplateColumns: isDesktopInboxLayout ? "clamp(320px, 27vw, 380px) minmax(0, 1.75fr)" : "minmax(0, 1fr)",
          }}
        >
          <ThreadListPane
            currentPage={currentPage}
            filter={filter}
            onChangeFilter={setFilter}
            onChangeSearch={setSearchValue}
            onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            onRefreshInbox={handleRefreshInbox}
            onSelectRequest={handleSelectInboxRequest}
            onToggleSort={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
            requests={pagedRequests}
            searchValue={searchValue}
            selectedRequestId={activeRequest.id}
            sortDirection={sortDirection}
            totalPages={totalPages}
          />
          <ConversationPane
            onReply={(requestId, message) =>
              replyToRequest(requestId, "client", user?.fullName ?? "Client", message)}
            onResolve={resolveRequest}
            onToggleStar={toggleRequestStar}
            request={activeRequest}
          />
        </div>
      ) : (
        <section className={`${inboxPanelClass} px-6 py-10 text-center`}>
          <h2 className="text-xl font-semibold text-[#091333]">
            {requests.length > 0 ? "No threads match your filters" : "No threads yet"}
          </h2>
          <p className="mt-2 text-sm text-[#53617f]">
            {requests.length > 0
              ? "Try clearing search or switching back to Inbox."
              : "Your accountant will start threads here when action is needed."}
          </p>
          {requests.length > 0 ? (
          <div className="mt-4">
              <Button onClick={() => {
                setSearchValue("");
                setFilter("all");
                setCurrentPage(1);
              }}
              className="client-inbox-primary-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0"
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
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4">
            <p className="text-sm font-semibold text-[#091333]">Tell your accountant what you need.</p>
            <p className="mt-1 text-sm leading-6 text-[#53617f]">
              Add the document name, a short explanation, and when you need it by.
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(4,24,52,0.04)]">
            <div className="mb-4">
              <p className="text-sm font-semibold text-[#091333]">Request details</p>
              <p className="mt-1 text-xs text-[#7b879e]">Keep the request specific so the accountant knows exactly what to prepare.</p>
            </div>
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
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(4,24,52,0.04)]">
            <div className="mb-4">
              <p className="text-sm font-semibold text-[#091333]">Timing and priority</p>
              <p className="mt-1 text-xs text-[#7b879e]">Set the due date and urgency level for this request.</p>
            </div>
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
          </section>

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

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-2">
            <Button className="client-inbox-primary-button h-11 rounded-xl border-0 px-4 text-sm font-semibold ring-0" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="client-inbox-primary-button h-11 rounded-xl border-0 px-5 text-sm font-semibold ring-0"
              disabled={!requestTitle.trim() || !requestDetails.trim() || !requestDueDate}
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
