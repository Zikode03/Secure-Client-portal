import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:px-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2.5">
        {eyebrow ? (
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-1.5">
          <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950 sm:text-[1.95rem]">
            {title}
          </h1>
          <p className="max-w-3xl text-[0.92rem] leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}
