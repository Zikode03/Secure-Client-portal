import { RecordActions } from "../../components/ui/RecordActions";
import "./accountantDocuments.css";
import { DocumentPdfPreview } from "../../components/documents/DocumentPdfPreview";
// Friendly guide: this module (AccountantDocumentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { ApiError, apiGetBlob, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import { portalApiClient, apiData } from "../../services/portalApiClient";
import { portalServiceApi } from "../../services/portalApi";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import {
  buildReviewDocumentFromInvoice,
  buildUnifiedSearchResults,
} from "../../services/workflowEngine";
import type {
  DocumentRecord,
  DocumentComment,
  DocumentVersionRecord,
  FirmClientAccount,
  UnifiedSearchFilters,
  UnifiedSearchResult,
  WorkflowStatus,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatStatusLabel,
  statusToTone,
  toneToAccentClass,
} from "../../utils/formatters";
import { getScopedClients } from "../../utils/permissions";

const defaultFilters: UnifiedSearchFilters = {
  query: "",
  clientId: "",
  month: "",
  year: "",
  documentType: "",
  status: "",
  expiryStatus: "",
  requiredFlag: "all",
  uploadedBy: "",
  reviewedBy: "",
};

function mapBackendComment(comment: BackendDocumentComment): DocumentComment {
  const role = comment.authorRole.trim().toLowerCase() === "client" ? "client" : "accountant";
  return {
    id: comment.id,
    author: role === "client" ? "Client user" : "Accountant reviewer",
    role,
    message: comment.message,
    createdAt: comment.createdAtUtc,
  };
}

const resultsPerPage = 7;

// Shared shape notes: these types keep UI and data contracts aligned.
type ViewerTab = "details" | "comments" | "history" | "related";

interface BackendDocumentComment {
  id: string;
  documentId: string;
  authorUserId: string;
  authorRole: string;
  message: string;
  createdAtUtc: string;
}

// Component flow: gather data first, then render a focused UI state.
function SearchIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.75v9.5m0 0 3.5-3.5m-3.5 3.5-3.5-3.5M5.5 18.25h13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m10 7 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function buildSelectOptions(values: string[], allLabel: string) {
  return [
    { label: allLabel, value: "" },
    ...values.map((value) => ({ label: value, value })),
  ];
}

function displayResultTitle(result: UnifiedSearchResult) {
  if (result.resultType === "invoice") {
    return `Invoice ${result.title}`;
  }

  if (result.resultType === "document" || result.resultType === "bank_statement") {
    return result.typeLabel;
  }

  if (result.resultType === "signed_document") {
    return result.typeLabel;
  }

  if (result.resultType === "monthly_pack_item") {
    return result.title;
  }

  return result.title;
}

function resultFamilyLabel(result: UnifiedSearchResult) {
  switch (result.resultType) {
    case "invoice":
      return "Invoices";
    case "compliance_document":
      return "Compliance";
    default:
      return "Documents";
  }
}

function inferFileLabel(result: UnifiedSearchResult, document?: DocumentRecord | null) {
  const fileName = document?.fileName ?? result.title;
  const extension = fileName.split(".").pop()?.toUpperCase();

  if (extension && extension.length <= 4 && extension !== fileName.toUpperCase()) {
    return extension;
  }

  if (result.resultType === "invoice") {
    return "PDF";
  }

  if (result.typeLabel.toLowerCase().includes("payroll")) {
    return "XLS";
  }

  if (result.typeLabel.toLowerCase().includes("vat")) {
    return "XLS";
  }

  return "PDF";
}

