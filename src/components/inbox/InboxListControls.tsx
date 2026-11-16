import type { ReactNode } from "react";
import { Search } from "lucide-react";

type Filter = "all" | "unread" | "resolved" | "unresolved";
const filters: {value: Filter; label: string}[] = [
  {value: "all", label: "All"}, {value: "unread", label: "Unread"},
  {value: "unresolved", label: "Open"}, {value: "resolved", label: "Resolved"},
];

export function InboxListControls({filter, onChangeFilter, searchValue, onChangeSearch, actions}: {
  filter: Filter; onChangeFilter: (value: Filter) => void;
  searchValue: string; onChangeSearch: (value: string) => void; actions: ReactNode;
}) {
  return <div className="inbox-thread-controls shrink-0 border-b border-slate-200 bg-white p-4">
    <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
    <label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-brand-500">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
      <input aria-label="Search conversations" placeholder="Search conversations" value={searchValue}
        onChange={event => onChangeSearch(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" />
    </label>
    <div role="group" aria-label="Filter conversations" className="mt-3 flex gap-1 border-b border-slate-100">
      {filters.map(option => <button key={option.value} type="button" aria-pressed={filter === option.value}
        onClick={() => onChangeFilter(option.value)}
        className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 ${filter === option.value ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
        {option.label}
      </button>)}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">{actions}</div>
  </div>;
}
