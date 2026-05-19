// Friendly guide: this module (PreviousMonthComparisonCard) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { PreviousMonthComparison } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface PreviousMonthComparisonCardProps {
  comparison: PreviousMonthComparison;
  actionLabel?: string;
  onAction?: () => void;
  onCreateFollowUps?: () => void;
  onOpenAffectedRecords?: () => void;
  title?: string;
}

// Component flow: gather data first, then render a focused UI state.
export function PreviousMonthComparisonCard({
  actionLabel,
  comparison,
  onAction,
  onCreateFollowUps,
  onOpenAffectedRecords,
  title = "Month Comparison",
}: PreviousMonthComparisonCardProps) {
  const maxValue = Math.max(comparison.currentInvoiceCount, comparison.previousInvoiceCount, 1);
  const currentWidth = Math.round((comparison.currentInvoiceCount / maxValue) * 100);
  const previousWidth = Math.round((comparison.previousInvoiceCount / maxValue) * 100);
  const isImproved = comparison.delta >= 0;
  const trendLabel = isImproved ? "Improved from last month" : "Dropped from last month";
  const driverHints =
    comparison.delta >= 5
      ? [
          "Upload consistency improved across required slots.",
          "Fewer blockers interrupted month-end submission.",
          "Review handoff appears faster than last month.",
        ]
      : comparison.delta <= -5
        ? [
            "Required documents were likely submitted later than expected.",
            "More rework or rejected files slowed completion.",
            "At least one high-volume client may be lagging.",
          ]
        : [
            "Performance is stable versus last month.",
            "No major swing detected in submission volume.",
            "Focus on reducing avoidable rework for a stronger next cycle.",
          ];

// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Clear view of this month vs last month, plus what to do next.</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(comparison.tone)}`}
          >
            {comparison.delta >= 0 ? `+${comparison.delta}` : comparison.delta} files
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{comparison.previousMonthLabel}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{comparison.previousInvoiceCount}</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-slate-400" style={{ width: `${previousWidth}%` }} />
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{comparison.currentMonthLabel}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{comparison.currentInvoiceCount}</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${isImproved ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${currentWidth}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
        <p className={`text-sm font-semibold ${isImproved ? "text-emerald-700" : "text-rose-700"}`}>{trendLabel}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{comparison.message}</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {driverHints.map((hint) => (
            <li key={hint}>- {hint}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {actionLabel && onAction ? (
          <button
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
        <button
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={onOpenAffectedRecords}
          type="button"
        >
          Open affected records
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={onCreateFollowUps}
          type="button"
        >
          Create follow-ups
        </button>
      </div>
    </SurfaceCard>
  );
}
