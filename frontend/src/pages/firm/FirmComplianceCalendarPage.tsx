import { useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

type CalendarView = "month" | "week";

interface DeadlineItem {
  id: string;
  clientName: string;
  label: string;
  dueDate: string;
  type: "filing" | "expiry";
}

export function FirmComplianceCalendarPage() {
  const portal = usePortal();
  const [view, setView] = useState<CalendarView>("month");

  const deadlines = useMemo<DeadlineItem[]>(() => {
    const filingItems = portal.accountantComplianceCentre.clientStatuses?.flatMap((client) =>
      client.topPriorities
        .filter((priority) => Boolean(priority.dueDate))
        .map((priority) => ({
          id: `${client.clientId}-${priority.id}`,
          clientName: client.clientName,
          label: priority.label,
          dueDate: priority.dueDate ?? new Date().toISOString(),
          type: "filing" as const,
        })),
    ) ?? [];

    const expiryItems = portal.accountantComplianceCentre.expiringDocuments.map((document) => ({
      id: `expiry-${document.id}`,
      clientName: document.clientName,
      label: document.name,
      dueDate: document.expiryDate ?? new Date().toISOString(),
      type: "expiry" as const,
    }));

    return [...filingItems, ...expiryItems].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }, [portal.accountantComplianceCentre]);

  const visible = useMemo(() => {
    const windowDays = view === "week" ? 7 : 31;
    const now = Date.now();
    const end = now + windowDays * 24 * 60 * 60 * 1000;

    return deadlines.filter((item) => {
      const ts = new Date(item.dueDate).getTime();
      return ts >= now && ts <= end;
    });
  }, [deadlines, view]);

  return (
    <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Compliance Calendar / Deadlines</h1>
          <p className="mt-1 text-sm text-slate-500">Upcoming filings and expiring compliance documents.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            className={`rounded-md px-3 py-1.5 text-sm ${view === "month" ? "bg-white font-semibold text-slate-900" : "text-slate-600"}`}
            onClick={() => setView("month")}
            type="button"
          >
            Month
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm ${view === "week" ? "bg-white font-semibold text-slate-900" : "text-slate-600"}`}
            onClick={() => setView("week")}
            type="button"
          >
            Week
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {visible.map((item) => (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" key={item.id}>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{item.clientName}</p>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.type === "filing" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
                {item.type}
              </span>
              <p className="mt-1 text-xs text-slate-500">{formatDateLabel(item.dueDate)}</p>
            </div>
          </div>
        ))}
        {visible.length === 0 ? <p className="text-sm text-slate-500">No deadlines in this window.</p> : null}
      </div>
    </SurfaceCard>
  );
}
