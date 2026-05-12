import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { CommentThread } from "../../components/workflow/CommentThread";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { DocumentComment, DocumentRecord, WorkflowRequest } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel, formatDateTimeLabel } from "../../utils/formatters";

type ThreadFilter = "all" | "requests" | "documents";

type MessageTarget = {
  id: string;
  kind: "document" | "request";
  clientId: string;
  clientName: string;
  title: string;
  summaryLabel: string;
  statusLabel: string;
  monthLabel: string;
  comments: DocumentComment[];
  preview: string;
  lastActivityAt: string;
  lastUpdatedBy: string;
  helperText: string;
};

const threadFilters: Array<{ id: ThreadFilter; label: string }> = [
  { id: "all", label: "All threads" },
  { id: "requests", label: "Requests" },
  { id: "documents", label: "Documents" },
];

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function latestComment(comments: DocumentComment[]) {
  return comments[comments.length - 1] ?? null;
}

function createDocumentTarget(document: DocumentRecord): MessageTarget {
  const lastComment = latestComment(document.comments);

  return {
    id: document.id,
    kind: "document",
    clientId: document.clientId,
    clientName: document.clientName,
    title: document.documentType,
    summaryLabel: document.fileName,
    statusLabel: formatLabel(document.status),
    monthLabel: document.monthLabel,
    comments: document.comments,
    preview: lastComment?.message ?? document.description,
    lastActivityAt: lastComment?.createdAt ?? document.reviewedAt ?? document.uploadedAt,
    lastUpdatedBy: lastComment?.author ?? document.reviewedBy ?? document.uploadedBy,
    helperText:
      "Use this thread for file-specific notes only. If the client needs to replace the file, open the documents workspace from here.",
  };
}

function createRequestTarget(request: WorkflowRequest): MessageTarget {
  const lastComment = latestComment(request.comments);

  return {
    id: request.id,
    kind: "request",
    clientId: request.clientId,
    clientName: request.clientName,
    title: request.title,
    summaryLabel: request.requestType
      ? `${formatLabel(request.requestType)} request`
      : `${formatLabel(request.priority)} priority request`,
    statusLabel: formatLabel(request.status),
    monthLabel: request.monthLabel,
    comments: request.comments,
    preview: lastComment?.message ?? request.description,
    lastActivityAt: lastComment?.createdAt ?? request.createdAt,
    lastUpdatedBy: lastComment?.author ?? request.requestedBy,
    helperText:
      "Use this thread to answer the client, confirm next steps, or capture clarifications tied to the request.",
  };
}

function filterMatches(target: MessageTarget, filter: ThreadFilter) {
  if (filter === "all") {
    return true;
  }

  return filter === "requests" ? target.kind === "request" : target.kind === "document";
}

