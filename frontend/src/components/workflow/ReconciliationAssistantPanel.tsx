import type { ReconciliationIssue } from "../../types/portal";
import { formatDateLabel, toneToAccentClass } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

interface ReconciliationAssistantPanelProps {
  items: ReconciliationIssue[];
  title?: string;
  description?: string;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
}

export function ReconciliationAssistantPanel({
  description = "The assistant compares invoice activity against bank transactions and flags gaps that need a human check.",
  headerActionLabel,
  items,
  onHeaderAction,
  title = "Auto-Reconciliation Assistant",
}: ReconciliationAssistantPanelProps) {
  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">{description}</p>
        </div>
        {headerActionLabel && onHeaderAction ? (
          <span>
            <button
              className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={onHeaderAction}
              type="button"
            >
              {headerActionLabel}
            </button>
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.amountLabel}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.counterparty} / {item.reference}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${toneToAccentClass(item.tone)}`}
                >
                  {formatDateLabel(item.transactionDate)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.message}</p>
              <p className="mt-3 text-sm text-slate-500">{item.suggestedAction}</p>
              {item.matchedInvoiceNumber ? (
                <p className="mt-2 text-sm text-slate-400">
                  Closest invoice: {item.matchedInvoiceNumber}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            No reconciliation gaps are currently flagged.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
