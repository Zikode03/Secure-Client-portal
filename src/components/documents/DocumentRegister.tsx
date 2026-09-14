import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import type { DocumentRecord, Tone, UnifiedSearchResult } from "../../types/portal";
import { formatDateLabel, formatStatusLabel, statusToTone } from "../../utils/formatters";
import { DocumentSourceBadge } from "./DocumentSourceBadge";
import { getDocumentSource } from "./documentSource";

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

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[1.08rem] font-semibold text-slate-950">Document register</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-500">{allResultsCount} results</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span>Sort</span>
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 outline-none" onChange={(event) => onSortChange(event.target.value as DocumentRegisterSortDirection)} value={sortDirection}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          {hasActiveFilters ? <button className="px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800" onClick={onClearFilters} type="button">Clear filters</button> : null}
          <Button onClick={onExport} size="sm" variant="secondary"><DownloadIcon /> Export</Button>
        </div>
      </div>

      {allResultsCount > 0 ? (
        <>
          <div className="hidden grid-cols-[minmax(0,1.65fr)_0.85fr_0.85fr_0.85fr_0.8fr_0.8fr_24px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
            <span>Document</span><span>Type</span><span>Period</span><span>Source</span><span>Uploaded</span><span>Status</span><span />
          </div>
          <div className="divide-y divide-slate-100">
            {results.map((result) => {
              const tone = statusToTone(result.status);
              const rowDocument = documents.find((document) => document.id === result.id);
              const source = getDocumentSource({ documentSlotId: rowDocument?.documentSlotId, documentId: rowDocument?.id ?? result.id }, requestDocumentIds);
              return (
                <button className={`w-full px-4 py-3 text-left transition ${selectedResultId === result.id ? "bg-brand-50/35 ring-1 ring-inset ring-brand-200" : "hover:bg-slate-50"}`} key={result.id} onClick={() => onSelect(result.id)} type="button">
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,1.65fr)_0.85fr_0.85fr_0.85fr_0.8fr_0.8fr_24px] lg:items-center lg:gap-3">
                    <div className="min-w-0"><p className="truncate text-[0.96rem] font-medium text-slate-950">{result.title}</p>{result.amountLabel ? <p className="mt-1 text-[0.8rem] font-medium text-slate-400">{result.amountLabel}</p> : null}</div>
                    <div className="text-[0.82rem] text-slate-600">{result.typeLabel}</div>
                    <div className="text-[0.82rem] text-slate-600">{result.monthLabel || "—"}</div>
                    <div><DocumentSourceBadge source={source} /></div>
                    <div className="text-[0.82rem] text-slate-500">{formatDateLabel(result.date)}</div>
                    <div className="flex items-center gap-2 text-[0.84rem] font-medium text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${toneDotClass(tone)}`} /><span>{formatStatusLabel(result.status)}</span></div>
                    <div className="hidden justify-self-end text-slate-300 lg:block"><ChevronRightIcon /></div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === pageNumber ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`} key={pageNumber} onClick={() => onPageChange(pageNumber)} type="button">{pageNumber}</button>
              ))}
            </div>
            <p className="text-sm text-slate-500">Showing {allResultsCount === 0 ? 0 : pageStartIndex + 1} to {Math.min(pageStartIndex + pageSize, allResultsCount)} of {allResultsCount} results</p>
          </div>
        </>
      ) : (
        <div className="px-5 py-8"><EmptyState description="Try broadening the search terms or removing a few filters." title="No results match this search" /></div>
      )}
    </div>
  );
}
