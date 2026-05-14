// Friendly guide: this module (LatestRecordsTable) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { InvoiceStatus, LatestRecordItem } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface LatestRecordsTableProps {
  title: string;
  description: string;
  items: LatestRecordItem[];
  onView: (recordName: string) => void;
  onDownload: (recordName: string) => void;
  onComment?: (recordName: string) => void;
  onFinaliseInvoice?: (invoiceId: string) => void;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
}

// Component flow: gather data first, then render a focused UI state.
function canFinalise(status: InvoiceStatus) {
  return status === "draft" || status === "uploaded" || status === "finalised";
}

export function LatestRecordsTable({
  description,
  items,
  onComment,
  onDownload,
  onFinaliseInvoice,
  onHeaderAction,
  onView,
  title,
  headerActionLabel,
}: LatestRecordsTableProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerActionLabel && onHeaderAction ? (
            <Button onClick={onHeaderAction} size="sm" variant="ghost">
              {headerActionLabel}
            </Button>
          ) : null}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {items.length} items
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No records are available in this view yet.
          </div>
        ) : (
          <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-b border-slate-100 last:border-b-0" key={item.id}>
                  <td className="py-4 pr-4 align-top">
                    <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                    {item.clientName ? (
                      <p className="mt-1 text-sm text-slate-500">{item.clientName}</p>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-500">
                    {item.type}
                    {item.amountLabel ? (
                      <p className="mt-1 text-sm text-slate-400">{item.amountLabel}</p>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-500">{formatDateLabel(item.date)}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => onView(item.name)} size="sm" variant="ghost">
                        View
                      </Button>
                      <Button onClick={() => onDownload(item.name)} size="sm" variant="secondary">
                        Download
                      </Button>
                      {onComment ? (
                        <Button onClick={() => onComment(item.name)} size="sm" variant="secondary">
                          Comment
                        </Button>
                      ) : null}
                      {item.kind === "invoice" &&
                      onFinaliseInvoice &&
                      canFinalise(item.status as InvoiceStatus) ? (
                        <Button
                          onClick={() => onFinaliseInvoice(item.id)}
                          size="sm"
                          variant="primary"
                        >
                          Finalise & send
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SurfaceCard>
  );
}