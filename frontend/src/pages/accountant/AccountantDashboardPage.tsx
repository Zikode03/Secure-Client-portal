import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { ExpiringDocumentsPanel } from "../../components/workflow/ExpiringDocumentsPanel";
import { LatestRecordsTable } from "../../components/workflow/LatestRecordsTable";
import { MissingDocumentsPanel } from "../../components/workflow/MissingDocumentsPanel";
import { ReconciliationAssistantPanel } from "../../components/workflow/ReconciliationAssistantPanel";
import { RejectedDocumentsPanel } from "../../components/workflow/RejectedDocumentsPanel";
import { SmartAlertsPanel } from "../../components/workflow/SmartAlertsPanel";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function AccountantDashboardPage() {
  const portal = usePortal();
  const data = portal.accountantDashboard;
  const navigate = useNavigate();

  function handleExportView() {
    downloadCsv("accountant-portfolio-view.csv", [
      ["Client Name", "Month", "Progress %", "Status", "Assigned Accountant"],
      ...data.portfolio.map((row) => [
        row.clientName,
        row.monthLabel,
        String(row.progressPercent),
        row.status,
        row.assignedAccountant,
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate("/accountant/review")}>Open review desk</Button>
            <Button onClick={() => navigate("/accountant/follow-ups")} variant="secondary">
              Run client follow-up list
            </Button>
          </>
        }
        description="This view surfaces completeness, accuracy, timeliness, and compliance risk across the portfolio, then gives the accountant a direct route into the work that resolves it."
        eyebrow="Accountant operations"
        title="Document control dashboard"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <SurfaceCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Client month pack table</h2>
              <p className="mt-1 text-sm text-slate-500">
                Portfolio view of monthly progress, missing documents, and assigned ownership.
              </p>
            </div>
            <Button onClick={handleExportView} variant="ghost">
              Export view
            </Button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <th className="pb-3 font-medium">Client name</th>
                  <th className="pb-3 font-medium">Month</th>
                  <th className="pb-3 font-medium">Progress %</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Assigned accountant</th>
                </tr>
              </thead>
              <tbody>
                {data.portfolio.map((row) => (
                  <tr
                    className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                    key={row.id}
                    onClick={() => navigate(`/accountant/clients/firm-client-${row.id.split("-").pop()}`)}
                  >
                    <td className="py-4 pr-4 align-top">
                      <p className="text-sm font-semibold text-slate-950">{row.clientName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {row.missingCount} missing / {row.overdueCount} overdue
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-500">{row.monthLabel}</td>
                    <td className="py-4 pr-4">
                      <div className="min-w-[180px] space-y-2">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{row.progressPercent}%</span>
                          <span>Due {row.deadline}</span>
                        </div>
                        <ProgressBar value={row.progressPercent} />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-4 text-sm text-slate-500">{row.assignedAccountant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Review queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Documents and invoices waiting for an accountant decision.
                </p>
              </div>
              <Button onClick={() => navigate("/accountant/review")} variant="ghost">
                Go to desk
              </Button>
            </div>
            <div className="space-y-3">
              {data.reviewQueue.map((item) => (
                <button
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                  key={item.id}
                  onClick={() => navigate("/accountant/review")}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.clientName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.documentType} / {item.monthLabel}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    Submitted {formatDateLabel(item.submittedAt)}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Deadline watch</h2>
              <p className="mt-1 text-sm text-slate-500">
                Today&apos;s exceptions across the portfolio.
              </p>
            </div>
            <div className="space-y-3">
              {data.deadlines.map((item) => (
                <button
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                  key={item.id}
                  onClick={() => navigate("/accountant/follow-ups")}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <StatusBadge
                      status={
                        item.tone === "danger"
                          ? "late"
                          : item.tone === "warning"
                            ? "due"
                            : "on_track"
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.owner}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Due {formatDateLabel(item.dueDate)}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SmartAlertsPanel
          description="These alerts highlight unusual client workflow patterns that need accountant judgment."
          items={data.smartAlerts}
          title="Portfolio Smart Alerts"
        />
        <ReconciliationAssistantPanel
          description="Provisional bank-to-invoice checks across the portfolio that still need follow-up."
          items={data.reconciliationIssues}
          title="Reconciliation Flags"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <MissingDocumentsPanel
          actionLabel="Open month pack"
          items={data.missingDocuments}
          onActionItem={() => navigate("/accountant/clients/firm-client-1?tab=packs")}
        />
        <ExpiringDocumentsPanel
          actionLabel="Open exceptions"
          items={data.expiringDocuments}
          onActionItem={() => navigate("/accountant/compliance-exceptions")}
        />
        <RejectedDocumentsPanel
          actionLabel="Open review"
          items={data.rejectedDocuments}
          onActionItem={() => navigate("/accountant/review")}
        />
      </section>

      <LatestRecordsTable
        description="Latest overall document and invoice activity across the accountant portfolio."
        items={data.latestOverallDocuments}
        onComment={() => navigate("/accountant/messages")}
        onDownload={(recordName) => downloadCsv("record-download.csv", [["Record"], [recordName]])}
        onView={() => navigate("/accountant/documents")}
        title="Latest 15 Overall Documents"
      />
    </div>
  );
}
