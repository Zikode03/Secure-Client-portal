import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Copy,
  Paperclip,
  Pin,
  RefreshCw,
  Forward,
  Reply,
  Search,
  Send,
  SlidersHorizontal,
  Square,
  Star,
  Trash2,
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
  checkedRequestIds,
  checkboxAnchorId,
  currentPage,
  isSelectionMode,
  onRefreshInbox,
  totalPages,
  onNextPage,
  onPrevPage,
  onToggleSelectionMode,
  onToggleSort,
  onToggleCheckedRequest,
  sortDirection,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (requestId: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  checkedRequestIds: string[];
  checkboxAnchorId: string;
  currentPage: number;
  isSelectionMode: boolean;
  onRefreshInbox: () => void;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleSelectionMode: () => void;
  onToggleSort: () => void;
  onToggleCheckedRequest: (requestId: string) => void;
  sortDirection: SortDirection;
}) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const unreadTotal = requests.reduce((sum, request) => sum + unreadFromAccountantCount(request), 0);
  const filterOptions: Array<{ label: string; value: ThreadFilter; count?: number }> = [
    { label: "All", value: "all" },
    { label: "Unread", value: "unread", count: unreadTotal },
    { label: "Resolved", value: "resolved" },
    { label: "Unresolved", value: "unresolved" },
  ];

  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden rounded-lg`}>
      <div className="flex min-h-[74px] items-center justify-between gap-3 border-b border-slate-100 bg-white px-4">
        <div className="flex min-w-0 items-center gap-7 text-sm font-semibold">
          <button
            className={`relative h-10 transition after:absolute after:inset-x-0 after:-bottom-3 after:h-1 after:rounded-full ${filter === "all" ? "text-[#091333] after:bg-[#00856f]" : "text-[#35466d] after:bg-transparent hover:text-[#091333]"}`}
            onClick={() => onChangeFilter("all")}
            type="button"
          >
            Focused
          </button>
        </div>
        <div className="relative flex shrink-0 items-center gap-3 text-[#061b41]">
          <button
            aria-pressed={isSelectionMode}
            aria-label="Selection mode"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${isSelectionMode || checkedRequestIds.length > 0 ? "bg-[#0a2f66]/10 text-[#00856f]" : "hover:bg-slate-50"}`}
            onClick={onToggleSelectionMode}
            title={isSelectionMode ? "Exit selection mode" : "Select messages"}
            type="button"
          >
            <Square aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Refresh inbox"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-slate-50"
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
            aria-label="Filter messages"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${filter !== "all" || isFilterMenuOpen ? "bg-[#0a2f66]/10" : "hover:bg-slate-50"}`}
            onClick={() => setIsFilterMenuOpen((current) => !current)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Sort messages"
            aria-pressed={sortDirection === "asc"}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${sortDirection === "asc" ? "bg-[#0a2f66]/10 text-[#00856f]" : "hover:bg-slate-50"}`}
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
                    filter === option.value ? "bg-[#eaf7f0] text-[#087d69]" : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]"
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

      <div className="border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 shadow-[0_10px_22px_rgba(4,24,52,0.06)]">
          <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
          <input
            className="h-full w-full bg-transparent text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="Search messages..."
            value={searchValue}
          />
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[#53617f]" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {requests.map((request) => {
          const selected = request.id === selectedRequestId;
          const checked = checkedRequestIds.includes(request.id);
          const showCheckbox = isSelectionMode || checkedRequestIds.length > 0 || checkboxAnchorId === request.id;
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
                  className="flex h-12 w-full items-center gap-2 border-y border-slate-100 bg-[#f7fafc] px-5 text-left text-sm font-semibold text-[#091333] transition hover:bg-[#eef4fa]"
                  onClick={() =>
                    setCollapsedSections((current) => ({
                      ...current,
                      [sectionLabel]: !current[sectionLabel],
                    }))
                  }
                  type="button"
                >
                  {isSectionCollapsed ? (
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-[#35466d]" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#35466d]" />
                  )}
                  {sectionLabel}
                </button>
              ) : null}
              {isSectionCollapsed ? null : (
              <button
                className={`relative mx-3 grid w-[calc(100%-1.5rem)] grid-cols-[auto_auto_1fr_auto] items-start gap-3 rounded-lg px-3 py-4 text-left transition ${
                  selected ? "bg-[#0a2f66]/[0.08] shadow-[0_10px_22px_rgba(4,24,52,0.08)]" : "hover:bg-slate-50"
                }`}
                onClick={() => onSelectRequest(request.id)}
                type="button"
              >
                {selected ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#0a2f66]/50" /> : null}
                <span className="mt-3.5 inline-flex h-4 w-4 items-center justify-center">
                  {showCheckbox ? (
                    <input
                      aria-label={`Select ${request.title}`}
                      checked={checked}
                      className="h-4 w-4 rounded border-[#8da0bd] text-[#087d69] accent-[#087d69]"
                      onChange={() => onToggleCheckedRequest(request.id)}
                      onClick={(event) => event.stopPropagation()}
                      type="checkbox"
                    />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                  )}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#061b41] text-sm font-semibold text-white shadow-sm">
                  {initials(request.requestedBy)}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="line-clamp-1 text-[0.92rem] font-semibold leading-5 text-[#091333]">{request.requestedBy}</p>
                  <p className="mt-0.5 line-clamp-1 text-[0.78rem] font-semibold leading-4 text-[#091333]">{request.title}</p>
                  <p className="mt-1 line-clamp-1 text-[0.75rem] font-medium leading-4 text-[#53617f]">{preview}</p>
                </div>
                <div className="flex min-h-14 shrink-0 flex-col items-end justify-between gap-1 pt-0.5">
                  <p className="text-[0.68rem] font-medium leading-4 text-[#061b41]">{formatShortThreadTime(lastActivity(request))}</p>
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
      <div className="flex min-h-[92px] items-center justify-between border-t border-slate-100 bg-white px-5 py-[18px] text-xs font-medium text-[#53617f]">
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
}: {
  request: WorkflowRequest;
  onReply: (requestId: string, message: string) => ActionResult;
  onResolve: (requestId: string) => void;
}) {
  const [replyMessage, setReplyMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<ParsedAttachment | null>(null);
  const [sendError, setSendError] = useState("");
  const [lastFailedPayload, setLastFailedPayload] = useState<{ requestId: string; message: string } | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenuState | null>(null);
  const [pinnedCommentIds, setPinnedCommentIds] = useState<string[]>([]);
  const [deletedCommentIds, setDeletedCommentIds] = useState<string[]>([]);
  const replyInputRef = useRef<HTMLInputElement | null>(null);
  const contextComment = useMemo(
    () => request.comments.find((comment) => comment.id === messageContextMenu?.commentId) ?? null,
    [messageContextMenu?.commentId, request.comments],
  );

  useEffect(() => {
    setIsStarred(false);
    setMessageContextMenu(null);
    setPinnedCommentIds([]);
    setDeletedCommentIds([]);
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

  function handleForwardThread() {
    const latestMessage = request.comments[request.comments.length - 1];
    const forwardedText = plainMessageText(latestMessage?.message ?? request.description);
    setReplyMessage(`Forwarded message:\n\n${forwardedText}`);
    window.setTimeout(() => focusReplyInput(), 0);
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

  function handleForwardMessage() {
    if (!contextComment) {
      return;
    }
    setReplyMessage(`Forwarded message:\n\n${plainMessageText(contextComment.message)}`);
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

  function handlePinMessage() {
    if (!contextComment) {
      return;
    }
    setPinnedCommentIds((current) =>
      current.includes(contextComment.id)
        ? current.filter((commentId) => commentId !== contextComment.id)
        : [...current, contextComment.id],
    );
    setMessageContextMenu(null);
  }

  function handleDeleteMessage() {
    if (!contextComment) {
      return;
    }
    setDeletedCommentIds((current) => [...new Set([...current, contextComment.id])]);
    setMessageContextMenu(null);
  }

  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden rounded-lg`} onClick={() => setMessageContextMenu(null)}>
      <p className="sr-only">{requestTypeHelperText(request)}</p>
      <div className="border-b border-slate-100 bg-white px-7 py-6">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className={`inline-flex rounded-full px-3 py-1 text-[0.7rem] font-semibold ${priorityBadgeClass(request.priority)}`}>
              {request.priority.toUpperCase()} PRIORITY
            </span>
            <h2 className="mt-5 text-[1.35rem] font-semibold tracking-tight text-[#091333]">{request.title}</h2>
            <div className="mt-4 text-xs font-medium text-[#8b97ad]">
              <p>
                Assigned accountant: <span className="font-semibold text-[#35466d]">{request.requestedBy} ({accountantEmail(request.requestedBy)})</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-10">
            <div className="flex items-center gap-4 text-[#061b41]">
              <button
                aria-label={isStarred ? "Unstar thread" : "Star thread"}
                aria-pressed={isStarred}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${isStarred ? "bg-amber-50 text-amber-500" : "hover:bg-slate-50"}`}
                onClick={() => setIsStarred((current) => !current)}
                type="button"
              >
                <Star aria-hidden="true" className={`h-4 w-4 ${isStarred ? "fill-current" : ""}`} />
              </button>
              <button
                aria-label="Reply to thread"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-slate-50"
                onClick={focusReplyInput}
                type="button"
              >
                <Reply aria-hidden="true" className="h-4 w-4 text-purple-600" />
              </button>
              <button
                aria-label="Forward thread"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-slate-50"
                onClick={handleForwardThread}
                type="button"
              >
                <Forward aria-hidden="true" className="h-4 w-4 text-blue-600" />
              </button>
            </div>
            <p className="text-xs font-semibold text-[#091333]">{formatDateLabel(lastActivity(request))}, {formatThreadTime(lastActivity(request))}</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white px-7 py-8">
            <div className="flex items-center gap-4 text-xs font-semibold text-[#53617f]">
              <span className="h-px flex-1 bg-slate-200" />
              Today
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            {request.comments.map((comment, index) => {
              if (deletedCommentIds.includes(comment.id)) {
                return null;
              }
              const attachment = decodeAttachment(comment.message);
              const text = plainMessageText(comment.message);
              const status = messageStatus(request, index);
              const isClient = comment.role === "client";
              const isPinned = pinnedCommentIds.includes(comment.id);
              return (
                <div className={`flex items-start gap-3 ${isClient ? "justify-end" : ""}`} key={comment.id}>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isClient ? "order-2 bg-[#d9efe6] text-[#047857]" : "bg-[#061b41] text-white"}`}>
                    {initials(comment.author)}
                  </span>
                  <article
                    className={`w-full max-w-[620px] rounded-lg border px-6 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${
                      isClient
                        ? "border-emerald-100 bg-[#eaf7f0]"
                        : "border-slate-200 bg-white"
                    } ${isPinned ? "ring-2 ring-[#061b41]/15" : ""}`}
                    onContextMenu={(event) => handleMessageContextMenu(event, comment.id)}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#091333]">{comment.author}</p>
                        {isPinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#061b41]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[#061b41]">
                            <Pin aria-hidden="true" className="h-3 w-3" />
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[#53617f]">{formatThreadTime(comment.createdAt)}</p>
                    </div>
                    {text ? <p className="text-sm leading-6 text-[#1e2f5b]">{text}</p> : null}
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
                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#091333] transition hover:bg-[#0a2f66]/10" onClick={handleForwardMessage} role="menuitem" type="button">
                  <Forward aria-hidden="true" className="h-4 w-4" />
                  Forward
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#091333] transition hover:bg-[#0a2f66]/10" onClick={handlePinMessage} role="menuitem" type="button">
                  <Pin aria-hidden="true" className="h-4 w-4" />
                  {pinnedCommentIds.includes(contextComment.id) ? "Unpin" : "Pin"}
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50" onClick={handleDeleteMessage} role="menuitem" type="button">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Delete
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
              <div className="flex h-14 min-w-[260px] flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 ring-brand-300 transition focus-within:ring-2">
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

function BulkSelectionPane({
  selectedCount,
  onClearSelection,
  onResolveSelected,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onResolveSelected: () => void;
}) {
  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden rounded-lg`}>
      <div className="border-b border-slate-100 bg-white px-7 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#53617f]">Bulk selection</p>
        <h2 className="mt-3 text-[1.45rem] font-semibold tracking-tight text-[#091333]">
          {selectedCount} messages selected
        </h2>
        <p className="mt-2 text-sm text-[#53617f]">
          Choose an action for the selected inbox items.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white px-7 py-8">
        <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
          <Button
            className="client-inbox-primary-button h-12 rounded-lg border-0 px-5 font-semibold ring-0"
            onClick={onResolveSelected}
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Mark resolved
          </Button>
          <Button
            className="client-inbox-secondary-button h-12 rounded-lg px-5 font-semibold"
            onClick={onClearSelection}
          >
            Clear selection
          </Button>
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
  const [checkedRequestIds, setCheckedRequestIds] = useState<string[]>([]);
  const [checkboxAnchorId, setCheckboxAnchorId] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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

  useEffect(() => {
    setCheckedRequestIds((current) =>
      current.filter((requestId) => visibleRequests.some((request) => request.id === requestId)),
    );
    setCheckboxAnchorId((current) =>
      current && visibleRequests.some((request) => request.id === current) ? current : "",
    );
  }, [visibleRequests]);

  function handleToggleCheckedRequest(requestId: string) {
    setIsSelectionMode(true);
    setCheckedRequestIds((current) =>
      current.includes(requestId)
        ? current.filter((selectedId) => selectedId !== requestId)
        : [...current, requestId],
    );
  }

  function handleClearSelection() {
    setCheckedRequestIds([]);
    setCheckboxAnchorId("");
    setIsSelectionMode(false);
  }

  function handleToggleSelectionMode() {
    setIsSelectionMode((current) => {
      if (current) {
        setCheckedRequestIds([]);
        setCheckboxAnchorId("");
      }
      return !current;
    });
  }

  function handleRefreshInbox() {
    setSearchValue("");
    setFilter("all");
    setCurrentPage(1);
    setSortDirection("desc");
    handleClearSelection();
  }

  function handleResolveCheckedRequests() {
    checkedRequestIds.forEach((requestId) => resolveRequest(requestId));
    handleClearSelection();
  }

  function handleSelectInboxRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setCheckboxAnchorId(requestId);
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
    <div className="client-inbox-page mx-auto max-w-[1500px] space-y-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.55rem] font-semibold tracking-tight text-[#091333]">Inbox</h1>
          <p className="mt-1 max-w-2xl text-[0.9rem] leading-6 text-[#53617f]">
            Review accountant follow-ups, reply with context, and keep document requests moving.
          </p>
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
          className="client-inbox-layout grid items-stretch gap-4"
          style={{
            gridTemplateColumns: isDesktopInboxLayout ? "440px minmax(0, 1fr)" : "minmax(0, 1fr)",
          }}
        >
          <ThreadListPane
            checkboxAnchorId={checkboxAnchorId}
            checkedRequestIds={checkedRequestIds}
            currentPage={currentPage}
            filter={filter}
            isSelectionMode={isSelectionMode}
            onChangeFilter={setFilter}
            onChangeSearch={setSearchValue}
            onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            onRefreshInbox={handleRefreshInbox}
            onSelectRequest={handleSelectInboxRequest}
            onToggleSelectionMode={handleToggleSelectionMode}
            onToggleSort={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
            onToggleCheckedRequest={handleToggleCheckedRequest}
            requests={pagedRequests}
            searchValue={searchValue}
            selectedRequestId={activeRequest.id}
            sortDirection={sortDirection}
            totalPages={totalPages}
          />
          {checkedRequestIds.length >= 2 ? (
            <BulkSelectionPane
              onClearSelection={handleClearSelection}
              onResolveSelected={handleResolveCheckedRequests}
              selectedCount={checkedRequestIds.length}
            />
          ) : (
            <ConversationPane
              onReply={(requestId, message) =>
                replyToRequest(requestId, "client", user?.fullName ?? "Client", message)}
              onResolve={resolveRequest}
              request={activeRequest}
            />
          )}
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
