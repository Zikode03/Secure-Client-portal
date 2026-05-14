// Friendly guide: this module (ComplianceReportPanel) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ComplianceReportPanelProps {
  generatedAt: string;
  onDownload: () => void;
}

// Component flow: gather data first, then render a focused UI state.
export function ComplianceReportPanel({
  generatedAt,
  onDownload,
}: ComplianceReportPanelProps) {
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Downloadable Compliance Report</h2>
        <p className="mt-1 text-sm text-slate-500">
          Export a compact report showing compliance score, expired documents, expiring items, missing requirements, and audit context.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">Latest report</p>
        <p className="mt-2 text-sm text-slate-500">
          Generated {formatDateLabel(generatedAt)}
        </p>
      </div>

      <Button onClick={onDownload}>Download compliance report</Button>
    </SurfaceCard>
  );
}