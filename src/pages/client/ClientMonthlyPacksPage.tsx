// Friendly guide: this module (ClientMonthlyPacksPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CloudUpload,
  FileText,
  Inbox,
  Send,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { MonthlyPackChecklist } from "../../components/workflow/MonthlyPackChecklist";
import {
  PreviousMonthComparisonCard,
  type MonthComparisonOption,
} from "../../components/workflow/PreviousMonthComparisonCard";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type { MonthlyDocumentSlot } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

// Component flow: gather data first, then render a focused UI state.
function downloadSlotFile(slot: MonthlyDocumentSlot, clientName: string) {
  const fileName = slot.acceptedFiles[0] ?? slot.autoName;
  const content = [
    `Client: ${clientName}`,
    `Document Type: ${slot.documentType}`,
    `Period: ${slot.month} ${slot.year}`,
    `Status: ${slot.status}`,
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

const readyStatuses = new Set<MonthlyDocumentSlot["status"]>([
  "draft",
  "uploaded",
  "under_review",
  "accepted",
  "filed",
]);

const blockingStatuses = new Set<MonthlyDocumentSlot["status"]>([
  "missing",
  "partial",
  "pending",
  "pending_signature",
  "rejected",
]);

const panelClass =
  "rounded-2xl border border-[#dce6ef] bg-white shadow-[0_16px_38px_rgba(4,24,52,0.08)]";

function normaliseDocumentType(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function comparisonOptionId(value: string) {
  return normaliseDocumentType(value).replace(/\s+/g, "-") || "documents";
}

function PriorityAction({
  action,
  helper,
  icon,
  label,
  onClick,
}: {
  action: string;
  helper: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#e8ecf5] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(4,24,52,0.04)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#091333]">{label}</p>
          <p className="mt-0.5 truncate text-[0.78rem] text-[#53617f]">{helper}</p>
        </div>
      </div>
      <button
        className="client-dashboard-action-button h-9 min-w-16 shrink-0 rounded-lg px-3 text-[0.78rem] font-semibold"
        onClick={onClick}
        type="button"
      >
        {action}
      </button>
    </div>
  );
}

function blockerSummaryText(missingCount: number, rejectedCount: number) {
  if (missingCount > 0 && rejectedCount > 0) {
    return `${missingCount} required document${missingCount === 1 ? " is" : "s are"} missing and ${rejectedCount} document${rejectedCount === 1 ? " was" : "s were"} rejected.`;
  }

  if (missingCount > 0) {
    return `${missingCount} required document${missingCount === 1 ? " is" : "s are"} still missing.`;
  }

  if (rejectedCount > 0) {
    return `${rejectedCount} document${rejectedCount === 1 ? " was" : "s were"} rejected and must be corrected.`;
  }

  return "All required documents are ready for accountant review.";
}

export function ClientMonthlyPacksPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const uploadModal = useDisclosure(false);
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const {
    clientName,
    documents,
    dismissFeedbackNotice,
    feedbackNotice,
    invoices = [],
    monthPack,
    previousMonthComparison,
    showFeedbackNotice,
    submitMonth,
    uploadToSlot,
  } = useClientWorkflow({
    clientId: user?.clientIds[0],
    clientName: user?.company,
    uploadedBy: user?.fullName ?? user?.name,
  });

  const requiredSlots = useMemo(
    () => monthPack.slots.filter((slot) => slot.isRequired),
    [monthPack.slots],
  );

  const blockingSlots = useMemo(
    () => requiredSlots.filter((slot) => blockingStatuses.has(slot.status)),
    [requiredSlots],
  );

  const missingRequiredCount = useMemo(
    () => blockingSlots.filter((slot) => slot.status !== "rejected").length,
    [blockingSlots],
  );

  const rejectedRequiredCount = useMemo(
    () => blockingSlots.filter((slot) => slot.status === "rejected").length,
    [blockingSlots],
  );

  const readyRequiredCount = useMemo(
    () => requiredSlots.filter((slot) => readyStatuses.has(slot.status)).length,
    [requiredSlots],
  );

  const progressPercent = useMemo(() => {
    if (monthPack.totalCount === 0) {
      return 0;
    }

    return Math.round((readyRequiredCount / monthPack.totalCount) * 100);
  }, [monthPack.totalCount, readyRequiredCount]);

  const dueDaysRemaining = useMemo(() => {
    const difference = new Date(monthPack.dueDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(difference / 86_400_000));
  }, [monthPack.dueDate]);

  const highlightedSlot = useMemo(
    () =>
      blockingSlots.find((slot) => slot.status === "rejected") ??
      blockingSlots.find((slot) => slot.status === "missing") ??
      blockingSlots.find((slot) => slot.status === "partial") ??
      blockingSlots.find((slot) => slot.status === "pending_signature") ??
      blockingSlots[0] ??
      requiredSlots[0] ??
      monthPack.slots[0] ??
      null,
    [blockingSlots, monthPack.slots, requiredSlots],
  );
  const existingSlotFileNames = useMemo(() => {
    if (!selectedSlot) {
      return [];
    }

    const targetMonthLabel = `${selectedSlot.month} ${selectedSlot.year}`;
    const documentFileNames = documents
      .filter(
        (document) =>
          document.documentType === selectedSlot.documentType &&
          document.monthLabel === targetMonthLabel,
      )
      .map((document) => document.fileName);
    const invoiceFileNames =
      selectedSlot.documentType.toLowerCase().includes("invoice")
        ? invoices
            .filter((invoice) => invoice.monthLabel === targetMonthLabel)
            .map((invoice) => invoice.fileName)
        : [];

    return [...documentFileNames, ...invoiceFileNames];
  }, [documents, invoices, selectedSlot]);

  const submissionState = useMemo(() => {
    if (monthPack.submissionStatus === "under_accountant_review") {
      return {
        label: "Under Review",
        tone: "info" as const,
        bannerTitle: "This pack has been submitted.",
        bannerMessage: "The monthly pack is awaiting accountant review.",
        statusHelper: "Awaiting accountant review",
      };
    }

    if (monthPack.canComplete) {
      return {
        label: "Ready",
        tone: "success" as const,
        bannerTitle: "This pack is ready.",
        bannerMessage: "All required documents are ready for accountant review.",
        statusHelper: "Ready for submission",
      };
    }

    return {
      label: "Not Ready",
      tone: "warning" as const,
      bannerTitle: "This pack is not ready.",
      bannerMessage: blockerSummaryText(missingRequiredCount, rejectedRequiredCount),
      statusHelper: "Fix blockers to enable submission",
    };
  }, [missingRequiredCount, monthPack.canComplete, monthPack.submissionStatus, rejectedRequiredCount]);

  const monthComparisonOptions = useMemo<MonthComparisonOption[]>(() => {
    const currentMonthLabel = previousMonthComparison.currentMonthLabel;
    const previousMonthLabel = previousMonthComparison.previousMonthLabel;
    const uniqueDocumentTypes = Array.from(
      new Set(monthPack.slots.map((slot) => slot.documentType)),
    );
    const nonInvoiceDocuments = documents.filter(
      (document) => !normaliseDocumentType(document.documentType).includes("invoice"),
    );

    function countDocuments(documentType: string, monthLabel: string) {
      const normalisedType = normaliseDocumentType(documentType);

      if (normalisedType.includes("invoice")) {
        return monthLabel === currentMonthLabel
          ? previousMonthComparison.currentInvoiceCount
          : previousMonthComparison.previousInvoiceCount;
      }

      return nonInvoiceDocuments.filter(
        (document) =>
          document.monthLabel === monthLabel &&
          normaliseDocumentType(document.documentType) === normalisedType,
      ).length;
    }

    const allDocumentsOption: MonthComparisonOption = {
      id: "all-documents",
      label: "All documents",
      currentMonthLabel,
      previousMonthLabel,
      currentCount:
        previousMonthComparison.currentInvoiceCount +
        nonInvoiceDocuments.filter((document) => document.monthLabel === currentMonthLabel).length,
      previousCount:
        previousMonthComparison.previousInvoiceCount +
        nonInvoiceDocuments.filter((document) => document.monthLabel === previousMonthLabel).length,
    };

    const documentTypeOptions = uniqueDocumentTypes.map<MonthComparisonOption>((documentType) => {
      const currentCount = countDocuments(documentType, currentMonthLabel);
      const previousCount = countDocuments(documentType, previousMonthLabel);
      const isInvoiceType = normaliseDocumentType(documentType).includes("invoice");

      return {
        id: comparisonOptionId(documentType),
        label: documentType,
        currentMonthLabel,
        previousMonthLabel,
        currentCount,
        previousCount,
        message: isInvoiceType ? previousMonthComparison.message : undefined,
        tone: isInvoiceType ? previousMonthComparison.tone : undefined,
      };
    });

    return [allDocumentsOption, ...documentTypeOptions];
  }, [documents, monthPack.slots, previousMonthComparison]);

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    if (location.hash !== "#pack-checklist") {
      return;
    }

    const target = document.getElementById("pack-checklist");
    if (!target) {
      return;
    }

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  function handleOpenUpload(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      showFeedbackNotice("danger", "No slot selected", "Choose a checklist slot before uploading.");
      return;
    }

    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handleOpenChecklist() {
    document.getElementById("pack-checklist")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDownloadSlot(slot: MonthlyDocumentSlot) {
    const businessName = clientName ?? user?.company ?? "Apex Trading Ltd";
    downloadSlotFile(slot, businessName);
    showFeedbackNotice("success", "Download started", `${slot.documentType} was prepared for download.`);
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 pb-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-2 pt-1">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
            Monthly Packs
          </p>
          <h1 className="text-[2.05rem] font-semibold tracking-tight text-[#091333]">
            {monthPack.monthLabel}
          </h1>
          <p className="max-w-2xl text-[0.96rem] leading-7 text-[#53617f]">
            Track, manage, and submit your monthly documents. Stay on top of requirements and keep your compliance up to date.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto lg:justify-end">
          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce6ef] bg-white px-4 text-sm font-semibold text-[#091333] shadow-sm">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-700" />
            {monthPack.monthLabel}
          </div>
          <Button
            className="h-10 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(4,24,52,0.16)] hover:bg-brand-800"
            disabled={monthPack.submissionStatus === "under_accountant_review"}
            onClick={() => handleOpenUpload(highlightedSlot)}
          >
            <CloudUpload aria-hidden="true" className="h-4 w-4" />
            <span>Upload into slot</span>
          </Button>
        </div>
      </div>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <section className="space-y-5">
        <SurfaceCard
          className={`${panelClass} h-full overflow-hidden p-0`}
          id="submission-readiness"
        >
          <div className="flex items-center justify-between gap-3 bg-brand-700 px-5 py-4 text-white">
            <h2 className="text-[1.05rem] font-semibold">{monthPack.monthLabel} Monthly Pack</h2>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[0.72rem] font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
              {submissionState.label}
            </span>
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div
              aria-label={`${progressPercent}% complete`}
              className="mx-auto flex h-48 w-48 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#062b61 ${progressPercent * 3.6}deg, #e5ebf3 0deg)`,
              }}
            >
              <div className="flex h-[152px] w-[152px] flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <span className="text-[2.2rem] font-semibold tracking-tight text-[#091333]">{progressPercent}%</span>
                <span className="text-[0.78rem] font-semibold text-[#53617f]">Complete</span>
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#e8ecf5] bg-[#fbfcff] p-4">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-[#53617f]">
                  Monthly pack status
                </p>
                <h3 className="mt-2 text-[1.08rem] font-semibold text-[#091333]">
                  {submissionState.bannerTitle}
                </h3>
                <p className="mt-1 text-[0.88rem] leading-6 text-[#53617f]">
                  {submissionState.bannerMessage}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#e8ecf5] bg-white px-4 py-3">
                    <p className="text-[0.72rem] font-semibold text-[#53617f]">Required documents</p>
                    <p className="mt-1 text-[1.15rem] font-semibold text-[#091333]">
                      {readyRequiredCount} of {monthPack.totalCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#e8ecf5] bg-white px-4 py-3">
                    <p className="text-[0.72rem] font-semibold text-[#53617f]">Submission deadline</p>
                    <p className="mt-1 text-[1rem] font-semibold text-[#091333]">
                      {formatDateLabel(monthPack.dueDate)}
                    </p>
                    <p className="mt-0.5 text-[0.76rem] text-[#53617f]">{dueDaysRemaining} days remaining</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[auto_auto] xl:grid-cols-[auto_auto]">
                <Button
                  className="h-10 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                  onClick={handleOpenChecklist}
                >
                  <span>Continue Pack</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  className="client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0"
                  disabled={!monthPack.canComplete || monthPack.submissionStatus === "under_accountant_review"}
                  onClick={submitMonth}
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  <span>Submit Month</span>
                </Button>
                {highlightedSlot ? (
                  <Button
                    className="client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0 sm:col-span-2 lg:col-span-2 xl:col-span-2"
                    disabled={monthPack.submissionStatus === "under_accountant_review"}
                    onClick={() => handleOpenUpload(highlightedSlot)}
                  >
                    <span>
                      {submissionState.tone === "warning"
                        ? `Fix: ${highlightedSlot.documentType}`
                        : `Update: ${highlightedSlot.documentType}`}
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className={`${panelClass} p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#091333]">Priority Actions</h2>
            <button className="client-dashboard-link text-[0.78rem] font-semibold" onClick={handleOpenChecklist} type="button">
              View All
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <PriorityAction
              action="Open"
              helper={`Confirm required files for ${monthPack.monthLabel}`}
              icon={<ClipboardList aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
              label="Review checklist requirements"
              onClick={handleOpenChecklist}
            />
            <PriorityAction
              action="View"
              helper="View uploaded files and supporting records"
              icon={<FileText aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
              label="Open document library"
              onClick={() => navigate("/client/documents")}
            />
            <PriorityAction
              action="Open"
              helper="Review follow-ups or clarification requests"
              icon={<Inbox aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
              label="Check accountant messages"
              onClick={() => navigate("/client/inbox")}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.38fr)]">
        <div className="h-full" id="pack-checklist">
          <MonthlyPackChecklist
            onDownload={handleDownloadSlot}
            isReadOnly={monthPack.submissionStatus === "under_accountant_review"}
            onUpload={handleOpenUpload}
            onView={() => navigate("/client/documents")}
            pack={monthPack}
          />
        </div>

        <PreviousMonthComparisonCard
          actionLabel="Open documents"
          comparisonOptions={monthComparisonOptions}
          comparison={previousMonthComparison}
          onCreateFollowUps={() => navigate("/client/inbox")}
          onOpenAffectedRecords={() => navigate("/client/documents")}
          onAction={() => navigate("/client/documents")}
        />
      </section>

      <DocumentUploadModal
        clientName={clientName ?? user?.company ?? "Apex Trading Ltd"}
        existingFileNames={existingSlotFileNames}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={uploadToSlot}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
