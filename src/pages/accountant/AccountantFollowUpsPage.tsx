import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Forward,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
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

function defaultFollowUpDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
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

function priorityBadgeClass(priority: WorkflowRequest["priority"]) {
  if (priority === "high") return "bg-amber-100 text-amber-800";
  if (priority === "medium") return "bg-brand-100 text-brand-700";
  return "bg-slate-100 text-slate-700";
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
  searchValue,
  onChangeSearch,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (requestId: string) => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
}) {
  const totalUnread = requests.reduce((sum, request) => sum + trailingClientUnreadCount(request), 0);

  return (
    <section
      className={`${inboxPanelClass} flex h-full min-h-[660px] flex-col overflow-hidden rounded-[20px] border-0 bg-white/96 shadow-[0_18px_42px_rgba(15,23,42,0.07)] min-[1080px]:min-h-0`}
    >
      <div className="border-b border-slate-100/80 bg-[linear-gradient(180deg,#f7f8fb_0%,#f1f2f5_100%)] px-4 py-3 sm:px-4 lg:px-4 lg:py-3.5">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[#7b879e]">Threads</p>
            <p className="text-[0.88rem] font-medium text-[#091333]">{requests.length} active conversations</p>
          </div>
          <span className="rounded-full bg-[#edf6f2] px-2.5 py-1 text-[0.68rem] font-medium text-[#087d69]">
            {totalUnread} unread
          </span>
        </div>
        <div className="flex h-10 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
          <input
            className="h-full w-full bg-transparent text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="Search threads..."
            value={searchValue}
          />
        </div>
      </div>

      <div className="inbox-scroll-region min-h-0 flex-1 bg-white pb-3 pr-1">
        {requests.map((request, index) => {
          const selected = request.id === selectedRequestId;
          const lastComment = request.comments[request.comments.length - 1];
          const unread = trailingClientUnreadCount(request);
          const sectionLabel = inboxSectionLabel(lastActivity(request));
          const previousRequest = requests[index - 1];
          const previousSection = previousRequest ? inboxSectionLabel(lastActivity(previousRequest)) : "";
          const showSection = index === 0 || sectionLabel !== previousSection;

          return (
            <div key={request.id}>
              {showSection ? (
                <div className="flex h-9 w-full items-center gap-2 border-b border-slate-100 bg-[#f7f9fc] px-4 text-left text-[0.82rem] font-medium text-[#091333] sm:px-4 lg:px-4">
                  <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#35466d]" />
                  {sectionLabel}
                </div>
              ) : null}
              <button
                className={`relative grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 text-left transition sm:px-4 lg:px-4 lg:py-3.5 ${
                  selected ? "bg-[#eef3fb] shadow-[inset_0_0_0_1px_rgba(127,155,203,0.14)]" : "hover:bg-slate-50/80"
                }`}
                onClick={() => onSelectRequest(request.id)}
                type="button"
              >
                {selected ? <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[#7f9bcb]" /> : null}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b2451] text-[0.88rem] font-medium text-white shadow-[0_8px_18px_rgba(11,36,81,0.18)]">
                  {initials(request.clientName)}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-[0.92rem] font-medium leading-5 text-[#091333]">{request.clientName}</p>
                    <p className="shrink-0 text-[0.78rem] font-medium text-[#091333]">{formatShortThreadTime(lastActivity(request))}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[0.8rem] font-medium leading-5 text-[#091333]">{request.title}</p>
                  <p className="mt-1 line-clamp-1 text-[0.78rem] font-medium leading-5 text-[#5f7090]">
                    {lastComment?.message ?? request.description}
                  </p>
                </div>
                <div className="flex min-h-12 shrink-0 flex-col items-end justify-between gap-1 pt-0.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.08em] ${
                      request.status === "awaiting_client"
                        ? "bg-amber-50 text-amber-700"
                        : request.status === "resolved" || request.status === "closed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {request.status.replace(/_/g, " ")}
                  </span>
                  {unread > 0 ? (
                    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#087d69] px-1.5 text-[0.58rem] font-semibold leading-none text-white">
                      {unread}
                    </span>
                  ) : null}
                </div>
              </button>
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
  const [isStarred, setIsStarred] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [attachedFile, setAttachedFile] = useState<ParsedAttachment | null>(null);
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
    <section className="flex h-full min-h-[720px] flex-col bg-transparent min-[1080px]:min-h-0">
      <div className={`${inboxPanelClass} flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className={`inline-flex rounded-full px-3 py-1 text-[0.62rem] font-medium ${priorityBadgeClass(request.priority)}`}>
                {request.priority.toUpperCase()} PRIORITY
              </p>
              <p className="text-xs font-medium text-[#6f7d96]">
                {formatDateLabel(lastActivity(request))}, {formatThreadTime(lastActivity(request))}
              </p>
              <span className="rounded-full bg-[#eef3fb] px-2.5 py-1 text-[0.66rem] font-medium text-[#315b9c]">
                {request.comments.length} messages
              </span>
            </div>
            <h2 className="mt-3 max-w-[760px] text-[1.12rem] font-medium leading-7 text-[#091333] sm:text-[1.2rem]">
              {request.title}
            </h2>
            <div className="mt-2 space-y-1 text-sm text-[#6c7b94]">
              <p>
                Client: <span className="text-[#4b5f7c]">{request.assignedTo}</span>
              </p>
              <p>{request.clientName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <button
              aria-label={isStarred ? "Unstar thread" : "Star thread"}
              aria-pressed={isStarred}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${isStarred ? "bg-amber-50 text-amber-500" : "text-[#061b41] hover:bg-slate-50"}`}
              onClick={() => setIsStarred((current) => !current)}
              type="button"
            >
              <Star aria-hidden="true" className={`h-4 w-4 ${isStarred ? "fill-current" : ""}`} />
            </button>
            <button
              aria-label="Reply to thread"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#061b41] transition hover:bg-slate-50"
              onClick={() => replyInputRef.current?.focus()}
              type="button"
            >
              <Reply aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Forward thread"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#061b41] transition hover:bg-slate-50"
              onClick={onForward}
              type="button"
            >
              <Forward aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-[#fbfcfe] px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-medium text-[#6f7d96]">
            <span className="rounded-full bg-white px-2.5 py-1 shadow-[0_4px_10px_rgba(15,23,42,0.04)]">Client and accountant conversation</span>
            <span className="rounded-full bg-[#eef6f2] px-2.5 py-1 text-[#087d69]">Reply here to continue the thread</span>
          </div>
        </div>

        <div className="inbox-scroll-region min-h-[360px] flex-1 space-y-3 bg-[#fbfcfe] px-4 py-5 pb-6 pr-1 sm:px-5 lg:px-6">
          {request.comments.map((comment) => {
            const internal = isInternalNote(comment.message);
            const strippedMessage = stripInternalPrefix(comment.message);
            const attachment = decodeAttachment(strippedMessage);
            const cleaned = plainMessageText(strippedMessage);
            const isAccountant = comment.role !== "client";
            return (
              <div className={`flex items-end gap-3 ${isAccountant ? "justify-end" : ""}`} key={comment.id}>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.82rem] font-medium ${
                    isAccountant ? "order-2 bg-[#d9efe6] text-[#047857]" : "bg-[#061b41] text-white"
                  }`}
                >
                  {initials(comment.author)}
                </span>
                <div className={`w-full max-w-[760px] ${isAccountant ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`mb-1.5 flex w-full max-w-[760px] items-center gap-2 px-1 text-[0.72rem] font-medium ${
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
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[0.64rem] font-medium uppercase tracking-[0.06em] text-amber-800">
                          Internal note
                        </span>
                      ) : null}
                    </div>
                    {cleaned ? <p className="text-[0.9rem] leading-6 text-[#1e2f5b]">{cleaned}</p> : null}
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

        <div className="space-y-3 bg-white px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.88rem] font-medium text-[#091333]">Reply to this conversation</p>
              <p className="text-[0.78rem] text-[#6f7d96]">Send a client reply, attach a file, or switch to an internal note.</p>
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-[52px] min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 ring-brand-300 transition focus-within:ring-2">
              <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#061b41] transition hover:bg-[#0a2f66]/10">
                <Paperclip aria-hidden="true" className="h-4.5 w-4.5" />
                <span className="sr-only">Attach</span>
                <input
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
            <Button
              aria-label="Resolve"
              className="client-inbox-secondary-button h-[52px] min-w-[128px] shrink-0 rounded-xl px-5"
              onClick={onResolve}
              title="Resolve"
              variant="secondary"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Resolve
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <button
          aria-expanded={isMoreMenuOpen}
          aria-haspopup="menu"
          className="inline-flex h-10 items-center gap-3 rounded-xl bg-[#0b2451] px-5 text-sm font-medium text-white shadow-[0_10px_22px_rgba(6,27,65,0.18)] transition hover:bg-[#123063]"
          onClick={() => setIsMoreMenuOpen((current) => !current)}
          type="button"
        >
          Thread actions
          <ChevronDown aria-hidden="true" className={`h-4 w-4 transition ${isMoreMenuOpen ? "rotate-180" : ""}`} />
        </button>
        {isMoreMenuOpen ? (
          <div className="absolute left-0 top-12 z-20 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
            {[
              { icon: CheckCircle2, label: "Set open", onClick: onSetOpen },
              { icon: RefreshCw, label: "Set awaiting client", onClick: onSetAwaitingClient },
              { icon: CheckCircle2, label: "Close", onClick: onSetClosed },
              { icon: ShieldAlert, label: "Escalate", onClick: onEscalate },
              { icon: UserRound, label: "Reassign note", onClick: onReassign },
              { icon: Reply, label: "Add internal note", onClick: handleAddInternalNote },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-medium text-[#091333] transition hover:bg-slate-50"
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    setIsMoreMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/88 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <button
          aria-expanded={isSummaryExpanded}
          className="flex w-full items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-3.5 text-left"
          onClick={() => setIsSummaryExpanded((current) => !current)}
          type="button"
        >
          <div className="flex items-center gap-3">
            <UserRound aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
            <div>
              <p className="text-[0.88rem] font-medium text-[#091333]">Assignment &amp; SLA</p>
              <p className="text-[0.76rem] text-[#6f7d96]">Operational details for this thread</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[0.68rem] font-medium text-emerald-700">
              {isSummaryExpanded ? "Expanded" : "Collapsed"}
            </span>
            {isSummaryExpanded ? <ChevronUp aria-hidden="true" className="h-4 w-4 text-[#567194]" /> : <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#567194]" />}
          </div>
        </button>
        {isSummaryExpanded ? (
          <>
            <div className="grid divide-y divide-slate-200/80 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <div className="space-y-3.5 p-4">
                <p className="text-xs font-medium text-[#6f7d96]">Assigned Contact</p>
                <div className="flex items-start gap-3">
                  <UserRound aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#315b9c]" />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Client contact</span>
                    <input
                      className="w-full border-0 bg-transparent p-0 text-[0.98rem] font-normal text-[#091333] outline-none"
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
                    className="w-full border-0 bg-transparent p-0 text-[0.98rem] font-normal text-[#091333] outline-none"
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
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.88rem] text-[#53617f]">
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
        ) : null}
      </section>
    </section>
  );
}

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [searchParams] = useSearchParams();

  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [user, portal.adminClients]);

  const [selectedClientId, setSelectedClientId] = useState(scopedClients[0]?.id ?? "");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sendAsInternal, setSendAsInternal] = useState(false);
  const [inboxNotice, setInboxNotice] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestDueDate, setRequestDueDate] = useState(defaultFollowUpDueDate());
  const [requestPriority, setRequestPriority] = useState<WorkflowRequest["priority"]>("high");
  const [requestFormError, setRequestFormError] = useState("");

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
    window.localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ selectedClientId, threadFilter, threadSearch }),
    );
  }, [selectedClientId, threadFilter, threadSearch]);

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
      const leftOpen = ["resolved", "closed"].includes(left.status) ? 1 : 0;
      const rightOpen = ["resolved", "closed"].includes(right.status) ? 1 : 0;
      if (leftOpen !== rightOpen) return leftOpen - rightOpen;
      return lastActivity(right).localeCompare(lastActivity(left));
    });
  }, [scopedRequests, threadFilter, threadSearch]);

  const activeRequest = useMemo(
    () => visibleRequests.find((request) => request.id === selectedRequestId) ?? visibleRequests[0] ?? null,
    [selectedRequestId, visibleRequests],
  );

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

  function handleSendMessage(messageOverride?: string) {
    if (!activeRequest || !user) return;
    const message = (messageOverride ?? messageDraft).trim();
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
            auditNote: `Assignment controls updated: client contact -> ${payload.assignedTo}; due -> ${formatDateLabel(
              payload.dueDate,
            )}; priority -> ${payload.priority}.`,
          }
        : { addAuditNote: false },
    );
    setInboxNotice(result.message);
  }

  function handleCreateRequest() {
    if (!user || !selectedClient || !selectedWorkspace) return;

    const title = requestTitle.trim();
    const description = requestDetails.trim();

    if (!title || !description || !requestDueDate) {
      setRequestFormError("Add the document name, request details, and due date before sending.");
      return;
    }

    const result = portal.createFollowUpRequest({
      actor: user,
      clientId: selectedClient.id,
      clientName: selectedClient.clientName,
      monthLabel: activeRequest?.monthLabel ?? selectedWorkspace.monthPack.monthLabel,
      title: `Document request: ${title}`,
      description,
      dueDate: new Date(`${requestDueDate}T17:00:00.000Z`).toISOString(),
      priority: requestPriority,
      relatedDocumentId: activeRequest?.relatedDocumentId,
    });

    setInboxNotice(result.message);
    if (!result.ok) {
      setRequestFormError(result.message);
      return;
    }

    setRequestFormError("");
    setIsRequestModalOpen(false);
    setRequestTitle("");
    setRequestDetails("");
    setRequestDueDate(defaultFollowUpDueDate());
    setRequestPriority("high");
    if (result.createdRequestId) {
      setSelectedRequestId(result.createdRequestId);
    }
  }

  if (!selectedClient || !selectedWorkspace) {
    return (
      <div className={`accountant-inbox-page ${inboxPanelClass} rounded-lg p-6 text-sm text-[#53617f]`}>
        No accessible clients found for this workspace.
      </div>
    );
  }

  return (
    <div className="accountant-inbox-page mx-auto flex w-full max-w-[1680px] flex-col gap-4 pb-8 min-[1080px]:h-full min-[1080px]:min-h-0 min-[1080px]:overflow-hidden min-[1080px]:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[#7b879e]">Client workflow</p>
          <p className="text-[0.92rem] font-medium text-[#091333]">
            Request documents from {selectedClient.clientName}
          </p>
        </div>
        <Button
          className="client-inbox-primary-button h-11 rounded-xl border-0 px-4 text-sm font-medium ring-0"
          onClick={() => {
            setRequestFormError("");
            setIsRequestModalOpen(true);
          }}
        >
          Request document
        </Button>
      </div>

      {inboxNotice ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-[#53617f] shadow-[0_8px_18px_rgba(4,24,52,0.05)]">
          {inboxNotice}
        </div>
      ) : null}

      {visibleRequests.length > 0 && activeRequest ? (
        <div className="grid grid-cols-1 items-start gap-4 min-[1080px]:min-h-0 min-[1080px]:flex-1 min-[1080px]:items-stretch min-[1080px]:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] min-[1400px]:grid-cols-[minmax(300px,350px)_minmax(0,1.52fr)] xl:gap-5">
          <ThreadListPane
            onChangeSearch={setThreadSearch}
            onSelectRequest={setSelectedRequestId}
            requests={visibleRequests}
            searchValue={threadSearch}
            selectedRequestId={activeRequest.id}
          />
          <ConversationPane
            isInternal={sendAsInternal}
            messageDraft={messageDraft}
            onChangeInternal={setSendAsInternal}
            onChangeMessageDraft={setMessageDraft}
            onEscalate={() =>
              addLifecycleNote("[INTERNAL] Escalation requested: SLA risk or blocker identified. Please prioritize.")}
            onForward={() =>
              addLifecycleNote("[INTERNAL] Forward requested: share this thread with the appropriate firm contact.")}
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
        <section className={`${inboxPanelClass} rounded-lg px-6 py-10 text-center`}>
          <h2 className="text-xl font-semibold text-[#091333]">
            {scopedRequests.length > 0 ? "No messages match your filters" : "No inbox threads yet"}
          </h2>
          <p className="mt-2 text-sm text-[#53617f]">
            {scopedRequests.length > 0
              ? "Try clearing search."
              : "Start a thread by creating a new request for this client."}
          </p>
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
        description="Create a new document request and send it into the client conversation inbox."
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request document"
      >
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_34px_rgba(4,24,52,0.05)]">
            <div className="h-1.5 w-full bg-[linear-gradient(90deg,#22356f_0%,#5e7ed6_45%,#d8e4ff_100%)]" />
            <div className="px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b879e]">Document request</p>
                  <p className="mt-2 text-[1.02rem] font-semibold text-[#091333]">Ask the client for a specific document.</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53617f]">
                  This creates a new inbox thread for {selectedClient.clientName} and keeps the follow-up conversation in one place.
                  </p>
                </div>
                <div className="min-w-[260px] rounded-2xl border border-slate-200/90 bg-[#f8fafc] px-4 py-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b879e]">Client</p>
                        <p className="mt-1 truncate text-sm font-medium text-[#091333]">{selectedClient.clientName}</p>
                      </div>
                      <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#415ea8] shadow-[inset_0_0_0_1px_rgba(198,210,232,0.9)]">
                        Live thread
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b879e]">Destination</p>
                        <p className="mt-1 text-sm font-medium text-[#091333]">Inbox conversation</p>
                      </div>
                      <div className="rounded-full bg-[#eef8f3] px-2.5 py-1 text-[11px] font-semibold text-[#2f7a57]">
                        Client visible
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-[26px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_16px_36px_rgba(4,24,52,0.06)]">
            <div className="mb-5 flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f7ff] text-[#415ea8]">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#091333]">Request details</p>
                <p className="mt-1 text-xs leading-5 text-[#7b879e]">
                  Be specific so the client knows exactly what to upload and how to send it back.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <TextField
                id="accountant-request-title"
                label="Document needed"
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder="e.g. Signed annual financial statements"
                value={requestTitle}
              />
              <TextAreaField
                id="accountant-request-details"
                label="Message to client"
                onChange={(event) => setRequestDetails(event.target.value)}
                placeholder="Explain what is missing, where the client should upload it, and any format requirements."
                value={requestDetails}
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_16px_36px_rgba(4,24,52,0.06)]">
            <div className="mb-5 flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff5df] text-[#a76b00]">
                <CalendarDays className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#091333]">Timing and priority</p>
                <p className="mt-1 text-xs leading-5 text-[#7b879e]">
                  Set when the client should respond and how urgent the request is.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                id="accountant-request-due-date"
                label="Due date"
                onChange={(event) => setRequestDueDate(event.target.value)}
                type="date"
                value={requestDueDate}
              />
              <SelectField
                id="accountant-request-priority"
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
            </div>
          ) : null}

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-[#7b879e]">The client will receive this as a new conversation thread in their inbox.</p>
            <div className="mt-3 flex flex-wrap justify-end gap-3">
              <Button
                className="client-inbox-secondary-button h-11 rounded-xl px-4 text-sm font-medium"
                onClick={() => setIsRequestModalOpen(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                className="client-inbox-primary-button h-11 rounded-xl border-0 px-5 text-sm font-medium ring-0 disabled:opacity-100"
                disabled={!requestTitle.trim() || !requestDetails.trim() || !requestDueDate}
                onClick={handleCreateRequest}
              >
                Send request
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
