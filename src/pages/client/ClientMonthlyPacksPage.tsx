// Friendly guide: this module (ClientMonthlyPacksPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { MonthlyPackChecklist } from "../../components/workflow/MonthlyPackChecklist";
import { PreviousMonthComparisonCard } from "../../components/workflow/PreviousMonthComparisonCard";
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

function UploadIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 16V5m0 0-4 4m4-4 4 4M5.5 16.5v1.25A2.75 2.75 0 0 0 8.25 20.5h7.5a2.75 2.75 0 0 0 2.75-2.75V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SubmitIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12 13-7-3.5 14L11 13l-6-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function AlertIcon({ tone }: { tone: "warning" | "success" | "info" }) {
  if (tone === "success") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
        <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
          <path
            d="m7.5 12.5 2.75 2.75L16.5 9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </div>
    );
  }

  if (tone === "info") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
        <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 10.25v5m0-8v.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 8.5v4m0 3h.01M10.26 4.76 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25H18.8a1.5 1.5 0 0 0 1.3-2.25L12.74 4.76a1.5 1.5 0 0 0-2.48 0Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-600" fill="none" viewBox="0 0 24 24">
      <rect
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="6.5"
      />
      <path
        d="M8 4.5v4m8-4v4M4 10.5h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function statusPillClasses(tone: "warning" | "success" | "info") {
  if (tone === "success") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (tone === "info") {
    return "bg-brand-50 text-brand-700";
  }

  return "bg-rose-50 text-rose-600";
}

function bannerClasses(tone: "warning" | "success" | "info") {
  if (tone === "success") {
    return "border-emerald-100 bg-gradient-to-r from-emerald-50 to-white";
  }

  if (tone === "info") {
    return "border-brand-100 bg-gradient-to-r from-brand-50 to-white";
  }

  return "border-orange-100 bg-gradient-to-r from-orange-50 to-white";
}

function progressBarClasses(tone: "warning" | "success" | "info") {
  if (tone === "success") {
    return "bg-emerald-500";
  }

  if (tone === "info") {
    return "bg-brand-500";
  }

  return "bg-emerald-500";
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
    invoices,
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
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Monthly Packs
          </p>
          <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">
            {monthPack.monthLabel}
          </h1>
          <p className="max-w-2xl text-[0.96rem] leading-7 text-slate-500">
            Complete required slots and submit once the pack is ready for accountant review.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto lg:justify-end">
          <Button
            className="h-10 rounded-xl px-4"
            disabled={monthPack.submissionStatus === "under_accountant_review"}
            onClick={() => handleOpenUpload(highlightedSlot)}
            variant="secondary"
          >
            <UploadIcon />
            <span>Upload</span>
          </Button>
          <Button
            className="h-10 rounded-xl px-4"
            disabled={!monthPack.canComplete || monthPack.submissionStatus === "under_accountant_review"}
            onClick={submitMonth}
          >
            <SubmitIcon />
            <span>Submit Month</span>
          </Button>
          <Button
            className="h-10 rounded-xl px-4 text-brand-700"
            onClick={handleOpenChecklist}
            variant="secondary"
          >
            <span>Open Checklist</span>
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

      <SurfaceCard
        className={`rounded-[1.35rem] border px-4 py-4 ${bannerClasses(submissionState.tone)}`}
        id="submission-readiness"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <AlertIcon tone={submissionState.tone} />
            <div className="space-y-1">
              <h2 className="text-[0.98rem] font-semibold text-slate-900">
                {submissionState.bannerTitle}
              </h2>
              <p className="text-[0.88rem] text-slate-700">{submissionState.bannerMessage}</p>
            </div>
          </div>
          {highlightedSlot ? (
            <Button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 ring-0 hover:bg-slate-50"
              disabled={monthPack.submissionStatus === "under_accountant_review"}
              onClick={() => handleOpenUpload(highlightedSlot)}
              variant="secondary"
            >
              <span>
                {submissionState.tone === "warning"
                  ? `Fix: ${highlightedSlot.documentType}`
                  : `Update: ${highlightedSlot.documentType}`}
              </span>
            </Button>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden rounded-[1.35rem] p-0">
        <div className="grid lg:grid-cols-3">
          <div className="space-y-2 px-5 py-4 lg:border-r lg:border-slate-100">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Progress
            </p>
            <p className="text-[1.42rem] font-semibold tracking-tight text-slate-950">
              {readyRequiredCount} of {monthPack.totalCount}
            </p>
            <p className="text-[0.88rem] text-slate-500">{progressPercent}% complete</p>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${progressBarClasses(submissionState.tone)}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 px-5 py-4 lg:border-r lg:border-slate-100">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Due Date
            </p>
            <div className="flex items-center gap-2.5 text-[1.42rem] font-semibold tracking-tight text-slate-950">
              <CalendarIcon />
              <span className="text-[1.42rem]">{formatDateLabel(monthPack.dueDate)}</span>
            </div>
            <p className="text-[0.88rem] text-slate-500">Submission deadline</p>
          </div>

          <div className="space-y-2 px-5 py-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Status
            </p>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold ${statusPillClasses(
                  submissionState.tone,
                )}`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    submissionState.tone === "success"
                      ? "bg-emerald-500"
                      : submissionState.tone === "info"
                        ? "bg-brand-500"
                        : "bg-rose-500"
                  }`}
                />
                {submissionState.label}
              </span>
            </div>
            <p className="text-[0.88rem] text-slate-500">{submissionState.statusHelper}</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-[1.35rem] border-slate-200/90">
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={handleOpenChecklist}
            type="button"
          >
            <span>Go to checklist</span>
            <ChevronRightIcon />
          </button>
          <button
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate("/client/documents")}
            type="button"
          >
            <span>Open documents</span>
            <ChevronRightIcon />
          </button>
          <button
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate("/client/inbox")}
            type="button"
          >
            <span>Open inbox</span>
            <ChevronRightIcon />
          </button>
        </div>
      </SurfaceCard>

      <section id="pack-checklist">
        <MonthlyPackChecklist
          onDownload={handleDownloadSlot}
          isReadOnly={monthPack.submissionStatus === "under_accountant_review"}
          onUpload={handleOpenUpload}
          onView={() => navigate("/client/documents")}
          pack={monthPack}
        />
      </section>

      <PreviousMonthComparisonCard
        actionLabel="Open documents"
        comparison={previousMonthComparison}
        onCreateFollowUps={() => navigate("/client/inbox")}
        onOpenAffectedRecords={() => navigate("/client/documents")}
        onAction={() => navigate("/client/documents")}
      />

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
