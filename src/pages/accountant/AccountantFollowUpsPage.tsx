import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Flag,
  Forward,
  RefreshCw,
  Reply,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedRequests } from "../../utils/permissions";

type ThreadFilter = "all" | "unread" | "resolved" | "unresolved";
type ThreadSort = "needs_action" | "newest" | "oldest";

const PREF_KEY = "firm-inbox-preferences-v1";
const inboxPanelClass =
  "border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(4,24,52,0.07)]";

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
  sort,
  onChangeSort,
  searchValue,
  onChangeSearch,
}: {
  requests: WorkflowRequest[];
  selectedRequestId: string;
  onSelectRequest: (requestId: string) => void;
  filter: ThreadFilter;
  onChangeFilter: (value: ThreadFilter) => void;
  sort: ThreadSort;
  onChangeSort: (value: ThreadSort) => void;
  searchValue: string;
  onChangeSearch: (value: string) => void;
}) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const unreadTotal = requests.reduce((sum, request) => sum + trailingClientUnreadCount(request), 0);

  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden rounded-lg`}>
      <div className="flex min-h-[82px] items-center justify-between gap-3 border-b border-slate-100 bg-white px-5">
        <div className="relative flex min-h-[46px] min-w-0 items-center gap-4 text-sm font-semibold after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-12 after:rounded-full after:bg-[#00856f]">
          <span className="text-[1rem] leading-none text-[#091333]">Inbox</span>
          <span className="rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-semibold text-[#53617f]">
            {requests.length} {requests.length === 1 ? "thread" : "threads"}
          </span>
        </div>
        <div className="relative flex h-12 shrink-0 items-center gap-4 rounded-full border border-slate-200 bg-white px-4 text-[#061b41] shadow-[0_10px_22px_rgba(4,24,52,0.06)]">
          <button
            aria-label="Refresh inbox"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-slate-50"
            onClick={() => {
              onChangeSearch("");
              onChangeFilter("all");
              onChangeSort("needs_action");
              setIsFilterMenuOpen(false);
              setIsSortMenuOpen(false);
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-expanded={isFilterMenuOpen}
            aria-haspopup="menu"
            aria-label="Filter messages"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
              filter !== "all" || isFilterMenuOpen ? "bg-[#0a2f66]/10 text-[#00856f]" : "hover:bg-slate-50"
            }`}
            onClick={() => {
              setIsFilterMenuOpen((current) => !current);
              setIsSortMenuOpen(false);
            }}
            title={filter === "all" ? "All" : filter === "unread" ? "Unread" : filter === "resolved" ? "Resolved" : "Unresolved"}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-expanded={isSortMenuOpen}
            aria-haspopup="menu"
            aria-label="Sort messages"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
              isSortMenuOpen || sort !== "needs_action" ? "bg-[#0a2f66]/10 text-[#00856f]" : "hover:bg-slate-50"
            }`}
            onClick={() => {
              setIsSortMenuOpen((current) => !current);
              setIsFilterMenuOpen(false);
            }}
            title={sort === "needs_action" ? "Needs action" : sort === "newest" ? "Newest" : "Oldest"}
            type="button"
          >
            <ArrowUpDown aria-hidden="true" className="h-4 w-4" />
          </button>
          {isFilterMenuOpen ? (
            <div className="absolute right-12 top-14 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
              {[
                { id: "all" as const, label: "All" },
                { id: "unread" as const, label: "Unread", count: unreadTotal },
                { id: "resolved" as const, label: "Resolved" },
                { id: "unresolved" as const, label: "Unresolved" },
              ].map((item) => (
                <button
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition ${
                    filter === item.id ? "bg-[#eaf7f0] text-[#087d69]" : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]"
                  }`}
                  key={item.id}
                  onClick={() => {
                    onChangeFilter(item.id);
                    setIsFilterMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span>{item.label}</span>
                  {item.count ? <span className="text-[#091333]">{item.count}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          {isSortMenuOpen ? (
            <div className="absolute right-0 top-14 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
              {[
                { id: "needs_action" as const, label: "Needs action" },
                { id: "newest" as const, label: "Newest" },
                { id: "oldest" as const, label: "Oldest" },
              ].map((item) => (
                <button
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition ${
                    sort === item.id ? "bg-[#eaf7f0] text-[#087d69]" : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]"
                  }`}
                  key={item.id}
                  onClick={() => {
                    onChangeSort(item.id);
                    setIsSortMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 shadow-[0_10px_22px_rgba(4,24,52,0.06)]">
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
          const lastComment = request.comments[request.comments.length - 1];
          const unread = trailingClientUnreadCount(request);
          const sectionLabel = inboxSectionLabel(lastActivity(request));
          const previousRequest = requests[requests.indexOf(request) - 1];
          const previousSection = previousRequest ? inboxSectionLabel(lastActivity(previousRequest)) : "";
          const showSection = requests.indexOf(request) === 0 || sectionLabel !== previousSection;

          return (
            <div key={request.id}>
              {showSection ? (
                <div className="flex h-12 w-full items-center gap-2 border-y border-slate-100 bg-[#f7fafc] px-5 text-left text-sm font-semibold text-[#091333]">
                  <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#35466d]" />
                  {sectionLabel}
                </div>
              ) : null}
              <button
                className={`relative grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-5 py-5 text-left transition ${
                  selected ? "bg-[#eef2f7] shadow-[0_10px_22px_rgba(4,24,52,0.08)]" : "hover:bg-slate-50"
                }`}
                onClick={() => onSelectRequest(request.id)}
                type="button"
              >
                {selected ? <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-[#6f8dbf]" /> : null}
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#061b41] text-sm font-semibold text-white shadow-sm">
                  {initials(request.assignedTo)}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="line-clamp-1 text-[0.95rem] font-semibold leading-5 text-[#091333]">{request.assignedTo}</p>
                  <p className="mt-0.5 line-clamp-1 text-[0.78rem] font-semibold leading-4 text-[#091333]">{request.title}</p>
                  <p className="mt-1 line-clamp-1 text-[0.75rem] font-medium leading-4 text-[#35466d]">
                    {lastComment?.message ?? request.description}
                  </p>
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
            </div>
          );
        })}
      </div>
      <div className="flex min-h-[92px] items-center justify-between border-t border-slate-100 bg-white px-5 py-[18px] text-xs font-medium text-[#53617f]">
        <span className="font-semibold text-[#091333]">Page 1 of 1</span>
        <div className="flex items-center gap-7">
          <button
            className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#9aa8ba] opacity-70"
            disabled
            type="button"
          >
            Prev
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#9aa8ba] opacity-70"
            disabled
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
  onSendMessage: () => void;
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
  const replyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAssignedToDraft(request.assignedTo);
    setDueDateDraft(request.dueDate.slice(0, 10));
    setPriorityDraft(request.priority);
    setAddAuditNote(false);
  }, [request.assignedTo, request.dueDate, request.priority, request.id]);

  function handleAddInternalNote() {
    onChangeInternal(true);
    replyInputRef.current?.focus();
  }

  return (
    <section className={`${inboxPanelClass} flex h-full min-h-[720px] flex-col overflow-hidden rounded-lg`}>
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <p className="line-clamp-1 text-sm font-semibold text-[#091333]">{request.title}</p>
      </div>

      <div className="relative border-b border-slate-100 bg-white px-7 py-8">
        <div className="min-w-0 pr-0 sm:pr-[180px]">
          <p className={`inline-flex rounded-full px-3 py-1 text-[0.62rem] font-semibold ${priorityBadgeClass(request.priority)}`}>
            {request.priority.toUpperCase()} PRIORITY
          </p>
          <h2 className="mt-5 max-w-[520px] text-[1.45rem] font-semibold leading-tight tracking-tight text-[#091333]">{request.title}</h2>
          <p className="absolute right-7 top-[104px] hidden text-xs font-semibold text-[#091333] lg:block">
            {formatDateLabel(lastActivity(request))}, {formatThreadTime(lastActivity(request))}
          </p>
          <p className="mt-3 text-xs font-semibold text-[#091333] lg:hidden">
            {formatDateLabel(lastActivity(request))}, {formatThreadTime(lastActivity(request))}
          </p>
          <p className="mt-6 max-w-xl text-xs font-semibold leading-5 text-[#8b97ad]">
            Client: <span className="text-[#53617f]">{request.assignedTo}</span>
            <br />
            {request.clientName}
          </p>
        </div>
        <div className="absolute right-7 top-8 flex h-12 shrink-0 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 text-[#061b41] shadow-[0_10px_22px_rgba(4,24,52,0.1)]">
          <button
            aria-label={isStarred ? "Unstar thread" : "Star thread"}
            aria-pressed={isStarred}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${isStarred ? "bg-amber-50 text-amber-500" : "hover:bg-slate-50"}`}
            onClick={() => setIsStarred((current) => !current)}
            type="button"
          >
            <Star aria-hidden="true" className={`h-4 w-4 ${isStarred ? "fill-current" : ""}`} />
          </button>
          <button
            aria-label="Reply to thread"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-slate-50"
            onClick={() => replyInputRef.current?.focus()}
            type="button"
          >
            <Reply aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Forward thread"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-slate-50"
            onClick={onForward}
            type="button"
          >
            <Forward aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-7 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <button
              aria-expanded={isMoreMenuOpen}
              aria-haspopup="menu"
              className="inline-flex h-11 items-center gap-4 rounded-md bg-[#061b41] px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(6,27,65,0.22)] transition hover:bg-[#09275c]"
              onClick={() => setIsMoreMenuOpen((current) => !current)}
              type="button"
            >
              Actions
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition ${isMoreMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {isMoreMenuOpen ? (
              <div className="absolute left-0 top-13 z-20 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-[0_18px_36px_rgba(4,24,52,0.14)]" role="menu">
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
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold text-[#091333] transition hover:bg-slate-50"
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
        </div>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex h-12 items-center gap-3 border-b border-slate-200 px-5">
            <UserRound aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
            <h3 className="text-sm font-semibold text-[#091333]">Assignment &amp; SLA</h3>
          </div>
          <div className="grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="space-y-4 p-5">
              <p className="text-xs font-semibold text-[#6f7d96]">Assigned Contact</p>
              <div className="flex items-start gap-3">
                <UserRound aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#315b9c]" />
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Client contact</span>
                  <input
                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#091333] outline-none"
                    onChange={(event) => setAssignedToDraft(event.target.value)}
                    value={assignedToDraft}
                  />
                  <span className="mt-1 block text-xs font-medium text-[#53617f]">Client Contact</span>
                </label>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#6f7d96]">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
                Due Date
              </p>
              <label className="block">
                <span className="sr-only">Due date</span>
                <input
                  className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#091333] outline-none"
                  onChange={(event) => setDueDateDraft(event.target.value)}
                  type="date"
                  value={dueDateDraft}
                />
              </label>
              <p className="text-xs font-semibold text-rose-600">{dueControlStatus(`${dueDateDraft}T00:00:00`)}</p>
            </div>
            <div className="space-y-4 p-5">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#6f7d96]">
                <Flag aria-hidden="true" className="h-4 w-4 text-[#315b9c]" />
                Priority
              </p>
              <label className="relative inline-flex items-center">
                <span className="sr-only">Priority</span>
                <select
                  className="h-9 appearance-none rounded-full border border-rose-100 bg-rose-50 py-0 pl-4 pr-9 text-xs font-semibold capitalize text-rose-600 outline-none ring-brand-300 transition focus:ring-2"
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <label className="inline-flex items-center gap-3 text-xs font-medium text-[#53617f]">
              <input checked={addAuditNote} onChange={(event) => setAddAuditNote(event.target.checked)} type="checkbox" />
              Internal audit note
            </label>
            <Button
              className="client-inbox-secondary-button h-10 rounded-lg px-5 text-xs font-semibold"
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
        </section>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white px-7 py-8">
        <div className="flex items-center gap-4 text-xs font-semibold text-[#53617f]">
          <span className="h-px flex-1 bg-slate-200" />
          Today
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        {request.comments.map((comment) => {
          const internal = isInternalNote(comment.message);
          const cleaned = stripInternalPrefix(comment.message);
          const isAccountant = comment.role !== "client";
          return (
            <div className={`flex items-start gap-3 ${isAccountant ? "justify-end" : ""}`} key={comment.id}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isAccountant ? "order-2 bg-[#d9efe6] text-[#047857]" : "bg-[#061b41] text-white"}`}>
                {initials(comment.author)}
              </span>
              <article
                className={`w-full max-w-[620px] rounded-lg border px-6 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${
                  internal
                    ? "border-amber-200 bg-amber-50"
                    : isAccountant
                      ? "border-emerald-100 bg-[#eaf7f0]"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#091333]">{comment.author}</p>
                    {internal ? (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-amber-800">
                        Internal note
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[#53617f]">{formatDateLabel(comment.createdAt)}</p>
                </div>
                <p className="text-sm leading-6 text-[#1e2f5b]">{cleaned}</p>
              </article>
            </div>
          );
        })}
      </div>

      <div className="min-h-[92px] space-y-3 border-t border-slate-100 bg-white px-7 py-[18px]">
        <label className="inline-flex items-center gap-2 text-sm text-[#53617f]">
          <input checked={isInternal} onChange={(event) => onChangeInternal(event.target.checked)} type="checkbox" />
          Send as internal note (not client-facing)
        </label>
        <div className="flex flex-nowrap items-center gap-3">
          <div className="flex h-14 min-w-[260px] flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 ring-brand-300 transition focus-within:ring-2">
            <input
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-[#091333] outline-none placeholder:text-[#7b879e]"
              onChange={(event) => onChangeMessageDraft(event.target.value)}
              placeholder={isInternal ? "Type internal note..." : "Type your message to the client..."}
              ref={replyInputRef}
              value={messageDraft}
            />
          </div>
          <Button
            aria-label="Send"
            className="client-inbox-primary-button h-14 w-14 shrink-0 rounded-lg border-0 p-0 ring-0 disabled:opacity-100"
            disabled={!messageDraft.trim()}
            onClick={onSendMessage}
            title="Send"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Resolve"
            className="client-inbox-primary-button h-14 w-14 shrink-0 rounded-lg border-0 p-0 ring-0"
            onClick={onResolve}
            title="Resolve"
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
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
  const [sendAsInternal, setSendAsInternal] = useState(false);
  const [inboxNotice, setInboxNotice] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [threadSort, setThreadSort] = useState<ThreadSort>("needs_action");

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

  if (!selectedClient || !selectedWorkspace) {
    return (
      <div className={`accountant-inbox-page ${inboxPanelClass} rounded-lg p-6 text-sm text-[#53617f]`}>
        No accessible clients found for this workspace.
      </div>
    );
  }

  return (
    <div className="accountant-inbox-page mx-auto max-w-[1500px] space-y-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.55rem] font-semibold tracking-tight text-[#091333]">Firm inbox and requests</h1>
          <p className="mt-1 text-sm text-[#53617f]">Manage client communication and follow-up requests.</p>
        </div>
      </header>

      {inboxNotice ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-[#53617f] shadow-[0_8px_18px_rgba(4,24,52,0.05)]">{inboxNotice}</div>
      ) : null}

      {visibleRequests.length > 0 && activeRequest ? (
        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <ThreadListPane
            filter={threadFilter}
            onChangeFilter={setThreadFilter}
            onChangeSearch={setThreadSearch}
            onChangeSort={setThreadSort}
            onSelectRequest={setSelectedRequestId}
            requests={visibleRequests}
            searchValue={threadSearch}
            selectedRequestId={activeRequest.id}
            sort={threadSort}
          />
          <ConversationPane
            isInternal={sendAsInternal}
            messageDraft={messageDraft}
            onChangeInternal={setSendAsInternal}
            onChangeMessageDraft={setMessageDraft}
            onEscalate={() =>
              addLifecycleNote("[INTERNAL] Escalation requested: SLA risk or blocker identified. Please prioritize.")}
            onReassign={() =>
              addLifecycleNote("[INTERNAL] Reassignment suggested: please review ownership and assign another accountant.")}
            onForward={() =>
              addLifecycleNote("[INTERNAL] Forward requested: share this thread with the appropriate firm contact.")}
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
              ? "Try clearing search or switching back to All."
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
    </div>
  );
}
