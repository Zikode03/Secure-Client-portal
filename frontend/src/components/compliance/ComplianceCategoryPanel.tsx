// Friendly guide: this module (ComplianceCategoryPanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ComplianceCategoryGroup } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ComplianceCategoryPanelProps {
  group: ComplianceCategoryGroup;
}

// Component flow: gather data first, then render a focused UI state.
export function ComplianceCategoryPanel({ group }: ComplianceCategoryPanelProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{group.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{group.description}</p>
      </div>

      <div className="space-y-3">
        {group.documents.map((document) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={document.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{document.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Owner: {document.owner} / {document.storageLabel}
                </p>
              </div>
              <StatusBadge status={document.status} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Issue date</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {document.issueDate ? formatDateLabel(document.issueDate) : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Expiry date</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {document.expiryDate ? formatDateLabel(document.expiryDate) : "Not set"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {document.reminderDates.map((item) => (
                <span
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                  key={item.id}
                >
                  {item.label} / {formatDateLabel(item.reminderDate)}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <span>
                Versions: {document.versionHistory.length}
              </span>
              <span>{document.isLocked ? "Accepted version locked" : "New version upload allowed"}</span>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}