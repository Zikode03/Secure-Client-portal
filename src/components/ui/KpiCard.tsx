import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface KpiCardProps {
  accent?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  progress?: number;
  value: ReactNode;
}

export function KpiCard({ accent = false, icon, label, onClick, progress, value }: KpiCardProps) {
  const content = (
    <div className="relative h-[96px] overflow-hidden rounded-xl border border-[#dce6ef] bg-white px-3.5 py-3 text-left shadow-[0_7px_18px_rgba(4,24,52,0.05)] transition group-hover:border-brand-200 group-hover:shadow-[0_9px_22px_rgba(4,24,52,0.08)]">
      <div className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", accent ? "bg-brand-600" : "bg-slate-300")} />
      <div className="absolute left-3.5 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee] [&>svg]:h-[1.1rem] [&>svg]:w-[1.1rem]">
          {icon}
      </div>
      <p className="absolute left-[62px] right-3.5 top-3 h-[18px] whitespace-nowrap text-[0.69rem] font-semibold uppercase leading-[18px] tracking-[0.045em] text-[#53617f]">{label}</p>
      <p className={cn("absolute left-[62px] right-3.5 top-[39px] h-6 tabular-nums text-[1.3rem] font-semibold leading-6 tracking-[-0.03em]", accent ? "text-brand-700" : "text-[#091333]")}>
        {value}
      </p>
      {typeof progress === "number" ? (
        <div className="client-dashboard-progress-track absolute inset-x-3.5 bottom-2 h-1 rounded-full">
          <div
            className="client-dashboard-progress-fill h-1 rounded-full"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      ) : null}
    </div>
  );

  return onClick ? (
    <button className="group block w-full" onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <div className="group">{content}</div>
  );
}
