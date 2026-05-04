import { cn } from "../../utils/cn";

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ className, value }: ProgressBarProps) {
  return (
    <div className={cn("h-2 rounded-full bg-slate-100", className)}>
      <div
        className="h-2 rounded-full bg-slate-950 transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
