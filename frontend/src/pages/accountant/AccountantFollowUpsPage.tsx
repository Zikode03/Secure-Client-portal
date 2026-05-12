import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { CommentThread } from "../../components/workflow/CommentThread";
import { RequestBoard } from "../../components/workflow/RequestBoard";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import type { Tone, WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedRequests } from "../../utils/permissions";

interface FeedbackState {
  message: string;
  title: string;
  tone: Tone;
}

function uniqueRequests(requests: WorkflowRequest[]) {
  return Array.from(new Map(requests.map((request) => [request.id, request])).values());
}

function requestSummary(requests: WorkflowRequest[]) {
  return {
    open: requests.filter((request) => request.status === "open" || request.status === "client_replied")
      .length,
    awaitingClient: requests.filter((request) => request.status === "awaiting_client").length,
    awaitingAccountant: requests.filter((request) => request.status === "awaiting_accountant").length,
    resolved: requests.filter((request) => request.status === "resolved").length,
  };
}

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const scopedClients = useMemo(
    () => getScopedClients(user, portal.adminClients),
    [portal.adminClients, user],
  );
  const requests = useMemo(() => {
    const allRequests = uniqueRequests(
      portal.adminClients.flatMap((client) => portal.getClientWorkspace(client.id).requests),
    );

    return getScopedRequests(user, allRequests, portal.adminClients).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [portal, user]);

  const [selectedRequestId, setSelectedRequestId] = useState(requests[0]?.id ?? "");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [clientId, setClientId] = useState(scopedClients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("2026-05-12");
  const summary = useMemo(() => requestSummary(requests), [requests]);

  useEffect(() => {
    if (!requests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(requests[0]?.id ?? "");
    }
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!scopedClients.some((client) => client.id === clientId)) {
      setClientId(scopedClients[0]?.id ?? "");
    }
  }, [clientId, scopedClients]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? requests[0] ?? null,
    [requests, selectedRequestId],
  );

  function handleCreateRequest() {
    if (!user) {
      return;
    }

    const client = scopedClients.find((item) => item.id === clientId);
    if (!client || !title.trim() || !description.trim()) {
      setFeedback({
        message: "Select a client and complete the follow-up details first.",
        title: "Request not created",
        tone: "warning",
      });
      return;
    }

    const result = portal.createFollowUpRequest({
      clientId,
      clientName: client.clientName,
      monthLabel: "May 2026",
      title,
      description,
      dueDate: `${dueDate}T17:00:00.000Z`,
      actor: user,
    });

    setFeedback({
      message: result.message,
      title: "Follow-up created",
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) {
      setTitle("");
      setDescription("");
    }
  }

  function handleComment(message: string) {
    if (!selectedRequest || !user) {
      return { ok: false, message: "Select a request before commenting." };
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
        actions={
          <Button onClick={() => navigate("/firm/review")} variant="secondary">
            Open review queue
          </Button>
        }
        description={
          isAdmin
            ? "Monitor firm-wide requests, create the next follow-up quickly, and keep every conversation tied to the right client workspace."
            : "Keep follow-up requests clear, owned, and easy to resolve without losing the comment trail."
        }
        eyebrow={isAdmin ? "Firm requests" : "Accountant follow-ups"}
        title={isAdmin ? "Request workspace" : "Follow-up requests"}
      />

      {feedback ? (
        <FeedbackBanner
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
          title={feedback.title}
          tone={feedback.tone}
        />
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        {[
          {
            id: "open",
            label: "Open",
            value: summary.open,
            tone: "text-brand-600",
            helper: "Active request threads",
          },
          {
            id: "awaiting-client",
            label: "Waiting on client",
            value: summary.awaitingClient,
            tone: "text-rose-600",
            helper: "Uploads or answers still missing",
          },
          {
            id: "awaiting-accountant",
            label: "Waiting on accountant",
            value: summary.awaitingAccountant,
            tone: "text-amber-600",
            helper: "Client has replied back",
          },
          {
            id: "resolved",
            label: "Resolved",
            value: summary.resolved,
            tone: "text-emerald-600",
            helper: "Already closed out",
          },
        ].map((item) => (
          <SurfaceCard
            className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            key={item.id}
          >
            <p className="text-[0.78rem] font-medium uppercase tracking-[0.12em] text-slate-400">
              {item.label}
            </p>
            <p className={`mt-2 text-[1.8rem] font-semibold tracking-tight ${item.tone}`}>
              {item.value}
            </p>
            <p className="mt-1 text-[0.82rem] text-slate-500">{item.helper}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <RequestBoard
          actionLabel="Review queue"
          description={
            isAdmin
              ? "All visible requests across the firm, including client-originated questions and accountant follow-ups."
              : "These are the live follow-ups that still need client action or accountant review."
          }
          onAction={() => navigate("/firm/review")}
          onOpenRequest={(request) => setSelectedRequestId(request.id)}
          requests={requests}
          title={isAdmin ? "Firm request board" : "Open requests"}
        />

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Create follow-up request</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use this when a client needs a clear task instead of a loose message.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Client"
                onChange={(event) => setClientId(event.target.value)}
                options={scopedClients.map((client) => ({
                  label: client.clientName,
                  value: client.id,
                }))}
                value={clientId}
              />
              <TextField
                label="Due date"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
              <TextField
                className="md:col-span-2"
                label="Request title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Upload missing bank statement"
                value={title}
              />
            </div>
            <TextAreaField
              label="Request detail"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain what is missing, why it matters, and where the client should upload it."
              value={description}
            />
            <Button onClick={handleCreateRequest}>
              {isAdmin ? "Create firm follow-up" : "Send follow-up request"}
            </Button>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Selected request thread</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Request comments stay tied to the task while uploads still go through the structured slot.
                </p>
              </div>
              {selectedRequest ? (
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
              ) : null}
            </div>

            {selectedRequest ? (
              <>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{selectedRequest.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedRequest.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                    <span>Due {formatDateLabel(selectedRequest.dueDate)}</span>
                    <span>{selectedRequest.clientName}</span>
                    <span>Assigned to {selectedRequest.assignedTo}</span>
                  </div>
                </div>
                <CommentThread
                  comments={selectedRequest.comments}
                  currentAuthor={user?.fullName ?? "Accountant"}
                  currentRole={user?.role ?? "accountant"}
                  onSubmitComment={handleComment}
                />
              </>
            ) : (
              <EmptyState
                description="Pick a request from the board to review the full thread."
                title="Select a request"
              />
            )}
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
