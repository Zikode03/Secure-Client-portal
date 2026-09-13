// Friendly guide: this module (PageHeader) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";

// Shared shape notes: these types keep UI and data contracts aligned.
interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

// Component flow: gather data first, then render a focused UI state.
export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
// Render output: this is the visual state users interact with.
  return (
    <header className="portal-page-header flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 lg:max-w-[48%] lg:justify-end">{actions}</div> : null}
    </header>
  );
}
