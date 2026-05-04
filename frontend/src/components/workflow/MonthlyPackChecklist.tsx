import type { MonthlyDocumentSlot, MonthlyPack } from "../../types/portal";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

interface MonthlyPackChecklistProps {
  pack: MonthlyPack;
  onUpload: (slot: MonthlyDocumentSlot) => void;
  onSubmitMonth: () => void;
}

function isBlockingRequiredSlot(slot: MonthlyDocumentSlot) {
  return (
    slot.isRequired &&
    (slot.status === "missing" ||
      slot.status === "partial" ||
      slot.status === "pending" ||
      slot.status === "pending_signature" ||
      slot.status === "rejected")
  );
}

export function MonthlyPackChecklist({
  onSubmitMonth,
  onUpload,
  pack,
}: MonthlyPackChecklistProps) {
  return (
    <SurfaceCard className="space-y-6">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">{pack.monthLabel}</h2>
            <StatusBadge status={pack.deadlineStatus} />
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Every month is controlled through a required document checklist, so each upload lands in the right slot with the right naming, review path, and audit history.
          </p>
        </div>

        <div className="min-w-[280px] rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">Pack progress</p>
            <p className="text-lg font-semibold text-slate-950">
              {pack.completedCount}/{pack.totalCount}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <ProgressBar value={pack.progressPercent} />
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Due {formatDateLabel(pack.dueDate)}</span>
              <span>{pack.progressPercent}% complete</span>
            </div>
          </div>
        </div>
      </div>

      {!pack.canComplete ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
          You cannot submit this month because required documents are still missing or rejected.
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
          Month is complete and ready to submit to your accountant.
        </div>
      )}

      <div className="space-y-3">
        {pack.slots.map((slot) => (
          <div
            className={`grid gap-4 rounded-[1.75rem] border p-4 lg:grid-cols-[1.25fr_0.65fr_0.8fr_0.55fr_auto] ${
              isBlockingRequiredSlot(slot)
                ? "border-rose-200 bg-rose-50"
                : "border-slate-200 bg-slate-50"
            }`}
            key={slot.id}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-slate-950">{slot.documentType}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                    slot.isRequired
                      ? "bg-white text-rose-700 ring-rose-200"
                      : "bg-white text-slate-600 ring-slate-200"
                  }`}
                >
                  {slot.isRequired ? "Required" : "Optional"}
                </span>
                <StatusBadge status={slot.status} />
              </div>
              <p className="text-sm leading-6 text-slate-500">{slot.description}</p>
              <p className="text-sm text-slate-400">
                Accepted files: {slot.acceptedFiles.join(", ")}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Slot health</p>
              <ProgressBar value={slot.progress} />
              <p className="text-sm text-slate-400">{formatStatusLabel(slot.status)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Auto name</p>
              <p className="text-sm text-slate-600">{slot.autoName}</p>
              {slot.lastSubmission ? (
                <p className="text-sm text-slate-400">
                  Last submission: {formatDateLabel(slot.lastSubmission)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Owner / due date</p>
              <p className="text-sm text-slate-600">{slot.assignedOwner ?? "Client"}</p>
              <p className="text-sm text-slate-400">
                Due {formatDateLabel(slot.dueDate ?? pack.dueDate)}
              </p>
            </div>

            <div className="flex items-center lg:justify-end">
              <Button onClick={() => onUpload(slot)} variant="secondary">
                Upload
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Month completion control</p>
          <p className="mt-1 text-sm text-slate-500">
            Do not submit until every required document is in place. Optional items can remain open, but missing required documents block the month.
          </p>
        </div>
        <Button disabled={!pack.canComplete} onClick={onSubmitMonth}>
          {pack.canComplete ? "Submit month" : "Do not submit until complete"}
        </Button>
      </div>
    </SurfaceCard>
  );
}
