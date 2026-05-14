// Friendly guide: this module (ComplianceClientStatusTable) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ComplianceClientStatus } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ComplianceClientStatusTableProps {
  items: ComplianceClientStatus[];
}

// Component flow: gather data first, then render a focused UI state.
export function ComplianceClientStatusTable({ items }: ComplianceClientStatusTableProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Compliance Status Per Client</h2>
          <p className="mt-1 text-sm text-slate-500">
            Short client view of score, expired files, expiring items, and missing required records.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
              <th className="pb-3 font-medium">Client</th>
              <th className="pb-3 font-medium">Score</th>
              <th className="pb-3 font-medium">Expired</th>
              <th className="pb-3 font-medium">Expiring</th>
              <th className="pb-3 font-medium">Missing required</th>
              <th className="pb-3 font-medium">Report ready</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-b border-slate-100 last:border-b-0" key={item.id}>
                <td className="py-4 pr-4 text-sm font-semibold text-slate-950">{item.clientName}</td>
                <td className="py-4 pr-4 text-sm text-slate-500">{item.score}%</td>
                <td className="py-4 pr-4 text-sm text-slate-500">{item.expiredCount}</td>
                <td className="py-4 pr-4 text-sm text-slate-500">{item.expiringSoonCount}</td>
                <td className="py-4 pr-4 text-sm text-slate-500">{item.missingRequiredCount}</td>
                <td className="py-4 text-sm text-slate-500">{formatDateLabel(item.reportReadyAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}