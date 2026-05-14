// Friendly guide: this module (OutstandingRequiredItemsPanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { MonthlyDocumentSlot } from "../../types/portal";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface OutstandingRequiredItemsPanelProps {
  slots: MonthlyDocumentSlot[];
  onUpload: (slotId: string) => void;
  onHeaderAction?: () => void;
  headerActionLabel?: string;
  maxVisible?: number;
}

const readyStatuses = new Set<MonthlyDocumentSlot["status"]>([
  "uploaded",
  "under_review",
  "accepted",
]);

// Component flow: gather data first, then render a focused UI state.
function ChecklistMarker({ ready }: { ready: boolean }) {
// Render output: this is the visual state users interact with.
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full border ${
        ready
          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
          : "border-slate-200 bg-white text-slate-300"
      }`}
    >
      {ready ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 8.2 6.4 11l6.1-6.2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      ) : (
        <span className="h-3 w-3 rounded-full border border-current" />
      )}
    </span>
  );
}

export function OutstandingRequiredItemsPanel({
  headerActionLabel = "View all",
  maxVisible,
  onHeaderAction,
  onUpload,
  slots,
}: OutstandingRequiredItemsPanelProps) {
  const requiredSlots = slots.filter((slot) => slot.isRequired);
  const readyCount = requiredSlots.filter((slot) => readyStatuses.has(slot.status)).length;
  const visibleSlots =
    typeof maxVisible === "number" ? requiredSlots.slice(0, maxVisible) : requiredSlots;

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Outstanding required items</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">
            This is the client to-do list for the month. Items are ticked automatically once a
            file is uploaded into the correct slot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {readyCount}/{requiredSlots.length} ready
          </span>
          {onHeaderAction ? (
            <Button onClick={onHeaderAction} size="sm" variant="ghost">
              {headerActionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const isReady = readyStatuses.has(slot.status);

          return (
            <div
              className={`flex flex-col gap-4 rounded-[1.4rem] border p-4 ${
                isReady ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
              }`}
              key={slot.id}
            >
              <div className="flex flex-wrap items-start gap-3">
                <ChecklistMarker ready={isReady} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{slot.documentType}</p>
                    <StatusBadge status={slot.status} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{slot.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-slate-400">
                    <span>
                      {slot.dueDate
                        ? `Due ${formatDateLabel(slot.dueDate)}`
                        : "Due date set in monthly pack"}
                    </span>
                    <span>
                      {slot.lastSubmission
                        ? `Last upload ${formatDateLabel(slot.lastSubmission)}`
                        : "No upload yet"}
                    </span>
                    <span>{formatStatusLabel(slot.status)}</span>
                  </div>
                </div>
              </div>

              {!isReady ? (
                <div className="flex justify-end">
                  <Button onClick={() => onUpload(slot.id)} size="sm">
                    Upload item
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}