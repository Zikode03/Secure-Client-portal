import type { SmartAlertItem } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

interface SmartAlertsPanelProps {
  items: SmartAlertItem[];
  title?: string;
  description?: string;
}

export function SmartAlertsPanel({
  description = "These alerts are generated from workflow patterns, not just calendar reminders.",
  items,
  title = "Smart Alerts",
}: SmartAlertsPanelProps) {
  function formatCategory(value: SmartAlertItem["category"]) {
    return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  }

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
