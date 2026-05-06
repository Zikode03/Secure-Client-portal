import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function SurfaceCard({ children, className, ...props }: SurfaceCardProps) {
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
