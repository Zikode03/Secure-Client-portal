// Friendly guide: this module (PreviousMonthComparisonCard) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import type { PreviousMonthComparison, Tone } from "../../types/portal";
import { toneToAccentClass } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

export interface MonthComparisonOption {
  id: string;
  label: string;
  currentCount: number;
  previousCount: number;
  currentMonthLabel: string;
  previousMonthLabel: string;
  message?: string;
  tone?: Tone;
}

// Shared shape notes: these types keep UI and data contracts aligned.
interface PreviousMonthComparisonCardProps {
  comparison: PreviousMonthComparison;
  comparisonOptions?: MonthComparisonOption[];
  actionLabel?: string;
  onAction?: () => void;
  onCreateFollowUps?: () => void;
  onOpenAffectedRecords?: () => void;
  title?: string;
}

function buildFallbackOption(comparison: PreviousMonthComparison): MonthComparisonOption {
  return {
    id: "invoices",
    label: "Invoices",
    currentCount: comparison.currentInvoiceCount,
    previousCount: comparison.previousInvoiceCount,
    currentMonthLabel: comparison.currentMonthLabel,
    previousMonthLabel: comparison.previousMonthLabel,
    message: comparison.message,
    tone: comparison.tone,
  };
}

function comparisonTone(currentCount: number, previousCount: number): Tone {
  if (previousCount > 0 && currentCount < previousCount * 0.5) {
    return "danger";
  }

  if (previousCount > 0 && currentCount > previousCount * 1.2) {
    return "warning";
  }

  if (currentCount === 0 && previousCount === 0) {
    return "neutral";
  }

  return "success";
}

function comparisonMessage(option: MonthComparisonOption) {
  const delta = option.currentCount - option.previousCount;

  if (delta < 0) {
    return `${option.label} volume is lower this month: ${option.currentCount} versus ${option.previousCount} last month.`;
  }

  if (delta > 0) {
    return `${option.label} volume is higher this month: ${option.currentCount} versus ${option.previousCount} last month.`;
  }

  return `${option.label} volume is tracking close to the previous month.`;
}

function roundedChartMax(value: number) {
  if (value <= 10) {
    return 10;
  }

  return Math.ceil(value / 10) * 10;
}

function buildTrendPoints(previousTotal: number, currentTotal: number) {
  const days = [1, 3, 5, 7, 10, 12, 15, 17, 20, 22, 25, 27, 30];

  return days.map((day, index) => {
    const progress = day / 30;
    const wave = index % 3 === 0 ? 0.92 : index % 3 === 1 ? 1.05 : 0.98;
    const previous = Math.round(previousTotal * Math.min(1, progress * wave));
    const current = Math.round(currentTotal * Math.min(1, progress * (index % 2 === 0 ? 1.02 : 0.96)));

    return {
      current: day === 30 ? currentTotal : current,
      day,
      previous: day === 30 ? previousTotal : previous,
    };
  });
}

