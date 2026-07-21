// Friendly guide: this module (ComplianceExpiryQueuePanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ComplianceDocumentRecord } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ComplianceExpiryQueuePanelProps {
  description: string;
  items: ComplianceDocumentRecord[];
  title: string;
}

// Component flow: gather data first, then render a focused UI state.
export function ComplianceExpiryQueuePanel({
  description,
  items,
  title,
}: ComplianceExpiryQueuePanelProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-medium text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Owner: {item.owner}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Expires {item.expiryDate ? formatDateLabel(item.expiryDate) : "Not set"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            No documents are currently in this queue.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
