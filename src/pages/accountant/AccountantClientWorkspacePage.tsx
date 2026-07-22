// Friendly guide: this module (AccountantClientWorkspacePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { ApiError, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import { buildReviewDocumentFromInvoice } from "../../services/workflowEngine";
import { EmptyState } from "../../components/ui/EmptyState";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { DocumentPreviewPane } from "../../components/workflow/DocumentPreviewPane";
import { RequestBoard } from "../../components/workflow/RequestBoard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { ComplianceDocumentRecord, DocumentComment, DocumentRecord, WorkflowRequest } from "../../types/portal";
import { cn } from "../../utils/cn";
import { buildComplianceRequestDetails } from "../../utils/compliance";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { toBackendRequestType, toFrontendRequestType } from "../../utils/requestTypeMapping";

const workspaceTabs = [
  { id: "packs", label: "Monthly Packs" },
  { id: "bank_statement", label: "Bank Statement" },
  { id: "invoices", label: "Invoices" },
  { id: "signed_documents", label: "Signed Documents" },
  { id: "compliance_record", label: "Compliance Record" },
] as const;

const navyPanelClass =
  "rounded-2xl border border-[#dce6ef] bg-white shadow-[0_16px_38px_rgba(4,24,52,0.08)]";
const navySoftPanelClass = "rounded-2xl border border-[#dce6ef] bg-[#f7faff]";
const navyButtonClass =
  "client-dashboard-action-button inline-flex items-center justify-center rounded-lg border-0 font-medium ring-0";
const navySecondaryButtonClass =
  "border border-[#cdd8ea] bg-white text-[#091333] shadow-[0_8px_18px_rgba(4,24,52,0.05)] hover:bg-[#f8fbff]";

// Shared shape notes: these types keep UI and data contracts aligned.
type WorkspaceTab = (typeof workspaceTabs)[number]["id"];
type WorkspaceDocumentDecision = "under_review" | "accepted" | "rejected" | "request_reupload";

interface BackendDocumentRecord {
  id: string;
  clientId: string;
  monthlyPackId: string;
  name: string;
  category: string;
  documentSlotId?: string | null;
  status: string;
  fileType: string;
  sizeBytes: number;
  storageKey?: string | null;
  uploadedByUserId: string;
  currentVersionNumber: number;
  uploadedAtUtc: string;
  updatedAtUtc: string;
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
  isInternal?: boolean;
  message: string;
  createdAtUtc: string;
}

interface BackendRequestWorkspace {
  request: BackendRequestRecord;
  comments: BackendRequestComment[];
}

interface BackendDocumentComment {
  id: string;
  documentId: string;
  authorUserId: string;
  authorRole: string;
  message: string;
  createdAtUtc: string;
}

const complianceTabs = [
  { id: "overview", label: "Overview" },
  { id: "categories", label: "Compliance Categories" },
  { id: "expired", label: "Expired" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "missing", label: "Missing Required" },
  { id: "audit", label: "Audit Trail" },
] as const;

type ComplianceWorkspaceTab = (typeof complianceTabs)[number]["id"];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return !!value && workspaceTabs.some((tab) => tab.id === value);
}

function resolveWorkspaceTab(value: string | null, pathname: string): WorkspaceTab {
  if (isWorkspaceTab(value)) {
    return value;
  }

  if (pathname.endsWith("/packs")) {
    return "packs";
  }

  return "packs";
}

function tabForDocumentType(documentType: string): WorkspaceTab {
  if (documentType === "Bank Statement") {
    return "bank_statement";
  }
  if (documentType === "Invoices") {
    return "invoices";
  }
  if (documentType === "Signed Documents") {
    return "signed_documents";
  }
  if (documentType === "Compliance Record") {
    return "compliance_record";
  }
  return "packs";
}

function statusPillClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("reject") || normalized.includes("overdue")) {
    return "bg-rose-50 text-rose-600 ring-rose-200";
  }
  if (normalized.includes("review") || normalized.includes("pending") || normalized.includes("attention")) {
    return "bg-amber-50 text-amber-600 ring-amber-200";
  }
  if (normalized.includes("approved") || normalized.includes("complete") || normalized.includes("on track")) {
    return "bg-emerald-50 text-emerald-600 ring-emerald-200";
  }
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function mapLiveDocumentStatus(status: string): DocumentRecord["status"] {
  switch (status.trim().toLowerCase()) {
    case "under_review":
      return "under_review";
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "filed":
      return "filed";
    default:
      return "uploaded";
  }
}

function formatSizeLabel(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1_000) {
    return `${Math.max(1, Math.round(sizeBytes / 1_000))} KB`;
  }

  return `${sizeBytes} B`;
}

