// Friendly guide: this module (MetricCard) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { SummaryMetric } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { ProgressBar } from "./ProgressBar";
import { SurfaceCard } from "./SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface MetricCardProps {
  metric: SummaryMetric;
}

// Component flow: gather data first, then render a focused UI state.
export function MetricCard({ metric }: MetricCardProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.74rem] font-medium uppercase tracking-[0.08em] text-slate-500">
            {metric.label}
          </p>
          <p className="mt-2 text-[1.7rem] font-semibold tracking-tight text-slate-950">
            {metric.value}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase ring-1 ring-inset ${toneToAccentClass(metric.tone)}`}
        >
          {metric.tone}
        </span>
      </div>
      <p className="text-[0.76rem] leading-5 text-slate-500">{metric.helper}</p>
      {typeof metric.progress === "number" ? <ProgressBar value={metric.progress} /> : null}
    </SurfaceCard>
  );
}