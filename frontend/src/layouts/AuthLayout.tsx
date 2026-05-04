import type { ReactNode } from "react";

interface AuthLayoutProps {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthLayout({
  badge,
  children,
  description,
  title,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            {badge}
          </span>
          <div className="mt-6 space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Structured slots</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">12 / month</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Review flow</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">5-stage</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Audit trace</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">Always on</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
