import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { DocumentPreviewPane } from "../../components/workflow/DocumentPreviewPane";
import { ExpiringDocumentsPanel } from "../../components/workflow/ExpiringDocumentsPanel";
import { RequestBoard } from "../../components/workflow/RequestBoard";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";

const workspaceTabs = [
  { id: "overview", label: "Overview" },
  { id: "packs", label: "Monthly Packs" },
  { id: "documents", label: "Documents" },
  { id: "invoices", label: "Invoices" },
  { id: "compliance", label: "Compliance" },
  { id: "requests", label: "Requests" },
  { id: "messages", label: "Messages" },
  { id: "audit", label: "Audit Trail" },
] as const;

type WorkspaceTab = (typeof workspaceTabs)[number]["id"];

export function AccountantClientWorkspacePage() {
  const { clientId = "firm-client-1" } = useParams();
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab =
    (searchParams.get("tab") as WorkspaceTab | null) ??
    (location.pathname.endsWith("/packs") ? "packs" : "overview");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const workspace = portal.getClientWorkspace(clientId);

  const selectedDocument =
    workspace.documents.find((document) => document.id === selectedDocumentId) ??
    workspace.documents[0] ??
    null;
  const selectedRequest =
    workspace.requests.find((request) => request.id === selectedRequestId) ??
    workspace.requests[0] ??
    null;
  const combinedAudit = useMemo(
    () =>
      [...workspace.auditTrail, ...workspace.requests.flatMap((request) => request.auditTrail)]
        .sort(
          (left, right) =>
            new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
        )
        .slice(0, 15),
    [workspace.auditTrail, workspace.requests],
  );

  function switchTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  }

  function handleDocumentComment(message: string) {
    if (!selectedDocument || !user || workspace.client.id !== "firm-client-1") {
      return {
        ok: false,
        message: "This seeded workspace is read-only for document comments outside the live client.",
      };
    }

    const result = portal.addDocumentComment(
      selectedDocument.id,
      user.fullName,
      user.role,
      message,
    );
    setFeedbackMessage(result.message);
    return result;
  }

  function handleRequestComment(message: string) {
    if (!selectedRequest || !user || workspace.client.id !== "firm-client-1") {
      return {
        ok: false,
        message: "This seeded workspace is read-only for request comments outside the live client.",
      };
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
        actions={
          <>
            <Button onClick={() => navigate(`/accountant/documents?client=${workspace.client.id}`)} variant="secondary">
              Open document centre
            </Button>
            <Button onClick={() => navigate("/accountant/follow-ups")}>Send follow-up</Button>
          </>
        }
        description="This client workspace keeps the month pack, document review, compliance, requests, messages, and audit trail in one accountable place."
        eyebrow="Accountant client workspace"
        title={workspace.client.clientName}
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-950">{workspace.client.clientName}</h2>
              <StatusBadge status={workspace.client.status} />
            </div>
            <p className="text-sm text-slate-500">
              {workspace.client.industry} / {workspace.client.assignedAccountant} / {workspace.client.deadlinePolicy}
            </p>
          </div>
          <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Month pack progress</span>
              <span>{workspace.monthPack.progressPercent}%</span>
            </div>
            <ProgressBar value={workspace.monthPack.progressPercent} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {workspaceTabs.map((tab) => (
            <button
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                activeTab === tab.id
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {activeTab === "overview" ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Workspace overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                Start here to understand completeness, compliance, and review readiness.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Missing items</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {workspace.missingDocuments.length}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Pending requests</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {workspace.requests.length}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <ExpiringDocumentsPanel items={workspace.expiringDocuments} />
        </section>
      ) : null}

      {activeTab === "packs" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Client monthly pack</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review the structured slots and focus on anything still missing, rejected, or pending.
            </p>
          </div>
          <div className="space-y-3">
            {workspace.monthPack.slots.map((slot) => (
              <div
                className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_140px_140px_auto]"
                key={slot.id}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{slot.documentType}</p>
                  <p className="mt-1 text-sm text-slate-500">{slot.description}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Required</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">
                    {slot.isRequired ? "Yes" : "Optional"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Due</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">
                    {formatDateLabel(slot.dueDate ?? workspace.monthPack.dueDate)}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <StatusBadge status={slot.status} />
                  <Button
                    onClick={() => {
                      setSelectedDocumentId(
                        workspace.documents.find(
                          (document) =>
                            document.documentType === slot.documentType &&
                            document.monthLabel === workspace.monthPack.monthLabel,
                        )?.id ?? "",
                      );
                      switchTab("documents");
                    }}
                    variant="secondary"
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      {activeTab === "documents" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open a document to inspect the file, review context, and leave controlled feedback.
              </p>
            </div>
            <div className="space-y-3">
              {workspace.documents.map((document) => (
                <button
                  className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                    selectedDocument?.id === document.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-brand-50"
                  }`}
                  key={document.id}
                  onClick={() => setSelectedDocumentId(document.id)}
                  type="button"
                >
                  <p className="text-sm font-semibold">{document.fileName}</p>
                  <p className={`mt-1 text-sm ${selectedDocument?.id === document.id ? "text-white/75" : "text-slate-500"}`}>
                    {document.documentType} / {document.monthLabel}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <div className="space-y-6">
            {selectedDocument ? <DocumentPreviewPane document={selectedDocument} /> : null}
            <SurfaceCard className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Document comments</h2>
                <p className="mt-1 text-sm text-slate-500">
                  File-specific feedback stays attached to the exact document.
                </p>
              </div>
              {selectedDocument ? (
                <CommentThread
                  comments={selectedDocument.comments}
                  currentAuthor={user?.fullName ?? "Accountant"}
                  currentRole="accountant"
                  onSubmitComment={handleDocumentComment}
                />
              ) : null}
            </SurfaceCard>
          </div>
        </section>
      ) : null}

      {activeTab === "invoices" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track lifecycle from draft through accountant acceptance or rejection.
            </p>
          </div>
          <div className="space-y-3">
            {workspace.invoices.map((invoice) => (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={invoice.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">{invoice.amountLabel} / {invoice.monthLabel}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      {activeTab === "compliance" ? (
        <ExpiringDocumentsPanel items={workspace.expiringDocuments} />
      ) : null}

      {activeTab === "requests" ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <RequestBoard
            description="Requests show what the client still owes the accountant before the month can be closed."
            onOpenRequest={(request) => setSelectedRequestId(request.id)}
            requests={workspace.requests}
            title="Open requests"
          />
          <div className="space-y-6">
            <SurfaceCard className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Request comments</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use the request thread when the issue is task-based rather than document-based.
                </p>
              </div>
              {selectedRequest ? (
                <CommentThread
                  comments={selectedRequest.comments}
                  currentAuthor={user?.fullName ?? "Accountant"}
                  currentRole="accountant"
                  onSubmitComment={handleRequestComment}
                />
              ) : null}
            </SurfaceCard>
          </div>
        </section>
      ) : null}

      {activeTab === "messages" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Controlled messages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Message history lives inside the selected document and request tabs, not in a free-form chat stream.
            </p>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Use the Documents tab for file-specific discussions.</li>
            <li>Use the Requests tab for follow-up tasks and clarifications.</li>
            <li>Uploads must still go through the client’s structured monthly pack slot.</li>
          </ul>
        </SurfaceCard>
      ) : null}

      {activeTab === "audit" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Audit trail</h2>
            <p className="mt-1 text-sm text-slate-500">
              This combines document and request workflow events for the selected client.
            </p>
          </div>
          <AuditTrail entries={combinedAudit} />
        </SurfaceCard>
      ) : null}
    </div>
  );
}
