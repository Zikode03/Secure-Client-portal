import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { DocumentRegister, type DocumentRegisterSortDirection } from "../../components/documents/DocumentRegister";
import { DocumentRegisterToolbar } from "../../components/documents/DocumentRegisterToolbar";
import { MonthlyPackAttentionLink } from "../../components/documents/MonthlyPackAttentionLink";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { ApiError, apiGetBlob, apiGetJson, apiPostForm, hasApiBaseUrl } from "../../services/apiClient";
import {
  buildSlotUploadForm,
  formatSizeLabel,
  mapBackendDocumentStatus,
  mapBackendSlotStatus,
  monthLabelFromParts,
} from "../../services/clientMonthlyPackBackend";
import type {
  DocumentRecord,
  DocumentVersionRecord,
  MonthlyDocumentSlot,
  Tone,
  UnifiedSearchFilters,
  UnifiedSearchResult,
} from "../../types/portal";
import { formatDateLabel, formatStatusLabel, statusToTone, toneToAccentClass } from "../../utils/formatters";

const pageSize = 8;

type LoadState = "idle" | "loading" | "ready" | "error";

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
  uploadedByUserId: string;
  currentVersionNumber: number;
  uploadedAtUtc: string;
  updatedAtUtc: string;
}

interface BackendMonthlyPackResponse {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
}

interface BackendDocumentSlotResponse {
  id: string;
  monthlyPackId: string;
  clientId: string;
  label: string;
  isRequired: boolean;
  status: string;
  canCurrentlyBeSubmitted: boolean;
  currentDocumentId?: string | null;
  dueDateUtc?: string | null;
  submittedAtUtc?: string | null;
  rejectionReason?: string | null;
}

interface BackendRequestRecord {
  id: string;
  relatedDocumentId?: string | null;
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

function inferSearchResultType(category: string): UnifiedSearchResult["resultType"] {
  const value = category.toLowerCase();
  if (value.includes("invoice")) return "invoice";
  if (value.includes("bank")) return "bank_statement";
  if (value.includes("signed")) return "signed_document";
  if (value.includes("compliance")) return "compliance_document";
  return "document";
}

function outstandingSlot(slot: MonthlyDocumentSlot) {
  return ["rejected", "missing", "pending", "partial"].includes(slot.status);
}

/**
 * Documents is the permanent evidence register. Monthly collection remains owned by Monthly Packs.
 * This page deliberately coordinates smaller register components instead of containing the whole UI.
 */
export function ClientDocumentsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const uploadModal = useDisclosure(false);
  const backendMode = hasApiBaseUrl() && Boolean(user?.clientIds[0]);
  const clientId = user?.clientIds[0] ?? "";

