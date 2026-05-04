import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { CommentThread } from "../../components/workflow/CommentThread";
import { RequestBoard } from "../../components/workflow/RequestBoard";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { formatDateLabel } from "../../utils/formatters";

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [selectedRequestId, setSelectedRequestId] = useState(
    portal.clientWorkflow.requests[0]?.id ?? "",
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [clientId, setClientId] = useState("firm-client-1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("2026-05-08");

  const selectedRequest = useMemo(
    () =>
      portal.clientWorkflow.requests.find((request) => request.id === selectedRequestId) ??
      portal.clientWorkflow.requests[0] ??
      null,
    [portal.clientWorkflow.requests, selectedRequestId],
  );

  function handleCreateRequest() {
    if (!user) {
      return;
    }

    const client = portal.adminClients.find((item) => item.id === clientId);
    if (!client || !title.trim() || !description.trim()) {
      setFeedbackMessage("Select a client and complete the follow-up details first.");
      return;
    }

    const result = portal.createFollowUpRequest({
      clientId,
      clientName: client.clientName,
      monthLabel: "April 2026",
      title,
      description,
      dueDate: `${dueDate}T17:00:00.000Z`,
      actor: user,
    });
    setFeedbackMessage(result.message);
    setTitle("");
    setDescription("");
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
    setFeedbackMessage(result.message);
    return result;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Follow-up requests turn missing or rejected items into clear next actions with ownership, due dates, and request-level comment history."
        eyebrow="Accountant follow-ups"
        title="Follow-up requests"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <RequestBoard
          actionLabel="Review queue"
          description="These are the live follow-ups that still need client action or accountant review."
          onAction={() => setFeedbackMessage("Open the review desk from the main navigation to inspect pending submissions.")}
          onOpenRequest={(request) => setSelectedRequestId(request.id)}
          requests={portal.clientWorkflow.requests}
          title="Open requests"
        />

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Create follow-up request</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use this when a client needs a clear task rather than a document-level note.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Client"
                onChange={(event) => setClientId(event.target.value)}
                options={portal.adminClients.map((client) => ({
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
            <Button onClick={handleCreateRequest}>Send follow-up request</Button>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Selected request thread</h2>
              <p className="mt-1 text-sm text-slate-500">
                Request comments stay tied to the task, while uploads still go through the structured slot.
              </p>
            </div>
            {selectedRequest ? (
              <>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{selectedRequest.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedRequest.description}</p>
                  <p className="mt-3 text-sm text-slate-400">
                    Due {formatDateLabel(selectedRequest.dueDate)}
                  </p>
                </div>
                <CommentThread
                  comments={selectedRequest.comments}
                  currentAuthor={user?.fullName ?? "Accountant"}
                  currentRole="accountant"
                  onSubmitComment={handleComment}
                />
              </>
            ) : null}
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
