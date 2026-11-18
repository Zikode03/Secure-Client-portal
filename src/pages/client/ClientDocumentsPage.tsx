import "./clientDocumentViewer.css";
import {DocumentPdfPreview} from "../../components/documents/DocumentPdfPreview";
import {archivePeriodLabel} from "../../services/financialArchive";
import {FinancialArchiveExplorer,type ArchiveSelection} from "../../components/documents/FinancialArchiveExplorer";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { DocumentRegister, type DocumentRegisterSortDirection } from "../../components/documents/DocumentRegister";
import { DocumentRegisterToolbar } from "../../components/documents/DocumentRegisterToolbar";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { ApiError, apiGetBlob, apiGetJson, apiPostForm, hasApiBaseUrl } from "../../services/apiClient";
import { buildReviewDocumentFromInvoice } from "../../services/workflowEngine";
import {
  acceptedFilesForSlot,
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

  const [archiveSelection,setArchiveSelection]=useState<ArchiveSelection>({ids:[],leaf:false,clientId:""});
  const selectArchive=useCallback((selection:ArchiveSelection)=>{setArchiveSelection(current=>current.leaf===selection.leaf&&current.ids.join("|")===selection.ids.join("|")?current:selection);setCurrentPage(1);},[]);
  const [filters, setFilters] = useState<UnifiedSearchFilters>(() => createDefaultFilters());
  const [sortDirection, setSortDirection] = useState<DocumentRegisterSortDirection>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResultId, setSelectedResultId] = useState("");
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
    setLoadState(current => current === "ready" ? current : "loading");

    async function load() {
      try {
        const [documents, packs, requests] = await Promise.all([
          apiGetJson("/api/documents"),
          apiGetJson(`/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`),
          apiGetJson("/api/requests").catch(() => []),
        ]);
        const currentPack = packs[0];
        const packById = new Map(packs.map((pack) => [pack.id, pack]));
        const slots = currentPack
          ? await apiGetJson(`/api/document-slots/${encodeURIComponent(currentPack.id)}`)
          : [];

        if (!active) return;

        setLiveDocuments(
          documents.filter((document) => document.clientId === clientId).map((document) => {
            const pack = packById.get(document.monthlyPackId ?? "");
            return {
              id: document.id,
              clientId: document.clientId,
              clientName: user?.company || "Client",
              documentType: document.category,
              fileName: document.name,
              monthLabel: archivePeriodLabel(document, pack ? monthLabelFromParts(pack.year, pack.month) : "Period needs checking"),
              description: `${document.category} uploaded in the secure document workflow.`,
              status: mapBackendDocumentStatus(document.status),
              isHistoricallyFiled: document.isHistoricallyFiled,
              archiveScope: document.archiveScope as DocumentRecord["archiveScope"], archiveYear: document.archiveYear, archiveMonth: document.archiveMonth,
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
            acceptedFiles: acceptedFilesForSlot(slot.category ?? slot.label, slot.label),
            progress: slot.canSubmit ? 70 : slot.status === "accepted" ? 100 : 0,
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

  useEffect(() => {
    if (!backendMode) return;
    const refresh = () => { if (document.visibilityState !== "hidden") setRefreshKey(value => value + 1); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.clearInterval(timer); };
  }, [backendMode, clientId]);

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
        isHistoricallyFiled: document.isHistoricallyFiled,
              archiveScope: document.archiveScope as DocumentRecord["archiveScope"], archiveYear: document.archiveYear, archiveMonth: document.archiveMonth,
        date: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        reviewedBy: document.reviewedBy,
        expiryDate: document.expiryDate,
        isRequired: slots.find((slot) => slot.documentType === document.documentType)?.isRequired ?? false,
        commentCount: document.comments?.length ?? 0,
        keywordText: `${document.fileName} ${document.documentType} ${document.monthLabel}`.toLowerCase(),
      }));
    }
    return portal.clientWorkflow.unifiedSearchResults.filter(
      (result) => result.resultType !== "request" && result.resultType !== "monthly_pack_item",
    );
  }, [backendMode, documents, portal.clientWorkflow.unifiedSearchResults, slots]);

  const filteredResults = useMemo(
    () => portal.filterSearchResults(searchableResults, filters).filter(result=>archiveSelection.ids.includes(result.id)),
    [filters, portal, searchableResults,archiveSelection.ids],
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
  const selectedInvoice = !backendMode && selectedResult?.resultType === "invoice"
    ? portal.clientWorkflow.invoices.find((invoice) => invoice.id === selectedResult.id)
    : undefined;
  const selectedDocument = documents.find((document) => document.id === selectedResult?.id)
    ?? (selectedInvoice ? buildReviewDocumentFromInvoice(selectedInvoice) : null);

  const monthOptions = useMemo(() => [...new Set(searchableResults.map((result) => result.monthLabel))].sort((a, b) => b.localeCompare(a)), [searchableResults]);
  const statusOptions = useMemo(() => [...new Set(searchableResults.map((result) => formatStatusLabel(result.status)))].sort(), [searchableResults]);
  const documentTypeOptions = useMemo(() => [...new Set(searchableResults.map((result) => result.typeLabel))].sort(), [searchableResults]);
  const activeAdvancedFilterCount = [filters.year, filters.uploadedBy, filters.reviewedBy, filters.expiryStatus, filters.requiredFlag !== "all" ? filters.requiredFlag : ""].filter(Boolean).length;
  const preferredUploadSlot = slots.find(outstandingSlot) ?? slots[0] ?? null;
  const hasActiveFilters = Boolean(filters.query || filters.month || filters.status || filters.documentType || activeAdvancedFilterCount > 0);

  useEffect(() => { setCurrentPage(1); }, [filters, sortDirection]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  useEffect(() => {
    if (!backendMode || !selectedDocument || versionsByDocumentId[selectedDocument.id]) return;
    void apiGetJson(`/api/documents/${encodeURIComponent(selectedDocument.id)}/versions`)
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

  async function downloadSelected(targetDocument: DocumentRecord | null = selectedDocument) {
    if (!targetDocument) return;
    if (targetDocument.fileDataUrl) {
      const anchor = document.createElement("a"); anchor.href = targetDocument.fileDataUrl; anchor.download = targetDocument.fileName; anchor.click(); return;
    }
    if (!backendMode) return;
    try {
      const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(targetDocument.id)}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = targetDocument.fileName;
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
      <div className="portal-page client-documents-page w-full min-w-0 space-y-5">
        {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}
        <PageHeader title="Documents" description="Upload, find and manage your business records." />
        <SurfaceCard className="p-8 text-center text-sm text-slate-500">
          {loadState === "error" ? "The document register could not be loaded." : "Loading document register..."}
        </SurfaceCard>
      </div>
    );
  }

  const selectedVersions = selectedDocument ? versionsByDocumentId[selectedDocument.id] ?? [] : [];

  return (
    <div className="portal-page client-documents-page w-full min-w-0 space-y-4">
      {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}

      <PageHeader
        title="Documents"
        description="Find, view and download your business records."
        actions={<div className="flex flex-wrap items-center gap-3">{slots.some(outstandingSlot) ? <Link to="/client/packs" className="text-brand-700 font-medium">Open monthly pack</Link> : null}<Button onClick={() => openUpload(preferredUploadSlot)}>Upload document</Button></div>}
      />


      <FinancialArchiveExplorer records={searchableResults} clients={[{id:clientId,name:user?.company||"Business records"}]} fixedClientId={clientId} onSelection={selectArchive} />
      {archiveSelection.leaf ? <section className="client-document-library" aria-label="Document library">
      <DocumentRegisterToolbar
        activeAdvancedFilterCount={activeAdvancedFilterCount}
        documentTypeOptions={documentTypeOptions}
        filters={filters}
        monthOptions={monthOptions}
        setFilters={setFilters}
        statusOptions={statusOptions}
      />

      <DocumentRegister
        onDownload={result => {
          const invoice = !backendMode ? portal.clientWorkflow.invoices.find(item => item.id === result.id) : undefined;
          const document = documents.find(item => item.id === result.id) ?? (invoice ? buildReviewDocumentFromInvoice(invoice) : null);
          void downloadSelected(document);
        }}
        allResultsCount={sortedResults.length}
        currentPage={currentPage}
        documents={documents}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => setFilters(createDefaultFilters())}
        onExport={exportResults}
        onPageChange={setCurrentPage}
        onSelect={setSelectedResultId}
        onSortChange={setSortDirection}
        pageSize={pageSize}
        pageStartIndex={pageStartIndex}
        requestDocumentIds={requestDocumentIds}
        results={visibleResults}
        selectedResultId={selectedResultId}
        sortDirection={sortDirection}
        totalPages={totalPages}
      />
      </section> : null}

      {selectedDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Document preview" onClick={()=>setSelectedResultId("")}>
          <SurfaceCard className="client-document-viewer" aria-label="Document details drawer" onClick={event=>event.stopPropagation()}>
            <header className="client-document-viewer__header">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-950" title={selectedDocument.fileName}>{selectedDocument.fileName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedDocument.monthLabel} · <span className={toneToAccentClass(statusToTone(selectedDocument.status))}>{selectedDocument.isHistoricallyFiled ? "Historically filed" : formatStatusLabel(selectedDocument.status)}</span></p>
              </div>
              <div className="client-document-viewer__actions">
                <Button variant="secondary" onClick={()=>void downloadSelected()}>Download</Button>
                <Button variant="secondary" onClick={()=>setSelectedResultId("")} aria-label="Close document workspace">Close</Button>
              </div>
            </header>
            <div className="client-document-viewer__preview">
              {backendMode && (selectedDocument.fileMimeType === "application/pdf" || /\.pdf$/i.test(selectedDocument.fileName)) ? <DocumentPdfPreview documentId={selectedDocument.id} fileName={selectedDocument.fileName} onReady={()=>{}} /> : selectedDocument.fileDataUrl && selectedDocument.fileMimeType?.startsWith("image/") ? <img src={selectedDocument.fileDataUrl} alt={selectedDocument.fileName} className="h-full w-full object-contain" /> : <p className="m-auto p-5 text-sm text-slate-600">A preview is unavailable for this file type. Use Download to open the original file.</p>}
            </div>
            <footer className="client-document-viewer__footer">
              <details>
                <summary><h3 className="inline text-sm font-medium">Versions</h3><span className="ml-2 text-sm text-slate-500">and file details</span></summary>
                <p className="my-3 text-sm text-slate-500">Uploaded {formatDateLabel(selectedDocument.uploadedAt)} · {selectedDocument.uploadedBy} · {selectedDocument.sizeLabel}</p>
                {selectedVersions.length ? selectedVersions.map(version=><p className="mb-2 text-sm text-slate-600" key={version.id}>Version {version.versionNumber} · {formatDateLabel(version.createdAtUtc)}</p>) : <p className="mb-2 text-sm text-slate-500">No previous versions.</p>}
                <Button variant="secondary" onClick={()=>openUpload(slots.find(slot=>slot.id===selectedDocument.documentSlotId)??preferredUploadSlot)}>Replace document</Button>
              </details>
            </footer>
          </SurfaceCard>
        </div>
      ) : null}

      <DocumentUploadModal
        clientId={user?.clientIds[0]}
        clientName={user?.company ?? ""}
        existingFileNames={documents.map((document) => document.fileName)}
        isOpen={uploadModal.isOpen}
        onClose={() => { uploadModal.close(); setSelectedSlot(null); }}
        onUploaded={handleUpload}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
