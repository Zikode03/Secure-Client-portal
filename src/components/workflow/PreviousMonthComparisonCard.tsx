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

      <div className="mt-auto grid gap-2.5">
        {actionLabel && onAction ? (
          <button
            className="client-dashboard-action-button h-10 rounded-xl px-3.5 text-sm font-semibold"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
        <button
          className="client-dashboard-action-button h-10 rounded-xl px-3.5 text-sm font-semibold"
          onClick={onOpenAffectedRecords}
          type="button"
        >
          Open affected records
        </button>
        <button
          className="client-dashboard-action-button h-10 rounded-xl px-3.5 text-sm font-semibold"
          onClick={onCreateFollowUps}
          type="button"
        >
          Create follow-ups
        </button>
      </div>
    </SurfaceCard>
  );
}
