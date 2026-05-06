import type { RejectedDocumentItem } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

interface RejectedDocumentsPanelProps {
  items: RejectedDocumentItem[];
  actionLabel?: string;
  onActionItem?: (item: RejectedDocumentItem) => void;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
}

export function RejectedDocumentsPanel({
  actionLabel,
  headerActionLabel,
  items,
  onActionItem,
  onHeaderAction,
}: RejectedDocumentsPanelProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Rejected Documents</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">
            Anything rejected stays in view until the corrected upload is back in the workflow.
          </p>
        </div>
        {headerActionLabel && onHeaderAction ? (
          <Button onClick={onHeaderAction} size="sm" variant="ghost">
            {headerActionLabel}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.type}
                    {item.clientName ? ` / ${item.clientName}` : ""}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-rose-700">{item.reason}</p>
              <p className="mt-2 text-sm text-slate-400">
                Rejected {formatDateLabel(item.date)}
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
            There are no rejected documents in the current workflow queue.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
