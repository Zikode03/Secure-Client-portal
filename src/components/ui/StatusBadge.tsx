// Friendly guide: this module (StatusBadge) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { WorkflowStatus } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatStatusLabel, statusToTone, toneToAccentClass } from "../../utils/formatters";

// Shared shape notes: these types keep UI and data contracts aligned.
interface StatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
}

// Component flow: gather data first, then render a focused UI state.
export function StatusBadge({ className, status }: StatusBadgeProps) {
// Render output: this is the visual state users interact with.
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        toneToAccentClass(statusToTone(status)),
        className,
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}