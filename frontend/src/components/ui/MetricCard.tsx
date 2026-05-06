import type { SummaryMetric } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { ProgressBar } from "./ProgressBar";
import { SurfaceCard } from "./SurfaceCard";

interface MetricCardProps {
  metric: SummaryMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
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
