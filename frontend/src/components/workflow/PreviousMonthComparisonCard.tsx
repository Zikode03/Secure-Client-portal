import type { PreviousMonthComparison } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

interface PreviousMonthComparisonCardProps {
  comparison: PreviousMonthComparison;
}

export function PreviousMonthComparisonCard({
  comparison,
}: PreviousMonthComparisonCardProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Previous Month Comparison</h2>
          <p className="mt-1 text-sm text-slate-500">
            Invoice volume is compared month over month to surface unusual changes early.
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(comparison.tone)}`}
        >
          {comparison.delta >= 0 ? `+${comparison.delta}` : comparison.delta}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {comparison.previousMonthLabel}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {comparison.previousInvoiceCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">Invoices uploaded last month</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {comparison.currentMonthLabel}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {comparison.currentInvoiceCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">Invoices uploaded this month</p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {comparison.message}
      </div>
    </SurfaceCard>
  );
}
