import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { ExpiringDocumentsPanel } from "../../components/workflow/ExpiringDocumentsPanel";
import { LatestRecordsTable } from "../../components/workflow/LatestRecordsTable";
import { MissingDocumentsPanel } from "../../components/workflow/MissingDocumentsPanel";
import { MonthlyPackChecklist } from "../../components/workflow/MonthlyPackChecklist";
import { PreviousMonthComparisonCard } from "../../components/workflow/PreviousMonthComparisonCard";
import { ReconciliationAssistantPanel } from "../../components/workflow/ReconciliationAssistantPanel";
import { RejectedDocumentsPanel } from "../../components/workflow/RejectedDocumentsPanel";
import { SmartAlertsPanel } from "../../components/workflow/SmartAlertsPanel";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type { MonthlyDocumentSlot } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

export function ClientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uploadModal = useDisclosure(false);
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
  const {
    activity,
    expiringDocuments,
    feedbackMessage,
    finaliseInvoice,
    latestInvoices,
    latestOverallDocuments,
    latestUploadedDocuments,
    missingRequiredDocuments,
    monthPack,
    previousMonthComparison,
    reconciliationIssues,
    rejectedDocuments,
    setFeedbackMessage,
    smartAlerts,
    submitMonth,
    summaryMetrics,
    triggerDownload,
    triggerView,
    uploadToSlot,
  } = useClientWorkflow({
    clientId: user?.clientIds[0],
    clientName: user?.company,
    uploadedBy: user?.fullName ?? user?.name,
  });

  const highlightedMissingSlot = useMemo(
    () =>
      monthPack.slots.find(
        (slot) =>
          slot.isRequired &&
          !["uploaded", "under_review", "accepted"].includes(slot.status),
      ) ?? monthPack.slots[0],
    [monthPack.slots],
  );

  function handleOpenUpload(slot: MonthlyDocumentSlot) {
    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handleOpenUploadById(slotId: string) {
    const slot = monthPack.slots.find((item) => item.id === slotId);
    if (!slot) {
      return;
    }

    handleOpenUpload(slot);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => handleOpenUpload(highlightedMissingSlot)}>
              Upload missing document
            </Button>
            <Button onClick={() => navigate("/client/packs")} variant="ghost">
              Open packs
            </Button>
            <Button disabled={!monthPack.canComplete} onClick={submitMonth} variant="secondary">
              Submit month
            </Button>
          </>
        }
        description="This dashboard enforces a controlled accounting workflow: required checklist slots, blocked submission until complete, invoice lifecycle tracking, expiry monitoring, and month-over-month comparison."
        eyebrow="Client workspace"
        title="Monthly document control"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <MonthlyPackChecklist
          onSubmitMonth={submitMonth}
          onUpload={handleOpenUpload}
          pack={monthPack}
        />

        <div className="space-y-6">
          <MissingDocumentsPanel
            items={missingRequiredDocuments}
            onUpload={handleOpenUploadById}
          />
          <ExpiringDocumentsPanel items={expiringDocuments} />
          <RejectedDocumentsPanel items={rejectedDocuments} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PreviousMonthComparisonCard comparison={previousMonthComparison} />

        <div className="space-y-6">
          <SmartAlertsPanel items={smartAlerts} />
          <ReconciliationAssistantPanel items={reconciliationIssues} />
        </div>
      </section>

      <SurfaceCard className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Recent Activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Workflow activity shows what changed, when it changed, and why it matters.
            </p>
          </div>
          <Button onClick={() => setFeedbackMessage("Activity feed reviewed.")} variant="ghost">
            Acknowledge
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {activity.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
              <p className="mt-3 text-sm text-slate-400">{formatDateLabel(item.timestamp)}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <section className="space-y-6">
        <LatestRecordsTable
          description="Latest 10 uploaded documents with workflow-aware status and quick actions."
          items={latestUploadedDocuments}
          onComment={() => navigate("/client/messages")}
          onDownload={triggerDownload}
          onView={triggerView}
          title="Latest 10 Uploaded Documents"
        />

        <LatestRecordsTable
          description="Latest 10 invoices with lifecycle state from Draft through Accepted or Rejected."
          items={latestInvoices}
          onComment={() => navigate("/client/messages")}
          onDownload={triggerDownload}
          onFinaliseInvoice={finaliseInvoice}
          onView={triggerView}
          title="Latest 10 Invoices"
        />

        <LatestRecordsTable
          description="Latest 15 overall records across uploaded documents and invoices."
          items={latestOverallDocuments}
          onComment={() => navigate("/client/messages")}
          onDownload={triggerDownload}
          onView={triggerView}
          title="Latest 15 Overall Documents"
        />
      </section>

      <DocumentUploadModal
        clientName={user?.company ?? "Apex Trading Ltd"}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={uploadToSlot}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
