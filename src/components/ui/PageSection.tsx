import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

/** Flat page content. Use SurfaceCard for distinct summaries, previews and dialogs. */
export function PageSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("portal-page-section min-w-0 border-b border-slate-200 py-5", className)} {...props} />;
}