function fileLabelClasses(label: string) {
  if (label === "PDF") {
    return "border-rose-100 bg-rose-50 text-rose-600";
  }

  if (label === "XLS") {
    return "border-emerald-100 bg-emerald-50 text-emerald-600";
  }

  if (label === "DOC") {
    return "border-indigo-100 bg-indigo-50 text-indigo-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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

function mapLiveDocumentType(category: string) {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("bank")) return "Bank Statement";
  if (normalized.includes("invoice")) return "Invoices";
  if (normalized.includes("sign")) return "Signed Documents";
  if (normalized.includes("compliance") || normalized.includes("tax") || normalized.includes("vat") || normalized.includes("cipc") || normalized.includes("payroll")) return "Compliance Record";
  return category;
}

function buildEmptyMonthPack() {
  return {
    monthLabel: "Current Period",
    dueDate: new Date().toISOString(),
    deadlineStatus: "on_track" as const,
    progressPercent: 0,
    completedCount: 0,
    totalCount: 0,
    canComplete: false,
    completionMessage: "",
    slots: [],
  };
}

function mapWorkflowStatusToDocumentStatus(
  value: WorkflowStatus,
): DocumentRecord["status"] {  switch (value) {
    case "accepted":
    case "filed":
    case "uploaded":
    case "under_review":
    case "rejected":
      return value;
    case "compliant":
    case "valid":
      return "accepted";
    default:
      return "uploaded";
  }
}

function buildSyntheticDocument(result: UnifiedSearchResult): DocumentRecord {
  const safeTitle = displayResultTitle(result)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const description = `Preview shell for ${result.typeLabel.toLowerCase()} in the unified document centre.`;

  return {
    id: result.id,
    clientId: result.clientId,
    clientName: result.clientName,
    documentType: result.typeLabel,
    fileName: `${safeTitle || "record"}.${inferFileLabel(result).toLowerCase()}`,
    monthLabel: result.monthLabel,
    description,
    status: mapWorkflowStatusToDocumentStatus(result.status),
    uploadedBy: result.uploadedBy ?? `${result.clientName} finance team`,
    uploadedAt: result.date,
    reviewedBy: result.reviewedBy,
    reviewedAt: result.reviewedBy ? result.date : undefined,
    sizeLabel: result.amountLabel ?? "1.4 MB",
    keywordTags: [result.title, result.typeLabel, result.monthLabel],
    supplierName: result.supplierName,
    amountLabel: result.amountLabel,
    extractedText: [displayResultTitle(result), result.clientName, result.monthLabel, description].join(
      "\n",
    ),
    expiryDate: result.expiryDate,
    comments: [],
    auditTrail: [
      {
        id: `${result.id}-audit-1`,
        status: formatStatusLabel(result.status),
        actor: result.reviewedBy ?? result.uploadedBy ?? result.clientName,
        timestamp: result.date,
        note: `This ${result.typeLabel.toLowerCase()} record is visible in the unified document centre.`,
      },
    ],
  };
}

function documentPreviewLines(document: DocumentRecord) {
  return (document.extractedText ?? `${document.fileName}\n${document.description}`)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 18);
}

function buildPreviewText(document: DocumentRecord) {
  return documentPreviewLines(document).join("\n");
}

function downloadPreview(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.replace(/\.[^.]+$/, "") + "-preview.txt";
  link.click();
  window.URL.revokeObjectURL(url);
}

function downloadDocumentFile(fileRecord: DocumentRecord) {
  if (fileRecord.fileDataUrl) {
    const link = document.createElement("a");
    link.href = fileRecord.fileDataUrl;
    link.download = fileRecord.fileName;
    link.click();
    return;
  }

  downloadPreview(fileRecord.fileName, buildPreviewText(fileRecord));
}

function detailValue(value: string | undefined, fallback = "-") {
  return value && value.trim().length > 0 ? value : fallback;
}

function ResultFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
  );
}

function PreviewShell({document,zoomLevel}:{document:DocumentRecord;result:UnifiedSearchResult;zoomLevel:number}) {
  if (!document.fileDataUrl) return <p role="status" className="p-5 text-sm text-slate-500">The original document is loading or unavailable. Download the original to review its contents.</p>;
  const image=document.fileMimeType?.startsWith("image/")||/\.(?:png|jpe?g|webp)$/i.test(document.fileName);
  const pdf=document.fileMimeType==="application/pdf"||/\.pdf$/i.test(document.fileName);
  return <div className="origin-top bg-white p-2" style={{transform:`scale(${Math.max(.85,zoomLevel/100)})`,transformOrigin:"top center"}}>{image?<img src={document.fileDataUrl} alt={document.fileName} className="h-auto w-full"/>:pdf?<iframe src={document.fileDataUrl} title={document.fileName} className="h-[72vh] w-full"/>:<p className="p-4 text-sm text-slate-600">Download the original to view this document type.</p>}</div>;
}

function Pagination({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: Array<number | "..."> = [];

  if (totalPages <= 5) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
  } else if (currentPage <= 3) {
    pages.push(1, 2, 3, "...", totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, "...", currentPage, "...", totalPages);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <span>{"<"}</span>
      </button>
      {pages.map((page, index) =>
        page === "..." ? (
          <span className="px-2 text-sm text-slate-400" key={`ellipsis-${index}`}>
            ...
          </span>
        ) : (
          <button
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-medium transition",
              page === currentPage
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            key={page}
            onClick={() => onPageChange(page)}
            type="button"
          >
            {page}
          </button>
        ),
      )}
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        <span>{">"}</span>
      </button>
    </div>
  );
}

