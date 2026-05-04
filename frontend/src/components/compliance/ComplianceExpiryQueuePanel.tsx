import type { ComplianceDocumentRecord } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

interface ComplianceExpiryQueuePanelProps {
  description: string;
  items: ComplianceDocumentRecord[];
  title: string;
}

export function ComplianceExpiryQueuePanel({
  description,
  items,
  title,
}: ComplianceExpiryQueuePanelProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Owner: {item.owner}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Expires {formatDateLabel(item.expiryDate)}
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
