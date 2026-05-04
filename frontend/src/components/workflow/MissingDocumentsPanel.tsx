import type { MissingDocumentItem } from "../../types/portal";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

interface MissingDocumentsPanelProps {
  items: MissingDocumentItem[];
  onUpload?: (slotId: string) => void;
  actionLabel?: string;
  onActionItem?: (item: MissingDocumentItem) => void;
}

export function MissingDocumentsPanel({
  actionLabel,
  items,
  onActionItem,
  onUpload,
}: MissingDocumentsPanelProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Missing Documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Required checklist items stay visible here until they stop blocking submission.
        </p>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4"
              key={item.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.documentType}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.monthLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.isRequired ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                      Required
                    </span>
                  ) : null}
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {onUpload ? (
                  <Button onClick={() => onUpload(item.id)} size="sm">
                    Upload document
                  </Button>
                ) : null}
                {onActionItem && actionLabel ? (
                  <Button onClick={() => onActionItem(item)} size="sm" variant="secondary">
                    {actionLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            No required documents are currently blocking submission.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
