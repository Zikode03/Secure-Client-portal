import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { EmptyState } from "../../components/ui/EmptyState";
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
import type { ComplianceDocumentRecord } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";

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

const complianceTabs = [
  { id: "overview", label: "Overview" },
  { id: "categories", label: "Compliance Categories" },
  { id: "expired", label: "Expired" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "missing", label: "Missing Required" },
  { id: "audit", label: "Audit Trail" },
] as const;

type ComplianceWorkspaceTab = (typeof complianceTabs)[number]["id"];

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
  const [activeComplianceView, setActiveComplianceView] = useState<ComplianceWorkspaceTab>(
    (searchParams.get("view") as ComplianceWorkspaceTab | null) ?? "overview",
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedComplianceCategoryId, setSelectedComplianceCategoryId] = useState("");
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
  const selectedComplianceCategory =
    workspace.compliance?.categories.find(
      (category) => category.id === selectedComplianceCategoryId,
    ) ??
    workspace.compliance?.categories[0] ??
    null;
  const complianceExpiredItems = workspace.compliance?.documents.filter(
    (document) => document.status === "expired",
  ) ?? [];
  const complianceExpiringItems = workspace.compliance?.documents.filter(
    (document) => document.status === "expiring",
  ) ?? [];
  const complianceMissingItems = workspace.compliance?.documents.filter(
    (document) => document.status === "missing",
  ) ?? [];

  function switchTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  }

  function switchComplianceView(view: ComplianceWorkspaceTab) {
    setActiveComplianceView(view);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", "compliance");
      next.set("view", view);
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

  function handleResolveRequest() {
    if (!selectedRequest || !user || workspace.client.id !== "firm-client-1") {
      setFeedbackMessage(
        "This seeded workspace is read-only for request updates outside the live client.",
      );
      return;
    }

    const result = portal.resolveRequest(selectedRequest.id, user.fullName);
    setFeedbackMessage(result.message);
  }

  function handleComplianceRequest(
    record: ComplianceDocumentRecord,
    requestType:
      | "missing_document_request"
      | "renewal_request"
      | "re_upload_request"
      | "clarification_request",
  ) {
    if (!user) {
      return;
    }

    const result = portal.createComplianceRequest({
      clientId: workspace.compliance?.clientId ?? workspace.client.id,
      complianceItemId: record.id,
      requestType,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      actor: user,
      comments: `Please action ${record.name} so the compliance workflow can move forward.`,
    });

    setFeedbackMessage(result.message);
  }

  function handleComplianceReplacement(record: ComplianceDocumentRecord) {
    if (!user) {
      return;
    }

    const result = portal.uploadComplianceVersion({
      clientId: workspace.compliance?.clientId ?? workspace.client.id,
      complianceItemId: record.id,
      fileName: `${workspace.client.clientName.replace(/[^A-Za-z0-9]+/g, "")}_${record.name.replace(/[^A-Za-z0-9]+/g, "")}_Renewal.pdf`,
      fileType: "pdf",
      uploadedBy: user.fullName,
      note: `Replacement version prepared for ${record.name}.`,
    });

    setFeedbackMessage(result.message);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate(`/firm/documents?client=${workspace.client.id}`)} variant="secondary">
              Open document centre
            </Button>
            <Button onClick={() => navigate("/firm/requests")}>Open requests</Button>
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
                  currentRole={user?.role ?? "accountant"}
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
        workspace.compliance ? (
          <section className="space-y-6">
            <SurfaceCard className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Compliance overview</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Structured readiness by category, version, review state, and expiry status.
                      </p>
                    </div>
                    <StatusBadge status={workspace.compliance.riskStatus} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Compliance score</span>
                      <span>{workspace.compliance.score}%</span>
                    </div>
                    <ProgressBar value={workspace.compliance.score} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Expired</p>
                      <p className="mt-2 text-xl font-semibold text-rose-500">
                        {workspace.compliance.expiredCount}
                      </p>
                    </div>
                    <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Expiring</p>
                      <p className="mt-2 text-xl font-semibold text-amber-500">
                        {workspace.compliance.expiringCount}
                      </p>
                    </div>
                    <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Missing</p>
                      <p className="mt-2 text-xl font-semibold text-indigo-500">
                        {workspace.compliance.missingCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-950">Readiness summary</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.readinessSummary}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-950">Next best action</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.nextBestAction}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 md:col-span-2">
                    <p className="text-sm font-semibold text-slate-950">Top priorities</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {workspace.compliance.topPriorities.slice(0, 3).map((priority) => (
                        <div
                          className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4"
                          key={priority.id}
                        >
                          <p className="text-sm font-semibold text-slate-950">{priority.label}</p>
                          <p className="mt-1 text-sm text-slate-500">{priority.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {complianceTabs.map((tab) => (
                  <button
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      activeComplianceView === tab.id
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                    key={tab.id}
                    onClick={() => switchComplianceView(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </SurfaceCard>

            {activeComplianceView === "overview" ? (
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Compliance readiness</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Use this summary to see why the client is compliant, at risk, overdue, or high risk.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-950">Risk status</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {formatStatusLabel(workspace.compliance.riskStatus)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.readinessSummary}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-950">Action queue</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.nextBestAction}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => switchComplianceView("expired")}
                        size="sm"
                        variant="secondary"
                      >
                        Review expired items
                      </Button>
                      <Button
                        onClick={() => switchComplianceView("missing")}
                        size="sm"
                        variant="secondary"
                      >
                        Review missing items
                      </Button>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            ) : null}

            {activeComplianceView === "categories" ? (
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <SurfaceCard className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Compliance categories</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Category cards summarize the controlled score and document counts for this client.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {workspace.compliance.categories.map((category) => (
                      <button
                        className={cn(
                          "w-full rounded-[1.5rem] border p-4 text-left transition",
                          selectedComplianceCategory?.id === category.id
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-brand-50",
                        )}
                        key={category.id}
                        onClick={() => setSelectedComplianceCategoryId(category.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{category.name}</p>
                            <p
                              className={cn(
                                "mt-1 text-sm",
                                selectedComplianceCategory?.id === category.id
                                  ? "text-white/75"
                                  : "text-slate-500",
                              )}
                            >
                              {category.description}
                            </p>
                          </div>
                          <p className="text-lg font-semibold">{category.complianceScore}%</p>
                        </div>
                        <div className="mt-4 space-y-2">
                          <ProgressBar value={category.complianceScore} />
                          <div
                            className={cn(
                              "grid grid-cols-4 gap-2 text-xs",
                              selectedComplianceCategory?.id === category.id
                                ? "text-white/75"
                                : "text-slate-500",
                            )}
                          >
                            <span>{category.compliantCount} compliant</span>
                            <span>{category.missingCount} missing</span>
                            <span>{category.expiringCount} expiring</span>
                            <span>{category.expiredCount} expired</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </SurfaceCard>

                <SurfaceCard className="space-y-4">
                  {selectedComplianceCategory ? (
                    <>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-950">
                          {selectedComplianceCategory.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          View the documents, versions, and review states for this category.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {selectedComplianceCategory.documents.map((document) => (
                          <div
                            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                            key={document.id}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{document.name}</p>
                                <p className="mt-1 text-sm text-slate-500">{document.description}</p>
                              </div>
                              <StatusBadge status={document.status} />
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                                Version count: {document.versionCount}
                              </div>
                              <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                                Owner: {document.owner.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())}
                              </div>
                              <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                                {document.expiryDate ? `Expiry ${formatDateLabel(document.expiryDate)}` : "No expiry"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      description="Choose a compliance category to inspect its document set."
                      title="No category selected"
                    />
                  )}
                </SurfaceCard>
              </section>
            ) : null}

            {activeComplianceView === "expired" ? (
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Expired documents</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Expired documents remain visible until a valid replacement version is reviewed.
                  </p>
                </div>
                {complianceExpiredItems.length > 0 ? (
                  <div className="space-y-3">
                    {complianceExpiredItems.map((document) => (
                      <div
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                        key={document.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{document.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Expired {document.expiryDate ? formatDateLabel(document.expiryDate) : "recently"}
                            </p>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleComplianceRequest(document, "renewal_request")}
                            size="sm"
                            variant="secondary"
                          >
                            Request renewal
                          </Button>
                          <Button
                            onClick={() => handleComplianceReplacement(document)}
                            size="sm"
                            variant="secondary"
                          >
                            Upload replacement
                          </Button>
                          <Button
                            onClick={() =>
                              setFeedbackMessage(
                                `${document.name} has ${document.versions.length} stored version${document.versions.length === 1 ? "" : "s"} in history.`,
                              )
                            }
                            size="sm"
                            variant="secondary"
                          >
                            Version history
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No expired compliance documents need renewal right now."
                    title="No expired documents"
                  />
                )}
              </SurfaceCard>
            ) : null}

            {activeComplianceView === "expiring" ? (
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Expiring soon</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    These documents are inside their 30-day reminder window.
                  </p>
                </div>
                {complianceExpiringItems.length > 0 ? (
                  <div className="space-y-3">
                    {complianceExpiringItems.map((document) => (
                      <div
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                        key={document.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{document.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Expires {document.expiryDate ? formatDateLabel(document.expiryDate) : "soon"}
                            </p>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {document.reminderSchedule.map((reminder) => (
                            <span
                              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                              key={`${document.id}-${reminder}`}
                            >
                              {reminder}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleComplianceRequest(document, "renewal_request")}
                            size="sm"
                            variant="secondary"
                          >
                            Send reminder
                          </Button>
                          <Button
                            onClick={() =>
                              setFeedbackMessage(`Open ${document.name} from the compliance record list.`)
                            }
                            size="sm"
                            variant="secondary"
                          >
                            Open item
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No items are currently in the 30-day renewal window."
                    title="No expiring documents"
                  />
                )}
              </SurfaceCard>
            ) : null}

            {activeComplianceView === "missing" ? (
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Missing required</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Required items with no current uploaded version.
                  </p>
                </div>
                {complianceMissingItems.length > 0 ? (
                  <div className="space-y-3">
                    {complianceMissingItems.map((document) => (
                      <div
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                        key={document.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{document.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{document.description}</p>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleComplianceRequest(document, "missing_document_request")}
                            size="sm"
                            variant="secondary"
                          >
                            Request document
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="Every required compliance document currently has an uploaded version."
                    title="No missing required documents"
                  />
                )}
              </SurfaceCard>
            ) : null}

            {activeComplianceView === "audit" ? (
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Compliance audit trail</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload, review, expiry, renewal, rejection, and request events stay visible here.
                  </p>
                </div>
                <AuditTrail
                  entries={workspace.compliance.auditTrail.map((entry) => ({
                    id: entry.id,
                    status: entry.action
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (character) => character.toUpperCase()),
                    actor: entry.actor,
                    timestamp: entry.timestamp,
                    note: entry.detail,
                  }))}
                />
              </SurfaceCard>
            ) : null}
          </section>
        ) : (
          <EmptyState
            description="No structured compliance record is available for this workspace yet."
            title="Compliance workspace unavailable"
          />
        )
      ) : null}

      {activeTab === "requests" ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <RequestBoard
            description="Requests track both accountant follow-ups and client questions so each task stays in one accountable thread."
            onOpenRequest={(request) => setSelectedRequestId(request.id)}
            requests={workspace.requests}
            title="Open requests"
          />
          <div className="space-y-6">
            <SurfaceCard className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Selected request</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review who asked for what, then reply in-thread or close the task once it is handled.
                  </p>
                </div>
                {selectedRequest && !["resolved", "closed"].includes(selectedRequest.status) ? (
                  <Button onClick={handleResolveRequest} variant="secondary">
                    Mark resolved
                  </Button>
                ) : null}
              </div>
              {selectedRequest ? (
                <div className="grid gap-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Request title</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedRequest.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedRequest.description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Requested by</p>
                      <p className="mt-2 font-semibold text-slate-950">
                        {selectedRequest.requestedBy}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedRequest.requestedByRole === "client" ? "Client request" : "Accountant follow-up"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Assigned to</p>
                      <p className="mt-2 font-semibold text-slate-950">{selectedRequest.assignedTo}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Due {formatDateLabel(selectedRequest.dueDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  description="Select a request from the queue to review its details and reply in context."
                  title="No request selected"
                />
              )}
            </SurfaceCard>
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
                  currentRole={user?.role ?? "accountant"}
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
