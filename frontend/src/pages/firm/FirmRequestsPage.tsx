import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { CommentThread } from "../../components/workflow/CommentThread";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { Tone, WorkflowRequest } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedRequests } from "../../utils/permissions";

type RequestFilter =
  | "all"
  | "open"
  | "awaiting_client"
  | "awaiting_accountant"
  | "resolved";

interface FeedbackState {
  message: string;
  title: string;
  tone: Tone;
}

const requestFilters: Array<{ id: RequestFilter; label: string }> = [
  { id: "all", label: "All requests" },
  { id: "open", label: "Open" },
  { id: "awaiting_client", label: "Waiting on client" },
  { id: "awaiting_accountant", label: "Waiting on accountant" },
  { id: "resolved", label: "Resolved" },
];

function formatRequestValue(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function matchesFilter(request: WorkflowRequest, filter: RequestFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "open") {
    return request.status === "open" || request.status === "client_replied";
  }

  return request.status === filter;
}

function priorityClasses(priority: WorkflowRequest["priority"]) {
  if (priority === "high") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (priority === "medium") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function FirmRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const portal = usePortal();
  const [activeFilter, setActiveFilter] = useState<RequestFilter>("all");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const requests = useMemo(() => {
    const allRequests = portal.adminClients.flatMap((client) => portal.getClientWorkspace(client.id).requests);
    const deduped = Array.from(new Map(allRequests.map((request) => [request.id, request])).values());

    return getScopedRequests(user, deduped, portal.adminClients).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [portal, user]);
  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesFilter(request, activeFilter)),
    [activeFilter, requests],
  );
  const [selectedRequestId, setSelectedRequestId] = useState(filteredRequests[0]?.id ?? "");
  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedRequestId) ??
    filteredRequests[0] ??
    null;

  function handleComment(message: string) {
    if (!user || !selectedRequest) {
      return { ok: false, message: "Select a request before replying." };
    }

    const result = portal.addRequestComment(
      selectedRequest.id,
      user.fullName,
      user.role,
      message,
    );

    setFeedback({
      message: result.message,
      title: "Request updated",
      tone: result.ok ? "info" : "danger",
    });
    return result;
  }

  function handleResolve() {
    if (!selectedRequest || !user) {
      return;
    }

    const result = portal.resolveRequest(selectedRequest.id, user.fullName);
    setFeedback({
      message: result.message,
      title: "Request resolved",
      tone: result.ok ? "success" : "danger",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          user?.role === "admin"
            ? "See every client request across the firm, confirm ownership, and keep request conversations in one controlled queue."
            : "Track only the requests linked to your assigned clients and keep each follow-up in one accountable thread."
        }
        eyebrow={user?.role === "admin" ? "Firm requests" : "Assigned requests"}
        title={user?.role === "admin" ? "Requests" : "My requests"}
      />

      {feedback ? (
        <FeedbackBanner
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
          title={feedback.title}
          tone={feedback.tone}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Request queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open the right request, reply in context, and keep the audit trail complete.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {filteredRequests.length} visible
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {requestFilters.map((filterOption) => (
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
                {filterOption.label}
              </button>
            ))}
          </div>

          {filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <button
                  className={cn(
                    "w-full rounded-[1.35rem] border p-4 text-left transition",
                    selectedRequest?.id === request.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-white",
                  )}
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{request.title}</p>
                      <p
                        className={cn(
                          "mt-1 text-sm",
                          selectedRequest?.id === request.id ? "text-white/75" : "text-slate-500",
                        )}
                      >
                        {request.clientName} / {request.monthLabel}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                        selectedRequest?.id === request.id
                          ? "bg-white/10 text-white ring-white/15"
                          : priorityClasses(request.priority),
                      )}
                    >
                      {request.priority}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-3 text-sm",
                      selectedRequest?.id === request.id ? "text-white/80" : "text-slate-600",
                    )}
                  >
                    {request.description}
                  </p>
                  <p
                    className={cn(
                      "mt-3 text-xs",
                      selectedRequest?.id === request.id ? "text-white/65" : "text-slate-400",
                    )}
                  >
                    {formatRequestValue(request.status)} / Due {formatDateLabel(request.dueDate)} /{" "}
                    {request.comments.length} comments
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              description="No requests are visible in your current scope."
              title="Nothing to work on"
            />
          )}
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          {selectedRequest ? (
            <>
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {selectedRequest.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedRequest.clientName} / {selectedRequest.monthLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => navigate(`/firm/clients/${selectedRequest.clientId}?tab=requests`)}
                      variant="secondary"
                    >
                      Open workspace
                    </Button>
                    {selectedRequest.status !== "resolved" ? (
                      <Button onClick={handleResolve}>Mark resolved</Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatRequestValue(selectedRequest.status)}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Priority
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatRequestValue(selectedRequest.priority)}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Requested by
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedRequest.requestedBy}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Assigned to
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedRequest.assignedTo}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">Request summary</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedRequest.description}
                  </p>
                </div>
              </div>

              <CommentThread
                comments={selectedRequest.comments}
                composerLabel="Reply in this request"
                composerPlaceholder="Confirm what is needed next, clarify the blocker, or update the client on progress."
                currentAuthor={user?.fullName ?? "Team member"}
                currentRole={user?.role ?? "accountant"}
                emptyDescription="No one has replied in this request yet. The first response should explain the next action clearly."
                emptyTitle="No request comments yet"
                helperText={`Posting as ${user?.fullName ?? "Team member"} (${user?.role ?? "accountant"})`}
                onSubmitComment={handleComment}
                submitLabel="Send reply"
              />
            </>
          ) : (
            <EmptyState
              description="Pick a request from the queue to review the full thread."
              title="Select a request"
            />
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