export function AccountantDocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<UnifiedSearchFilters>(defaultFilters);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedResultId, setSelectedResultId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState<ViewerTab>("details");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [reviewActionBusy, setReviewActionBusy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [liveClients, setLiveClients] = useState<FirmClientAccount[] | null>(null);
  const [liveDocuments, setLiveDocuments] = useState<DocumentRecord[]>([]);
  const [versionsByDocumentId, setVersionsByDocumentId] = useState<Record<string, DocumentVersionRecord[]>>({});
  const [commentsByDocumentId, setCommentsByDocumentId] = useState<Record<string, DocumentComment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [liveLoadStatus, setLiveLoadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [liveRefreshKey, setLiveRefreshKey] = useState(0);
  const hasLoadedLiveDocuments = useRef(false);

  const sourceClients = backendMode ? liveClients ?? [] : portal.adminClients;
  const assignedClients = useMemo(
    () => getScopedClients(user, sourceClients),
    [sourceClients, user],
  );

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isActive = true;
    if (!hasLoadedLiveDocuments.current) {
      setLiveLoadStatus("loading");
    }

    async function loadLiveDocuments() {
      try {
        const [clients, records] = await Promise.all([
          portalServiceApi.getAdminClients({ allowFallback: false }),
          apiGetJson("/api/documents"),
        ]);

        if (!isActive) {
          return;
        }

        const clientNameById = new Map(clients.map((client) => [client.id, client.clientName]));
        const mappedDocuments = records.map((record) => {
          const clientName = clientNameById.get(record.clientId) ?? "Client";
          const documentType = mapLiveDocumentType(record.category);
          return {
            id: record.id,
            clientId: record.clientId,
            clientName,
            documentType,
            fileName: record.name,
            monthLabel: formatDateLabel(record.uploadedAtUtc),
            description: `${record.category} uploaded in the live document workflow.`,
            status: mapLiveDocumentStatus(record.status),
            uploadedBy: clientName,
            uploadedAt: record.uploadedAtUtc,
            reviewedBy: undefined,
            reviewedAt: undefined,
            sizeLabel: formatSizeLabel(record.sizeBytes),
            keywordTags: [record.category, record.name, documentType],
            comments: [],
            auditTrail: [],
            fileMimeType: record.fileType,
            versionNumber: record.currentVersionNumber,
            monthlyPackId: record.monthlyPackId,
            documentSlotId: record.documentSlotId ?? undefined,
          } satisfies DocumentRecord;
        });

        setLiveClients(clients);
        setLiveDocuments(mappedDocuments);
        hasLoadedLiveDocuments.current = true;
        setLiveLoadStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (!hasLoadedLiveDocuments.current) {
          setLiveClients([]);
          setLiveDocuments([]);
          setLiveLoadStatus("error");
        }
        setFeedbackMessage(
          error instanceof ApiError
            ? error.message
            : "The live document centre could not be loaded. No demo records are being shown.",
        );
      }
    }

    void loadLiveDocuments();

    return () => {
      isActive = false;
    };
  }, [backendMode, liveRefreshKey]);

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    const refresh = () => setLiveRefreshKey((current) => current + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    const intervalId = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [backendMode]);

  useEffect(() => {
    if (!backendMode || !viewerOpen || !selectedResultId) {
      return;
    }

    const selectedLiveDocument = liveDocuments.find((document) => document.id === selectedResultId);
    if (!selectedLiveDocument || selectedLiveDocument.fileDataUrl || /\.pdf$/i.test(selectedLiveDocument.fileName)) {
      return;
    }

    let isActive = true;

    async function loadPreviewFile() {
      try {
        const { blob, contentType } = await apiGetBlob(`/api/documents/${encodeURIComponent(selectedResultId)}/download`);
        if (!isActive) {
          return;
        }

        const url = URL.createObjectURL(blob);
        setLiveDocuments((current) =>
          current.map((document) =>
            document.id === selectedResultId
              ? { ...document, fileDataUrl: url, fileMimeType: contentType }
              : document,
          ),
        );
      } catch {
        // Preview shell still works without an embedded file.
      }
    }

    void loadPreviewFile();

    return () => {
      isActive = false;
    };
  }, [backendMode, liveDocuments, selectedResultId, viewerOpen]);

  const allResults = useMemo(
    () =>
      assignedClients.flatMap((client) => {
        if (backendMode) {
          return buildUnifiedSearchResults({
            clientId: client.id,
            clientName: client.clientName,
            documents: liveDocuments.filter((document) => document.clientId === client.id),
            invoices: [],
            monthPack: buildEmptyMonthPack(),
            requests: [],
            complianceDocuments: [],
          });
        }

        const workspace = portal.getClientWorkspace(client.id);
        return buildUnifiedSearchResults({
          clientId: client.id,
          clientName: client.clientName,
          documents: workspace.documents,
          invoices: workspace.invoices,
          monthPack: workspace.monthPack,
          // Document centre should reflect live document streams only.
          requests: [],
          complianceDocuments: [],
        });
      }),
    [assignedClients, backendMode, liveDocuments, portal],
  );

  const filteredResults = useMemo(
    () => portal.filterSearchResults(allResults, filters),
    [allResults, filters, portal],
  );

  const visibleResults = filteredResults;

  const totalPages = Math.max(1, Math.ceil(visibleResults.length / resultsPerPage));

  const pagedResults = useMemo(
    () =>
      visibleResults.slice(
        (currentPage - 1) * resultsPerPage,
        currentPage * resultsPerPage,
      ),
    [currentPage, visibleResults],
  );

  const selectedResult = useMemo(
    () => filteredResults.find((result) => result.id === selectedResultId) ?? null,
    [filteredResults, selectedResultId],
  );

  const selectedDocument = useMemo<DocumentRecord | null>(() => {
    if (!selectedResult) {
      return null;
    }

    return resolveDocumentForResult(selectedResult);
  }, [portal, selectedResult]);

  const selectedVersions = useMemo<DocumentVersionRecord[]>(() => {
    if (!selectedDocument) return [];
    return versionsByDocumentId[selectedDocument.id] ?? [{
      id: `${selectedDocument.id}-current`,
      documentId: selectedDocument.id,
      versionNumber: selectedDocument.versionNumber ?? 1,
      name: selectedDocument.fileName,
      originalFileName: selectedDocument.fileName,
      fileType: selectedDocument.fileMimeType ?? "Document",
      sizeBytes: 0,
      uploadedByUserId: selectedDocument.uploadedBy,
      createdAtUtc: selectedDocument.uploadedAt,
      isCurrent: true,
    }];
  }, [selectedDocument, versionsByDocumentId]);

  const selectedComments = useMemo(() => {
    if (!selectedDocument) return [];
    return commentsByDocumentId[selectedDocument.id] ?? selectedDocument.comments;
  }, [commentsByDocumentId, selectedDocument]);

  useEffect(() => {
    if (!backendMode || !selectedDocument || versionsByDocumentId[selectedDocument.id]) return;
    let isActive = true;
    const documentId = selectedDocument.id;
    void apiGetJson(`/api/documents/${encodeURIComponent(documentId)}/versions`)
      .then((versions) => {
        if (isActive) setVersionsByDocumentId((current) => ({ ...current, [documentId]: versions }));
      })
      .catch(() => {
        if (isActive) setVersionsByDocumentId((current) => ({ ...current, [documentId]: [] }));
      });
    return () => { isActive = false; };
  }, [backendMode, selectedDocument, versionsByDocumentId]);

  useEffect(() => {
    if (!backendMode || !selectedDocument || commentsByDocumentId[selectedDocument.id]) return;
    let isActive = true;
    const documentId = selectedDocument.id;
    void apiGetJson(`/api/documents/${encodeURIComponent(documentId)}/comments`)
      .then((comments) => {
        if (isActive) setCommentsByDocumentId((current) => ({ ...current, [documentId]: comments.map(mapBackendComment) }));
      })
      .catch(() => {
        if (isActive) setCommentsByDocumentId((current) => ({ ...current, [documentId]: [] }));
      });
    return () => { isActive = false; };
  }, [backendMode, commentsByDocumentId, selectedDocument]);

  const clientOptions = useMemo(
    () => buildSelectOptions(assignedClients.map((client) => client.clientName), "All clients"),
    [assignedClients],
  );

  const monthOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(new Set(allResults.map((result) => result.monthLabel))).sort((left, right) =>
          left.localeCompare(right),
        ),
        "All periods",
      ),
    [allResults],
  );

  const documentTypeOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(new Set(allResults.map((result) => result.typeLabel))).sort((left, right) =>
          left.localeCompare(right),
        ),
        "All types",
      ),
    [allResults],
  );

  const statusOptions = useMemo(
    () => [
      { label: "All statuses", value: "" },
      ...Array.from(new Set(allResults.map((result) => result.status)))
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ label: formatStatusLabel(value), value })),
    ],
    [allResults],
  );

  const uploadedByOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(
          new Set(
            allResults
              .map((result) => result.uploadedBy)
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort((left, right) => left.localeCompare(right)),
        "All",
      ),
    [allResults],
  );

  const reviewedByOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(
          new Set(
            allResults
              .map((result) => result.reviewedBy)
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort((left, right) => left.localeCompare(right)),
        "All",
      ),
    [allResults],
  );

  const yearOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(
          new Set(allResults.map((result) => String(new Date(result.date).getFullYear()))),
        ).sort((left, right) => Number(right) - Number(left)),
        "All",
      ),
    [allResults],
  );

  const viewerTabs = useMemo(
    () => [
      { id: "details" as const, label: "Details" },
      { id: "comments" as const, label: `Comments (${selectedComments.length})` },
      { id: "history" as const, label: "Workflow log" },
      { id: "related" as const, label: "Related" },
    ],
    [selectedComments.length],
  );

  const relatedResults = useMemo(() => {
    if (!selectedResult) {
      return [];
    }

    return filteredResults
      .filter(
        (result) =>
          result.id !== selectedResult.id &&
          result.clientName === selectedResult.clientName &&
          result.monthLabel === selectedResult.monthLabel,
      )
      .slice(0, 4);
  }, [filteredResults, selectedResult]);

  const selectedAccountant = useMemo(() => {
    if (!selectedResult) {
      return user?.fullName ?? "Assigned accountant";
    }

    return (
      sourceClients.find((client) => client.id === selectedResult.clientId)
        ?.assignedAccountant ??
      sourceClients.find((client) => client.clientName === selectedResult.clientName)
        ?.assignedAccountant ??
      user?.fullName ??
      "Assigned accountant"
    );
  }, [selectedResult, sourceClients, user?.fullName]);

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (selectedResultId && !filteredResults.some((result) => result.id === selectedResultId)) {
      setSelectedResultId("");
      setViewerOpen(false);
    }
  }, [filteredResults, selectedResultId]);

  useEffect(() => {
    const clientFromQuery = searchParams.get("client");
    if (!clientFromQuery) {
      return;
    }
    if (filters.clientId === clientFromQuery) {
      return;
    }
    setFilters((current) => ({ ...current, clientId: clientFromQuery }));
  }, [filters.clientId, searchParams]);


  function resolveDocumentForResult(result: UnifiedSearchResult) {
    if (backendMode) {
      const liveMatch = liveDocuments.find((document) => document.id === result.id);
      if (liveMatch) {
        return liveMatch;
      }
    }

    const workspace = portal.getClientWorkspace(result.clientId);
    const documentMatch = workspace.documents.find((document) => document.id === result.id);

    if (documentMatch) {
      return documentMatch;
    }

    const invoiceMatch = workspace.invoices.find((invoice) => invoice.id === result.id);
    if (invoiceMatch) {
      return buildReviewDocumentFromInvoice(invoiceMatch);
    }

    if (result.clientId === "firm-client-1" || result.clientId === "client-apex") {
      const liveRecord = portal.getReviewRecord(result.id);
      if (liveRecord.id === result.id) {
        return liveRecord;
      }
    }

    return buildSyntheticDocument(result);
  }

  function handleOpenResultTab(result: UnifiedSearchResult, tab: ViewerTab) {
    setSelectedResultId(result.id);
    setViewerOpen(true);
    setViewerTab(tab);
  }

  function handleOpenResult(result: UnifiedSearchResult) {
    handleOpenResultTab(result, "details");
  }

  async function fileAcceptedDocument() {
    if (!selectedDocument || reviewActionBusy) return;
    setReviewActionBusy(true);
    try {
      await apiData(portalApiClient.PUT("/api/documents/{id}/status", {
        params: { path: { id: selectedDocument.id } },
        body: { status: "filed" },
      }));
      setLiveDocuments(documents => documents.map(document => document.id === selectedDocument.id ? { ...document, status: "filed" as const } : document));
      setFeedbackMessage("Document filed. It is available in the Filing Register.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "The document could not be filed.");
    } finally { setReviewActionBusy(false); }
  }

  async function openInvoiceReview() {
    if (!selectedDocument || reviewActionBusy) return;
    setReviewActionBusy(true);
    try {
      if (selectedDocument.status === "uploaded" || selectedDocument.status === "draft") {
        await apiData(portalApiClient.POST("/api/documents/{id}/review", {
          params: { path: { id: selectedDocument.id } },
          body: { decision: "under_review", reason: null, internalNote: "Sent to the invoice review workspace." },
        }));
      }
      navigate(`/firm/review?documentId=${encodeURIComponent(selectedDocument.id)}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "The document could not be sent for review.");
    } finally { setReviewActionBusy(false); }
  }

  async function handleDownloadResult(result: UnifiedSearchResult) {
    const document = resolveDocumentForResult(result);

    if (backendMode && !document.fileDataUrl) {
      try {
        const { blob, contentType } = await apiGetBlob(`/api/documents/${encodeURIComponent(result.id)}/download`);
        const url = URL.createObjectURL(blob);
        const hydratedDocument = { ...document, fileDataUrl: url, fileMimeType: contentType };
        setLiveDocuments((current) =>
          current.map((entry) =>
            entry.id === result.id ? { ...entry, fileDataUrl: url, fileMimeType: contentType } : entry,
          ),
        );
        downloadDocumentFile(hydratedDocument);
        setFeedbackMessage(`${displayResultTitle(result)} downloaded from the live backend.`);
      } catch (error) {
        setFeedbackMessage(error instanceof ApiError ? error.message : `Could not download ${displayResultTitle(result)}.`);
      }
    } else {
      downloadDocumentFile(document);
      setFeedbackMessage(`${displayResultTitle(result)} downloaded as a preview file.`);
    }

  }

  function handleSubmitComment() {
    if (!selectedDocument || !user) return;
    const message = commentDraft.trim();
    if (!message) {
      setCommentError("Write a comment before sending it.");
      return;
    }

    if (backendMode) {
      void apiPostJson(
        `/api/documents/${encodeURIComponent(selectedDocument.id)}/comments`,
        { message },
      )
        .then((comment) => {
          setCommentsByDocumentId((current) => ({
            ...current,
            [selectedDocument.id]: [...(current[selectedDocument.id] ?? []), mapBackendComment(comment)],
          }));
          setCommentDraft("");
          setCommentError("");
        })
        .catch((error: unknown) => {
          setCommentError(error instanceof ApiError ? error.message : "The comment could not be saved.");
        });
      return;
    }

    const result = portal.addDocumentComment(selectedDocument.id, user.fullName, user.role, message);
    if (!result.ok) {
      setCommentError(result.message);
      return;
    }
    setCommentsByDocumentId((current) => ({
      ...current,
      [selectedDocument.id]: [
        ...(current[selectedDocument.id] ?? selectedDocument.comments),
        {
          id: `comment-${Date.now()}`,
          author: user.fullName,
          role: user.role,
          message,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setCommentDraft("");
    setCommentError("");
  }

  function handleClearFilters() {
    setFilters(defaultFilters);
    setSelectedResultId("");
    setViewerOpen(false);
    setViewerTab("details");
    setCurrentPage(1);
  }

  if (backendMode && liveLoadStatus !== "ready") {
    const isLoading = liveLoadStatus === "idle" || liveLoadStatus === "loading";
    return (
      <div className="mx-auto max-w-[1280px] space-y-6">
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            description={
              isLoading
                ? "The live client document register is being loaded."
                : "The backend document register could not be loaded. No demo records are being shown."
            }
            title={isLoading ? "Loading documents" : "Documents unavailable"}
          />
          {!isLoading ? (
            <div className="mt-5 flex justify-center">
              <Button onClick={() => setLiveRefreshKey((current) => current + 1)}>Try again</Button>
            </div>
          ) : null}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <header className="documents-header"><div><h1 className="workspace-duplicate-title ">Documents</h1><p>Find client files, view their history and download the original.</p></div><Button variant="secondary" onClick={() => navigate("/firm/inbox")}>Request documents</Button></header>
      {feedbackMessage ? <p role="status" className="documents-notice">{feedbackMessage}</p> : null}
      <section className="documents-register" aria-label="Client document register">
        <div className="documents-toolbar">
          <label className="documents-search"><SearchIcon /><input aria-label="Search client documents" type="search" placeholder="Find a document or reference" value={filters.query} onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} /></label>
          <ResultFilterSelect label="Client" options={clientOptions} value={assignedClients.find(client => client.id === filters.clientId)?.clientName ?? ""} onChange={value => setFilters(current => ({ ...current, clientId: assignedClients.find(client => client.clientName === value)?.id ?? "" }))} />
          <ResultFilterSelect label="Status" options={statusOptions} value={filters.status} onChange={value => setFilters(current => ({ ...current, status: value }))} />
          <button type="button" className="documents-filter-button" aria-expanded={advancedFiltersOpen} aria-controls="documents-extra-filters" onClick={() => setAdvancedFiltersOpen(value => !value)}>More filters<ChevronDownIcon /></button>
        </div>
        {advancedFiltersOpen ? <div id="documents-extra-filters" className="documents-extra-filters">
          <ResultFilterSelect label="Document type" options={documentTypeOptions} value={filters.documentType} onChange={value => setFilters(current => ({ ...current, documentType: value }))} />
          <ResultFilterSelect label="Period" options={monthOptions} value={filters.month} onChange={value => setFilters(current => ({ ...current, month: value }))} />
          <ResultFilterSelect label="Year" options={yearOptions} value={filters.year} onChange={value => setFilters(current => ({ ...current, year: value }))} />
          <ResultFilterSelect label="Uploaded by" options={uploadedByOptions} value={filters.uploadedBy} onChange={value => setFilters(current => ({ ...current, uploadedBy: value }))} />
          <ResultFilterSelect label="Reviewed by" options={reviewedByOptions} value={filters.reviewedBy} onChange={value => setFilters(current => ({ ...current, reviewedBy: value }))} />
          <ResultFilterSelect label="Expiry status" options={[{label:"All",value:""},{label:"Expiring soon",value:"expiring"},{label:"Expired",value:"expired"}]} value={filters.expiryStatus} onChange={value => setFilters(current => ({ ...current, expiryStatus: value }))} />
        </div> : null}
        <div className="documents-result-count"><span>{visibleResults.length} {visibleResults.length === 1 ? "document" : "documents"}</span>{Object.entries(filters).some(([key, value]) => value && !(key === "requiredFlag" && value === "all")) ? <button type="button" onClick={handleClearFilters}>Clear filters</button> : null}</div>
        {visibleResults.length ? <div className="documents-table"><table><thead><tr><th scope="col">Document</th><th scope="col">Client</th><th scope="col">Status</th><th scope="col">Uploaded</th><th scope="col" className="documents-actions-heading">Actions</th></tr></thead><tbody>{pagedResults.map(result => <tr key={result.id}>
          <th scope="row"><button type="button" className="documents-file-title" onClick={() => handleOpenResult(result)}>{displayResultTitle(result)}</button><small>{result.typeLabel}</small></th>
          <td>{result.clientName}</td>
          <td><span className={cn("documents-status",toneToAccentClass(statusToTone(result.status)))}>{formatStatusLabel(result.status)}</span></td>
          <td className="documents-uploaded">{formatDateLabel(result.date)}</td>
          <td><div className="documents-row-actions"><RecordActions iconOnly label={`Actions for ${displayResultTitle(result)}`} actions={[{ label: "Open", onSelect: () => handleOpenResult(result) }, { label: "Download", onSelect: () => void handleDownloadResult(result) }]} /></div></td>
        </tr>)}</tbody></table></div> : <div className="documents-empty"><EmptyState title={allResults.length ? "No matching documents" : "No documents yet"} description={allResults.length ? "Change the search or clear your filters." : "Client documents will appear here after they are uploaded."} /></div>}
        {visibleResults.length ? <footer className="documents-pagination"><span>Showing {(currentPage - 1) * resultsPerPage + 1}-{Math.min(currentPage * resultsPerPage, visibleResults.length)} of {visibleResults.length}</span><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></footer> : null}
      </section>
      <div>
        {viewerOpen && selectedResult && selectedDocument ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/30"
            onClick={() => setViewerOpen(false)}
          >
            <SurfaceCard
              role="dialog" aria-modal="true" aria-label="Document details"
              className="documents-viewer ml-auto h-full w-full max-w-[800px] overflow-y-auto rounded-none border-0 border-l border-slate-200 bg-white p-6 shadow-[-18px_0_50px_rgba(15,23,42,0.16)] sm:p-8"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-3xl font-medium text-slate-950">
                  {displayResultTitle(selectedResult)}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span
                    className={cn(
                      "inline-flex rounded-lg border px-2 py-0.5 text-sm font-medium",
                      fileLabelClasses(inferFileLabel(selectedResult, selectedDocument)),
                    )}
                  >
                    {inferFileLabel(selectedResult, selectedDocument)}
                  </span>
                  <span>{selectedResult.clientName}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{selectedResult.monthLabel}</span>
                </div>
              </div>

              <button
                aria-label="Close document viewer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={() => setViewerOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">

              <Button
                className="h-10 flex-1 rounded-xl px-4"
                onClick={() => void handleDownloadResult(selectedResult)}
              >
                <DownloadIcon />
                <span>Download</span>
              </Button>
            </div>

            {backendMode && selectedDocument.documentType.toLowerCase().includes("invoice") && (!selectedDocument.documentSlotId || selectedDocument.status === "under_review") && ["uploaded", "under_review"].includes(selectedDocument.status) ? <Button className="mt-3 w-full" disabled={reviewActionBusy} onClick={()=>void openInvoiceReview()}>{reviewActionBusy ? "Opening review…" : "Review invoice"}</Button> : null}
            {backendMode && selectedDocument.status === "accepted" ? <Button className="mt-3 w-full" disabled={reviewActionBusy} onClick={()=>void fileAcceptedDocument()}>{reviewActionBusy ? "Filing…" : "File document"}</Button> : null}
            <div className="documents-preview-area">
              {backendMode && /\.pdf$/i.test(selectedDocument.fileName) ? <DocumentPdfPreview documentId={selectedDocument.id} fileName={selectedDocument.fileName} onReady={() => {}} /> : <PreviewShell document={selectedDocument} result={selectedResult} zoomLevel={100} />}
            </div>

            <div className="mt-5 border-b border-slate-200">
              <div className="flex flex-nowrap items-center gap-6 overflow-x-auto pb-1">
                {viewerTabs.map((tab) => (
                  <button
                    className={cn(
                      "relative pb-3 text-sm font-medium transition",
                      viewerTab === tab.id
                        ? "text-brand-700"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                    key={tab.id}
                    onClick={() => setViewerTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                    {viewerTab === tab.id ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              {viewerTab === "details" ? (
                <div className="space-y-5">
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Document type
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedResult.typeLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Status
                      </p>
                      <div className="mt-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset",
                            toneToAccentClass(statusToTone(selectedResult.status)),
                          )}
                        >
                          {formatStatusLabel(selectedResult.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Uploaded by
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {detailValue(selectedDocument.uploadedBy)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Uploaded on
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {formatDateTimeLabel(selectedDocument.uploadedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Reviewed by
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {detailValue(selectedDocument.reviewedBy, "Waiting for review")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Period
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedResult.monthLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                        Assigned to
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedAccountant}
                        {selectedAccountant === user?.fullName ? " (You)" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    Archive view: inspect this record, trace its history, and collaborate through comments.
                  </div>
                </div>
              ) : null}

              {viewerTab === "comments" ? (
                <div className="space-y-5">
                  <div className="divide-y divide-slate-100 border-y border-slate-200">
                    {selectedComments.length > 0 ? (
                      [...selectedComments].reverse().map((comment) => (
                        <article className="py-4" key={comment.id}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                                {comment.author.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                                <p className="text-xs capitalize text-slate-500">{comment.role}</p>
                              </div>
                            </div>
                            <time className="text-xs text-slate-400">{formatDateTimeLabel(comment.createdAt)}</time>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">{comment.message}</p>
                        </article>
                      ))
                    ) : (
                      <p className="py-5 text-sm text-slate-500">No comments yet. Start the document-specific review thread below.</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="accountant-document-comment">
                      Add review note
                    </label>
                    <textarea
                      className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                      id="accountant-document-comment"
                      onChange={(event) => {
                        setCommentDraft(event.target.value);
                        setCommentError("");
                      }}
                      placeholder="Add context, ask a question, or explain a requested change..."
                      value={commentDraft}
                    />
                    {commentError ? <p className="mt-2 text-sm text-rose-600">{commentError}</p> : null}
                    <div className="mt-3 flex justify-end">
                      <Button className="h-10 rounded-xl px-5" onClick={handleSubmitComment}>Send comment</Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {viewerTab === "history" ? (
                <div className="space-y-7">
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-sm font-semibold text-slate-950">Version history</h3>
                      <span className="text-xs font-medium text-slate-500">{selectedVersions.length} versions</span>
                    </div>
                    {selectedVersions.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {selectedVersions.map((version) => (
                          <div className="flex items-center justify-between gap-4 py-3" key={version.id}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-slate-900">Version {version.versionNumber}</p>
                                {version.isCurrent ? (
                                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-sm font-semibold uppercase tracking-wide text-brand-700">Current</span>
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-500">{version.originalFileName}</p>
                            </div>
                            <p className="shrink-0 text-xs text-slate-500">{formatDateLabel(version.createdAtUtc)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-sm text-slate-500">No saved versions are available.</p>
                    )}
                  </section>

                  <section>
                    <h3 className="border-b border-slate-200 pb-3 text-sm font-semibold text-slate-950">Activity trail</h3>
                    <div className="pt-4">
                      {selectedDocument.auditTrail.length > 0 ? (
                        <AuditTrail entries={selectedDocument.auditTrail} />
                      ) : (
                        <p className="text-sm text-slate-500">Workflow events will appear here as this item moves through review.</p>
                      )}
                    </div>
                  </section>
                </div>
              ) : null}

              {viewerTab === "related" ? (
                relatedResults.length > 0 ? (
                  <div className="space-y-3">
                    {relatedResults.map((result) => (
                      <button
                        className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/50"
                        key={result.id}
                        onClick={() => handleOpenResult(result)}
                        type="button"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-950">
                            {displayResultTitle(result)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {resultFamilyLabel(result)} | {formatStatusLabel(result.status)}
                          </p>
                        </div>
                        <ChevronRightIcon />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No closely related records were found in this filtered result set."
                    title="Nothing related yet"
                  />
                )
              ) : null}
            </div>
            </SurfaceCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