function threadKindClasses(kind: MessageTarget["kind"]) {
  return kind === "request"
    ? "bg-brand-50 text-brand-700 ring-brand-100"
    : "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

export function AccountantMessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const portal = usePortal();
  const [activeFilter, setActiveFilter] = useState<ThreadFilter>("all");
  const targets = useMemo<MessageTarget[]>(
    () =>
      [
        ...portal.clientWorkflow.requests.map(createRequestTarget),
        ...portal.clientWorkflow.documents.map(createDocumentTarget),
      ].sort(
        (left, right) =>
          new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime(),
      ),
    [portal.clientWorkflow.documents, portal.clientWorkflow.requests],
  );
  const filteredTargets = useMemo(
    () => targets.filter((target) => filterMatches(target, activeFilter)),
    [activeFilter, targets],
  );
  const [selectedTargetId, setSelectedTargetId] = useState(targets[0]?.id ?? "");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (!filteredTargets.some((target) => target.id === selectedTargetId)) {
      setSelectedTargetId(filteredTargets[0]?.id ?? "");
    }
  }, [filteredTargets, selectedTargetId]);

  const selectedTarget = useMemo(
    () => filteredTargets.find((target) => target.id === selectedTargetId) ?? null,
    [filteredTargets, selectedTargetId],
  );
  const selectedDocument = useMemo<DocumentRecord | null>(
    () =>
      portal.clientWorkflow.documents.find((document) => document.id === selectedTargetId) ??
      null,
    [portal.clientWorkflow.documents, selectedTargetId],
  );
  const selectedRequest = useMemo<WorkflowRequest | null>(
    () =>
      portal.clientWorkflow.requests.find((request) => request.id === selectedTargetId) ?? null,
    [portal.clientWorkflow.requests, selectedTargetId],
  );

  function handleComment(message: string) {
    if (!user) {
      return { ok: false, message: "You must be signed in to comment." };
    }

    const result = selectedDocument
      ? portal.addDocumentComment(selectedDocument.id, user.fullName, user.role, message)
      : selectedRequest
        ? portal.addRequestComment(selectedRequest.id, user.fullName, user.role, message)
        : { ok: false, message: "Select a thread first." };

    setFeedbackMessage(result.message);
    return result;
  }

  function openWorkspace() {
    if (!selectedTarget) {
      return;
    }

    navigate(
      `/accountant/clients/${selectedTarget.clientId}?tab=${
        selectedTarget.kind === "request" ? "requests" : "documents"
      }`,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Reply inside the exact request or document thread. Pick a thread on the left, then send a clear update on the right."
        eyebrow="Accountant messages"
        title="Messages"
      />

      {feedbackMessage ? (
        <FeedbackBanner
          message={feedbackMessage}
          onDismiss={() => setFeedbackMessage("")}
          title="Message updated"
          tone="info"
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.18fr]">
        <SurfaceCard className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Thread list</h2>
              <p className="mt-1 text-sm text-slate-500">
                Requests need follow-up. Document threads are for file-specific notes.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {filteredTargets.length} open
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {threadFilters.map((filterOption) => {
              const count =
                filterOption.id === "all"
                  ? targets.length
                  : filterOption.id === "requests"
                    ? targets.filter((target) => target.kind === "request").length
                    : targets.filter((target) => target.kind === "document").length;

              return (
                <button
                  aria-pressed={activeFilter === filterOption.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    activeFilter === filterOption.id
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                  key={filterOption.id}
                  onClick={() => setActiveFilter(filterOption.id)}
                  type="button"
                >
                  <span>{filterOption.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      activeFilter === filterOption.id
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredTargets.length === 0 ? (
            <EmptyState
              actionLabel="Show all threads"
              description="There are no message threads in this filter right now."
              onAction={() => setActiveFilter("all")}
              title="Nothing to review"
            />
          ) : (
            <div className="space-y-3">
              {filteredTargets.map((target) => (
                <button
                  className={cn(
                    "w-full rounded-[1.4rem] border p-4 text-left transition",
                    target.id === selectedTargetId
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-white",
                  )}
                  key={target.id}
                  onClick={() => setSelectedTargetId(target.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ring-1",
                            target.id === selectedTargetId
                              ? "bg-white/10 text-white ring-white/15"
                              : threadKindClasses(target.kind),
                          )}
                        >
                          {target.kind === "request" ? "Request" : "Document"}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            target.id === selectedTargetId ? "text-white/70" : "text-slate-500",
                          )}
                        >
                          {target.statusLabel}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{target.title}</p>
                        <p
                          className={cn(
                            "mt-1 text-sm",
                            target.id === selectedTargetId ? "text-white/75" : "text-slate-500",
                          )}
                        >
                          {target.clientName} / {target.monthLabel}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        target.id === selectedTargetId
                          ? "bg-white/10 text-white"
                          : "bg-white text-slate-500 ring-1 ring-slate-200",
                      )}
                    >
                      {target.comments.length} comments
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-3 truncate text-sm",
                      target.id === selectedTargetId ? "text-white/80" : "text-slate-600",
                    )}
                  >
                    {target.preview}
                  </p>
                  <div
                    className={cn(
                      "mt-3 flex flex-wrap items-center justify-between gap-2 text-xs",
                      target.id === selectedTargetId ? "text-white/65" : "text-slate-400",
                    )}
                  >
                    <span>{target.summaryLabel}</span>
                    <span>Updated by {target.lastUpdatedBy}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          {selectedTarget ? (
            <>
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ring-1",
                          threadKindClasses(selectedTarget.kind),
                        )}
                      >
                        {selectedTarget.kind === "request" ? "Request thread" : "Document thread"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {selectedTarget.statusLabel}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {selectedTarget.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedTarget.clientName} / {selectedTarget.monthLabel}
                      </p>
                    </div>
                  </div>
                  <Button onClick={openWorkspace} variant="secondary">
                    Open workspace
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Client
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedTarget.clientName}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Last update
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatDateTimeLabel(selectedTarget.lastActivityAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      by {selectedTarget.lastUpdatedBy}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Comments
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedTarget.comments.length} in thread
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Snapshot {formatDateLabel(selectedTarget.lastActivityAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">What this thread is for</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {selectedTarget.helperText}
                  </p>
                </div>
              </div>

              <CommentThread
                comments={selectedTarget.comments}
                composerLabel={`Reply in this ${selectedTarget.kind} thread`}
                composerPlaceholder={
                  selectedTarget.kind === "request"
                    ? "Confirm what is needed next, answer the client, or leave a clear follow-up note."
                    : "Explain what changed on the file, what still needs fixing, or what the client should replace."
                }
                currentAuthor={user?.fullName ?? "Accountant"}
                currentRole="accountant"
                emptyDescription={
                  selectedTarget.kind === "request"
                    ? "No messages have been added to this request yet. The first reply should tell the client exactly what happens next."
                    : "No file-specific notes have been added yet. Leave a short message so the next reviewer sees the context immediately."
                }
                emptyTitle={
                  selectedTarget.kind === "request"
                    ? "No request messages yet"
                    : "No document notes yet"
                }
                helperText={`Posting as ${user?.fullName ?? "Accountant"}. Keep the reply tied to this ${
                  selectedTarget.kind
                } so the audit trail stays clear.`}
                onSubmitComment={handleComment}
                submitLabel="Send reply"
              />
            </>
          ) : (
            <EmptyState
              description="Choose a request or document thread from the left to start replying."
              title="Select a thread"
            />
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
