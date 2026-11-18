import { RecordActions } from "../ui/RecordActions";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import type { DocumentRecord, Tone, UnifiedSearchResult } from "../../types/portal";
import { formatDateLabel, formatStatusLabel, statusToTone } from "../../utils/formatters";
import { FileText } from "lucide-react";
import "./documentLibrary.css";
import { formatDocumentType } from "./documentTypeLabel";
import { formatDocumentSource, getDocumentSource } from "./documentSource";

export type DocumentRegisterSortDirection = "newest" | "oldest";

interface DocumentRegisterProps {
  results: UnifiedSearchResult[];
  allResultsCount: number;
  documents: DocumentRecord[];
  requestDocumentIds: ReadonlySet<string>;
  selectedResultId?: string;
  sortDirection: DocumentRegisterSortDirection;
  onSortChange: (direction: DocumentRegisterSortDirection) => void;
  onSelect: (resultId: string) => void;
  onDownload: (result: UnifiedSearchResult) => void;
  onClearFilters: () => void;
  onExport: () => void;
  hasActiveFilters: boolean;
  currentPage: number;
  totalPages: number;
  pageStartIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function toneDotClass(tone: Tone) {
  if (tone === "success") return "bg-emerald-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "danger") return "bg-rose-500";
  if (tone === "info") return "bg-sky-500";
  return "bg-slate-400";
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 4.75v9.5m0 0 3.75-3.75M12 14.25l-3.75-3.75M5.75 16.25v1.5A2.5 2.5 0 0 0 8.25 20.25h7.5a2.5 2.5 0 0 0 2.5-2.5v-1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

/** Permanent document register. Monthly collection actions stay in Monthly Packs. */
export function DocumentRegister({
  results,
  allResultsCount,
  documents,
  requestDocumentIds,
  selectedResultId,
  sortDirection,
  onSortChange,
  onSelect,
  onDownload,
  onClearFilters,
  onExport,
  hasActiveFilters,
  currentPage,
  totalPages,
  pageStartIndex,
  pageSize,
  onPageChange,
}: DocumentRegisterProps) {
  return (
    <div className="doc-library-register">
      <div className="doc-library-summary">
        <span className="font-medium text-slate-700">{allResultsCount} {allResultsCount === 1 ? "document" : "documents"}</span>
        <div className="doc-library-summary-actions">
          {hasActiveFilters ? <button onClick={onClearFilters} type="button">Clear filters</button> : null}
          <label className="doc-library-sort"><span className="sr-only">Sort</span><select onChange={(event) => onSortChange(event.target.value as DocumentRegisterSortDirection)} value={sortDirection}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          <button className="doc-library-export" onClick={onExport} disabled={allResultsCount === 0} type="button"><DownloadIcon /> Export list</button>
        </div>
      </div>
      {allResultsCount > 0 ? (
        <>
          <div className="doc-library-table-scroll">
            <table className="doc-library-table">
              <caption className="sr-only">Business documents</caption>
              <thead><tr><th scope="col">Document</th><th scope="col">Period</th><th scope="col">Uploaded</th><th scope="col">Status</th><th scope="col" className="doc-library-action-cell">Actions</th></tr></thead>
              <tbody>{results.map((result) => {
                const rowDocument = documents.find((document) => document.id === result.id);
                const source = getDocumentSource({ documentSlotId: rowDocument?.documentSlotId, documentId: rowDocument?.id ?? result.id }, requestDocumentIds);
                return (
                  <tr key={result.id} className={selectedResultId === result.id ? "doc-library-selected" : undefined}>
                    <td><div className="doc-library-file"><span className="doc-library-file-icon"><FileText size={20} aria-hidden="true" /></span><div className="min-w-0"><button className="doc-library-file-name" title={result.title} onClick={() => onSelect(result.id)} type="button">{result.title}</button><p className="doc-library-file-meta">{formatDocumentType(result.typeLabel)}<span aria-hidden="true"> · </span>{formatDocumentSource(source)}{result.amountLabel ? ` · ${result.amountLabel}` : ""}</p></div></div></td>
                    <td>{result.monthLabel || "—"}</td>
                    <td>{formatDateLabel(result.date)}</td>
                    <td><span className="doc-library-status"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${toneDotClass(statusToTone(result.status))}`} />{rowDocument?.isHistoricallyFiled ? "Historically filed" : formatStatusLabel(result.status)}</span></td>
                    <td className="doc-library-action-cell"><RecordActions iconOnly label={`Actions for ${result.title}`} actions={[{ label: "Open", onSelect: () => onSelect(result.id) }, { label: "Download", onSelect: () => onDownload(result) }]} /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          {totalPages > 1 ? <nav className="doc-library-pagination" aria-label="Document pages"><span>{pageStartIndex + 1}–{Math.min(pageStartIndex + pageSize, allResultsCount)} of {allResultsCount}</span><div><Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Previous</Button><span>Page {currentPage} of {totalPages}</span><Button size="sm" variant="secondary" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</Button></div></nav> : null}
        </>
      ) : <div className="px-5 py-8"><EmptyState title={hasActiveFilters ? "No matching documents" : "No documents yet"} description={hasActiveFilters ? "Try a different search or clear your filters." : "Upload a document or complete an item in Monthly Packs."} /></div>}
    </div>
  );
}
