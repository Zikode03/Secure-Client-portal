import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function SurfaceCard({ children, className, ...props }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
