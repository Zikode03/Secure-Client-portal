// Friendly guide: this module (AuditTrail) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { AuditTrailEntry } from "../../types/portal";
import { formatDateTimeLabel } from "../../utils/formatters";

// Shared shape notes: these types keep UI and data contracts aligned.
interface AuditTrailProps {
  entries: AuditTrailEntry[];
}

// Component flow: gather data first, then render a focused UI state.
export function AuditTrail({ entries }: AuditTrailProps) {
// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div className="relative pl-6" key={entry.id}>
          <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-slate-900" />
          <span className="absolute left-[4px] top-5 h-[calc(100%-0.25rem)] w-px bg-slate-200 last:hidden" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">{entry.status}</p>
              <span className="text-sm text-slate-400">{formatDateTimeLabel(entry.timestamp)}</span>
            </div>
            <p className="text-sm text-slate-600">{entry.actor}</p>
            <p className="text-sm leading-6 text-slate-500">{entry.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}