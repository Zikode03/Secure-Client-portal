import "./accountantInbox.css";
import { InboxListControls } from "../../components/inbox/InboxListControls";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Flag,
  Plus,
  MoreHorizontal,
  Paperclip,
  Send,
  UserRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { inboxAttachmentAccept, validateInboxAttachment } from "../../components/inbox/attachmentPolicy";
import { InboxContextDrawer } from "../../components/inbox/InboxContextDrawer";
import { InboxStatusBadge } from "../../components/inbox/InboxStatusBadge";
import { useInboxDraft } from "../../components/inbox/useInboxDraft";
import { useInboxReadState } from "../../components/inbox/useInboxReadState";
import {
  inboxRequestKindOptions,
  requestTitleForKind,
  requestTypeForKind,
  type InboxRequestKind,
} from "../../components/inbox/requestKinds";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPatchJson, apiPostForm, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { portalServiceApi } from "../../services/portalApi";
import type { FirmClientAccount, WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedRequests } from "../../utils/permissions";
import { toBackendRequestType, toFrontendRequestType } from "../../utils/requestTypeMapping";

type ThreadFilter = "all" | "unread" | "resolved" | "unresolved";
type ThreadSort = "activity" | "priority" | "due";
const THREADS_PER_PAGE = 10;
const ATTACHMENT_PREFIX = "[[attachment:";
const ATTACHMENT_SUFFIX = "]]";

const PREF_KEY = "firm-inbox-preferences-v1";
const inboxPanelClass =
  "border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(4,24,52,0.07)]";

interface ParsedAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

interface BackendRequestRecord {
  id: string;
  clientId: string;
  requestType: string;
  relatedDocumentId?: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDateUtc?: string | null;
  requestedByUserId: string;
  requestedAtUtc: string;
  updatedAtUtc: string;
}

interface BackendRequestComment {
  id: string;
  requestId: string;
  clientId: string;
  authorUserId: string;
  authorRole: string;
  isInternal: boolean;
  message: string;
  createdAtUtc: string;
}

interface BackendRequestWorkspace {
  request: BackendRequestRecord;
  comments: BackendRequestComment[];
}

function defaultFollowUpDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

async function dataUrlToFile(attachment: ParsedAttachment) {
  const response = await fetch(attachment.dataUrl);
  const blob = await response.blob();
  return new File([blob], attachment.name, {
    type: attachment.mimeType || blob.type || "application/octet-stream",
  });
}

function encodeAttachment(attachment: ParsedAttachment) {
  return `${ATTACHMENT_PREFIX}${encodeURIComponent(JSON.stringify(attachment))}${ATTACHMENT_SUFFIX}`;
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


function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DM";
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

function formatChipDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toRequestPriority(priority?: string): WorkflowRequest["priority"] {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function normalizeAccountantRequestStatus(status?: string): WorkflowRequest["status"] {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "resolved") {
    return "resolved";
  }

  if (normalized === "closed") {
    return "closed";
  }

  if (normalized === "awaiting_client" || normalized === "waiting_on_client" || normalized === "overdue") {
    return "awaiting_client";
  }

  return "awaiting_accountant";
}

function formatMonthLabel(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return formatDateLabel(new Date().toISOString());
  }

  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function mapBackendAccountantRequest(
  workspace: BackendRequestWorkspace,
  accountantName: string,
  clientName: string,
  accountantUserId: string,
): WorkflowRequest {
  const requestedByRole = workspace.request.requestedByUserId === accountantUserId ? "accountant" : "client";

  return {
    id: workspace.request.id,
    clientId: workspace.request.clientId,
    clientName,
    title: workspace.request.title,
    description: workspace.request.description,
    monthLabel: formatMonthLabel(workspace.request.dueDateUtc ?? workspace.request.requestedAtUtc),
    status: normalizeAccountantRequestStatus(workspace.request.status),
    priority: toRequestPriority(workspace.request.priority),
    relatedDocumentId: workspace.request.relatedDocumentId ?? undefined,
    requestedBy: requestedByRole === "accountant" ? accountantName : clientName,
    requestedByRole,
    assignedTo: clientName,
    dueDate: workspace.request.dueDateUtc ?? workspace.request.updatedAtUtc,
    createdAt: workspace.request.requestedAtUtc,
    requestType: toFrontendRequestType(workspace.request.requestType),
    comments: workspace.comments.map((comment) => ({
      id: comment.id,
      author: comment.authorRole === "client" ? clientName : accountantName,
      role: comment.authorRole === "client" ? "client" : "accountant",
      message: comment.isInternal ? `[INTERNAL] ${comment.message}` : comment.message,
      createdAt: comment.createdAtUtc,
    })),
    auditTrail: [],
  };
}

function dueControlStatus(value: string) {
  const due = new Date(value);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((now.getTime() - due.getTime()) / 86_400_000);

  if (days > 0) return `Overdue by ${days} ${days === 1 ? "day" : "days"}`;
  if (days === 0) return "Due today";
  return `Due in ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`;
}

function isInternalNote(message: string) {
  return message.startsWith("[INTERNAL]");
}

function stripInternalPrefix(message: string) {
  return message.replace(/^\[INTERNAL\]\s*/, "");
}

function inboxSectionLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (daysAgo <= 0) return "Today";
  if (daysAgo <= 7) return "This week";
  return "Last week";
}

