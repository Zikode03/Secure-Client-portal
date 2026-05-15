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
    <div className="flex flex-col gap-4 rounded-[1.4rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
