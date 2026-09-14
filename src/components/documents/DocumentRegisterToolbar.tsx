import { useState, type Dispatch, type SetStateAction } from "react";
import type { UnifiedSearchFilters } from "../../types/portal";

interface DocumentRegisterToolbarProps {
  filters: UnifiedSearchFilters;
  setFilters: Dispatch<SetStateAction<UnifiedSearchFilters>>;
  monthOptions: string[];
  statusOptions: string[];
  documentTypeOptions: string[];
  activeAdvancedFilterCount: number;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 3.75 3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6.5" />
      <path d="M8 4.5v4m8-4v4M4 10.5h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * A compact register toolbar rather than a dashboard control panel.
 * Search remains the primary action while deeper filters stay out of the way until needed.
 */
export function DocumentRegisterToolbar({
  filters,
  setFilters,
  monthOptions,
  statusOptions,
  documentTypeOptions,
  activeAdvancedFilterCount,
}: DocumentRegisterToolbarProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  return (
    <section aria-label="Document register filters" className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search documents</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Search documents, suppliers, references or amounts"
            value={filters.query}
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
          <label className="min-w-[150px]">
            <span className="sr-only">Period</span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <select
                className="w-full appearance-none border-none bg-transparent text-sm text-slate-700 outline-none"
                onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
                value={filters.month}
              >
                <option value="">All periods</option>
                {monthOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <CalendarIcon />
            </div>
          </label>

          <label className="min-w-[145px]">
            <span className="sr-only">Status</span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <select
                className="w-full appearance-none border-none bg-transparent text-sm text-slate-700 outline-none"
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                value={filters.status}
              >
                <option value="">All statuses</option>
                {statusOptions.map((option) => <option key={option} value={option.toLowerCase()}>{option}</option>)}
              </select>
              <ChevronDownIcon />
            </div>
          </label>

          <label className="min-w-[160px]">
            <span className="sr-only">Document type</span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <select
                className="w-full appearance-none border-none bg-transparent text-sm text-slate-700 outline-none"
                onChange={(event) => setFilters((current) => ({ ...current, documentType: event.target.value }))}
                value={filters.documentType}
              >
                <option value="">All types</option>
                {documentTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <ChevronDownIcon />
            </div>
          </label>
        </div>

        <button
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          onClick={() => setShowMoreFilters((current) => !current)}
          type="button"
        >
          More filters
          {activeAdvancedFilterCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{activeAdvancedFilterCount}</span>
          ) : null}
          <span className={showMoreFilters ? "rotate-180 transition" : "transition"}><ChevronDownIcon /></span>
        </button>
      </div>

      {showMoreFilters ? (
        <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Year</span>
            <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))} placeholder="2026" value={filters.year} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Uploaded by</span>
            <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onChange={(event) => setFilters((current) => ({ ...current, uploadedBy: event.target.value }))} placeholder="Name" value={filters.uploadedBy} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Reviewed by</span>
            <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onChange={(event) => setFilters((current) => ({ ...current, reviewedBy: event.target.value }))} placeholder="Name" value={filters.reviewedBy} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Requirement</span>
            <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onChange={(event) => setFilters((current) => ({ ...current, requiredFlag: event.target.value }))} value={filters.requiredFlag}>
              <option value="all">Required & optional</option>
              <option value="required">Required only</option>
              <option value="optional">Optional only</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Expiry</span>
            <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onChange={(event) => setFilters((current) => ({ ...current, expiryStatus: event.target.value }))} value={filters.expiryStatus}>
              <option value="">Any expiry state</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="expired">Expired</option>
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
