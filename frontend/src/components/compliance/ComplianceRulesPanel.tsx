import type { ReactNode } from "react";
import { SurfaceCard } from "../ui/SurfaceCard";

interface ComplianceRulesPanelProps {
  title: string;
  description: string;
  items: string[];
  footer?: ReactNode;
}

export function ComplianceRulesPanel({
  description,
  footer,
  items,
  title,
}: ComplianceRulesPanelProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600" key={item}>
            {item}
          </div>
        ))}
      </div>

      {footer ? <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-700">{footer}</div> : null}
    </SurfaceCard>
  );
}
