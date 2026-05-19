// Friendly guide: this module (FirmComplianceCalendarPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

// Shared shape notes: these types keep UI and data contracts aligned.
type CalendarView = "month" | "week";

interface DeadlineItem {
  id: string;
  clientName: string;
  label: string;
  dueDate: string;
  type: "filing" | "expiry";
}

interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: DeadlineItem[];
}

function atMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(date);
}

function weekDayLabels() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function startOfGrid(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  return atMidnight(start);
}

function buildMonthGrid(monthDate: Date, events: DeadlineItem[]): CalendarCell[] {
  const today = atMidnight(new Date());
  const start = startOfGrid(monthDate);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dayEvents = events.filter((event) => sameDate(new Date(event.dueDate), current));
    cells.push({
      date: current,
      inCurrentMonth: current.getMonth() === monthDate.getMonth(),
      isToday: sameDate(current, today),
      events: dayEvents,
    });
  }

  return cells;
}

export function FirmComplianceCalendarPage() {
  const portal = usePortal();
  const [view, setView] = useState<CalendarView>("month");
  const [activeMonth, setActiveMonth] = useState(() => atMidnight(new Date()));

  const deadlines = useMemo<DeadlineItem[]>(() => {
    const filingItems =
      portal.accountantComplianceCentre.clientStatuses?.flatMap((client) =>
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

  const monthGrid = useMemo(() => buildMonthGrid(activeMonth, deadlines), [activeMonth, deadlines]);

  const upcoming = useMemo(() => {
    const today = atMidnight(new Date()).getTime();
    const windowDays = view === "week" ? 7 : 31;
    const end = today + windowDays * 24 * 60 * 60 * 1000;
    return deadlines
      .filter((item) => {
        const ts = new Date(item.dueDate).getTime();
        return ts >= today && ts <= end;
      })
      .slice(0, 10);
  }, [deadlines, view]);

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Compliance Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Plan filings and renewals with a true calendar view.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm ${view === "month" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setView("month")}
            type="button"
          >
            Month
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm ${view === "week" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setView("week")}
            type="button"
          >
            Upcoming
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-4 shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() =>
                setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
              }
              type="button"
            >
              Prev
            </button>
            <p className="text-lg font-semibold text-slate-950">{monthLabel(activeMonth)}</p>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() =>
                setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
              }
              type="button"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDayLabels().map((label) => (
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400" key={label}>
                {label}
              </div>
            ))}
            {monthGrid.map((cell) => (
              <div
                className={`min-h-[120px] rounded-xl border p-2 ${
                  cell.inCurrentMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/70"
                }`}
                key={cell.date.toISOString()}
              >
                <p
                  className={`mb-2 text-xs font-semibold ${
                    cell.isToday
                      ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white"
                      : cell.inCurrentMonth
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  {cell.date.getDate()}
                </p>
                <div className="space-y-1">
                  {cell.events.slice(0, 2).map((event) => (
                    <div
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                        event.type === "filing" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
                      }`}
                      key={event.id}
                      title={`${event.clientName} - ${event.label}`}
                    >
                      {event.label}
                    </div>
                  ))}
                  {cell.events.length > 2 ? (
                    <p className="text-[11px] font-medium text-slate-500">+{cell.events.length - 2} more</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-none">
          <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Agenda
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">
                {view === "week" ? "This Week" : "This Month"}
              </h2>
            </div>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
              {upcoming.length} items
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {upcoming.map((item) => (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3" key={item.id}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.type === "filing" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.type === "filing" ? "Filing" : "Expiry"}
                  </span>
                  <span className="text-xs text-slate-500">{formatDateLabel(item.dueDate)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.clientName}</p>
              </div>
            ))}
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No deadlines in this window.</p>
            ) : null}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
