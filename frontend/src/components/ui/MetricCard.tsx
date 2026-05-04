import type { SummaryMetric } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { ProgressBar } from "./ProgressBar";
import { SurfaceCard } from "./SurfaceCard";

interface MetricCardProps {
  metric: SummaryMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <SurfaceCard className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {metric.value}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(metric.tone)}`}
        >
          {metric.tone}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-500">{metric.helper}</p>
      {typeof metric.progress === "number" ? <ProgressBar value={metric.progress} /> : null}
    </SurfaceCard>
  );
}
