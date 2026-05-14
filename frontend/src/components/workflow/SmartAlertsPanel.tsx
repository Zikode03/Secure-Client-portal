// Friendly guide: this module (SmartAlertsPanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { SmartAlertItem } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface SmartAlertsPanelProps {
  items: SmartAlertItem[];
  title?: string;
  description?: string;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
}

// Component flow: gather data first, then render a focused UI state.
export function SmartAlertsPanel({
  description = "These alerts are generated from workflow patterns, not just calendar reminders.",
  headerActionLabel,
  items,
  onHeaderAction,
  title = "Smart Alerts",
}: SmartAlertsPanelProps) {
  function formatCategory(value: SmartAlertItem["category"]) {
    return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  }

// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">{description}</p>
        </div>
        {headerActionLabel && onHeaderAction ? (
          <span>
            <button
              className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={onHeaderAction}
              type="button"
            >
              {headerActionLabel}
            </button>
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(item.tone)}`}
                >
                  {formatCategory(item.category)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.message}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            No unusual workflow activity needs attention right now.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}