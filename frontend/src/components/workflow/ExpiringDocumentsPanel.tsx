import { Button } from "../ui/Button";
import type { ExpiringDocumentItem } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

interface ExpiringDocumentsPanelProps {
  items: ExpiringDocumentItem[];
  actionLabel?: string;
  onActionItem?: (item: ExpiringDocumentItem) => void;
}

export function ExpiringDocumentsPanel({
  actionLabel,
  items,
  onActionItem,
}: ExpiringDocumentsPanelProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Expiring Documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Expiry-sensitive records are tracked here before they become compliance failures.
        </p>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.fileName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.documentType} / {item.owner}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.alertMessage}</p>
              <p className="mt-2 text-sm text-slate-400">
                Expires {formatDateLabel(item.expiresOn)}
              </p>
              {onActionItem && actionLabel ? (
                <Button
                  className="mt-4"
                  onClick={() => onActionItem(item)}
                  size="sm"
                  variant="secondary"
                >
                  {actionLabel}
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            No tracked documents are expiring within the next 30 days.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