// Component flow: gather data first, then render a focused UI state.
export function PreviousMonthComparisonCard({
  actionLabel,
  comparison,
  comparisonOptions,
  onAction,
  onCreateFollowUps,
  onOpenAffectedRecords,
  title = "Month Comparison",
}: PreviousMonthComparisonCardProps) {
  const availableOptions = useMemo(
    () => (comparisonOptions?.length ? comparisonOptions : [buildFallbackOption(comparison)]),
    [comparison, comparisonOptions],
  );
  const [selectedOptionId, setSelectedOptionId] = useState(availableOptions[0]?.id ?? "invoices");
  const [hoveredTrendDay, setHoveredTrendDay] = useState<number | null>(null);

  useEffect(() => {
    if (!availableOptions.some((option) => option.id === selectedOptionId)) {
      setSelectedOptionId(availableOptions[0]?.id ?? "invoices");
    }
  }, [availableOptions, selectedOptionId]);

  const selectedOption =
    availableOptions.find((option) => option.id === selectedOptionId) ?? availableOptions[0];
  const delta = selectedOption.currentCount - selectedOption.previousCount;
  const isImproved = delta >= 0;
  const deltaLabel = delta >= 0 ? `+${delta}` : delta;
  const selectedTone =
    selectedOption.tone ?? comparisonTone(selectedOption.currentCount, selectedOption.previousCount);
  const trendPoints = buildTrendPoints(selectedOption.previousCount, selectedOption.currentCount);
  const hoveredTrendPoint = trendPoints.find((point) => point.day === hoveredTrendDay) ?? null;
  const chartMax = roundedChartMax(Math.max(selectedOption.currentCount, selectedOption.previousCount, 1));
  const yAxisTicks = [chartMax, Math.round(chartMax * 0.75), Math.round(chartMax * 0.5), Math.round(chartMax * 0.25), 0];

// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="flex h-full flex-col gap-5 rounded-2xl border border-[#dce6ef] bg-white shadow-[0_16px_38px_rgba(4,24,52,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#091333]">{title}</h2>
          <p className="mt-1 text-sm text-[#53617f]">
            Compare {selectedOption.previousMonthLabel} with {selectedOption.currentMonthLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableOptions.length > 1 ? (
            <select
              aria-label="Compare document type"
              className="h-9 rounded-lg border border-[#c8d7e5] bg-white px-3 text-xs font-semibold text-[#091333] shadow-sm transition focus:border-[#8ccf45] focus:outline-none focus:ring-2 focus:ring-[#8ccf45]/25"
              onChange={(event) => setSelectedOptionId(event.target.value)}
              value={selectedOption.id}
            >
              {availableOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(selectedTone)}`}
          >
            {deltaLabel} files
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-[#fbfcff] px-4 py-3 ring-1 ring-[#e8ecf5]">
          <div>
            <p className="text-[0.78rem] font-semibold text-[#091333]">Previous month</p>
            <p className="mt-0.5 text-[0.74rem] text-[#53617f]">
              {selectedOption.previousMonthLabel} - {selectedOption.label}
            </p>
          </div>
          <span className="text-sm font-semibold text-[#091333]">{selectedOption.previousCount}</span>
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-[#fbfcff] px-4 py-3 ring-1 ring-[#e8ecf5]">
          <div>
            <p className="text-[0.78rem] font-semibold text-[#091333]">Current month</p>
            <p className="mt-0.5 text-[0.74rem] text-[#53617f]">
              {selectedOption.currentMonthLabel} - {selectedOption.label}
            </p>
          </div>
          <span className="text-sm font-semibold text-[#091333]">{selectedOption.currentCount}</span>
          <span className={`h-2 w-2 rounded-full ${isImproved ? "bg-emerald-500" : "bg-rose-500"}`} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-[#fbfcff] px-4 py-3 ring-1 ring-[#e8ecf5]">
          <div>
            <p className="text-[0.78rem] font-semibold text-[#091333]">Monthly variance</p>
            <p className="mt-0.5 text-[0.74rem] text-[#53617f]">{isImproved ? "On track" : "Needs attention"}</p>
          </div>
          <span className={`text-sm font-semibold ${isImproved ? "text-emerald-700" : "text-rose-700"}`}>
            {deltaLabel}
          </span>
          <span className={`h-2 w-2 rounded-full ${isImproved ? "bg-emerald-500" : "bg-rose-500"}`} />
        </div>
      </div>

      <div className="rounded-xl border border-[#e8ecf5] bg-[#fbfcff] p-4">
        <p className="text-sm leading-6 text-[#53617f]">
          {selectedOption.message ?? comparisonMessage(selectedOption)}
        </p>
      </div>

      <div className="rounded-xl border border-[#e8ecf5] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee]">
              <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M4 16.5 9 11l4 3.5 6-7"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M4 19h16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <div>
              <h3 className="text-[0.95rem] font-semibold text-[#091333]">Document Volume Trend</h3>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[0.72rem] font-semibold text-[#53617f]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#93c5fd]" />
                  {selectedOption.previousMonthLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#062044]" />
                  {selectedOption.currentMonthLabel}
                </span>
              </div>
            </div>
          </div>
          <select
            aria-label="Trend grouping"
            className="h-9 rounded-lg border border-[#dce6ef] bg-white px-3 text-[0.74rem] font-semibold text-[#091333] shadow-sm"
            defaultValue="day"
          >
            <option value="day">By day</option>
          </select>
        </div>

        <div className="mt-5 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
          <div className="flex h-64 flex-col justify-between text-right text-[0.68rem] font-semibold text-[#7b879e]">
            {yAxisTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>

          <div className="min-w-0">
            <div className="relative h-64 overflow-x-auto border-b border-l border-[#dce6ef] pb-1">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {yAxisTicks.map((tick) => (
                  <span className="border-t border-[#edf2f7]" key={tick} />
                ))}
              </div>

              <div
                className="relative grid h-full min-w-[760px] items-end gap-3 px-5"
                style={{ gridTemplateColumns: `repeat(${trendPoints.length}, minmax(0, 1fr))` }}
              >
                {trendPoints.map((point) => {
                  const previousHeight = `${Math.max(4, (point.previous / chartMax) * 100)}%`;
                  const currentHeight = `${Math.max(4, (point.current / chartMax) * 100)}%`;

                  return (
                    <div
                      className="flex h-full flex-col items-center justify-end gap-2"
                      key={point.day}
                      onBlur={() => setHoveredTrendDay(null)}
                      onFocus={() => setHoveredTrendDay(point.day)}
                      onMouseEnter={() => setHoveredTrendDay(point.day)}
                      onMouseLeave={() => setHoveredTrendDay(null)}
                      tabIndex={0}
                    >
                      <div className="flex h-[calc(100%-1.25rem)] w-full items-end justify-center gap-1.5">
                        <div
                          aria-label={`${selectedOption.previousMonthLabel}, day ${point.day}: ${point.previous} files`}
                          className="relative h-full w-3 rounded-t-md bg-[#93c5fd]/75"
                          style={{ height: previousHeight }}
                        >
                          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#93c5fd] ring-2 ring-white" />
                        </div>
                        <div
                          aria-label={`${selectedOption.currentMonthLabel}, day ${point.day}: ${point.current} files`}
                          className="relative h-full w-3 rounded-t-md bg-[#062044]"
                          style={{ height: currentHeight }}
                        >
                          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#062044] ring-2 ring-white" />
                        </div>
                      </div>
                      <span className="h-4 text-[0.68rem] font-semibold text-[#53617f]">{point.day}</span>
                    </div>
                  );
                })}
              </div>

              {hoveredTrendPoint ? (
                <div className="pointer-events-none absolute right-5 top-5 z-10 min-w-[190px] rounded-xl border border-[#dce6ef] bg-white px-4 py-3 text-left shadow-[0_18px_38px_rgba(15,23,42,0.14)]">
                  <p className="text-[0.72rem] font-semibold text-[#091333]">
                    {hoveredTrendPoint.day} {selectedOption.currentMonthLabel}
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-4 text-[0.74rem]">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#53617f]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#062044]" />
                        {selectedOption.currentMonthLabel}
                      </span>
                      <span className="font-semibold text-[#091333]">{hoveredTrendPoint.current} files</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[0.74rem]">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#53617f]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#93c5fd]" />
                        {selectedOption.previousMonthLabel}
                      </span>
                      <span className="font-semibold text-[#091333]">{hoveredTrendPoint.previous} files</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-2 text-center text-[0.72rem] font-semibold text-[#53617f]">Day of month</div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && onAction ? (
          <button
            className="client-dashboard-action-button h-8 w-28 rounded-lg px-2 text-[0.76rem] font-semibold"
            onClick={onAction}
            type="button"
          >
            Open docs
          </button>
        ) : null}
        <button
          className="client-dashboard-action-button h-8 w-28 rounded-lg px-2 text-[0.76rem] font-semibold"
          onClick={onOpenAffectedRecords}
          type="button"
        >
          Records
        </button>
        <button
          className="client-dashboard-action-button h-8 w-28 rounded-lg px-2 text-[0.76rem] font-semibold"
          onClick={onCreateFollowUps}
          type="button"
        >
          Follow-ups
        </button>
      </div>
    </SurfaceCard>
  );
}
