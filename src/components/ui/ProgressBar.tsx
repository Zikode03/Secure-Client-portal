// Friendly guide: this module (ProgressBar) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { cn } from "../../utils/cn";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ProgressBarProps {
  value: number;
  className?: string;
}

// Component flow: gather data first, then render a focused UI state.
export function ProgressBar({ className, value }: ProgressBarProps) {
// Render output: this is the visual state users interact with.
  return (
    <div className={cn("h-2 rounded-full bg-slate-100", className)}>
      <div
        className="h-2 rounded-full bg-slate-950 transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}