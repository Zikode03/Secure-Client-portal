import type { WorkflowStatus } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatStatusLabel, statusToTone, toneToAccentClass } from "../../utils/formatters";

interface StatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
}

export function StatusBadge({ className, status }: StatusBadgeProps) {
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
