// Friendly guide: this module (ComplianceAuditPanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ComplianceAuditEvent } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ComplianceAuditPanelProps {
  items: ComplianceAuditEvent[];
}

// Component flow: gather data first, then render a focused UI state.
export function ComplianceAuditPanel({ items }: ComplianceAuditPanelProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Audit Trail</h2>
        <p className="mt-1 text-sm text-slate-500">
          Uploads, reviews, approvals, rejections, downloads, and new versions stay visible here.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div className="relative pl-6" key={item.id}>
            <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-slate-900" />
            <p className="text-sm font-semibold text-slate-950">
              {item.action} / {item.actor}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
            <p className="mt-2 text-sm text-slate-400">{formatDateLabel(item.timestamp)}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}