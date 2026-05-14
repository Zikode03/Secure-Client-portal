// Friendly guide: this module (SurfaceCard) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

// Shared shape notes: these types keep UI and data contracts aligned.
interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// Component flow: gather data first, then render a focused UI state.
export function SurfaceCard({ children, className, ...props }: SurfaceCardProps) {
// Render output: this is the visual state users interact with.
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}