// Component flow: gather data first, then render a focused UI state.
export function AccountantClientWorkspacePage() {
  const { clientId = "firm-client-1" } = useParams();
  const { user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamString = searchParams.toString();
  const initialTab = resolveWorkspaceTab(searchParams.get("tab"), location.pathname);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [activeComplianceView, setActiveComplianceView] = useState<ComplianceWorkspaceTab>(
    (searchParams.get("view") as ComplianceWorkspaceTab | null) ?? "overview",
  );
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedComplianceCategoryId, setSelectedComplianceCategoryId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [liveDocuments, setLiveDocuments] = useState<DocumentRecord[]>([]);
  const [liveCommentsByDocumentId, setLiveCommentsByDocumentId] = useState<Record<string, DocumentComment[]>>({});
  const [liveRequests, setLiveRequests] = useState<WorkflowRequest[]>([]);
  const workspace = portal.getClientWorkspace(clientId);
  const workspaceDocumentsSource = backendMode && liveDocuments.length > 0
    ? liveDocuments
    : workspace.documents;
  const acceptedDocuments = useMemo(
    () => workspaceDocumentsSource.filter((document) => document.status === "accepted"),
    [workspaceDocumentsSource],
  );

  const workspaceViewDocuments = useMemo<DocumentRecord[]>(() => {
    if (backendMode) {
      return workspaceDocumentsSource;
    }

    const monthLabel = workspace.monthPack.monthLabel;
    const invoiceDocuments = workspace.invoices
      .filter((invoice) => invoice.monthLabel === monthLabel)
      .map((invoice) => buildReviewDocumentFromInvoice(invoice));

    const byId = new Map<string, DocumentRecord>();
    for (const document of [...invoiceDocuments, ...workspace.documents]) {
      byId.set(document.id, document);
    }
    return [...byId.values()];
  }, [backendMode, workspace.documents, workspace.invoices, workspace.monthPack.monthLabel, workspaceDocumentsSource]);

  const selectedDocument =
    workspaceViewDocuments.find((document) => document.id === selectedDocumentId) ??
    workspaceViewDocuments[0] ??
    null;
  const requestQueue = backendMode ? liveRequests : workspace.requests;
  const selectedRequest =
    requestQueue.find((request) => request.id === selectedRequestId) ??
    requestQueue[0] ??
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
  const visiblePackSlots = useMemo(() => {
    if (activeTab === "bank_statement") {
      return workspace.monthPack.slots.filter((slot) => slot.documentType === "Bank Statement");
    }
    if (activeTab === "signed_documents") {
      return workspace.monthPack.slots.filter((slot) => slot.documentType === "Signed Documents");
    }
    if (activeTab === "compliance_record") {
      return workspace.monthPack.slots.filter((slot) => slot.documentType === "Compliance Record");
    }
    if (activeTab === "invoices") {
      return workspace.monthPack.slots.filter((slot) => slot.documentType === "Invoices");
    }
    return workspace.monthPack.slots;
  }, [activeTab, workspace.monthPack.slots]);
  const activePackDocumentType = useMemo(() => {
    if (activeTab === "bank_statement") return "Bank Statement";
    if (activeTab === "invoices") return "Invoices";
    if (activeTab === "signed_documents") return "Signed Documents";
    if (activeTab === "compliance_record") return "Compliance Record";
    return null;
  }, [activeTab]);
  const submittedPackDocuments = useMemo(() => {
    if (!activePackDocumentType) {
      return [];
    }
    if (activePackDocumentType === "Invoices") {
      return workspace.invoices
        .filter((invoice) => invoice.monthLabel === workspace.monthPack.monthLabel)
        .map((invoice) => buildReviewDocumentFromInvoice(invoice));
    }
    return workspace.documents.filter(
      (document) =>
        document.documentType === activePackDocumentType &&
        document.monthLabel === workspace.monthPack.monthLabel,
    );
  }, [activePackDocumentType, workspace.documents, workspace.invoices, workspace.monthPack.monthLabel]);

  useEffect(() => {
    const requestedTab = resolveWorkspaceTab(searchParams.get("tab"), location.pathname);
    setActiveTab(requestedTab);
  }, [location.pathname, searchParamString]);

  useEffect(() => {
    if ((activeTab as string) !== "documents") {
      return;
    }

    if (acceptedDocuments.length === 0) {
      return;
    }

    const selectedStillExists = acceptedDocuments.some(
      (document) => document.id === selectedDocumentId,
    );

    if (!selectedDocumentId || !selectedStillExists) {
      setSelectedDocumentId(acceptedDocuments[0].id);
    }
  }, [acceptedDocuments, activeTab, selectedDocumentId]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "documents") {
      navigate(`/firm/documents?client=${workspace.client.id}`, { replace: true });
    }
  }, [navigate, searchParamString, searchParams, workspace.client.id]);

  useEffect(() => {
    const documentId = searchParams.get("documentId");
    if (!documentId) {
      return;
    }
    const targetDocument = workspaceViewDocuments.find((document) => document.id === documentId);
    if (!targetDocument) {
      return;
    }
    setSelectedDocumentId(targetDocument.id);
    setIsDocumentModalOpen(true);
  }, [searchParamString, searchParams, workspaceViewDocuments]);

  useEffect(() => {
    setDecisionMessage("");
    if (!isDocumentModalOpen) {
      setDecisionReason("");
      return;
    }
    setDecisionReason(selectedDocument?.rejectionReason ?? "");
  }, [isDocumentModalOpen, selectedDocument?.id, selectedDocument?.rejectionReason]);

  useEffect(() => {
    if (!backendMode || !user) {
      return;
    }

    void loadLiveRequests();
  }, [backendMode, user?.id, workspace.client.id]);

  useEffect(() => {
    if (!backendMode || !user) {
      return;
    }

    void loadLiveDocuments();
  }, [backendMode, user?.id, workspace.client.id]);

  useEffect(() => {
    if (!backendMode || !selectedDocument) {
      return;
    }

    if (liveCommentsByDocumentId[selectedDocument.id]) {
      return;
    }

    void loadLiveDocumentComments(selectedDocument.id);
  }, [backendMode, selectedDocument?.id]);

  function mapLiveRequest(workspaceRequest: BackendRequestWorkspace): WorkflowRequest {
    const clientName = workspace.client.clientName;
    const accountantName = workspace.client.assignedAccountant;
    const requestedByRole =
      workspaceRequest.request.requestedByUserId === user?.id ? "accountant" : "client";

    return {
      id: workspaceRequest.request.id,
      clientId: workspaceRequest.request.clientId,
      clientName,
      title: workspaceRequest.request.title,
      description: workspaceRequest.request.description,
      monthLabel: formatDateLabel(
        workspaceRequest.request.dueDateUtc ?? workspaceRequest.request.requestedAtUtc,
      ),
      status:
        workspaceRequest.request.status === "resolved"
          ? "resolved"
          : workspaceRequest.request.status === "closed"
            ? "closed"
            : workspaceRequest.request.status === "waiting_on_client" ||
                workspaceRequest.request.status === "awaiting_client" ||
                workspaceRequest.request.status === "overdue"
              ? "awaiting_client"
              : "awaiting_accountant",
      priority:
        workspaceRequest.request.priority === "high" ||
        workspaceRequest.request.priority === "medium" ||
        workspaceRequest.request.priority === "low"
          ? workspaceRequest.request.priority
          : "medium",
      relatedDocumentId: workspaceRequest.request.relatedDocumentId ?? undefined,
      requestedBy: requestedByRole === "accountant" ? accountantName : clientName,
      requestedByRole,
      assignedTo: clientName,
      dueDate: workspaceRequest.request.dueDateUtc ?? workspaceRequest.request.updatedAtUtc,
      createdAt: workspaceRequest.request.requestedAtUtc,
      requestType: toFrontendRequestType(workspaceRequest.request.requestType),
      comments: workspaceRequest.comments.map<DocumentComment>((comment) => ({
        id: comment.id,
        author: comment.authorRole === "client" ? clientName : accountantName,
        role: comment.authorRole === "client" ? "client" : "accountant",
        message: comment.isInternal ? `[INTERNAL] ${comment.message}` : comment.message,
        createdAt: comment.createdAtUtc,
      })),
      auditTrail: [],
    };
  }

  async function loadLiveRequests() {
    try {
      const requests = await apiGetJson<BackendRequestRecord[]>("/api/requests");
      const clientRequests = requests.filter((request) => request.clientId === workspace.client.id);
      const workspaces = await Promise.all(
        clientRequests.map((request) =>
          apiGetJson<BackendRequestWorkspace>(`/api/requests/${encodeURIComponent(request.id)}/workspace`),
        ),
      );

      setLiveRequests(workspaces.map(mapLiveRequest));
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiError
          ? error.message
          : "The live client request panel could not be loaded.",
      );
    }
  }

  async function loadLiveDocuments() {
    try {
      const documents = await apiGetJson<BackendDocumentRecord[]>("/api/documents");
      const mappedDocuments = documents
        .filter((document) => document.clientId === workspace.client.id)
        .map<DocumentRecord>((document) => ({
          id: document.id,
          clientId: document.clientId,
          clientName: workspace.client.clientName,
          documentType: document.category,
          fileName: document.name,
          monthLabel: formatDateLabel(document.uploadedAtUtc),
          description: `${document.category} uploaded in the secure document workflow.`,
          status: mapLiveDocumentStatus(document.status),
          uploadedBy: workspace.client.clientName,
          uploadedAt: document.uploadedAtUtc,
          reviewedBy: undefined,
          reviewedAt: undefined,
          sizeLabel: formatSizeLabel(document.sizeBytes),
          keywordTags: [document.category, document.name],
          comments: liveCommentsByDocumentId[document.id] ?? [],
          auditTrail: [],
          fileMimeType: document.fileType,
        }));

      setLiveDocuments(mappedDocuments);
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiError ? error.message : "The live client documents could not be loaded.",
      );
    }
  }

  async function loadLiveDocumentComments(documentId: string) {
    try {
      const comments = await apiGetJson<BackendDocumentComment[]>(
        `/api/documents/${encodeURIComponent(documentId)}/comments`,
      );
      const mappedComments = comments.map<DocumentComment>((comment) => ({
        id: comment.id,
        author: comment.authorRole === "client" ? workspace.client.clientName : workspace.client.assignedAccountant,
        role: comment.authorRole === "client" ? "client" : "accountant",
        message: comment.message,
        createdAt: comment.createdAtUtc,
      }));

      setLiveCommentsByDocumentId((current) => ({ ...current, [documentId]: mappedComments }));
      setLiveDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? { ...document, comments: mappedComments } : document,
        ),
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiError
          ? error.message
          : "The live document comments could not be loaded.",
      );
    }
  }

  function switchTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  }

  function openDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setIsDocumentModalOpen(true);
  }

  function handlePackSlotOpen(documentType: string) {
    const targetTab = tabForDocumentType(documentType);
    setIsDocumentModalOpen(false);
    switchTab(targetTab);
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
    if (!selectedDocument || !user) {
      return {
        ok: false,
        message: "Select a document before posting a comment.",
      };
    }

    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/documents/${encodeURIComponent(selectedDocument.id)}/comments`, {
            message,
          });
          await loadLiveDocumentComments(selectedDocument.id);
          setFeedbackMessage("Document comment posted.");
        } catch (error) {
          setFeedbackMessage(
            error instanceof ApiError
              ? error.message
              : "The live document comment could not be posted.",
          );
        }
      })();

      return {
        ok: true,
        message: "Sending...",
      };
    }

    if (workspace.client.id !== "firm-client-1") {
      return {
        ok: false,
        message: "This seeded workspace is read-only for document comments outside the live client.",
      };
    }
    if (selectedDocument.status === "draft") {
      return {
        ok: false,
        message: "This file is still in client draft. Accountants can only view it until submission.",
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

  function handleWorkspaceDocumentDecision(decision: WorkspaceDocumentDecision) {
    if (!selectedDocument || !user) {
      return;
    }
    if (selectedDocument.status === "draft") {
      setDecisionMessage(
        "This file is still in client draft. You can only view it until the client submits the month pack.",
      );
      return;
    }
    const trimmedReason = decisionReason.trim();
    if ((decision === "rejected" || decision === "request_reupload") && !trimmedReason) {
      setDecisionMessage("Add a reason before rejecting or returning this document.");
      return;
    }

    if (backendMode) {
      void (async () => {
        try {
          if (decision === "accepted" || decision === "rejected") {
            await apiPostJson(`/api/documents/${encodeURIComponent(selectedDocument.id)}/review`, {
              decision,
              reason: decision === "rejected" ? trimmedReason : null,
              internalNote: null,
            });
          } else {
            await apiPostJson(`/api/documents/${encodeURIComponent(selectedDocument.id)}/request-reupload`, {
              reason: trimmedReason,
              internalNote: null,
            });
          }

          await loadLiveDocuments();
          await loadLiveDocumentComments(selectedDocument.id);
          setDecisionMessage("Document workflow updated.");
          setFeedbackMessage("Document workflow updated.");
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : "The live document workflow action could not be completed.";
          setDecisionMessage(message);
          setFeedbackMessage(message);
        }
      })();
      return;
    }

    const result = portal.reviewRecord({
      recordId: selectedDocument.id,
      action: decision === "request_reupload" ? "rejected" : decision,
      reviewer: user.fullName,
      reason: decision === "rejected" || decision === "request_reupload" ? trimmedReason : undefined,
    });

    setDecisionMessage(result.message);
    setFeedbackMessage(result.message);
  }

  function handleRequestComment(message: string) {
    if (!selectedRequest || !user) {
      return {
        ok: false,
        message: "Select a request before posting a comment.",
      };
    }

    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/requests/${encodeURIComponent(selectedRequest.id)}/comments`, {
            message,
          });
          await loadLiveRequests();
          setFeedbackMessage("Request comment posted.");
        } catch (error) {
          setFeedbackMessage(
            error instanceof ApiError
              ? error.message
              : "The live request comment could not be posted.",
          );
        }
      })();

      return { ok: true, message: "Sending..." };
    }

    if (workspace.client.id !== "firm-client-1") {
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
    if (!selectedRequest || !user) {
      setFeedbackMessage("Select a request before updating it.");
      return;
    }

    if (backendMode) {
      void (async () => {
        try {
          await apiPostJson(`/api/requests/${encodeURIComponent(selectedRequest.id)}/resolve`, {
            resolutionNote: "Resolved from the accountant client workspace.",
          });
          await loadLiveRequests();
          setFeedbackMessage("Request resolved.");
        } catch (error) {
          setFeedbackMessage(
            error instanceof ApiError
              ? error.message
              : "The live request could not be resolved.",
          );
        }
      })();
      return;
    }

    if (workspace.client.id !== "firm-client-1") {
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

    if (backendMode) {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const details = buildComplianceRequestDetails(
        record,
        requestType,
        dueDate,
        `Please action ${record.name} so the compliance workflow can move forward.`,
        user.fullName,
      );

      void (async () => {
        try {
          await apiPostJson("/api/requests", {
            clientId: workspace.compliance?.clientId ?? workspace.client.id,
            requestType: toBackendRequestType(details.requestType),
            title: details.title,
            description: details.description,
            priority: "high",
            dueDateUtc: details.dueDate,
            relatedDocumentId: null,
          });

          setFeedbackMessage(`Live request created for ${record.name}.`);
        } catch (error) {
          setFeedbackMessage(
            error instanceof ApiError
              ? error.message
              : `The live request for ${record.name} could not be created.`,
          );
        }
      })();

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

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-6 text-[#091333]">
      <section className="relative overflow-hidden rounded-[28px] border border-[#dce6ef] bg-[linear-gradient(135deg,#ffffff_0%,#f7faff_62%,#eef5fb_100%)] p-5 text-[#091333] shadow-[0_22px_50px_rgba(4,24,52,0.08)] md:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[34%] bg-[radial-gradient(circle_at_top_right,rgba(160,190,220,0.24),transparent_62%)]" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[#6f7d96]">
              Accountant Client Workspace
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-medium text-[#091333] md:text-3xl">
                {workspace.client.clientName}
              </h1>
              <StatusBadge status={workspace.client.status} />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#53617f]">
              Keep this client's month pack, document review, compliance, requests, messages, and audit trail in one accountable workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[0.78rem] font-medium text-[#41526f]">
              <span className="rounded-full border border-[#d8e2ef] bg-white px-3 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                {workspace.client.industry}
              </span>
              <span className="rounded-full border border-[#d8e2ef] bg-white px-3 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                Assigned to {workspace.client.assignedAccountant}
              </span>
              <span className="rounded-full border border-[#d8e2ef] bg-white px-3 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                {workspace.client.deadlinePolicy}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 self-end">
            <Button
              className={cn("h-10 rounded-xl border border-[#cdd8ea] bg-white px-4 text-sm font-medium text-[#091333] shadow-[0_8px_18px_rgba(4,24,52,0.05)] hover:bg-[#f8fbff]",)}
              onClick={() => navigate(`/firm/documents?client=${workspace.client.id}`)}
              variant="secondary"
            >
              Open document centre
            </Button>
            <Button
              className={cn("client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-medium ring-0",)}
              onClick={() => navigate(`/firm/inbox?client=${workspace.client.id}`)}
            >
              Open inbox
            </Button>
          </div>
        </div>
      </section>

      {feedbackMessage ? (
        <div className="rounded-2xl border border-[#cdd8ea] bg-[#f7faff] px-5 py-4 text-sm font-medium text-[#0a2f66]">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className={cn(navyPanelClass, "space-y-5 p-0")}>
        <div className="border-b border-[#e6edf4] bg-[#fbfdff] px-5 pb-5 pt-5">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-medium text-[#091333]">{workspace.client.clientName}</h2>
              <StatusBadge status={workspace.client.status} />
            </div>
            <p className="text-sm text-[#53617f]">
              {workspace.client.industry} / {workspace.client.assignedAccountant} / {workspace.client.deadlinePolicy}
            </p>
          </div>
          <div className={cn(navySoftPanelClass, "space-y-2 p-4")}>
            <div className="flex items-center justify-between text-sm font-medium text-[#091333]">
              <span>Month pack progress</span>
              <span>{workspace.monthPack.progressPercent}%</span>
            </div>
            <ProgressBar value={workspace.monthPack.progressPercent} />
          </div>
        </div>
        </div>

        <div className="flex flex-wrap gap-2 px-5">
          {workspaceTabs.map((tab) => (
            <button
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                activeTab === tab.id
                  ? "bg-[#062044] text-white shadow-[0_10px_22px_rgba(6,32,68,0.22)]"
                  : "bg-[#eef4fa] text-[#53617f] hover:bg-[#dfeaf5] hover:text-[#091333]",
              )}
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "packs" ? (
          <div className="mx-5 mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#dce6ef] bg-[#f7faff] px-3 py-2.5">
            <p className="text-sm text-[#53617f]">
              Viewing:{" "}
              <span className="font-medium text-[#091333]">
                {workspaceTabs.find((tab) => tab.id === activeTab)?.label ?? "Section"}
              </span>
            </p>
            <Button className={cn(navySecondaryButtonClass, "h-8 rounded-lg px-3 text-xs")} onClick={() => switchTab("packs")} size="sm" variant="secondary">
              Back to Monthly Packs
            </Button>
          </div>
        ) : null}
      </SurfaceCard>

      {["packs", "bank_statement", "invoices", "signed_documents", "compliance_record"].includes(activeTab) ? (
        <SurfaceCard className={cn(navyPanelClass, "space-y-5 rounded-[1.45rem] border border-[#dce6ef] bg-white p-0 shadow-[0_12px_30px_rgba(15,23,42,0.05)]")}>
          <div className="px-6 pb-4 pt-6">
            <h2 className="text-[1.28rem] font-medium text-[#091333]">Client monthly pack</h2>
            <p className="mt-2 text-sm leading-6 text-[#53617f]">
              Review the structured slots and focus on anything still missing, rejected, or pending.
            </p>
          </div>
          <div className="px-6 pb-1">
            <div className="overflow-hidden rounded-[1rem] border border-[#dce6ef] bg-white">
            <div className="hidden border-b border-[#0a2f66] bg-[linear-gradient(180deg,#0b2f63_0%,#08264f_100%)] px-6 py-3 text-[0.72rem] font-medium uppercase tracking-[0.08em] text-white lg:grid lg:grid-cols-[minmax(0,1fr)_120px_160px_220px] lg:gap-4">
              <div>Document slot</div>
              <div>Required</div>
              <div>Due date</div>
              <div className="text-right">Pack progress</div>
            </div>
            <div className="divide-y divide-[#edf2f7]">
            {visiblePackSlots.map((slot) => (
              (() => {
                const slotDueDate = slot.dueDate ?? workspace.monthPack.dueDate;
                const dueDeltaDays = Math.ceil(
                  (new Date(slotDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                );
                const relatedDocs = workspace.documents.filter(
                  (document) =>
                    document.documentType === slot.documentType &&
                    document.monthLabel === workspace.monthPack.monthLabel,
                );
                const hasRejected = relatedDocs.some((document) =>
                  document.status.toLowerCase().includes("reject"),
                );
                const hasUnderReview = relatedDocs.some((document) =>
                  document.status.toLowerCase().includes("review"),
                );
                const hasAccepted = relatedDocs.some((document) =>
                  document.status.toLowerCase().includes("accept"),
                );
                const slotStatusLabel =
                  relatedDocs.length === 0
                    ? "Not submitted"
                    : hasRejected
                      ? "Needs correction"
                      : hasUnderReview
                        ? "In review"
                        : hasAccepted
                          ? "Submitted"
                          : "Uploaded";

                return (
                  <div
                    className="grid gap-4 px-5 py-4 transition hover:bg-[#fcfdff] lg:grid-cols-[minmax(0,1fr)_120px_160px_220px] lg:items-center lg:gap-4 lg:px-6"
                    key={slot.id}
                  >
                    <div className="min-w-0">
                      <p className="text-[0.98rem] font-medium text-[#091333]">{slot.documentType}</p>
                      <p className="mt-1 line-clamp-1 max-w-xl text-sm text-[#53617f]">{slot.description}</p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#73809a] lg:hidden">
                        Required
                      </p>
                      <p className="mt-1 text-sm text-[#091333] lg:mt-0">
                        {slot.isRequired ? "Yes" : "Optional"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#73809a] lg:hidden">
                        Due date
                      </p>
                      <p className="mt-1 text-sm text-[#091333] lg:mt-0">
                        {formatDateLabel(slotDueDate)}
                      </p>
                      {dueDeltaDays < 0 ? (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {Math.abs(dueDeltaDays)} day{Math.abs(dueDeltaDays) === 1 ? "" : "s"} overdue
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset shadow-none",
                          statusPillClass(slotStatusLabel),
                        )}
                      >
                        {slotStatusLabel}
                      </span>
                      {activeTab === "packs" ? (
                        <Button
                          className="h-8 rounded-md border border-[#d5deea] bg-white px-3 text-xs font-medium text-[#33425f] shadow-none hover:bg-[#f8fbff]"
                          onClick={() => handlePackSlotOpen(slot.documentType)}
                          size="sm"
                          variant="secondary"
                        >
                          View files
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ))}
            </div>
          </div>
          </div>
          {activePackDocumentType ? (
            <div className="space-y-4 px-6 pb-6">
              <div className="border-t border-[#edf2f7] pt-5">
                <h3 className="text-[1.02rem] font-medium text-[#091333]">
                  Submitted {activePackDocumentType.toLowerCase()} files ({workspace.monthPack.monthLabel})
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#53617f]">
                  These are the client files currently attached to this pack for the selected month.
                </p>
              </div>
              {submittedPackDocuments.length > 0 ? (
                <div className="overflow-hidden rounded-[1rem] border border-[#dce6ef] bg-white">
                  <div className="hidden border-b border-[#e6edf4] bg-[#f8fafc] px-5 py-3 text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[#73809a] md:grid md:grid-cols-[minmax(0,1.2fr)_180px_150px_auto] md:gap-4">
                    <div>File</div>
                    <div>Type</div>
                    <div>Status</div>
                    <div className="text-right">Action</div>
                  </div>
                  <div className="divide-y divide-[#edf2f7]">
                    {submittedPackDocuments.map((document) => (
                      <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_180px_150px_auto] md:items-center" key={document.id}>
                        <div className="min-w-0">
                          <p className="truncate text-[0.95rem] font-medium text-[#091333]">{document.fileName}</p>
                        </div>
                        <div>
                          <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#73809a] md:hidden">
                            Type
                          </p>
                          <p className="mt-1 text-sm text-[#53617f] md:mt-0">
                            {document.documentType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#73809a] md:hidden">
                            Status
                          </p>
                          <StatusBadge status={document.status} />
                        </div>
                        <div className="flex items-center gap-2 md:justify-end">
                          <Button
                            className="h-8 rounded-md border border-[#d5deea] bg-white px-3 text-xs font-medium text-[#33425f] shadow-none hover:bg-[#f8fbff]"
                            onClick={() => openDocument(document.id)}
                            size="sm"
                            variant="secondary"
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1rem] border border-[#dce6ef] bg-[#fafcff] px-5 py-4 text-sm text-[#53617f]">
                  No client files have been submitted for this pack in {workspace.monthPack.monthLabel} yet.
                </div>
              )}
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      {(activeTab as string) === "documents" ? (
        <section className="mx-auto w-full max-w-[1040px] space-y-4">
          <div className={cn(navyPanelClass, "flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
            <div>
              <h2 className="text-xl font-medium text-[#091333]">Documents</h2>
              <p className="mt-1 text-sm text-[#53617f]">
                Open a document to inspect the file, review context, and leave controlled feedback.
              </p>
            </div>
          </div>

          {acceptedDocuments.length === 0 ? (
            <SurfaceCard>
              <EmptyState
                description="Only accepted documents appear in this section. Rejected or in-review files are excluded."
                title="No accepted documents yet"
              />
            </SurfaceCard>
          ) : null}

          {acceptedDocuments.length > 0 ? (
            <SurfaceCard className={cn(navyPanelClass, "overflow-hidden p-0")}>
              <div className="grid grid-cols-[minmax(0,1.25fr)_180px_120px_auto] gap-4 border-b border-[#e6edf4] bg-[#f7faff] px-5 py-3 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[#73809a]">
                <div>File</div>
                <div>Type/Month</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              <div className="divide-y divide-[#edf2f7]">
                {acceptedDocuments.map((document) => (
                  <div className="grid grid-cols-[minmax(0,1.25fr)_180px_120px_auto] items-center gap-4 px-5 py-3" key={document.id}>
                    <p className="truncate text-sm font-medium text-[#091333]">{document.fileName}</p>
                    <p className="text-sm text-[#53617f]">{document.documentType} / {document.monthLabel}</p>
                    <StatusBadge status={document.status} />
                    <Button className={cn(navySecondaryButtonClass, "h-8 rounded-lg px-3 text-xs")} onClick={() => openDocument(document.id)} size="sm" variant="secondary">
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          ) : null}
        </section>
      ) : null}

      <Modal
        description="Review the file and add controlled feedback."
        isOpen={isDocumentModalOpen && !!selectedDocument}
        onClose={() => setIsDocumentModalOpen(false)}
        panelClassName="max-w-[96vw] xl:max-w-[1420px] p-6 xl:p-7"
        title={selectedDocument?.fileName ?? "Document preview"}
      >
        <div className="space-y-6">
          {selectedDocument ? <DocumentPreviewPane document={selectedDocument} /> : null}
          {selectedDocument?.status === "draft" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This document is in client draft state. Accountant actions are locked until submission.
            </div>
          ) : null}
          {selectedDocument ? (
            <section className="space-y-3 rounded-xl border border-[#dce6ef] bg-[#f7faff] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#091333]">Review actions (workspace only)</p>
                <StatusBadge status={selectedDocument.status} />
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#73809a]">
                  Reason (required for return/reject)
                </span>
                <textarea
                  className="min-h-[88px] w-full rounded-lg border border-[#dce6ef] bg-white px-3 py-2 text-sm text-[#091333] outline-none focus:border-[#0a2f66] focus:ring-2 focus:ring-[#dbe7f1]"
                  disabled={selectedDocument.status === "draft"}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  placeholder="Add review notes for the client or team..."
                  value={decisionReason}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  className="h-9 rounded-lg border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                  disabled={selectedDocument.status === "draft"}
                  onClick={() => handleWorkspaceDocumentDecision("under_review")}
                  size="sm"
                  variant="secondary"
                >
                  Mark under review
                </Button>
                <Button
                  className={cn(navySecondaryButtonClass, "h-9 rounded-lg")}
                  disabled={selectedDocument.status === "draft"}
                  onClick={() => handleWorkspaceDocumentDecision("request_reupload")}
                  size="sm"
                  variant="secondary"
                >
                  Return to client
                </Button>
                <Button
                  className="h-9 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                  disabled={selectedDocument.status === "draft"}
                  onClick={() => handleWorkspaceDocumentDecision("rejected")}
                  size="sm"
                  variant="secondary"
                >
                  Reject
                </Button>
                <Button
                  className={cn(navyButtonClass, "h-9 rounded-lg")}
                  disabled={selectedDocument.status === "draft"}
                  onClick={() => handleWorkspaceDocumentDecision("accepted")}
                  size="sm"
                >
                  Accept
                </Button>
              </div>
              {decisionMessage ? (
                <p className="text-sm font-medium text-[#0a2f66]">{decisionMessage}</p>
              ) : null}
            </section>
          ) : null}
          {selectedDocument ? (
            <CommentThread
              comments={selectedDocument.comments}
              currentAuthor={user?.fullName ?? "Accountant"}
              currentRole={user?.role ?? "accountant"}
              helperText={
                selectedDocument.status === "draft"
                  ? "Comments are disabled while this file is still in client draft."
                  : undefined
              }
              readOnly={selectedDocument.status === "draft"}
              onSubmitComment={handleDocumentComment}
            />
          ) : null}
        </div>
      </Modal>

      {(activeTab as string) === "invoices_legacy" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-medium text-slate-950">Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track lifecycle from draft through accountant acceptance or rejection.
            </p>
          </div>
          <div className="space-y-3">
            {workspace.invoices.map((invoice) => (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={invoice.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">{invoice.amountLabel} / {invoice.monthLabel}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      {(activeTab as string) === "compliance_legacy" ? (
        workspace.compliance ? (
          <section className="space-y-6">
            <SurfaceCard className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">Compliance overview</p>
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
                      <p className="mt-2 text-xl font-medium text-rose-500">
                        {workspace.compliance.expiredCount}
                      </p>
                    </div>
                    <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Expiring</p>
                      <p className="mt-2 text-xl font-medium text-amber-500">
                        {workspace.compliance.expiringCount}
                      </p>
                    </div>
                    <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Missing</p>
                      <p className="mt-2 text-xl font-medium text-indigo-500">
                        {workspace.compliance.missingCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-950">Readiness summary</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.readinessSummary}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-950">Next best action</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.nextBestAction}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 md:col-span-2">
                    <p className="text-sm font-medium text-slate-950">Top priorities</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {workspace.compliance.topPriorities.slice(0, 3).map((priority) => (
                        <div
                          className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4"
                          key={priority.id}
                        >
                          <p className="text-sm font-medium text-slate-950">{priority.label}</p>
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
                  <h2 className="text-xl font-medium text-slate-950">Compliance readiness</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Use this summary to see why the client is compliant, at risk, overdue, or high risk.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-950">Risk status</p>
                    <p className="mt-2 text-2xl font-medium text-slate-950">
                      {formatStatusLabel(workspace.compliance.riskStatus)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {workspace.compliance.readinessSummary}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-950">Action queue</p>
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
                    <h2 className="text-xl font-medium text-slate-950">Compliance categories</h2>
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
                            <p className="text-sm font-medium">{category.name}</p>
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
                          <p className="text-lg font-medium">{category.complianceScore}%</p>
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
                        <h2 className="text-xl font-medium text-slate-950">
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
                                <p className="text-sm font-medium text-slate-950">{document.name}</p>
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
                  <h2 className="text-xl font-medium text-slate-950">Expired documents</h2>
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
                            <p className="text-sm font-medium text-slate-950">{document.name}</p>
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
                            onClick={() => {
                              setActiveComplianceView("audit");
                              setFeedbackMessage(
                                `Opened compliance audit trail for ${document.name} (${document.versions.length} version${document.versions.length === 1 ? "" : "s"}).`,
                              );
                            }}
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
                  <h2 className="text-xl font-medium text-slate-950">Expiring soon</h2>
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
                            <p className="text-sm font-medium text-slate-950">{document.name}</p>
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
                            onClick={() => {
                              setActiveComplianceView("categories");
                              if (document.categoryId) {
                                setSelectedComplianceCategoryId(document.categoryId);
                              }
                              setFeedbackMessage(`Opened ${document.name} in compliance categories.`);
                            }}
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
                  <h2 className="text-xl font-medium text-slate-950">Missing required</h2>
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
                            <p className="text-sm font-medium text-slate-950">{document.name}</p>
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
                  <h2 className="text-xl font-medium text-slate-950">Compliance audit trail</h2>
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

      {(activeTab as string) === "requests_legacy" ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <RequestBoard
            description="Requests track both accountant follow-ups and client questions so each task stays in one accountable thread."
            onOpenRequest={(request) => setSelectedRequestId(request.id)}
            requests={requestQueue}
            title="Open inbox"
          />
          <div className="space-y-6">
            <SurfaceCard className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium text-slate-950">Selected request</h2>
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
                    <p className="mt-2 text-sm font-medium text-slate-950">{selectedRequest.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedRequest.description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Requested by</p>
                      <p className="mt-2 font-medium text-slate-950">
                        {selectedRequest.requestedBy}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedRequest.requestedByRole === "client" ? "Client request" : "Accountant follow-up"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Assigned to</p>
                      <p className="mt-2 font-medium text-slate-950">{selectedRequest.assignedTo}</p>
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
                <h2 className="text-xl font-medium text-slate-950">Request comments</h2>
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

      {(activeTab as string) === "messages_legacy" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-medium text-slate-950">Controlled messages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Message history lives inside the selected document and request tabs, not in a free-form chat stream.
            </p>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Use the Documents tab for file-specific discussions.</li>
            <li>Use the Inbox tab for follow-up tasks and clarifications.</li>
            <li>Uploads must still go through the client’s structured monthly pack slot.</li>
          </ul>
        </SurfaceCard>
      ) : null}

      {(activeTab as string) === "audit_legacy" ? (
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-medium text-slate-950">Audit trail</h2>
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
