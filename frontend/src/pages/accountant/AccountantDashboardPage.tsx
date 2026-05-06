import { useMemo } from "react";
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
import type { PortfolioRow } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function portfolioRank(row: PortfolioRow) {
  const statusScore =
    row.status === "overdue" ? 3 : row.status === "attention" ? 2 : 1;
  return statusScore * 100 + row.missingCount * 10 + row.overdueCount;
}

export function AccountantDashboardPage() {
  const portal = usePortal();
  const data = portal.accountantDashboard;
  const navigate = useNavigate();

  const priorityClients = useMemo(
    () =>
      [...data.portfolio]
        .sort((left, right) => portfolioRank(right) - portfolioRank(left))
        .slice(0, 6),
    [data.portfolio],
  );

  const reviewQueuePreview = useMemo(() => data.reviewQueue.slice(0, 4), [data.reviewQueue]);
  const deadlinePreview = useMemo(() => data.deadlines.slice(0, 4), [data.deadlines]);
  const recentRecords = useMemo(
    () => data.latestOverallDocuments.slice(0, 6),
    [data.latestOverallDocuments],
  );

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

  function openClientWorkspace(row: PortfolioRow) {
    navigate(`/accountant/clients/${row.clientId}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate("/accountant/review")}>Review queue</Button>
            <Button onClick={() => navigate("/accountant/follow-ups")} variant="secondary">
              Follow-ups
            </Button>
          </>
        }
        description="Triage the portfolio, act on review work, and clear the exceptions that block month-end progress."
        eyebrow="Accountant operations"
        title="Portfolio triage"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <SurfaceCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Priority client queue</h2>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Focus the team on the clients with the highest completeness and deadline risk.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/accountant/clients")} size="sm" variant="secondary">
                Open portfolio
              </Button>
              <Button onClick={handleExportView} size="sm" variant="ghost">
                Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[0.68rem] uppercase tracking-[0.16em] text-slate-400">
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Pack health</th>
                  <th className="pb-3 font-medium">Due</th>
                  <th className="pb-3 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {priorityClients.map((row) => (
                  <tr
                    className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                    key={row.id}
                    onClick={() => openClientWorkspace(row)}
                  >
                    <td className="py-3.5 pr-4 align-top">
                      <p className="text-[0.9rem] font-semibold text-slate-950">{row.clientName}</p>
                      <p className="mt-1 text-[0.8rem] text-slate-500">
                        {row.missingCount} missing / {row.overdueCount} overdue
                      </p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="min-w-[170px] space-y-2">
                        <div className="flex items-center justify-between text-[0.8rem] text-slate-600">
                          <span>{row.monthLabel}</span>
                          <span>{row.progressPercent}%</span>
                        </div>
                        <ProgressBar value={row.progressPercent} />
                        <StatusBadge status={row.status} />
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[0.84rem] text-slate-500">
                      {row.deadline}
                    </td>
                    <td className="py-3.5 text-[0.84rem] text-slate-500">
                      {row.assignedAccountant}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <div className="space-y-5">
          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Review queue</h2>
                <p className="mt-1 text-[0.84rem] text-slate-500">
                  Work waiting for an accountant decision right now.
                </p>
              </div>
              <Button onClick={() => navigate("/accountant/review")} size="sm" variant="ghost">
                Open
              </Button>
            </div>
            <div className="space-y-2.5">
              {reviewQueuePreview.map((item) => (
                <button
                  className="w-full rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-brand-200 hover:bg-brand-50"
                  key={item.id}
                  onClick={() => navigate("/accountant/review")}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.88rem] font-semibold text-slate-950">
                        {item.clientName}
                      </p>
                      <p className="mt-1 text-[0.8rem] text-slate-500">
                        {item.documentType} / {item.monthLabel}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-[0.78rem] text-slate-400">
                    Submitted {formatDateLabel(item.submittedAt)}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Today&apos;s follow-ups</h2>
                <p className="mt-1 text-[0.84rem] text-slate-500">
                  Exceptions that need outreach or accountant attention today.
                </p>
              </div>
              <Button
                onClick={() => navigate("/accountant/follow-ups")}
                size="sm"
                variant="ghost"
              >
                Open
              </Button>
            </div>
            <div className="space-y-2.5">
              {deadlinePreview.map((item) => (
                <button
                  className="w-full rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-brand-200 hover:bg-brand-50"
                  key={item.id}
                  onClick={() => navigate("/accountant/follow-ups")}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[0.88rem] font-semibold text-slate-950">{item.label}</p>
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
                  <p className="mt-2 text-[0.8rem] text-slate-500">{item.owner}</p>
                  <p className="mt-1 text-[0.78rem] text-slate-400">
                    Due {formatDateLabel(item.dueDate)}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SmartAlertsPanel
          description="Workflow anomalies worth human judgment before they become client follow-ups."
          headerActionLabel="View all"
          items={data.smartAlerts.slice(0, 4)}
          onHeaderAction={() => navigate("/accountant/documents")}
          title="Workflow anomalies"
        />
        <ReconciliationAssistantPanel
          description="Unmatched or unusual bank-to-invoice signals that need review."
          headerActionLabel="View all"
          items={data.reconciliationIssues.slice(0, 4)}
          onHeaderAction={() => navigate("/accountant/documents")}
          title="Reconciliation gaps"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <MissingDocumentsPanel
          actionLabel="Open client"
          headerActionLabel="View all"
          items={data.missingDocuments.slice(0, 4)}
          onActionItem={() => navigate("/accountant/clients/firm-client-1?tab=packs")}
          onHeaderAction={() => navigate("/accountant/clients")}
        />
        <ExpiringDocumentsPanel
          actionLabel="Open exceptions"
          headerActionLabel="View all"
          items={data.expiringDocuments.slice(0, 4)}
          onActionItem={() => navigate("/accountant/compliance-exceptions")}
          onHeaderAction={() => navigate("/accountant/compliance-exceptions")}
        />
        <RejectedDocumentsPanel
          actionLabel="Open review"
          headerActionLabel="View all"
          items={data.rejectedDocuments.slice(0, 4)}
          onActionItem={() => navigate("/accountant/review")}
          onHeaderAction={() => navigate("/accountant/review")}
        />
      </section>

      <LatestRecordsTable
        description="Recent document and invoice movement across the portfolio."
        headerActionLabel="View all"
        items={recentRecords}
        onComment={() => navigate("/accountant/messages")}
        onDownload={(recordName) => downloadCsv("record-download.csv", [["Record"], [recordName]])}
        onHeaderAction={() => navigate("/accountant/documents")}
        onView={() => navigate("/accountant/documents")}
        title="Recent portfolio records"
      />
    </div>
  );
}
