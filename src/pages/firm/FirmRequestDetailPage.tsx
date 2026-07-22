import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, apiPatchJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import type { WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedRequests } from "../../utils/permissions";
import { toFrontendRequestType } from "../../utils/requestTypeMapping";

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

function toPriority(priority?: string): WorkflowRequest["priority"] {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function toStatus(status?: string): WorkflowRequest["status"] {
  const normalized = status?.trim().toLowerCase();

  if (
    normalized === "resolved" ||
    normalized === "closed" ||
    normalized === "awaiting_client" ||
    normalized === "awaiting_accountant" ||
    normalized === "client_replied"
  ) {
    return normalized;
  }

  if (normalized === "waiting_on_client" || normalized === "overdue") {
    return "awaiting_client";
  }

  return "awaiting_accountant";
}

export function FirmRequestDetailPage() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [comment, setComment] = useState("");
  const [sendAsInternal, setSendAsInternal] = useState(false);
  const [flash, setFlash] = useState("");
  const [liveWorkspace, setLiveWorkspace] = useState<BackendRequestWorkspace | null>(null);
  const [loading, setLoading] = useState(false);

  const allRequests = useMemo(
    () => portal.adminClients.flatMap((client) => portal.getClientWorkspace(client.id).requests),
    [portal],
  );

  const scoped = useMemo(
    () => getScopedRequests(user, allRequests, portal.adminClients),
    [allRequests, portal.adminClients, user],
  );

  async function loadLiveWorkspace(targetRequestId: string) {
    setLoading(true);

    try {
      setLiveWorkspace(
        await apiGetJson<BackendRequestWorkspace>(
          `/api/requests/${encodeURIComponent(targetRequestId)}/workspace`,
        ),
      );
      setFlash("");
    } catch (error) {
      setLiveWorkspace(null);
      setFlash(error instanceof ApiError ? error.message : "The request could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!backendMode || !requestId) {
      return;
    }

    void loadLiveWorkspace(requestId);
  }, [backendMode, requestId]);

  const request = useMemo(() => {
    if (!backendMode) {
      return scoped.find((item) => item.id === requestId) ?? null;
    }

    if (!liveWorkspace) {
      return null;
    }

    const clientName =
      portal.adminClients.find((client) => client.id === liveWorkspace.request.clientId)?.clientName ?? "Client";
    const accountantName = user?.fullName ?? "Accountant";

    return {
      id: liveWorkspace.request.id,
      clientId: liveWorkspace.request.clientId,
      clientName,
      title: liveWorkspace.request.title,
      description: liveWorkspace.request.description,
      monthLabel: formatDateLabel(liveWorkspace.request.dueDateUtc ?? liveWorkspace.request.requestedAtUtc),
      status: toStatus(liveWorkspace.request.status),
      isStarred: false,
      priority: toPriority(liveWorkspace.request.priority),
      relatedDocumentId: liveWorkspace.request.relatedDocumentId ?? undefined,
      requestedBy:
        liveWorkspace.request.requestedByUserId === user?.id ? accountantName : clientName,
      requestedByRole:
        liveWorkspace.request.requestedByUserId === user?.id ? "accountant" : "client",
      assignedTo: clientName,
      dueDate: liveWorkspace.request.dueDateUtc ?? liveWorkspace.request.updatedAtUtc,
      createdAt: liveWorkspace.request.requestedAtUtc,
      requestType: toFrontendRequestType(liveWorkspace.request.requestType),
      comments: liveWorkspace.comments.map((entry) => ({
        id: entry.id,
        author: entry.authorRole === "client" ? clientName : accountantName,
        role: entry.authorRole === "client" ? "client" : "accountant",
        message: entry.isInternal ? `[INTERNAL] ${entry.message}` : entry.message,
        createdAt: entry.createdAtUtc,
      })),
      auditTrail: [],
    } satisfies WorkflowRequest;
  }, [backendMode, liveWorkspace, portal.adminClients, requestId, scoped, user?.fullName, user?.id]);

  function postComment() {
    if (!request || !user || !comment.trim()) {
      return;
    }

    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/requests/${encodeURIComponent(request.id)}/comments`, {
            message: comment.trim(),
            isInternal: sendAsInternal,
          });
          setComment("");
          setSendAsInternal(false);
          await loadLiveWorkspace(request.id);
          setFlash(sendAsInternal ? "Internal note posted." : "Comment posted.");
        } catch (error) {
          setFlash(
            error instanceof ApiError
              ? error.message
              : sendAsInternal
                ? "The internal note could not be posted."
                : "The comment could not be posted.",
          );
        }
      })();
      return;
    }

    const payload = sendAsInternal ? `[INTERNAL] ${comment.trim()}` : comment.trim();
    const result = portal.addRequestComment(request.id, user.fullName, user.role, payload);
    setFlash(result.message);
    if (result.ok) {
      setComment("");
      setSendAsInternal(false);
    }
  }

  function resolve() {
    if (!request || !user) {
      return;
    }

    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/requests/${encodeURIComponent(request.id)}/resolve`, {
            resolutionNote: "Resolved by accountant.",
          });
          await loadLiveWorkspace(request.id);
          setFlash("Request resolved.");
        } catch (error) {
          setFlash(error instanceof ApiError ? error.message : "The request could not be resolved.");
        }
      })();
      return;
    }

    const result = portal.resolveRequest(request.id, user.fullName);
    setFlash(result.message);
  }

  function updateStatus(status: "awaiting_client" | "open") {
    if (!request) {
      return;
    }

    if (backendMode) {
      void (async () => {
        try {
          await apiPatchJson(`/api/requests/${encodeURIComponent(request.id)}/status`, { status });
          await loadLiveWorkspace(request.id);
          setFlash(
            status === "awaiting_client"
              ? "Request set to awaiting client."
              : "Request reopened for active follow-up.",
          );
        } catch (error) {
          setFlash(error instanceof ApiError ? error.message : "The request status could not be updated.");
        }
      })();
      return;
    }

    const result = portal.addRequestComment(
      request.id,
      user?.fullName ?? "Unknown user",
      user?.role ?? "accountant",
      status === "awaiting_client"
        ? "Request set to awaiting client. Waiting for client response or upload."
        : "Request reopened for active follow-up.",
    );
    setFlash(result.message);
  }

  function addActionNote(action: "escalate" | "reassign") {
    if (!request || !user) {
      return;
    }

    if (backendMode) {
      void (async () => {
        try {
          if (action === "escalate") {
            await apiPostJson(`/api/requests/${encodeURIComponent(request.id)}/escalate`, {
              reason: "Manual escalation requested from the firm request detail page.",
              escalateToRole: "admin",
            });
            setFlash("Request escalated to admin.");
          } else {
            await apiPostJson(`/api/requests/${encodeURIComponent(request.id)}/comments`, {
              message: "Reassignment suggested: please review ownership and assign another accountant.",
              isInternal: true,
            });
            setFlash("Internal reassignment note added.");
          }

          await loadLiveWorkspace(request.id);
        } catch (error) {
          setFlash(
            error instanceof ApiError
              ? error.message
              : action === "escalate"
                ? "The request could not be escalated."
                : "The internal note could not be added.",
          );
        }
      })();
      return;
    }

    const template =
      action === "escalate"
        ? "Escalation requested: SLA risk or blocker identified. Please prioritize."
        : "Reassignment suggested: please review ownership and assign another accountant.";
    const result = portal.addRequestComment(request.id, user.fullName, user.role, template);
    setFlash(result.message);
  }

  if (loading) {
    return (
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <div className="text-sm text-slate-600">Loading request...</div>
      </SurfaceCard>
    );
  }

  if (!request) {
    return (
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <EmptyState
          title="Request not found"
          description="The request may be outside your scope or no longer available."
        />
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4">
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Inbox item detail</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{request.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {request.clientName} · {request.monthLabel} · {request.id}
            </p>
          </div>
          <Link
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            to="/firm/inbox"
          >
            Back to inbox
          </Link>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
        <p className="mt-2 text-sm text-slate-700">{request.description}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {request.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Priority</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{request.priority}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Due</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatDateLabel(request.dueDate)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Assigned</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{request.assignedTo}</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">
          {backendMode ? "Conversation" : "Timeline"}
        </h2>
        <div className="mt-3 space-y-3">
          {backendMode
            ? request.comments.map((entry) => (
                <div
                  className={`rounded-xl border p-3 ${
                    entry.message.startsWith("[INTERNAL]")
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  key={entry.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">{entry.author}</p>
                    {entry.message.startsWith("[INTERNAL]") ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                        Internal
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{entry.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.role} · {formatDateLabel(entry.createdAt)}
                  </p>
                </div>
              ))
            : request.auditTrail.map((entry) => (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={entry.id}>
                  <p className="text-sm font-medium text-slate-900">{entry.status}</p>
                  {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.actor} · {formatDateLabel(entry.timestamp)}
                  </p>
                </div>
              ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Button className="h-10 rounded-xl" onClick={resolve}>
            Mark resolved
          </Button>
          <Button
            className="h-10 rounded-xl"
            onClick={() => updateStatus("awaiting_client")}
            variant="secondary"
          >
            Awaiting client
          </Button>
          <Button
            className="h-10 rounded-xl"
            onClick={() => updateStatus("open")}
            variant="secondary"
          >
            Reopen
          </Button>
          <Button
            className="h-10 rounded-xl"
            onClick={() => addActionNote("escalate")}
            variant="secondary"
          >
            Escalate
          </Button>
          <Button
            className="h-10 rounded-xl"
            onClick={() => addActionNote("reassign")}
            variant="secondary"
          >
            Reassign note
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="request-comment-input">
            {sendAsInternal ? "Add internal note" : "Add comment"}
          </label>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            id="request-comment-input"
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              sendAsInternal
                ? "Write a firm-only note that stays hidden from the client."
                : "Write an update for this request thread."
            }
            value={comment}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Posting as {user?.fullName ?? "Unknown user"}</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  checked={sendAsInternal}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) => setSendAsInternal(event.target.checked)}
                  type="checkbox"
                />
                Client cannot see this note
              </label>
            </div>
            <Button className="h-9 rounded-xl px-3" onClick={postComment} size="sm">
              {sendAsInternal ? "Post internal note" : "Post comment"}
            </Button>
          </div>
        </div>
        {flash ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {flash}
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