function ThreadListPane({
  requests,
  selectedRequestId,
  onSelectRequest,
  filter,
  onChangeFilter,
  sortMode,
  onChangeSort,
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
  readThreadIds,
  searchValue,
  onChangeSearch,
  onRequestDocuments,
}: {
  onRequestDocuments: () => void;
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (requestId: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  sortMode: ThreadSort;
  onChangeSort: (value: ThreadSort) => void;
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  readThreadIds: ReadonlySet<string>;
  searchValue: string;
  onChangeSearch: (value: string) => void;
}) {
  return (
    <section aria-label="Conversations" className="flex h-full min-h-0 max-h-[420px] flex-col min-[1080px]:max-h-none overflow-hidden bg-white min-[1080px]:min-h-0 min-[1080px]:border-r min-[1080px]:border-slate-200">
      <InboxListControls headingActions={<button className="inbox-new-request" type="button" aria-label="Request document" onClick={onRequestDocuments}><Plus size={16} aria-hidden="true" />Request</button>} filter={filter} onChangeFilter={onChangeFilter} searchValue={searchValue} onChangeSearch={onChangeSearch} actions={<label className="flex items-center gap-2">Sort by
          <select aria-label="Sort conversations" value={sortMode} onChange={event => onChangeSort(event.target.value as ThreadSort)} className="rounded border border-slate-200 bg-white px-2 py-1.5">
            <option value="activity">Latest activity</option><option value="priority">Priority</option><option value="due">Due date</option>
          </select>
        </label>} />

      <div className="inbox-scroll-region min-h-0 flex-1 bg-white pb-3 pr-1">
        {requests.map((request, index) => {
          const selected = request.id === selectedRequestId;
          const lastComment = request.comments[request.comments.length - 1];
          const unread = readThreadIds.has(request.id) ? 0 : trailingClientUnreadCount(request);
          const sectionLabel = inboxSectionLabel(lastActivity(request));
          const previousRequest = requests[index - 1];
          const previousSection = previousRequest ? inboxSectionLabel(lastActivity(previousRequest)) : "";
          const showSection = index === 0 || sectionLabel !== previousSection;

          return (
            <div key={request.id}>
              {showSection ? (
                <div className="flex h-9 w-full items-center gap-2 border-b border-slate-100 bg-[#f7f9fc] px-4 text-left text-sm font-medium text-[#091333] sm:px-4 lg:px-4">
                  {sectionLabel}
                </div>
              ) : null}
              <button
                className={`relative grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left transition sm:px-4 lg:px-4 lg:py-3.5 ${
                  selected ? "bg-[#eef3fb] shadow-[inset_0_0_0_1px_rgba(127,155,203,0.14)]" : "hover:bg-slate-50/80"
                }`}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelectRequest(request.id)}
                type="button"
              >
                {selected ? <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[#7f9bcb]" /> : null}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b2451] text-base font-medium text-white shadow-[0_8px_18px_rgba(11,36,81,0.18)]">
                  {initials(request.clientName)}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-base font-medium leading-5 text-[#091333]">{request.clientName}</p>
                    <p className="shrink-0 text-sm font-medium text-[#091333]">{formatShortThreadTime(lastActivity(request))}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm font-medium leading-5 text-[#091333]">{request.title}</p>
                  <p className="mt-1 line-clamp-1 text-sm font-medium leading-5 text-[#5f7090]">
                    {lastComment?.message ?? request.description}
                  </p>
                </div>
                <div className="col-start-2 flex items-center justify-between gap-2 pb-1">
                  <InboxStatusBadge audience="firm" className="text-sm" status={request.status} />
                  {unread > 0 ? (
                    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#087d69] px-1.5 text-sm font-semibold leading-none text-white">
                      {unread}
                    </span>
                  ) : null}
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <div className="inbox-thread-pagination flex min-h-[58px] shrink-0 items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        <span>Page {currentPage} of {totalPages}</span>
        <div className="flex items-center gap-4">
          <button disabled={currentPage <= 1} onClick={onPrevPage} type="button" className="font-semibold text-slate-700 disabled:opacity-35">Prev</button>
          <button disabled={currentPage >= totalPages} onClick={onNextPage} type="button" className="font-semibold text-slate-700 disabled:opacity-35">Next</button>
        </div>
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
  onEscalate,
  onForward,
  onReassign,
  onUpdateAssignment,
}: {
  request: WorkflowRequest;
  messageDraft: string;
  isInternal: boolean;
  onChangeInternal: (value: boolean) => void;
  onChangeMessageDraft: (value: string) => void;
  onSendMessage: (messageOverride?: string) => void;
  onResolve: () => void;
  onSetAwaitingClient: () => void;
  onSetOpen: () => void;
  onSetClosed: () => void;
  onEscalate: () => void;
  onForward: () => void;
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ParsedAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAssignedToDraft(request.assignedTo);
    setDueDateDraft(request.dueDate.slice(0, 10));
    setPriorityDraft(request.priority);
    setAddAuditNote(false);
    setIsMoreMenuOpen(false);
    setAttachedFile(null);
  }, [request.assignedTo, request.dueDate, request.priority, request.id]);

  function handleAddInternalNote() {
    onChangeInternal(true);
    replyInputRef.current?.focus();
  }

  async function handleAttachmentSelected(file: File | null) {
    if (!file) {
      setAttachedFile(null);
      return;
    }

    const validationError = validateInboxAttachment(file);
    if (validationError) {
      setAttachmentError(validationError);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

    setAttachedFile({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
    });
    setAttachmentError("");
  }

  function handleComposerSend() {
    const message = messageDraft.trim();
    if (!message && !attachedFile) {
      return;
    }

    const composedMessage = attachedFile
      ? `${message || "Attached file for review."}\n\n${encodeAttachment(attachedFile)}`
      : message;
    onSendMessage(composedMessage);
    setAttachedFile(null);
  }

  return (
    <section className="accountant-inbox-conversation flex h-full min-h-[520px] flex-col overflow-y-auto bg-white min-[1080px]:min-h-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="inbox-conversation-header shrink-0 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <InboxStatusBadge audience="firm" status={request.status} />
              <p className="text-xs font-medium text-[#6f7d96]">
                {formatDateLabel(lastActivity(request))}, {formatThreadTime(lastActivity(request))}
              </p>

            </div>
            <h2 className="mt-3 max-w-[760px] text-lg font-medium leading-7 text-[#091333] sm:text-xl">
              {request.title}
            </h2>
            <div className="inbox-conversation-assignee mt-2 space-y-1 text-sm text-[#6c7b94]">
              <p>Client: <span className="font-medium text-[#4b5f7c]">{request.clientName}</span></p>
            </div>
          </div>
          <div className="inbox-conversation-actions" role="group" aria-label="Conversation controls">
            <Button variant="secondary" size="sm" onClick={onResolve} aria-label="Resolve" disabled={request.status === "resolved" || request.status === "closed"}><CheckCircle2 size={16} aria-hidden="true" />Resolve</Button>
            <div className="inbox-conversation-more">
              <button type="button" className="inbox-more-trigger" aria-label="Conversation actions" aria-haspopup="menu" aria-expanded={isMoreMenuOpen} onClick={() => setIsMoreMenuOpen(value => !value)}><MoreHorizontal size={20} aria-hidden="true" /></button>
              {isMoreMenuOpen ? <div role="menu" className="inbox-actions-menu">{[
                { label: "Conversation details", onClick: () => setDetailsOpen(true) },
                { label: "Edit request details", onClick: () => setIsSummaryExpanded(true) },
                { label: "Forward thread", onClick: onForward },
                { label: "Add internal note", onClick: handleAddInternalNote },
                { label: "Set open", onClick: onSetOpen },
                { label: "Set awaiting client", onClick: onSetAwaitingClient },
                { label: "Close", onClick: onSetClosed },
                { label: "Escalate", onClick: onEscalate },
                { label: "Reassign note", onClick: onReassign },
              ].map(item => <button type="button" role="menuitem" key={item.label} onClick={() => { item.onClick(); setIsMoreMenuOpen(false); }}>{item.label}</button>)}</div> : null}
            </div>
          </div>
        </div>

        <div className="inbox-scroll-region min-h-[360px] min-[1080px]:min-h-0 flex-1 space-y-3 bg-[#fbfcfe] px-4 py-5 pb-6 pr-1 sm:px-5 lg:px-6">
          {request.description.trim() ? <article className="inbox-original-request"><p className="inbox-original-request-label">Original request</p><p>{request.description}</p></article> : null}
          {request.comments.map((comment) => {
            const internal = isInternalNote(comment.message);
            const strippedMessage = stripInternalPrefix(comment.message);
            const attachment = decodeAttachment(strippedMessage);
            const cleaned = plainMessageText(strippedMessage);
            const isAccountant = comment.role !== "client";
            return (
              <div className={`flex items-end gap-3 ${isAccountant ? "justify-end" : ""}`} key={comment.id}>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    isAccountant ? "order-2 bg-[#d9efe6] text-[#047857]" : "bg-[#061b41] text-white"
                  }`}
                >
                  {initials(comment.author)}
                </span>
                <div className={`w-full max-w-[760px] ${isAccountant ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`mb-1.5 flex w-full max-w-[760px] items-center gap-2 px-1 text-sm font-medium ${
                      isAccountant ? "justify-end text-[#5f7090]" : "justify-start text-[#6f7d96]"
                    }`}
                  >
                    <span>{isAccountant ? "Accountant" : "Client"}</span>
                    <span className="text-[#b0b9cb]">•</span>
                    <span>{comment.author}</span>
                    <span className="text-[#b0b9cb]">•</span>
                    <span>{formatDateLabel(comment.createdAt)}</span>
                  </div>
                  <article
                    className={`w-full rounded-[22px] border px-4 py-3.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:px-5 ${
                    internal
                      ? "border-amber-200 bg-amber-50"
                      : isAccountant
                        ? "border-emerald-100 bg-[#eaf7f0]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {internal ? (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-sm font-medium uppercase tracking-[0.06em] text-amber-800">
                          Internal note
                        </span>
                      ) : null}
                    </div>
                    {cleaned ? <p className="text-base leading-6 text-[#1e2f5b]">{cleaned}</p> : null}
                    {attachment ? (
                      <a
                        className="client-dashboard-link mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                        download={attachment.name}
                        href={attachment.dataUrl}
                      >
                        <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
                        Download: {attachment.name}
                      </a>
                    ) : null}
                  </article>
                </div>
              </div>
            );
          })}
        </div>

        <div role="group" aria-label="Reply composer" className="inbox-composer shrink-0 space-y-3 bg-white px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inbox-composer-intro">
              <p className="text-base font-medium text-[#091333]">Reply to this conversation</p>
              <p className="text-sm text-[#6f7d96]">Send a client reply, attach a file, or switch to an internal note.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[#53617f]">
            <input checked={isInternal} onChange={(event) => onChangeInternal(event.target.checked)} type="checkbox" />
            Send as internal note
            </label>
          </div>
          {attachedFile ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#53617f]">
              Attached: {attachedFile.name}
            </div>
          ) : null}
          {attachmentError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {attachmentError}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-[52px] min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 ring-brand-300 transition focus-within:ring-2">
              <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#061b41] transition hover:bg-[#0a2f66]/10">
                <Paperclip aria-hidden="true" className="h-4.5 w-4.5" />
                <span className="sr-only">Attach</span>
                <input
                  accept={inboxAttachmentAccept}
                  className="hidden"
                  onChange={(event) => void handleAttachmentSelected(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              <input
                className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
                onChange={(event) => onChangeMessageDraft(event.target.value)}
                placeholder={isInternal ? "Type internal note..." : "Reply to the client..."}
                ref={replyInputRef}
                value={messageDraft}
              />
            </div>
            <Button
              aria-label="Send"
              className="client-inbox-primary-button h-[52px] min-w-[116px] shrink-0 rounded-xl border-0 px-5 ring-0 disabled:opacity-100"
              disabled={!messageDraft.trim() && !attachedFile}
              onClick={handleComposerSend}
              title="Send"
            >
              <span className="inline-flex items-center gap-2">
                <Send aria-hidden="true" className="h-4 w-4" />
                Send
              </span>
            </Button>

          </div>
        </div>
      </div>

      <Modal title="Edit request details" isOpen={isSummaryExpanded} onClose={() => setIsSummaryExpanded(false)} scrollBody panelClassName="accountant-request-dialog">
          <>
            <div className="grid divide-y divide-slate-200/80 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <div className="space-y-3.5 p-4">
                <p className="text-xs font-medium text-[#6f7d96]">Assigned Contact</p>
                <div className="flex items-start gap-3">
                  <UserRound aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#315b9c]" />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Client contact</span>
                    <input
                      className="w-full border-0 bg-transparent p-0 text-base font-normal text-[#091333] outline-none"
                      onChange={(event) => setAssignedToDraft(event.target.value)}
                      value={assignedToDraft}
                    />
                    <span className="mt-1 block text-sm font-normal text-[#53617f]">Client Contact</span>
                  </label>
                </div>
              </div>
              <div className="space-y-3.5 p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-[#6f7d96]">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
                  Due Date
                </p>
                <label className="block">
                  <span className="sr-only">Due date</span>
                  <input
                    className="w-full border-0 bg-transparent p-0 text-base font-normal text-[#091333] outline-none"
                    onChange={(event) => setDueDateDraft(event.target.value)}
                    type="date"
                    value={dueDateDraft}
                  />
                </label>
                <p className="text-sm font-medium text-rose-600">{dueControlStatus(`${dueDateDraft}T00:00:00`)}</p>
              </div>
              <div className="space-y-3.5 p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-[#6f7d96]">
                  <Flag aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
                  Priority
                </p>
                <label className="relative inline-flex items-center">
                  <span className="sr-only">Priority</span>
                  <select
                    className="h-9 appearance-none rounded-full border border-rose-100 bg-rose-50 py-0 pl-4 pr-9 text-sm font-medium capitalize text-rose-600 outline-none ring-brand-300 transition focus:ring-2"
                    onChange={(event) => setPriorityDraft(event.target.value as WorkflowRequest["priority"])}
                    value={priorityDraft}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-rose-500" />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3.5">
              <label className="inline-flex items-center gap-3 text-sm font-normal text-[#53617f]">
                <input checked={addAuditNote} onChange={(event) => setAddAuditNote(event.target.checked)} type="checkbox" />
                Internal audit note
              </label>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-base text-[#53617f]">
                  Due: <span className="text-[#091333]">{formatChipDate(request.dueDate)}</span>
                </span>
                <Button
                  className="client-inbox-secondary-button h-10 rounded-2xl px-7 text-sm font-medium"
                  onClick={() =>
                    onUpdateAssignment({
                      assignedTo: assignedToDraft,
                      dueDate: new Date(`${dueDateDraft}T17:00:00.000Z`).toISOString(),
                      priority: priorityDraft,
                      addAuditNote,
                    })}
                  variant="secondary"
                >
                  Save changes
                </Button>
              </div>
            </div>
          </>
      </Modal>

      <InboxContextDrawer audience="firm" isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} request={request} />
    </section>
  );
}

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [searchParams] = useSearchParams();
  const backendMode = hasApiBaseUrl();
  const inboxFlight = useRef<number | null>(null);
  const inboxGeneration = useRef(0);
  const threadCache = useRef(new Map<string, BackendRequestWorkspace>());
  const [requestVersions, setRequestVersions] = useState<Record<string, string>>({});
  const [threadRevision, setThreadRevision] = useState(0);
  const [threadLoading, setThreadLoading] = useState(false);
  const [liveClients, setLiveClients] = useState<FirmClientAccount[]>([]);
  const [liveRequests, setLiveRequests] = useState<WorkflowRequest[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  const scopedClients = useMemo(
    () => (backendMode ? liveClients : getScopedClients(user, portal.adminClients)),
    [backendMode, liveClients, portal.adminClients, user],
  );

  const [selectedClientId, setSelectedClientId] = useState(scopedClients[0]?.id ?? "");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const { hydrateRead, markRead, readThreadIds } = useInboxReadState("firm", user?.id);
  const [sendAsInternal, setSendAsInternal] = useState(false);
  const [inboxNotice, setInboxNotice] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [threadSort, setThreadSort] = useState<ThreadSort>("activity");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestKind, setRequestKind] = useState<InboxRequestKind>("document");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestDueDate, setRequestDueDate] = useState(defaultFollowUpDueDate());
  const [requestPriority, setRequestPriority] = useState<WorkflowRequest["priority"]>("high");
  const [requestFormError, setRequestFormError] = useState("");
  const [requestSending, setRequestSending] = useState(false);
  const requestSendingRef = useRef(false);

  const selectedClient = useMemo(
    () => scopedClients.find((client) => client.id === selectedClientId) ?? scopedClients[0] ?? null,
    [scopedClients, selectedClientId],
  );

  const selectedWorkspace = useMemo(() => {
    if (backendMode) return null;
    if (!selectedClient) return null;
    return portal.getClientWorkspace(selectedClient.id);
  }, [backendMode, portal, selectedClient]);

  const scopedRequests = useMemo(() => {
    if (backendMode) {
      return liveRequests;
    }

    return scopedClients.flatMap((client) =>
      getScopedRequests(
        user,
        portal.getClientWorkspace(client.id).requests,
        portal.adminClients,
      ),
    );
  }, [backendMode, liveRequests, portal, scopedClients, user]);

  async function loadLiveInbox() {
    if (!backendMode || !user) {
      return;
    }
    const generation = inboxGeneration.current;
    if (inboxFlight.current === generation) return;
    inboxFlight.current = generation;
    setLiveLoading(true);

    try {
      const [clients, requests, readStates] = await Promise.all([
        portalServiceApi.getAdminClients(),
        apiGetJson("/api/requests"),
        apiGetJson("/api/requests/read-state").catch(() => []),
      ]);
      hydrateRead(readStates.map((state) => state.requestId));

      if (generation !== inboxGeneration.current) return;
      const workspaces = requests.map(request => {
        const cached = threadCache.current.get(request.id);
        return cached?.request.updatedAtUtc === request.updatedAtUtc ? cached : { request, comments: [] };
      });
      setRequestVersions(Object.fromEntries(requests.map(request => [request.id, request.updatedAtUtc])));
      setInboxNotice("");

      const clientsById = new Map(clients.map((client) => [client.id, client]));

      setLiveClients(clients);
      setLiveRequests(
        workspaces.map((workspace) => {
          const client = clientsById.get(workspace.request.clientId);
          return mapBackendAccountantRequest(
            workspace,
            user.fullName,
            client?.clientName ?? "Client",
            user.id,
          );
        }),
      );
    } catch (error) {
      if (generation !== inboxGeneration.current) return;
      const message =
        error instanceof ApiError ? error.message : "The live follow-up inbox could not be loaded right now.";
      setInboxNotice(message);
    } finally {
      if (inboxFlight.current === generation) inboxFlight.current = null;
      if (generation === inboxGeneration.current) setLiveLoading(false);
    }
  }

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    void loadLiveInbox();
    const refreshTimer = window.setInterval(() => { if (document.visibilityState !== "hidden") void loadLiveInbox(); }, 20_000);
    return () => { inboxGeneration.current++; window.clearInterval(refreshTimer); };
  }, [backendMode, user?.id]);

  useEffect(() => {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        selectedClientId?: string;
        threadFilter?: ThreadFilter;
        threadSearch?: string;
      };
      if (parsed.selectedClientId) setSelectedClientId(parsed.selectedClientId);
      if (parsed.threadFilter) setThreadFilter(parsed.threadFilter);
      if (typeof parsed.threadSearch === "string") setThreadSearch(parsed.threadSearch);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const clientFromQuery = searchParams.get("client");
    if (!clientFromQuery) {
      return;
    }

    const normalizedClientQuery = clientFromQuery.trim().toLowerCase();
    const matchedClient = scopedClients.find(
      (client) => client.id === clientFromQuery || client.clientName.trim().toLowerCase() === normalizedClientQuery,
    );

    if (!matchedClient || matchedClient.id === selectedClientId) {
      return;
    }

    setSelectedClientId(matchedClient.id);
  }, [scopedClients, searchParams, selectedClientId]);

  useEffect(() => {
    if (!selectedClientId && scopedClients[0]?.id) {
      setSelectedClientId(scopedClients[0].id);
    }
  }, [scopedClients, selectedClientId]);

  useEffect(() => {
    window.localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ selectedClientId, threadFilter, threadSearch }),
    );
  }, [selectedClientId, threadFilter, threadSearch]);

  const visibleRequests = useMemo(() => {
    const normalizedSearch = threadSearch.trim().toLowerCase();
    const filtered = scopedRequests.filter((request) => {
      const unreadCount = trailingClientUnreadCount(request);
      if (threadFilter === "unread" && (readThreadIds.has(request.id) || unreadCount === 0)) return false;
      if (threadFilter === "resolved" && !["resolved", "closed"].includes(request.status)) return false;
      if (threadFilter === "unresolved" && ["resolved", "closed"].includes(request.status)) return false;
      if (!normalizedSearch) return true;
      const searchBlob = `${request.title} ${request.description} ${request.clientName}`.toLowerCase();
      return searchBlob.includes(normalizedSearch);
    });

    return [...filtered].sort((left, right) => {
      const leftOpen = ["resolved", "closed"].includes(left.status) ? 1 : 0;
      const rightOpen = ["resolved", "closed"].includes(right.status) ? 1 : 0;
      if (leftOpen !== rightOpen) return leftOpen - rightOpen;
      if (threadSort === "priority") {
        const rank = { high: 0, medium: 1, low: 2 } as const;
        if (rank[left.priority] !== rank[right.priority]) return rank[left.priority] - rank[right.priority];
      }
      if (threadSort === "due") return left.dueDate.localeCompare(right.dueDate);
      return lastActivity(right).localeCompare(lastActivity(left));
    });
  }, [readThreadIds, scopedRequests, threadFilter, threadSearch, threadSort]);

  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / THREADS_PER_PAGE));
  const pagedRequests = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * THREADS_PER_PAGE;
    return visibleRequests.slice(start, start + THREADS_PER_PAGE);
  }, [currentPage, totalPages, visibleRequests]);

  function handleSelectRequest(requestId: string) {
    setSelectedRequestId(requestId);
    markRead(requestId);
    if (backendMode) {
      void apiPostJson(`/api/requests/${encodeURIComponent(requestId)}/read`, {}).catch(() => undefined);
    }
  }

  const activeRequest = useMemo(
    () => pagedRequests.find((request) => request.id === selectedRequestId) ?? pagedRequests[0] ?? null,
    [pagedRequests, selectedRequestId],
  );
  const activeRequestId = activeRequest?.id;
  const activeRequestVersion = activeRequestId ? requestVersions[activeRequestId] : undefined;
  useEffect(() => {
    if (!backendMode || !activeRequestId || threadLoading) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      threadCache.current.delete(activeRequestId);
      setThreadRevision(value => value + 1);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [backendMode, activeRequestId, threadLoading]);

  useEffect(() => {
    setThreadLoading(false);
    if (!backendMode || !user || !activeRequestId) return;
    const cached = threadCache.current.get(activeRequestId);
    if (cached?.request.updatedAtUtc === activeRequestVersion) return;
    let active = true;
    setThreadLoading(true);
    void apiGetJson(`/api/requests/${encodeURIComponent(activeRequestId)}/workspace`)
      .then(workspace => {
        if (!active) return;
        threadCache.current.set(activeRequestId, workspace);
        setLiveRequests(current => current.map(request => request.id === activeRequestId
          ? mapBackendAccountantRequest(workspace, user.fullName, request.clientName, user.id) : request));
      }).catch(error => { if (active) setInboxNotice(error instanceof Error ? error.message : "This conversation could not be loaded. Select it again to retry."); })
      .finally(() => { if (active) setThreadLoading(false); });
    return () => { active = false; };
  }, [backendMode, user?.id, activeRequestId, activeRequestVersion, threadRevision]);
  const [messageDraft, setMessageDraft] = useInboxDraft("firm", activeRequest?.id ?? "new-thread");

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
  }, [threadFilter, threadSearch, threadSort]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function addLifecycleNote(note: string) {
    if (!activeRequest || !user) return;

    if (backendMode) {
      setMessageDraft(note.replace(/^\[INTERNAL\]\s*/, ""));
      setSendAsInternal(true);
      setInboxNotice("Internal note mode enabled.");
      return;
    }

    const result = portal.addRequestComment(activeRequest.id, user.fullName, user.role, note);
    setInboxNotice(result.message);
  }

  function postInternalWorkflowNote(note: string, successMessage: string, failureMessage: string) {
    if (!activeRequest) {
      return;
    }

    void (async () => {
      try {
        await apiPostJson(`/api/requests/${encodeURIComponent(activeRequest.id)}/comments`, {
          message: note,
          isInternal: true,
        });
        setInboxNotice(successMessage);
        await loadLiveInbox();
      } catch (error) {
        setInboxNotice(error instanceof ApiError ? error.message : failureMessage);
      }
    })();
  }

  function handleSendMessage(messageOverride?: string) {
    if (!activeRequest || !user) return;
    const message = (messageOverride ?? messageDraft).trim();
    if (!message) {
      setInboxNotice("Type a message before sending.");
      return;
    }

    if (backendMode) {
      const attachment = decodeAttachment(message);
      const plainText = plainMessageText(message);

      void (async () => {
        try {
          if (attachment) {
            const file = await dataUrlToFile(attachment);
            const formData = new FormData();
            if (plainText) {
              formData.append("message", plainText);
            }
                    formData.append("file", file);
            await apiPostForm(`/api/requests/${encodeURIComponent(activeRequest.id)}/upload`, formData);
          } else {
            await apiPostJson(`/api/requests/${encodeURIComponent(activeRequest.id)}/comments`, {
              message: plainText,
              isInternal: sendAsInternal,
            });
          }

          setInboxNotice("Reply sent.");
          setMessageDraft("");
          setSendAsInternal(false);
          await loadLiveInbox();
        } catch (error) {
          setInboxNotice(error instanceof ApiError ? error.message : "The reply could not be sent right now.");
        }
      })();

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

    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/requests/${encodeURIComponent(activeRequest.id)}/resolve`, {
            resolutionNote: "Resolved by accountant.",
          });
          setInboxNotice("Request resolved.");
          await loadLiveInbox();
        } catch (error) {
          setInboxNotice(error instanceof ApiError ? error.message : "The request could not be resolved.");
        }
      })();

      return;
    }

    const result = portal.resolveRequest(activeRequest.id, user.fullName);
    setInboxNotice(result.message);
  }

  function handleUpdateAssignment(payload: {
    assignedTo: string;
    dueDate: string;
    priority: WorkflowRequest["priority"];
    addAuditNote: boolean;
  }) {
    if (!activeRequest || !user) return;

    if (backendMode) {
      void (async () => {
        try {
          await apiPutJson(`/api/requests/${encodeURIComponent(activeRequest.id)}`, {
            requestType: toBackendRequestType(activeRequest.requestType ?? "missing_document_request"),
            title: activeRequest.title,
            description: activeRequest.description,
            priority: payload.priority,
            dueDateUtc: payload.dueDate,
            relatedDocumentId: activeRequest.relatedDocumentId ?? null,
            status: activeRequest.status,
          });
          setInboxNotice("Request controls updated.");
          await loadLiveInbox();
        } catch (error) {
          setInboxNotice(error instanceof ApiError ? error.message : "The request could not be updated.");
        }
      })();

      return;
    }

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
            auditNote: `Assignment controls updated: client contact -> ${payload.assignedTo}; due -> ${formatDateLabel(
              payload.dueDate,
            )}; priority -> ${payload.priority}.`,
          }
        : { addAuditNote: false },
    );
    setInboxNotice(result.message);
  }

  function handleCreateRequest() {
    if (!user || !selectedClient || requestSendingRef.current) return;

    const title = requestTitle.trim();
    const description = requestDetails.trim();

    if (!title || !description || !requestDueDate) {
      setRequestFormError("Add the document name, request details, and due date before sending.");
      return;
    }

    if (backendMode) {
      requestSendingRef.current = true; setRequestSending(true);
      void (async () => {
        try {
          const created = await apiPostJson("/api/requests", {
            clientId: selectedClient.id,
            requestType: toBackendRequestType(requestTypeForKind(requestKind)),
            title: requestTitleForKind(requestKind, title),
            description,
            priority: requestPriority,
            dueDateUtc: new Date(`${requestDueDate}T17:00:00.000Z`).toISOString(),
            relatedDocumentId: activeRequest?.relatedDocumentId ?? null,
          });

          if (Array.isArray(created)) throw new Error("The server returned validation errors instead of a request.");
          setInboxNotice("Client request created.");
          setRequestFormError("");
          setIsRequestModalOpen(false);
          setRequestTitle("");
          setRequestKind("document");
          setRequestDetails("");
          setRequestDueDate(defaultFollowUpDueDate());
          setRequestPriority("high");
          await loadLiveInbox();
          setSelectedRequestId(created.id);
        } catch (error) {
          setRequestFormError(error instanceof ApiError ? error.message : "The request could not be created. Your message has been kept; try again.");
        } finally { requestSendingRef.current = false; setRequestSending(false); }
      })();

      return;
    }

    const result = portal.createFollowUpRequest({
      actor: user,
      clientId: selectedClient.id,
      clientName: selectedClient.clientName,
      monthLabel: activeRequest?.monthLabel ?? selectedWorkspace?.monthPack.monthLabel ?? formatMonthLabel(new Date().toISOString()),
      title: requestTitleForKind(requestKind, title),
      description,
      dueDate: new Date(`${requestDueDate}T17:00:00.000Z`).toISOString(),
      priority: requestPriority,
      relatedDocumentId: activeRequest?.relatedDocumentId,
      requestType: requestTypeForKind(requestKind),
    });

    setInboxNotice(result.message);
    if (!result.ok) {
      setRequestFormError(result.message);
      return;
    }

    setRequestFormError("");
    setIsRequestModalOpen(false);
    setRequestTitle("");
    setRequestKind("document");
    setRequestDetails("");
    setRequestDueDate(defaultFollowUpDueDate());
    setRequestPriority("high");
    if (result.createdRequestId) {
      setSelectedRequestId(result.createdRequestId);
    }
  }

  if (!selectedClient || (!backendMode && !selectedWorkspace)) {
    if (backendMode && liveLoading) {
      return (
        <div className={`accountant-inbox-page ${inboxPanelClass} rounded-lg p-6 text-sm text-[#53617f]`}>
          Loading live client requests...
        </div>
      );
    }

    if (backendMode && !selectedClient) {
      return (
        <section className={`accountant-inbox-page ${inboxPanelClass} rounded-lg p-6 text-sm text-[#53617f]`}>
          <h1 className="text-xl font-semibold text-slate-950">Inbox</h1>
          {inboxNotice ? <div role="alert" className="mt-3 text-rose-700">{inboxNotice}</div> : <p className="mt-3">No accessible clients found for this workspace.</p>}
          <Button className="mt-4" variant="secondary" onClick={() => void loadLiveInbox()}>Retry inbox</Button>
        </section>
      );
    }

    return (
      <div className={`accountant-inbox-page ${inboxPanelClass} rounded-lg p-6 text-sm text-[#53617f]`}>
        No accessible clients found for this workspace.
      </div>
    );
  }

  return (
    <div className="accountant-inbox-page mx-auto flex w-full max-w-none flex-col gap-5 pb-8 min-[1080px]:h-full min-[1080px]:min-h-0 min-[1080px]:overflow-hidden min-[1080px]:pb-0">
      <h1 className="sr-only">Inbox</h1>
      {backendMode && activeRequestId ? <span className="sr-only" role={threadLoading ? "status" : undefined}>{threadLoading ? "Loading selected conversation..." : "Updates automatically"}</span> : null}


      {inboxNotice ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-[#53617f] shadow-[0_8px_18px_rgba(4,24,52,0.05)]">
          {inboxNotice}
        </div>
      ) : null}

      {scopedRequests.length > 0 ? (
        <div className="accountant-inbox-workspace grid grid-cols-1 items-start overflow-hidden rounded-2xl border border-slate-200 bg-white min-[1080px]:min-h-0 min-[1080px]:flex-1 min-[1080px]:items-stretch min-[1080px]:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          <ThreadListPane
            onRequestDocuments={() => { setRequestFormError(""); setIsRequestModalOpen(true); }}
            filter={threadFilter}
            onChangeFilter={setThreadFilter}
            sortMode={threadSort}
            onChangeSort={setThreadSort}
            currentPage={currentPage}
            totalPages={totalPages}
            onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onChangeSearch={setThreadSearch}
            onSelectRequest={handleSelectRequest}
            readThreadIds={readThreadIds}
            requests={pagedRequests}
            searchValue={threadSearch}
            selectedRequestId={activeRequest?.id ?? ""}
          />
          {activeRequest ? <ConversationPane
            isInternal={sendAsInternal}
            messageDraft={messageDraft}
            onChangeInternal={setSendAsInternal}
            onChangeMessageDraft={setMessageDraft}
            onEscalate={() =>
              backendMode
                ? activeRequest
                  ? void (async () => {
                      try {
                        await apiPostJson(`/api/requests/${encodeURIComponent(activeRequest.id)}/escalate`, {
                          reason: "SLA risk or blocker identified. Please prioritize.",
                          escalateToRole: "admin",
                        });
                        setInboxNotice("Request escalated to admin.");
                        await loadLiveInbox();
                      } catch (error) {
                        setInboxNotice(error instanceof ApiError ? error.message : "The request could not be escalated.");
                      }
                    })()
                  : undefined
                : addLifecycleNote("[INTERNAL] Escalation requested: SLA risk or blocker identified. Please prioritize.")}
            onForward={() =>
              backendMode
                ? activeRequest
                  ? postInternalWorkflowNote(
                      "Forward requested: share this thread with the appropriate firm contact.",
                      "Internal forwarding note added.",
                      "The forwarding note could not be added.",
                    )
                  : undefined
                : addLifecycleNote("[INTERNAL] Forward requested: share this thread with the appropriate firm contact.")}
            onReassign={() =>
              backendMode
                ? postInternalWorkflowNote(
                    "Reassignment suggested: please review ownership and assign another accountant.",
                    "Internal reassignment note added.",
                    "The reassignment note could not be added.",
                  )
                : addLifecycleNote("[INTERNAL] Reassignment suggested: please review ownership and assign another accountant.")}
            onResolve={handleResolve}
            onSendMessage={handleSendMessage}
            onSetAwaitingClient={() => {
              if (backendMode && activeRequest) {
                void (async () => {
                  try {
                    await apiPatchJson(`/api/requests/${encodeURIComponent(activeRequest.id)}/status`, {
                      status: "awaiting_client",
                    });
                    setInboxNotice("Request set to awaiting client.");
                    await loadLiveInbox();
                  } catch (error) {
                    setInboxNotice(error instanceof ApiError ? error.message : "The request status could not be updated.");
                  }
                })();
                return;
              }

              addLifecycleNote("Request set to awaiting client. Waiting for client response or upload.");
            }}
            onSetClosed={() => {
              if (backendMode) {
                handleResolve();
                return;
              }

              addLifecycleNote("Request set to closed. No further action required unless reopened.");
            }}
            onSetOpen={() => {
              if (backendMode && activeRequest) {
                void (async () => {
                  try {
                    await apiPatchJson(`/api/requests/${encodeURIComponent(activeRequest.id)}/status`, {
                      status: "open",
                    });
                    setInboxNotice("Request reopened for active follow-up.");
                    await loadLiveInbox();
                  } catch (error) {
                    setInboxNotice(error instanceof ApiError ? error.message : "The request status could not be updated.");
                  }
                })();
                return;
              }

              addLifecycleNote("Request reopened for active follow-up.");
            }}
            onUpdateAssignment={handleUpdateAssignment}
            request={activeRequest}
          /> : <section className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <h2 className="text-base font-semibold text-slate-900">No conversations match your filters</h2>
            <p className="mt-2 text-sm text-slate-500">Change the filter or clear your search to find a conversation.</p>
          </section>}
        </div>
      ) : (
        <section className={`${inboxPanelClass} rounded-lg px-6 py-10 text-center`}>
          <h2 className="text-xl font-semibold text-[#091333]">
            {scopedRequests.length > 0 ? "No messages match your filters" : "No inbox threads yet"}
          </h2>
          <p className="mt-2 text-sm text-[#53617f]">
            {scopedRequests.length > 0
              ? "Try clearing search."
              : "Start a thread by creating a new request for this client."}
          </p>
          {scopedRequests.length === 0 ? <Button className="mt-4" aria-label="Request document" onClick={() => { setRequestFormError(""); setIsRequestModalOpen(true); }}><Plus size={16} aria-hidden="true" />Request documents</Button> : null}
          {scopedRequests.length > 0 ? (
            <div className="mt-4">
              <Button
                className="client-inbox-secondary-button h-10 rounded-lg px-4 font-semibold"
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
        description="Tell the client what you need and when it is due."
        isOpen={isRequestModalOpen}
        onClose={() => { if (!requestSendingRef.current) setIsRequestModalOpen(false); }}
        title="Request document"
        scrollBody
        panelClassName="accountant-request-dialog"
        footer={<div className="accountant-request-footer"><span>Sent to the client's inbox.</span><div><Button variant="secondary" disabled={requestSending} onClick={() => setIsRequestModalOpen(false)}>Cancel</Button><Button type="submit" form="accountant-document-request" disabled={requestSending || !requestTitle.trim() || !requestDetails.trim() || !requestDueDate}>{requestSending ? "Sending..." : "Send request"}</Button></div></div>}
      >
        <form id="accountant-document-request" className="accountant-request-form" onSubmit={event => { event.preventDefault(); handleCreateRequest(); }}>
          <fieldset disabled={requestSending}>
            <div className="accountant-request-row">
              {scopedClients.length === 1 ? <TextField id="accountant-request-client" label="Client" value={selectedClient.clientName} readOnly /> : <SelectField id="accountant-request-client" label="Client" onChange={event => setSelectedClientId(event.target.value)} options={scopedClients.map(client => ({ label: client.clientName, value: client.id }))} value={selectedClient.id} />}
              <SelectField id="accountant-request-kind" label="Message type" onChange={event => setRequestKind(event.target.value as InboxRequestKind)} options={inboxRequestKindOptions} value={requestKind} />
            </div>
            <TextField id="accountant-request-title" label="Subject" required maxLength={200} onChange={event => setRequestTitle(event.target.value)} placeholder="e.g. November bank statement" value={requestTitle} />
            <TextAreaField id="accountant-request-details" label="Message to client" required rows={4} onChange={event => setRequestDetails(event.target.value)} placeholder="Describe the document you need and what the client should include." value={requestDetails} />
            <div className="accountant-request-row">
              <TextField id="accountant-request-due-date" label="Due date" required onChange={event => setRequestDueDate(event.target.value)} type="date" value={requestDueDate} />
              <SelectField id="accountant-request-priority" label="Priority" onChange={event => setRequestPriority(event.target.value as WorkflowRequest["priority"])} options={[{ label: "Low", value: "low" }, { label: "Medium", value: "medium" }, { label: "High", value: "high" }]} value={requestPriority} />
            </div>
          </fieldset>
          {requestFormError ? <p role="alert" className="accountant-request-error">{requestFormError}</p> : null}
        </form>
      </Modal>
    </div>
  );
}