  const [filters, setFilters] = useState<UnifiedSearchFilters>(() => createDefaultFilters());
  const [sortDirection, setSortDirection] = useState<DocumentRegisterSortDirection>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResultId, setSelectedResultId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
  const [livePackId, setLivePackId] = useState("");
  const [liveDocuments, setLiveDocuments] = useState<DocumentRecord[] | null>(null);
  const [liveSlots, setLiveSlots] = useState<MonthlyDocumentSlot[] | null>(null);
  const [slotDocumentIds, setSlotDocumentIds] = useState<Record<string, string | undefined>>({});
  const [requestDocumentIds, setRequestDocumentIds] = useState<Set<string>>(new Set());
  const [versionsByDocumentId, setVersionsByDocumentId] = useState<Record<string, DocumentVersionRecord[]>>({});
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: Tone; title: string; message: string } | null>(null);

  useEffect(() => {
    if (!backendMode || !clientId) return;
    let active = true;
    setLoadState("loading");

    async function load() {
      try {
        const [documents, packs, requests] = await Promise.all([
          apiGetJson<BackendDocumentRecord[]>("/api/documents"),
          apiGetJson<BackendMonthlyPackResponse[]>(`/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`),
          apiGetJson<BackendRequestRecord[]>("/api/requests").catch(() => []),
        ]);
        const currentPack = packs[0];
        const packById = new Map(packs.map((pack) => [pack.id, pack]));
        const slots = currentPack
          ? await apiGetJson<BackendDocumentSlotResponse[]>(`/api/document-slots/${encodeURIComponent(currentPack.id)}`)
          : [];

        if (!active) return;

        setLiveDocuments(
          documents.filter((document) => document.clientId === clientId).map((document) => {
            const pack = packById.get(document.monthlyPackId);
            return {
              id: document.id,
              clientId: document.clientId,
              clientName: user?.company || "Client",
              documentType: document.category,
              fileName: document.name,
              monthLabel: pack ? monthLabelFromParts(pack.year, pack.month) : formatDateLabel(document.uploadedAtUtc),
              description: `${document.category} uploaded in the secure document workflow.`,
              status: mapBackendDocumentStatus(document.status),
              uploadedBy: "Portal user",
              uploadedAt: document.uploadedAtUtc,
              sizeLabel: formatSizeLabel(document.sizeBytes),
              keywordTags: [document.category, document.name],
              comments: [],
              auditTrail: [],
              fileMimeType: document.fileType,
              versionNumber: document.currentVersionNumber,
              monthlyPackId: document.monthlyPackId,
              documentSlotId: document.documentSlotId ?? undefined,
            } satisfies DocumentRecord;
          }),
        );
        setLivePackId(currentPack?.id ?? "");
        setLiveSlots(
          slots.map((slot) => ({
            id: slot.id,
            documentType: slot.label,
            description: `${slot.label} for ${currentPack ? monthLabelFromParts(currentPack.year, currentPack.month) : "current period"}.`,
            status: mapBackendSlotStatus(slot.status, slot.isRequired),
            month: currentPack ? monthLabelFromParts(currentPack.year, currentPack.month).split(" ")[0] ?? "Month" : "Month",
            year: currentPack?.year ?? new Date().getUTCFullYear(),
            acceptedFiles: ["PDF", "PNG", "JPG", "DOCX", "XLSX"],
            progress: slot.canCurrentlyBeSubmitted ? 70 : slot.status === "accepted" ? 100 : 0,
            autoName: slot.label.replace(/\s+/g, "_"),
            isRequired: slot.isRequired,
            dueDate: slot.dueDateUtc ?? undefined,
            lastSubmission: slot.submittedAtUtc ?? undefined,
            rejectionReason: slot.rejectionReason ?? undefined,
          })),
        );
        setSlotDocumentIds(Object.fromEntries(slots.map((slot) => [slot.id, slot.currentDocumentId ?? undefined])));
        setRequestDocumentIds(new Set(requests.map((request) => request.relatedDocumentId).filter((id): id is string => Boolean(id))));
        setLoadState("ready");
      } catch (error) {
        if (!active) return;
        setLoadState("error");
        setFeedback({
          tone: "danger",
          title: "Documents unavailable",
          message: error instanceof ApiError ? error.message : "The live document register could not be loaded.",
        });
      }
    }

    void load();
    return () => { active = false; };
  }, [backendMode, clientId, refreshKey, user?.company]);

  const documents = backendMode ? liveDocuments ?? [] : portal.clientWorkflow.documents;
  const slots = backendMode ? liveSlots ?? [] : portal.clientWorkflow.monthPack.slots;

  const searchableResults = useMemo<UnifiedSearchResult[]>(() => {
    if (backendMode) {
      return documents.map((document) => ({
        id: document.id,
        resultType: inferSearchResultType(document.documentType),
        title: document.fileName,
        clientId: document.clientId,
        clientName: document.clientName,
        monthLabel: document.monthLabel,
        typeLabel: document.documentType,
        status: document.status,
        date: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        reviewedBy: document.reviewedBy,
        expiryDate: document.expiryDate,
        isRequired: slots.find((slot) => slot.documentType === document.documentType)?.isRequired ?? false,
        keywordText: `${document.fileName} ${document.documentType} ${document.monthLabel}`.toLowerCase(),
      }));
    }
    return portal.clientWorkflow.unifiedSearchResults.filter(
      (result) => result.resultType !== "request" && result.resultType !== "monthly_pack_item",
    );
  }, [backendMode, documents, portal.clientWorkflow.unifiedSearchResults, slots]);

  const filteredResults = useMemo(
    () => portal.filterSearchResults(searchableResults, filters),
    [filters, portal, searchableResults],
  );

  const sortedResults = useMemo(() => [...filteredResults].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    return sortDirection === "newest" ? rightTime - leftTime : leftTime - rightTime;
  }), [filteredResults, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const visibleResults = sortedResults.slice(pageStartIndex, pageStartIndex + pageSize);
  const selectedResult = sortedResults.find((result) => result.id === selectedResultId) ?? null;
  const selectedDocument = documents.find((document) => document.id === selectedResult?.id) ?? null;

  const monthOptions = useMemo(() => [...new Set(searchableResults.map((result) => result.monthLabel))].sort((a, b) => b.localeCompare(a)), [searchableResults]);
  const statusOptions = useMemo(() => [...new Set(searchableResults.map((result) => formatStatusLabel(result.status)))].sort(), [searchableResults]);
  const documentTypeOptions = useMemo(() => [...new Set(searchableResults.map((result) => result.typeLabel))].sort(), [searchableResults]);
  const activeAdvancedFilterCount = [filters.year, filters.uploadedBy, filters.reviewedBy, filters.expiryStatus, filters.requiredFlag !== "all" ? filters.requiredFlag : ""].filter(Boolean).length;
  const outstandingCount = slots.filter(outstandingSlot).length;
  const preferredUploadSlot = slots.find(outstandingSlot) ?? slots[0] ?? null;
  const hasActiveFilters = Boolean(filters.query || filters.month || filters.status || filters.documentType || activeAdvancedFilterCount > 0);

  useEffect(() => { setCurrentPage(1); }, [filters, sortDirection]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  useEffect(() => {
    if (!backendMode || !selectedDocument || versionsByDocumentId[selectedDocument.id]) return;
    void apiGetJson<DocumentVersionRecord[]>(`/api/documents/${encodeURIComponent(selectedDocument.id)}/versions`)
      .then((versions) => setVersionsByDocumentId((current) => ({ ...current, [selectedDocument.id]: versions })))
      .catch(() => setVersionsByDocumentId((current) => ({ ...current, [selectedDocument.id]: [] })));
  }, [backendMode, selectedDocument, versionsByDocumentId]);

  function openUpload(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      setFeedback({ tone: "warning", title: "No upload slot available", message: "Open Monthly Packs to create or select the required item first." });
      return;
    }
    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handleUpload(submission: Parameters<typeof portal.uploadToSlot>[0]) {
    if (!backendMode) {
      const result = portal.uploadToSlot(submission, { name: user?.name ?? "Client user", fullName: user?.fullName ?? "Client user" });
      setFeedback({ tone: result.ok ? "success" : "danger", title: result.ok ? "Document uploaded" : "Upload failed", message: result.message });
      return;
    }
    if (!selectedSlot || !submission.file || !clientId || !livePackId) return;
    const form = buildSlotUploadForm({
      clientId,
      monthlyPackId: livePackId,
      submission: { ...submission, slotId: selectedSlot.id },
      currentDocumentId: slotDocumentIds[selectedSlot.id],
    });
    void apiPostForm("/api/documents/upload", form)
      .then(() => {
        setFeedback({ tone: "success", title: "Document uploaded", message: `${submission.documentType} was added to the document register.` });
        setRefreshKey((current) => current + 1);
      })
      .catch((error: unknown) => setFeedback({ tone: "danger", title: "Upload failed", message: error instanceof ApiError ? error.message : "The document could not be uploaded." }));
  }

  async function downloadSelected() {
    if (!selectedDocument) return;
    if (!backendMode || selectedDocument.fileDataUrl) {
      if (selectedDocument.fileDataUrl) window.open(selectedDocument.fileDataUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(selectedDocument.id)}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = selectedDocument.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Download failed", message: error instanceof ApiError ? error.message : "The file could not be downloaded." });
    }
  }

  function exportResults() {
    const rows = [["Document", "Type", "Period", "Status", "Uploaded"], ...sortedResults.map((result) => [result.title, result.typeLabel, result.monthLabel, formatStatusLabel(result.status), formatDateLabel(result.date)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "client-document-register.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (backendMode && loadState !== "ready") {
    return (
      <div className="portal-page mx-auto max-w-[1280px] space-y-5">
        {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState title={loadState === "error" ? "Documents unavailable" : "Loading documents"} description={loadState === "error" ? "The live register could not be loaded. No demo records are being shown." : "Your live document register is being loaded."} />
        </SurfaceCard>
      </div>
    );
  }

  const selectedTone = selectedResult ? statusToTone(selectedResult.status) : "neutral";
  const selectedVersions = selectedDocument ? versionsByDocumentId[selectedDocument.id] ?? [] : [];

  return (
    <div className="portal-page mx-auto max-w-[1320px] space-y-5">
      <PageHeader
        title="Documents"
        eyebrow="Client workspace"
        description="Upload, find and manage your business records."
        actions={<Button onClick={() => openUpload(preferredUploadSlot)}>Upload document</Button>}
      />

      {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}

      <DocumentRegisterToolbar
        activeAdvancedFilterCount={activeAdvancedFilterCount}
        documentTypeOptions={documentTypeOptions}
        filters={filters}
        monthOptions={monthOptions}
        setFilters={setFilters}
        statusOptions={statusOptions}
      />

      <MonthlyPackAttentionLink outstandingCount={outstandingCount} />

      <DocumentRegister
        allResultsCount={sortedResults.length}
        currentPage={currentPage}
        documents={documents}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => setFilters(createDefaultFilters())}
        onExport={exportResults}
        onPageChange={setCurrentPage}
        onSelect={(resultId) => { setSelectedResultId(resultId); setViewerOpen(true); }}
        onSortChange={setSortDirection}
        pageSize={pageSize}
        pageStartIndex={pageStartIndex}
        requestDocumentIds={requestDocumentIds}
        results={visibleResults}
        selectedResultId={selectedResultId}
        sortDirection={sortDirection}
        totalPages={totalPages}
      />

      {viewerOpen && selectedResult ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30" onClick={() => setViewerOpen(false)}>
          <aside className="ml-auto h-full w-full max-w-[600px] overflow-y-auto border-l border-slate-200 bg-white shadow-[-18px_0_48px_rgba(15,23,42,0.16)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(selectedTone)}`}>{formatStatusLabel(selectedResult.status)}</span>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">{selectedResult.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedResult.typeLabel} · {selectedResult.monthLabel}</p>
              </div>
              <button aria-label="Close document workspace" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600" onClick={() => setViewerOpen(false)} type="button">Close</button>
            </div>

            <div className="space-y-6 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Uploaded</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatDateLabel(selectedResult.date)}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Uploaded by</p><p className="mt-1 text-sm font-semibold text-slate-900">{selectedDocument?.uploadedBy ?? selectedResult.uploadedBy ?? "Client"}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">File size</p><p className="mt-1 text-sm font-semibold text-slate-900">{selectedDocument?.sizeLabel ?? "—"}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Version</p><p className="mt-1 text-sm font-semibold text-slate-900">v{selectedDocument?.versionNumber ?? 1}</p></div>
              </div>

              <div className="flex flex-wrap gap-2 border-y border-slate-100 py-4">
                <Button onClick={() => void downloadSelected()} size="sm" variant="secondary">Download</Button>
                <Button onClick={() => openUpload(slots.find((slot) => slot.documentType === selectedResult.typeLabel) ?? preferredUploadSlot)} size="sm" variant="secondary">Replace document</Button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-950">Version history</h3>
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {(selectedVersions.length > 0 ? selectedVersions : selectedDocument ? [{
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
                  }] : []).map((version) => (
                    <div className="grid grid-cols-[90px_minmax(0,1fr)_auto] gap-3 px-4 py-3 text-sm" key={version.id}>
                      <span className="font-semibold text-slate-900">Version {version.versionNumber}</span>
                      <span className="truncate text-slate-600">{version.originalFileName || version.name}</span>
                      <span className="text-xs text-slate-500">{version.isCurrent ? "Current" : formatDateLabel(version.createdAtUtc)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <DocumentUploadModal
        clientName={user?.company ?? "Client"}
        existingFileNames={[]}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={handleUpload}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
