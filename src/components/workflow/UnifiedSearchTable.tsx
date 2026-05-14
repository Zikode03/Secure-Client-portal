// Friendly guide: this module (UnifiedSearchTable) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { UnifiedSearchResult } from "../../types/portal";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface UnifiedSearchTableProps {
  title: string;
  description: string;
  results: UnifiedSearchResult[];
  onOpenResult: (result: UnifiedSearchResult) => void;
  onCommentResult?: (result: UnifiedSearchResult) => void;
}

// Component flow: gather data first, then render a focused UI state.
export function UnifiedSearchTable({
  description,
  onCommentResult,
  onOpenResult,
  results,
  title,
}: UnifiedSearchTableProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {results.length} results
        </span>
      </div>

      <div className="mt-6 overflow-x-auto">
        {results.length === 0 ? (
          <EmptyState
            description="Try broadening the search terms or removing a few filters."
            title="No results match this search"
          />
        ) : (
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3 font-medium">Result</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Client / period</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr className="border-b border-slate-100 last:border-b-0" key={result.id}>
                  <td className="py-4 pr-4 align-top">
                    <p className="text-sm font-semibold text-slate-950">{result.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateLabel(result.date)}</p>
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-500">
                    {result.resultType.replace(/_/g, " ")}
                    <p className="mt-1 text-sm text-slate-400">{result.typeLabel}</p>
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-500">
                    {result.clientName}
                    <p className="mt-1 text-sm text-slate-400">{result.monthLabel}</p>
                    {result.amountLabel ? (
                      <p className="mt-1 text-sm text-slate-400">{result.amountLabel}</p>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="space-y-2">
                      <StatusBadge status={result.status} />
                      <p className="text-sm text-slate-400">
                        {formatStatusLabel(result.status)}
                        {result.commentCount > 0 ? ` / ${result.commentCount} comments` : ""}
                      </p>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => onOpenResult(result)} size="sm" variant="ghost">
                        Open
                      </Button>
                      {onCommentResult ? (
                        <Button
                          onClick={() => onCommentResult(result)}
                          size="sm"
                          variant="secondary"
                        >
                          Comment
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SurfaceCard>
  );
}