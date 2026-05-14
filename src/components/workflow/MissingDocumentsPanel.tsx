// Friendly guide: this module (MissingDocumentsPanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { MissingDocumentItem } from "../../types/portal";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface MissingDocumentsPanelProps {
  items: MissingDocumentItem[];
  onUpload?: (slotId: string) => void;
  actionLabel?: string;
  onActionItem?: (item: MissingDocumentItem) => void;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
  title?: string;
  description?: string;
  onViewReason?: (item: MissingDocumentItem) => void;
}

// Component flow: gather data first, then render a focused UI state.
function actionLabelForItem(item: MissingDocumentItem) {
  return item.status === "rejected" ? "Re-upload" : "Upload";
}

export function MissingDocumentsPanel({
  actionLabel,
  description = "Required checklist items stay visible here until they stop blocking submission.",
  headerActionLabel,
  items,
  onActionItem,
  onHeaderAction,
  onUpload,
  onViewReason,
  title = "Missing documents",
}: MissingDocumentsPanelProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">{description}</p>
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
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-slate-500">
                <span>
                  {item.dueDate
                    ? `Due ${formatDateLabel(item.dueDate)}`
                    : "Due date shown in checklist"}
                </span>
                <span>{formatStatusLabel(item.status)}</span>
                {item.lastSubmission ? (
                  <span>Last upload {formatDateLabel(item.lastSubmission)}</span>
                ) : null}
              </div>
              {item.rejectionReason ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-white/70 px-3 py-2 text-sm text-rose-700">
                  Rejection reason: {item.rejectionReason}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {onUpload ? (
                  <Button onClick={() => onUpload(item.id)} size="sm">
                    {actionLabelForItem(item)}
                  </Button>
                ) : null}
                {item.rejectionReason && onViewReason ? (
                  <Button onClick={() => onViewReason(item)} size="sm" variant="secondary">
                    View reason
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
          <EmptyState
            description="No required items are blocking this monthly pack right now."
            title="No blocking documents. Your required checklist is complete."
          />
        )}
      </div>
    </SurfaceCard>
  );
}