// Friendly guide: this module (ClientDocumentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import type {
  DocumentRecord,
  MonthlyDocumentSlot,
  Tone,
  UnifiedSearchFilters,
  UnifiedSearchResult,
} from "../../types/portal";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatStatusLabel,
  statusToTone,
  toneToAccentClass,
} from "../../utils/formatters";

const pageSize = 8;

// Shared shape notes: these types keep UI and data contracts aligned.
type DocumentWorkspaceTab = "overview" | "comments" | "audit" | "related";
type SortDirection = "newest" | "oldest";

// Component flow: gather data first, then render a focused UI state.
function SearchIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 3.75 3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h14M8 12h8m-10 5h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="8" cy="7" fill="currentColor" r="1.35" />
      <circle cx="14" cy="12" fill="currentColor" r="1.35" />
      <circle cx="11" cy="17" fill="currentColor" r="1.35" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.75v9.5m0 0 3.75-3.75M12 14.25l-3.75-3.75M5.75 16.25v1.5A2.5 2.5 0 0 0 8.25 20.25h7.5a2.5 2.5 0 0 0 2.5-2.5v-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3.75 12s3-5.5 8.25-5.5 8.25 5.5 8.25 5.5-3 5.5-8.25 5.5S3.75 12 3.75 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 9 6 6 6-6"
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
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
      <rect
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="6.5"
      />
      <path
        d="M8 4.5v4m8-4v4M4 10.5h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DocumentMetaIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.75 3.75V8h4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 18.5c1.75-2.75 4.08-4.13 6.5-4.13 2.42 0 4.75 1.38 6.5 4.13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ResultTypeIcon({ result }: { result: UnifiedSearchResult }) {
  const classes =
    result.resultType === "invoice"
      ? "bg-rose-50 text-rose-500 ring-rose-100"
      : result.resultType === "bank_statement"
        ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
        : result.resultType === "signed_document"
          ? "bg-amber-50 text-amber-500 ring-amber-100"
          : result.resultType === "compliance_document"
            ? "bg-sky-50 text-sky-600 ring-sky-100"
            : "bg-brand-50 text-brand-600 ring-brand-100";

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${classes}`}>
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
        <path
          d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M13.75 3.75V8h4.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function toneDotClass(tone: Tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-rose-500";
    case "info":
      return "bg-brand-500";
    default:
      return "bg-slate-400";
  }
}

function normaliseValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferSlotFromResult(
  result: UnifiedSearchResult | null,
  slots: MonthlyDocumentSlot[],
) {
  if (!result) {
    return null;
  }

  const searchText = `${result.resultType} ${result.typeLabel} ${result.title}`.toLowerCase();

  if (result.resultType === "invoice" || searchText.includes("invoice") || searchText.includes("vat")) {
    return slots.find((slot) => slot.documentType === "Invoices") ?? null;
  }

  if (searchText.includes("bank")) {
    return slots.find((slot) => slot.documentType === "Bank Statement") ?? null;
  }

  if (searchText.includes("signed")) {
    return slots.find((slot) => slot.documentType === "Signed Documents") ?? null;
  }

  return slots.find((slot) => slot.documentType === "Compliance Record") ?? null;
}

function inferStatusReason(result: UnifiedSearchResult | null, document: DocumentRecord | null) {
  if (!result) {
    return "Open a result to inspect its workflow detail.";
  }

  if (document?.rejectionReason) {
    return document.rejectionReason;
  }

  switch (result.status) {
    case "rejected":
      return "This record was rejected and needs a corrected upload before it can move forward.";
    case "under_review":
      return "This record is currently with the accountant for review.";
    case "accepted":
    case "filed":
      return "This record has been reviewed and is workflow-complete.";
    case "uploaded":
    case "finalised":
    case "sent_to_accountant":
      return "This record is in the workflow and waiting for the next review step.";
    case "expiring_soon":
      return "This compliance record is approaching expiry and should be renewed soon.";
    case "expired":
      return "This compliance record has expired and needs a renewed version.";
    default:
      return `Current workflow state: ${formatStatusLabel(result.status)}.`;
  }
}

function pickPriorityResult(results: UnifiedSearchResult[]) {
  return (
    results.find((result) => result.status === "rejected") ??
    results.find((result) => result.status === "under_review") ??
    results.find((result) => result.status === "uploaded") ??
    results[0] ??
    null
  );
}

function buildFileName(title: string) {
  return title.toLowerCase().endsWith(".pdf") ? title : `${title.replace(/\s+/g, "_")}.txt`;
}

function createDefaultFilters(): UnifiedSearchFilters {
  return {
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
}

export function ClientDocumentsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const uploadModal = useDisclosure(false);
  const [filters, setFilters] = useState<UnifiedSearchFilters>(() => createDefaultFilters());
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedResultId, setSelectedResultId] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState<{
    tone: Tone;
    title: string;
    message: string;
  } | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentWorkspaceTab>("overview");
  const [sortDirection, setSortDirection] = useState<SortDirection>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const searchableResults = useMemo(
    () =>
      portal.clientWorkflow.unifiedSearchResults.filter(
        (result) => result.resultType !== "request" && result.resultType !== "monthly_pack_item",
      ),
    [portal.clientWorkflow.unifiedSearchResults],
  );

  const filteredResults = useMemo(
    () => portal.filterSearchResults(searchableResults, filters),
    [filters, portal, searchableResults],
  );

  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((left, right) => {
      const leftTime = new Date(left.date).getTime();
      const rightTime = new Date(right.date).getTime();
      return sortDirection === "newest" ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [filteredResults, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const visibleResults = useMemo(
    () => sortedResults.slice(pageStartIndex, pageStartIndex + pageSize),
    [pageStartIndex, sortedResults],
  );

  const selectedResult = useMemo(
    () =>
      sortedResults.find((result) => result.id === selectedResultId) ??
      pickPriorityResult(sortedResults),
    [selectedResultId, sortedResults],
  );

  const selectedDocument = useMemo<DocumentRecord | null>(() => {
    if (!selectedResult) {
      return null;
    }

    if (selectedResult.resultType === "invoice") {
      return portal.getReviewRecord(selectedResult.id);
    }

    const directMatch =
      portal.clientWorkflow.documents.find((document) => document.id === selectedResult.id) ??
      null;
    if (directMatch) {
      return directMatch;
    }

    const normalisedTitle = normaliseValue(selectedResult.title);
    const normalisedType = normaliseValue(selectedResult.typeLabel);

    return (
      portal.clientWorkflow.documents.find((document) => {
        const fileNameMatch = normaliseValue(document.fileName).includes(normalisedTitle);
        const typeMatch =
          normaliseValue(document.documentType).includes(normalisedTitle) ||
          normaliseValue(document.documentType).includes(normalisedType);
        return document.monthLabel === selectedResult.monthLabel && (fileNameMatch || typeMatch);
      }) ?? null
    );
  }, [portal, selectedResult]);

  const selectedSlotForAction = useMemo(
    () => inferSlotFromResult(selectedResult, portal.clientWorkflow.monthPack.slots),
    [portal.clientWorkflow.monthPack.slots, selectedResult],
  );

  const selectedComments = useMemo(() => {
    if (!selectedResult) {
      return [];
    }

    return selectedDocument?.comments ?? [];
  }, [selectedDocument, selectedResult]);

  const selectedRelatedResults = useMemo(() => {
    if (!selectedResult) {
      return [] as UnifiedSearchResult[];
    }

    return searchableResults
      .filter((result) => {
        if (result.id === selectedResult.id) {
          return false;
        }

        const samePeriod = result.monthLabel === selectedResult.monthLabel;
        const sameType = result.typeLabel === selectedResult.typeLabel;
        const sameSupplier =
          result.supplierName &&
          selectedResult.supplierName &&
          result.supplierName === selectedResult.supplierName;

        return sameSupplier || sameType || samePeriod;
      })
      .slice(0, 4);
  }, [searchableResults, selectedResult]);

  const previewLines = useMemo(() => {
    const sourceText =
      selectedDocument?.extractedText ??
      selectedDocument?.description ??
      selectedResult?.title ??
      "";

    return sourceText
      .split(/[.]\s+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [selectedDocument, selectedResult]);

  const monthOptions = useMemo(() => {
    const uniqueValues = Array.from(new Set(searchableResults.map((result) => result.monthLabel)));
    return uniqueValues.sort((left, right) => right.localeCompare(left));
  }, [searchableResults]);

  const statusOptions = useMemo(() => {
    const uniqueValues = Array.from(
      new Set(searchableResults.map((result) => formatStatusLabel(result.status))),
    );
    return uniqueValues.sort((left, right) => left.localeCompare(right));
  }, [searchableResults]);

  const documentTypeOptions = useMemo(() => {
    const uniqueValues = Array.from(new Set(searchableResults.map((result) => result.typeLabel)));
    return uniqueValues.sort((left, right) => left.localeCompare(right));
  }, [searchableResults]);

  const activeAdvancedFilterCount = useMemo(
    () =>
      [
        filters.year,
        filters.uploadedBy,
        filters.reviewedBy,
        filters.expiryStatus,
        filters.requiredFlag !== "all" ? filters.requiredFlag : "",
      ].filter(Boolean).length,
    [filters.expiryStatus, filters.requiredFlag, filters.reviewedBy, filters.uploadedBy, filters.year],
  );

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (sortedResults.length === 0) {
      setSelectedResultId("");
      return;
    }

    const hasCurrentSelection = sortedResults.some((result) => result.id === selectedResultId);
    if (hasCurrentSelection) {
      return;
    }

    const priorityResult = pickPriorityResult(sortedResults);
    if (!priorityResult) {
      return;
    }

    setSelectedResultId(priorityResult.id);
    const priorityIndex = sortedResults.findIndex((result) => result.id === priorityResult.id);
    if (priorityIndex >= 0) {
      setCurrentPage(Math.floor(priorityIndex / pageSize) + 1);
    }
  }, [selectedResultId, sortedResults]);

  useEffect(() => {
    setActiveTab("overview");
    setDetailMenuOpen(false);
    setCommentDraft("");
    setCommentError("");
    setPreviewZoom(100);
    setPreviewModalOpen(false);
    setViewerOpen(false);
  }, [selectedResultId]);

  function dismissFeedbackNotice() {
    setFeedbackNotice(null);
  }

  function openUploadForSlot(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      setFeedbackNotice({
        tone: "warning",
        title: "No upload slot available",
        message:
          "This record does not map cleanly to a structured upload slot yet. Open Monthly Packs and use the checklist for the correct upload action.",
      });
      return;
    }

    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handleSelectedRecordDownload() {
    if (!selectedResult) {
      return;
    }

    const content = [
      `Title: ${selectedResult.title}`,
      `Type: ${selectedResult.typeLabel}`,
      `Status: ${formatStatusLabel(selectedResult.status)}`,
      `Period: ${selectedResult.monthLabel}`,
      `Client: ${selectedResult.clientName}`,
      selectedDocument?.description ? `Description: ${selectedDocument.description}` : "",
      selectedDocument?.extractedText ? `Preview text: ${selectedDocument.extractedText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    downloadTextFile(buildFileName(selectedResult.title), content);
  }

  function handleExportResults() {
    downloadCsv("client-document-results.csv", [
      ["Title", "Type", "Period", "Status", "Updated", "Supplier", "Amount"],
      ...sortedResults.map((result) => [
        result.title,
        result.typeLabel,
        result.monthLabel,
        formatStatusLabel(result.status),
        formatDateLabel(result.date),
        result.supplierName ?? "",
        result.amountLabel ?? "",
      ]),
    ]);
  }

  function handleClearFilters() {
    setFilters(createDefaultFilters());
    setAdvancedFiltersOpen(false);
  }

  function handleUploadToSlot(submission: Parameters<typeof portal.uploadToSlot>[0]) {
    const result = portal.uploadToSlot(submission, {
      name: user?.name ?? "Client user",
      fullName: user?.fullName ?? "Client user",
    });

    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Document uploaded" : "Upload failed",
      message: result.message,
    });
  }

  function handleSubmitComment() {
    if (!selectedResult || !user) {
      setCommentError("Open a document record before sending a comment.");
      return;
    }

    const trimmed = commentDraft.trim();
    if (!trimmed) {
      setCommentError("Write a clear comment before sending it.");
      return;
    }

    if (!selectedDocument) {
      setCommentError("Open a document record before sending a comment.");
      return;
    }

    const result = portal.addDocumentComment(
      selectedDocument.id,
      user.fullName,
      user.role,
      trimmed,
    );

    if (!result.ok) {
      setCommentError(result.message);
      return;
    }

    setFeedbackNotice({
      tone: "success",
      title: "Comment sent",
      message: result.message,
    });
    setCommentDraft("");
    setCommentError("");
  }

  const selectedTone = selectedResult ? statusToTone(selectedResult.status) : "neutral";
  const selectedStatusMessage = inferStatusReason(selectedResult, selectedDocument);
  const selectedSupplier =
    selectedDocument?.supplierName ?? selectedResult?.supplierName ?? selectedResult?.clientName ?? "—";
  const selectedAmount = selectedDocument?.amountLabel ?? selectedResult?.amountLabel ?? "—";
  const selectedRequired = selectedResult?.isRequired ?? selectedSlotForAction?.isRequired ?? false;
  const selectedDueDate = selectedDocument?.expiryDate ?? selectedSlotForAction?.dueDate ?? "";
  const selectedReference =
    selectedResult?.resultType === "invoice"
      ? selectedResult.title
      : selectedDocument?.fileName.replace(/\.[^.]+$/, "") ?? selectedResult?.title ?? "—";
  const detailActionLabel =
    selectedResult?.status === "rejected"
      ? "Re-upload"
      : selectedSlotForAction
        ? "Upload"
        : "Open slot";

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">
            Client document centre
          </div>
          <h1 className="text-[1.95rem] font-semibold tracking-tight text-slate-950">
            Document workspace
          </h1>
          <p className="max-w-3xl text-[0.94rem] leading-7 text-slate-500">
            Search, inspect, and manage your documents and invoices in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <Button
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
            onClick={handleClearFilters}
            variant="secondary"
          >
            <FilterIcon />
            <span>Clear filters</span>
          </Button>
          <Button
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-5 text-sm shadow-[0_14px_28px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            onClick={handleExportResults}
          >
            <DownloadIcon />
            <span>Export results</span>
          </Button>
        </div>
      </div>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(150px,1fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(170px,1fr)]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-600">Smart search</span>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-500 shadow-sm">
              <SearchIcon />
              <input
                className="w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, query: event.target.value }))
                }
                placeholder="Search by amount, supplier, reference..."
                value={filters.query}
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-600">Month</span>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              <select
                className="w-full appearance-none border-none bg-transparent text-sm text-slate-900 outline-none"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, month: event.target.value }))
                }
                value={filters.month}
              >
                <option value="">All periods</option>
                {monthOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <CalendarIcon />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-600">Status</span>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              <select
                className="w-full appearance-none border-none bg-transparent text-sm text-slate-900 outline-none"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value }))
                }
                value={filters.status}
              >
                <option value="">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option.toLowerCase()}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-600">Document type</span>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              <select
                className="w-full appearance-none border-none bg-transparent text-sm text-slate-900 outline-none"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, documentType: event.target.value }))
                }
                value={filters.documentType}
              >
                <option value="">All types</option>
                {documentTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-600">More filters</span>
            <button
              className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => setAdvancedFiltersOpen((current) => !current)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <span>Advanced filters</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-500">
                  {activeAdvancedFilterCount}
                </span>
              </span>
              <ChevronDownIcon />
            </button>
          </div>
        </div>

        {advancedFiltersOpen ? (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600">Year</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, year: event.target.value }))
                }
                placeholder="2026"
                value={filters.year}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600">Uploaded by</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, uploadedBy: event.target.value }))
                }
                placeholder="Sarah Jacobs"
                value={filters.uploadedBy}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600">Reviewed by</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, reviewedBy: event.target.value }))
                }
                placeholder="Daniel Mokoena"
                value={filters.reviewedBy}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600">Required / optional</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requiredFlag: event.target.value }))
                }
                value={filters.requiredFlag}
              >
                <option value="all">All items</option>
                <option value="required">Required only</option>
                <option value="optional">Optional only</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600">Expiry status</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, expiryStatus: event.target.value }))
                }
                value={filters.expiryStatus}
              >
                <option value="">Any expiry state</option>
                <option value="expiring_soon">Expiring soon</option>
                <option value="expired">Expired</option>
              </select>
            </label>
          </div>
        ) : null}
      </SurfaceCard>

      <section className="grid gap-5">
        <SurfaceCard className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <h2 className="text-[1.08rem] font-semibold text-slate-950">Search results</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-500">
                {sortedResults.length} results
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-500">
              <span>Sort:</span>
              <select
                className="border-none bg-transparent font-medium text-slate-700 outline-none"
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                value={sortDirection}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          {sortedResults.length > 0 ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1.9fr)_0.95fr_0.95fr_24px] gap-4 border-b border-slate-100 px-5 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
                <span>Document</span>
                <span>Updated</span>
                <span>Status</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {visibleResults.map((result) => {
                  const tone = statusToTone(result.status);
                  const isSelected = selectedResult?.id === result.id;
                  const isRecent =
                    (Date.now() - new Date(result.date).getTime()) / (1000 * 60 * 60 * 24) <= 7;

                  return (
                    <button
                      className={`w-full px-4 py-4 text-left transition lg:px-5 ${
                        isSelected
                          ? "bg-brand-50/35 ring-1 ring-inset ring-brand-200"
                          : "hover:bg-slate-50"
                      }`}
                      key={result.id}
                      onClick={() => {
                        setSelectedResultId(result.id);
                        setViewerOpen(true);
                      }}
                      type="button"
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.9fr)_0.95fr_0.95fr_24px] lg:items-center lg:gap-4">
                        <div className="flex items-start gap-3">
                          <ResultTypeIcon result={result} />
                          <div className="min-w-0">
                            <p className="truncate text-[0.98rem] font-medium text-slate-950">
                              {result.title}
                            </p>
                            <p className="mt-0.5 truncate text-[0.82rem] text-slate-500">
                              {result.typeLabel} | {result.monthLabel}
                            </p>
                            {result.amountLabel ? (
                              <p className="mt-1 text-[0.82rem] font-medium text-slate-400">{result.amountLabel}</p>
                            ) : null}
                            {isRecent ? (
                              <span className="mt-1.5 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[0.68rem] font-semibold text-brand-700 ring-1 ring-brand-100">
                                New
                              </span>
                            ) : null}
                            <p className="mt-1 text-[0.78rem] text-slate-400 lg:hidden">
                              Updated {formatDateLabel(result.date)}
                            </p>
                          </div>
                        </div>

                        <div className="text-[0.82rem] text-slate-500">{formatDateLabel(result.date)}</div>
                        <div className="flex items-center gap-2 text-[0.84rem] font-medium text-slate-700">
                          <span className={`h-2.5 w-2.5 rounded-full ${toneDotClass(tone)}`} />
                          <span>{formatStatusLabel(result.status)}</span>
                        </div>

                        <div className="hidden justify-self-end text-slate-300 lg:block">
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                        currentPage === pageNumber
                          ? "bg-brand-600 text-white shadow-[0_10px_20px_rgba(84,66,255,0.2)]"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      type="button"
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <p className="text-sm text-slate-500">
                  Showing {sortedResults.length === 0 ? 0 : pageStartIndex + 1} to{" "}
                  {Math.min(pageStartIndex + pageSize, sortedResults.length)} of {sortedResults.length} results
                </p>
              </div>
            </>
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                description="Try broadening the search terms or removing a few filters."
                title="No results match this search"
              />
            </div>
          )}
        </SurfaceCard>

        {viewerOpen && selectedResult ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/55 px-3 py-4 sm:px-6 sm:py-6"
            onClick={() => setViewerOpen(false)}
          >
            <SurfaceCard
              className="mx-auto h-full w-full max-w-[1120px] overflow-y-auto rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_22px_56px_rgba(15,23,42,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
          {selectedResult ? (
            <>
              <div className="space-y-5 border-b border-slate-100 px-5 pb-5 pt-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset ${toneToAccentClass(
                        selectedTone,
                      )}`}
                    >
                      {formatStatusLabel(selectedResult.status)}
                    </span>
                    <div>
                      <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-950">
                        {selectedResult.title}
                      </h2>
                      <p className="mt-1 text-[0.94rem] text-slate-500">
                        {selectedSupplier} <span className="mx-2 text-slate-300">•</span> {selectedResult.monthLabel}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex flex-wrap items-center gap-2.5 lg:justify-end">
                    <Button
                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setPreviewModalOpen(true)}
                      size="sm"
                      variant="secondary"
                    >
                      <EyeIcon />
                      <span>View</span>
                    </Button>
                    <Button
                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={handleSelectedRecordDownload}
                      size="sm"
                      variant="secondary"
                    >
                      <DownloadIcon />
                      <span>Download</span>
                    </Button>
                    <Button
                      className={`h-10 rounded-xl border px-4 text-sm ${
                        selectedResult.status === "rejected"
                          ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                          : "border-brand-200 bg-white text-brand-600 hover:bg-brand-50"
                      }`}
                      onClick={() => openUploadForSlot(selectedSlotForAction)}
                      size="sm"
                      variant="secondary"
                    >
                      <DownloadIcon />
                      <span>{detailActionLabel}</span>
                    </Button>
                    <button
                      aria-label="Open detail actions"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      onClick={() => setDetailMenuOpen((current) => !current)}
                      type="button"
                    >
                      <MoreIcon />
                    </button>
                    <button
                      aria-label="Close document workspace"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      onClick={() => setViewerOpen(false)}
                      type="button"
                    >
                      ✕
                    </button>

                    {detailMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
                        <button
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => {
                            openUploadForSlot(selectedSlotForAction);
                            setDetailMenuOpen(false);
                          }}
                          type="button"
                        >
                          Open upload slot
                          <ChevronRightIcon />
                        </button>
                        <button
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => {
                            setActiveTab("related");
                            setDetailMenuOpen(false);
                          }}
                          type="button"
                        >
                          View related records
                          <ChevronRightIcon />
                        </button>
                        <button
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => {
                            setActiveTab("comments");
                            setDetailMenuOpen(false);
                          }}
                          type="button"
                        >
                          Open comments
                          <ChevronRightIcon />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <DocumentMetaIcon />
                      <span>Type</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-slate-950">{selectedResult.typeLabel}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <CalendarIcon />
                      <span>Period</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-slate-950">{selectedResult.monthLabel}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <UserIcon />
                      <span>Uploaded by</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-slate-950">
                      {selectedDocument?.uploadedBy ?? selectedResult.uploadedBy ?? selectedResult.clientName}
                    </p>
                    <p className="text-[0.82rem] text-slate-500">
                      {selectedDocument ? formatDateLabel(selectedDocument.uploadedAt) : formatDateLabel(selectedResult.date)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <UserIcon />
                      <span>Reviewed by</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-slate-950">
                      {selectedDocument?.reviewedBy ?? selectedResult.reviewedBy ?? "Not reviewed yet"}
                    </p>
                    <p className="text-[0.82rem] text-slate-500">
                      {selectedDocument?.reviewedAt ? formatDateLabel(selectedDocument.reviewedAt) : "Awaiting review"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 px-5">
                <div className="flex flex-wrap items-center gap-6">
                  {[
                    { id: "overview" as const, label: "Overview", count: null },
                    { id: "comments" as const, label: "Comments", count: selectedComments.length },
                    {
                      id: "audit" as const,
                      label: "Audit trail",
                      count: selectedDocument?.auditTrail.length ?? 0,
                    },
                    {
                      id: "related" as const,
                      label: "Related documents",
                      count: selectedRelatedResults.length,
                    },
                  ].map((item) => (
                    <button
                      className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition ${
                        activeTab === item.id
                          ? "border-brand-500 text-brand-600"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      type="button"
                    >
                      <span>{item.label}</span>
                      {item.count !== null ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-500">
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-5">
                {activeTab === "overview" ? (
                  <div className="grid gap-5">
                    <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Preview</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Open the document preview in full screen for a cleaner reading view.
                          </p>
                        </div>
                        <Button
                          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setPreviewModalOpen(true)}
                          size="sm"
                          variant="secondary"
                        >
                          <EyeIcon />
                          <span>Open full preview</span>
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-[1.3rem] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">Details</p>
                      <div className="mt-4 space-y-4 text-sm">
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Document ID</span>
                          <span className="font-medium text-slate-900">{selectedResult.id}</span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Supplier</span>
                          <span className="font-medium text-slate-900">{selectedSupplier}</span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Amount</span>
                          <span className="font-medium text-slate-900">{selectedAmount}</span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Reference</span>
                          <span className="font-medium text-slate-900">{selectedReference}</span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Due date</span>
                          <span className="font-medium text-slate-900">
                            {selectedDueDate ? formatDateLabel(selectedDueDate) : "—"}
                          </span>
                        </div>
                      <div className="space-y-2 border-b border-slate-100 pb-4">
                        <span className="text-slate-500">Status reason</span>
                        <div
                          className={`rounded-[1rem] border px-4 py-3 leading-6 ${toneToAccentClass(
                            selectedTone,
                          )}`}
                        >
                          {selectedStatusMessage}
                        </div>
                      </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4">
                          <span className="text-slate-500">Required</span>
                          <span className="font-medium text-slate-900">{selectedRequired ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "comments" ? (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5442ff,#6f59ff)] text-sm font-semibold text-white">
                        {user?.initials ?? "CU"}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <textarea
                            className="min-h-[54px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder="Write a comment..."
                            value={commentDraft}
                          />
                          {commentError ? (
                            <p className="mt-2 text-sm text-rose-600">{commentError}</p>
                          ) : null}
                        </div>
                        <Button
                          className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-4 shadow-[0_12px_24px_rgba(84,66,255,0.18)]"
                          onClick={handleSubmitComment}
                        >
                          <CommentIcon />
                          <span>Send</span>
                        </Button>
                      </div>
                    </div>

                    {selectedComments.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-[1.3rem] border border-slate-200 bg-white">
                        {[...selectedComments].reverse().map((comment) => (
                          <div className="flex items-start gap-3 px-4 py-4" key={comment.id}>
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                                comment.role === "accountant"
                                  ? "bg-emerald-500"
                                  : "bg-[linear-gradient(135deg,#5442ff,#6f59ff)]"
                              }`}
                            >
                              {(comment.author.split(" ")[0]?.[0] ?? "").toUpperCase()}
                              {(comment.author.split(" ")[1]?.[0] ?? "").toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950">
                                  {comment.author}
                                  {comment.author === user?.fullName ? " (You)" : ""}
                                </p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-medium text-slate-500">
                                  {comment.role === "accountant" ? "Accountant" : "Client"}
                                </span>
                                <span className="text-[0.82rem] text-slate-400">
                                  {formatDateTimeLabel(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-[0.92rem] leading-7 text-slate-600">{comment.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        description="Comments stay attached to this record so the review context does not get lost in a general chat stream."
                        title="No comments yet"
                      />
                    )}
                  </div>
                ) : null}

                {activeTab === "audit" ? (
                  selectedDocument ? (
                    <AuditTrail entries={selectedDocument.auditTrail} />
                  ) : (
                    <EmptyState
                      description="This result does not have a document-level audit trail available yet."
                      title="No audit trail available"
                    />
                  )
                ) : null}

                {activeTab === "related" ? (
                  selectedRelatedResults.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRelatedResults.map((result) => (
                        <button
                          className="flex w-full items-center justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
                          key={result.id}
                          onClick={() => setSelectedResultId(result.id)}
                          type="button"
                        >
                          <div className="flex items-start gap-3">
                            <ResultTypeIcon result={result} />
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-950">{result.title}</p>
                              <p className="text-[0.84rem] text-slate-500">
                                {result.typeLabel} / {result.monthLabel}
                              </p>
                              <p className="text-[0.84rem] text-slate-400">
                                {formatDateLabel(result.date)} / {formatStatusLabel(result.status)}
                              </p>
                            </div>
                          </div>
                          <Button className="h-9 rounded-xl px-3" size="sm" variant="secondary">
                            Open
                          </Button>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      description="No additional records with the same period or workflow context were found."
                      title="No related records"
                    />
                  )
                ) : null}
              </div>
            </>
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                description="Open a result from the left to review the document, comments, and audit history."
                title="Nothing selected yet"
              />
            </div>
          )}
            </SurfaceCard>
          </div>
        ) : null}
      </section>

      <DocumentUploadModal
        clientName={user?.company ?? "Apex Trading Ltd"}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={handleUploadToSlot}
        selectedSlot={selectedSlot}
      />
      {previewModalOpen && selectedResult ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 px-3 py-4 sm:px-6 sm:py-6" onClick={() => setPreviewModalOpen(false)}>
          <div
            className="mx-auto h-full w-full max-w-[980px] overflow-y-auto rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_26px_55px_rgba(15,23,42,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{selectedResult.title}</p>
                <p className="text-xs text-slate-500">
                  {selectedSupplier} / {selectedResult.monthLabel}
                </p>
              </div>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => setPreviewModalOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="bg-[radial-gradient(circle_at_top,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6">
              <div
                className="mx-auto w-full max-w-[520px] rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_32px_rgba(15,23,42,0.08)]"
                style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "top center" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[1.35rem] font-semibold tracking-tight text-slate-950">{selectedSupplier}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {selectedResult.typeLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-600">
                    {selectedResult.monthLabel}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[0.72rem] uppercase tracking-[0.16em] text-slate-400">Reference</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedReference}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[0.72rem] uppercase tracking-[0.16em] text-slate-400">Amount</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedAmount}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 rounded-[1.2rem] border border-slate-200 bg-white p-4">
                  {previewLines.length > 0 ? (
                    previewLines.map((line) => (
                      <p className="text-[0.85rem] leading-6 text-slate-600" key={line}>
                        {line}.
                      </p>
                    ))
                  ) : (
                    <>
                      <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                      <div className="h-3 w-5/6 rounded-full bg-slate-100" />
                      <div className="h-3 w-3/5 rounded-full bg-slate-100" />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  onClick={() => setPreviewZoom((current) => Math.max(80, current - 10))}
                  type="button"
                >
                  -
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  onClick={() => setPreviewZoom((current) => Math.min(140, current + 10))}
                  type="button"
                >
                  +
                </button>
              </div>
              <span className="text-sm font-medium text-slate-500">{previewZoom}%</span>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                onClick={() => setPreviewZoom(100)}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
