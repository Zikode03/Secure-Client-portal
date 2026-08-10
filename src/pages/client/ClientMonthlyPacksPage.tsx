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
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import { ApiError, apiGetBlob, apiGetJson, apiPostForm, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import {
  acceptedFilesForSlot,
  buildDefaultDueDate,
  buildSlotUploadForm,
  findNextSubmittableSlot,
  formatSizeLabel,
  isInvoiceCategory,
  mapBackendDocumentStatus,
  mapBackendPackSubmissionStatus,
  mapBackendSlotStatus,
  monthLabelFromParts,
  normaliseDocumentType,
  slotProgress,
  supportsExpiryDate,
  type SlotSubmissionMeta,
} from "../../services/clientMonthlyPackBackend";
import type { DocumentRecord, InvoiceRecord, MonthlyDocumentSlot, MonthlyPack, PreviousMonthComparison } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { recalculatePack } from "../../services/workflowEngine";

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

const monthlyPackActionButtonClass =
  "monthly-pack-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0";

interface BackendMonthlyPackResponse {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendDocumentSlotResponse {
  id: string;
  monthlyPackId: string;
  clientId: string;
  category: string;
  label: string;
  isRequired: boolean;
  status: string;
  canCurrentlyBeSubmitted: boolean;
  currentDocumentId?: string | null;
  dueDateUtc?: string | null;
  submittedAtUtc?: string | null;
  submittedByUserId?: string | null;
  reviewStatus?: string | null;
  rejectionReason?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendDocumentRecord {
  id: string;
  clientId: string;
  monthlyPackId: string;
  name: string;
  category: string;
  documentSlotId?: string | null;
  status: string;
  fileType: string;
  sizeBytes: number;
  storageKey?: string | null;
  uploadedByUserId: string;
  currentVersionNumber: number;
  uploadedAtUtc: string;
  updatedAtUtc: string;
}


function buildLivePreviousMonthComparison(
  currentPack: BackendMonthlyPackResponse,
  previousPack: BackendMonthlyPackResponse | undefined,
  documents: BackendDocumentRecord[],
): PreviousMonthComparison {
  const currentMonthLabel = monthLabelFromParts(currentPack.year, currentPack.month);
  const previousMonthLabel = previousPack
    ? monthLabelFromParts(previousPack.year, previousPack.month)
    : monthLabelFromParts(
        currentPack.month === 1 ? currentPack.year - 1 : currentPack.year,
        currentPack.month === 1 ? 12 : currentPack.month - 1,
      );

  const currentInvoiceCount = documents.filter(
    (document) =>
      document.monthlyPackId === currentPack.id &&
      isInvoiceCategory(document.category),
  ).length;
  const previousInvoiceCount = previousPack
    ? documents.filter(
        (document) =>
          document.monthlyPackId === previousPack.id &&
          isInvoiceCategory(document.category),
      ).length
    : 0;
  const delta = currentInvoiceCount - previousInvoiceCount;

  return {
    currentMonthLabel,
    previousMonthLabel,
    currentInvoiceCount,
    previousInvoiceCount,
    delta,
    message:
      delta === 0
        ? "Invoice volumes are aligned with the previous pack."
        : delta > 0
          ? `${delta} more invoice document${delta === 1 ? "" : "s"} than the previous pack.`
          : `${Math.abs(delta)} fewer invoice document${Math.abs(delta) === 1 ? "" : "s"} than the previous pack.`,
    tone: delta === 0 ? "info" : delta > 0 ? "warning" : "success",
  };
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
  const [liveMonthPack, setLiveMonthPack] = useState<MonthlyPack | null>(null);
  const [liveDocuments, setLiveDocuments] = useState<DocumentRecord[] | null>(null);
  const [liveInvoices, setLiveInvoices] = useState<InvoiceRecord[] | null>(null);
  const [livePreviousMonthComparison, setLivePreviousMonthComparison] =
    useState<PreviousMonthComparison | null>(null);
  const [livePackId, setLivePackId] = useState<string>("");
  const [liveSlotMetaById, setLiveSlotMetaById] = useState<Record<string, SlotSubmissionMeta>>({});
  const [isSyncingBackendPack, setIsSyncingBackendPack] = useState(false);
  const [liveLoadStatus, setLiveLoadStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
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
  const backendClientId = user?.clientIds[0] ?? "";
  const backendMode = hasApiBaseUrl() && Boolean(backendClientId);

  async function loadBackendMonthlyPack() {
    if (!backendMode) {
      return;
    }

    setIsSyncingBackendPack(true);
    setLiveLoadStatus("loading");

    try {
      const packs = await apiGetJson<BackendMonthlyPackResponse[]>(
        `/api/monthly-packs?clientId=${encodeURIComponent(backendClientId)}`,
      );
      const currentPack = packs[0];

      if (!currentPack) {
        setLiveMonthPack(null);
        setLiveDocuments([]);
        setLiveInvoices([]);
        setLivePreviousMonthComparison(null);
        setLivePackId("");
        setLiveSlotMetaById({});
        setLiveLoadStatus("empty");
        return;
      }

      const [slots, documents] = await Promise.all([
        apiGetJson<BackendDocumentSlotResponse[]>(
          `/api/document-slots/${encodeURIComponent(currentPack.id)}`,
        ),
        apiGetJson<BackendDocumentRecord[]>("/api/documents"),
      ]);

      const documentsForClient = documents.filter(
        (document) => document.clientId === backendClientId,
      );
      const packById = new Map(
        packs.map((pack) => [pack.id, pack] satisfies [string, BackendMonthlyPackResponse]),
      );
      const businessName = clientName ?? user?.company ?? "Client";

      const mappedSlots = slots.map<MonthlyDocumentSlot>((slot) => {
        const mappedStatus = mapBackendSlotStatus(slot.status, slot.isRequired);
        const pack = packById.get(slot.monthlyPackId) ?? currentPack;
        const monthName = monthLabelFromParts(pack.year, pack.month).split(" ")[0] ?? "Month";
        return {
          id: slot.id,
          documentType: slot.label,
          description: `${slot.label} for ${monthLabelFromParts(pack.year, pack.month)}.`,
          status: mappedStatus,
          month: monthName,
          year: pack.year,
          acceptedFiles: acceptedFilesForSlot(slot.category, slot.label),
          progress: slotProgress(mappedStatus),
          autoName: `${businessName.replace(/\s+/g, "")}_${slot.label.replace(/\s+/g, "")}_${monthName}_${pack.year}.pdf`,
          isRequired: slot.isRequired,
          assignedOwner: "Client",
          dueDate: slot.dueDateUtc ?? buildDefaultDueDate(pack.year, pack.month),
          supportsExpiryDate: supportsExpiryDate(slot.category, slot.label),
          lastSubmission: slot.submittedAtUtc ?? undefined,
          rejectionReason: slot.rejectionReason ?? undefined,
        };
      });

      const mappedPack = recalculatePack({
        monthLabel: monthLabelFromParts(currentPack.year, currentPack.month),
        dueDate:
          mappedSlots
            .map((slot) => slot.dueDate)
            .filter((value): value is string => Boolean(value))
            .sort()[0] ?? buildDefaultDueDate(currentPack.year, currentPack.month),
        deadlineStatus: "on_track",
        progressPercent: 0,
        completedCount: 0,
        totalCount: 0,
        canComplete: false,
        completionMessage: "",
        submissionStatus: mapBackendPackSubmissionStatus(currentPack.status),
        submittedAt: (() => {
          const submissions = mappedSlots
            .map((slot) => slot.lastSubmission)
            .filter((value): value is string => Boolean(value))
            .sort();
          return submissions.length > 0 ? submissions[submissions.length - 1] : undefined;
        })(),
        slots: mappedSlots,
      });

      const mappedDocuments = documentsForClient.map<DocumentRecord>((document) => {
        const pack = packById.get(document.monthlyPackId);
        return {
          id: document.id,
          clientId: document.clientId,
          clientName: businessName,
          documentType: document.category,
          fileName: document.name,
          monthLabel: pack
            ? monthLabelFromParts(pack.year, pack.month)
            : formatDateLabel(document.uploadedAtUtc),
          description: `${document.category} uploaded to the monthly pack.`,
          status: mapBackendDocumentStatus(document.status),
          uploadedBy: "Portal user",
          uploadedAt: document.uploadedAtUtc,
          reviewedBy: undefined,
          reviewedAt: undefined,
          sizeLabel: formatSizeLabel(document.sizeBytes),
          keywordTags: [document.category],
          rejectionReason: undefined,
          comments: [],
          auditTrail: [],
          fileMimeType: document.fileType,
        };
      });

      const mappedInvoices = documentsForClient
        .filter((document) => isInvoiceCategory(document.category))
        .map<InvoiceRecord>((document) => {
          const pack = packById.get(document.monthlyPackId);
          return {
            id: document.id,
            clientId: document.clientId,
            clientName: businessName,
            invoiceNumber: document.name.replace(/\.[^.]+$/, ""),
            fileName: document.name,
            monthLabel: pack
              ? monthLabelFromParts(pack.year, pack.month)
              : formatDateLabel(document.uploadedAtUtc),
            description: `${document.category} uploaded to the monthly pack.`,
            amountLabel: "—",
            uploadedAt: document.uploadedAtUtc,
            status: "uploaded",
            keywordTags: [document.category],
            fileMimeType: document.fileType,
          };
        });

      setLivePackId(currentPack.id);
      setLiveMonthPack(mappedPack);
      setLiveDocuments(mappedDocuments);
      setLiveInvoices(mappedInvoices);
      setLivePreviousMonthComparison(
        buildLivePreviousMonthComparison(currentPack, packs[1], documentsForClient),
      );
      setLiveSlotMetaById(
        Object.fromEntries(
          slots.map((slot) => [
            slot.id,
            {
              currentDocumentId: slot.currentDocumentId ?? undefined,
              canCurrentlyBeSubmitted: slot.canCurrentlyBeSubmitted,
            },
          ]),
        ),
      );
      setLiveLoadStatus("ready");
    } catch (error) {
      setLiveMonthPack(null);
      setLiveDocuments([]);
      setLiveInvoices([]);
      setLiveLoadStatus("error");
      showFeedbackNotice(
        "danger",
        "Monthly pack sync failed",
        error instanceof ApiError
          ? error.message
          : "Could not load the live monthly pack from the backend.",
      );
    } finally {
      setIsSyncingBackendPack(false);
    }
  }

  useEffect(() => {
    void loadBackendMonthlyPack();
  }, [backendClientId, backendMode]);

  const effectiveDocuments = backendMode && liveDocuments ? liveDocuments : documents;
  const effectiveInvoices = backendMode && liveInvoices ? liveInvoices : invoices;
  const effectiveMonthPack = backendMode && liveMonthPack ? liveMonthPack : monthPack;
  const effectivePreviousMonthComparison =
    backendMode && livePreviousMonthComparison
      ? livePreviousMonthComparison
      : previousMonthComparison;
  const isPackReadOnly =
    !backendMode && effectiveMonthPack.submissionStatus === "under_accountant_review";

  const requiredSlots = useMemo(
    () => effectiveMonthPack.slots.filter((slot) => slot.isRequired),
    [effectiveMonthPack.slots],
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

    return Math.round((readyRequiredCount / effectiveMonthPack.totalCount) * 100);
  }, [effectiveMonthPack.totalCount, readyRequiredCount]);

  const dueDaysRemaining = useMemo(() => {
    const difference = new Date(effectiveMonthPack.dueDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(difference / 86_400_000));
  }, [effectiveMonthPack.dueDate]);

  const highlightedSlot = useMemo(
    () =>
      blockingSlots.find((slot) => slot.status === "rejected") ??
      blockingSlots.find((slot) => slot.status === "missing") ??
      blockingSlots.find((slot) => slot.status === "partial") ??
      blockingSlots.find((slot) => slot.status === "pending_signature") ??
      blockingSlots[0] ??
      requiredSlots[0] ??
      effectiveMonthPack.slots[0] ??
      null,
    [blockingSlots, effectiveMonthPack.slots, requiredSlots],
  );
  const backendSubmittableSlot = useMemo(
    () => findNextSubmittableSlot(effectiveMonthPack.slots, liveSlotMetaById),
    [effectiveMonthPack.slots, liveSlotMetaById],
  );
  const existingSlotFileNames = useMemo(() => {
    if (!selectedSlot) {
      return [];
    }

    const targetMonthLabel = `${selectedSlot.month} ${selectedSlot.year}`;
    const documentFileNames = effectiveDocuments
      .filter(
        (document) =>
          document.documentType === selectedSlot.documentType &&
          document.monthLabel === targetMonthLabel,
      )
      .map((document) => document.fileName);
    const invoiceFileNames =
      selectedSlot.documentType.toLowerCase().includes("invoice")
        ? effectiveInvoices
            .filter((invoice) => invoice.monthLabel === targetMonthLabel)
            .map((invoice) => invoice.fileName)
        : [];

    return [...documentFileNames, ...invoiceFileNames];
  }, [effectiveDocuments, effectiveInvoices, selectedSlot]);

  const submissionState = useMemo(() => {
    if (backendMode) {
      const activeReviewCount = effectiveMonthPack.slots.filter((slot) =>
        ["uploaded", "under_review", "accepted", "filed"].includes(slot.status),
      ).length;

      if (backendSubmittableSlot) {
        return {
          label: "Ready",
          tone: "success" as const,
          bannerTitle: `${backendSubmittableSlot.documentType} is ready to submit.`,
          bannerMessage:
            "Submit the next ready slot for accountant review while the rest of the month continues independently.",
          statusHelper: "Ready for slot submission",
        };
      }

      if (activeReviewCount > 0) {
        return {
          label: "Active",
          tone: "info" as const,
          bannerTitle: "Slot reviews are already in motion.",
          bannerMessage:
            "Some slots are already with the accountant. You can keep uploading or correcting the remaining slots in parallel.",
          statusHelper: "Parallel slot workflow",
        };
      }
    }

    if (effectiveMonthPack.submissionStatus === "under_accountant_review") {
      return {
        label: "Under Review",
        tone: "info" as const,
        bannerTitle: "Submitted slots are under review.",
        bannerMessage: "At least one checklist slot has been sent to the accountant for review.",
        statusHelper: "Awaiting accountant review",
      };
    }

    if (effectiveMonthPack.canComplete) {
      return {
        label: "Ready",
        tone: "success" as const,
        bannerTitle: "A required slot is ready to submit.",
        bannerMessage: "All required documents are in place, and the next ready slot can be sent for accountant review.",
        statusHelper: "Ready for slot submission",
      };
    }

    return {
      label: "Not Ready",
      tone: "warning" as const,
      bannerTitle: "This pack is not ready.",
      bannerMessage: blockerSummaryText(missingRequiredCount, rejectedRequiredCount),
      statusHelper: "Fix blockers to enable submission",
    };
  }, [effectiveMonthPack.canComplete, effectiveMonthPack.submissionStatus, missingRequiredCount, rejectedRequiredCount]);

  const monthComparisonOptions = useMemo<MonthComparisonOption[]>(() => {
    const currentMonthLabel = effectivePreviousMonthComparison.currentMonthLabel;
    const previousMonthLabel = effectivePreviousMonthComparison.previousMonthLabel;
    const uniqueDocumentTypes = Array.from(
      new Set(effectiveMonthPack.slots.map((slot) => slot.documentType)),
    );
    const nonInvoiceDocuments = effectiveDocuments.filter(
      (document) => !normaliseDocumentType(document.documentType).includes("invoice"),
    );

    function countDocuments(documentType: string, monthLabel: string) {
        const normalisedType = normaliseDocumentType(documentType);

      if (normalisedType.includes("invoice")) {
        return monthLabel === currentMonthLabel
          ? effectivePreviousMonthComparison.currentInvoiceCount
          : effectivePreviousMonthComparison.previousInvoiceCount;
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
        effectivePreviousMonthComparison.currentInvoiceCount +
        nonInvoiceDocuments.filter((document) => document.monthLabel === currentMonthLabel).length,
      previousCount:
        effectivePreviousMonthComparison.previousInvoiceCount +
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
        message: isInvoiceType ? effectivePreviousMonthComparison.message : undefined,
        tone: isInvoiceType ? effectivePreviousMonthComparison.tone : undefined,
      };
    });

    return [allDocumentsOption, ...documentTypeOptions];
  }, [effectiveDocuments, effectiveMonthPack.slots, effectivePreviousMonthComparison]);

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

  async function handleSubmitAction() {
    if (!backendMode) {
      submitMonth();
      return;
    }

    if (!backendSubmittableSlot) {
      showFeedbackNotice(
        "warning",
        "No slot ready to submit",
        "Upload or correct a checklist slot before sending it for accountant review.",
      );
      return;
    }

    try {
      await apiPostJson<
        BackendDocumentSlotResponse,
        Record<string, never>
      >(`/api/document-slots/${encodeURIComponent(backendSubmittableSlot.id)}/submit`, {});
      await loadBackendMonthlyPack();
      showFeedbackNotice(
        "success",
        "Slot submitted",
        `${backendSubmittableSlot.documentType} was submitted for accountant review.`,
      );
    } catch (error) {
      showFeedbackNotice(
        "danger",
        "Slot submission failed",
        error instanceof ApiError
          ? error.message
          : "The selected slot could not be submitted for review.",
      );
    }
  }

  async function handleDownloadSlot(slot: MonthlyDocumentSlot) {
    if (backendMode) {
      const documentId = liveSlotMetaById[slot.id]?.currentDocumentId;
      if (!documentId) {
        showFeedbackNotice("warning", "No file available", `${slot.documentType} does not have an uploaded file yet.`);
        return;
      }

      try {
        const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(documentId)}/download`);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slot.documentType.replace(/\s+/g, "_")}_${slot.month}_${slot.year}`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        showFeedbackNotice(
          "danger",
          "Download failed",
          error instanceof ApiError ? error.message : "The uploaded file could not be downloaded.",
        );
      }
      return;
    }

    const businessName = clientName ?? user?.company ?? "Apex Trading Ltd";
    downloadSlotFile(slot, businessName);
    showFeedbackNotice("success", "Download started", `${slot.documentType} was prepared for download.`);
  }

  if (backendMode && liveLoadStatus !== "ready") {
    const isLoading = liveLoadStatus === "idle" || liveLoadStatus === "loading";
    return (
      <div className="portal-page mx-auto max-w-[1280px] space-y-5 pb-8">
        {feedbackNotice ? (
          <FeedbackBanner
            message={feedbackNotice.message}
            onDismiss={dismissFeedbackNotice}
            title={feedbackNotice.title}
            tone={feedbackNotice.tone}
          />
        ) : null}
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            description={
              isLoading
                ? "The current monthly pack and its document slots are being loaded."
                : liveLoadStatus === "empty"
                  ? "Your accountant has not opened a monthly pack for this client yet."
                  : "The live monthly pack could not be loaded. No seeded checklist is being shown."
            }
            title={isLoading ? "Loading monthly pack" : liveLoadStatus === "empty" ? "No monthly pack yet" : "Monthly pack unavailable"}
          />
          {!isLoading ? (
            <div className="mt-5 flex justify-center">
              <Button onClick={() => void loadBackendMonthlyPack()}>Try again</Button>
            </div>
          ) : null}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="portal-page mx-auto max-w-[1280px] space-y-5 pb-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-2 pt-1">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
            Monthly Packs
          </p>
          <h1 className="portal-page-title text-[#091333]">
            {effectiveMonthPack.monthLabel}
          </h1>
          <p className="max-w-2xl text-[0.96rem] leading-7 text-[#53617f]">
            Upload, correct, and submit each slot inside {effectiveMonthPack.monthLabel}. The pack tracks progress, but each document slot moves through review on its own.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto lg:justify-end">
          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce6ef] bg-white px-4 text-sm font-semibold text-[#091333] shadow-sm">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-700" />
            {effectiveMonthPack.monthLabel}
          </div>
          <Button
            className="h-10 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(4,24,52,0.16)] hover:bg-brand-800"
            disabled={isPackReadOnly}
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
            <h2 className="text-[1.05rem] font-semibold">{effectiveMonthPack.monthLabel} Monthly Pack</h2>
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
                <span className="text-[1.85rem] font-medium tracking-tight text-[#091333]">{progressPercent}%</span>
                <span className="text-[0.78rem] font-semibold text-[#53617f]">Complete</span>
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#e8ecf5] bg-[#fbfcff] p-4">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-[#53617f]">
                  Monthly pack summary
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
                      {readyRequiredCount} of {effectiveMonthPack.totalCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#e8ecf5] bg-white px-4 py-3">
                    <p className="text-[0.72rem] font-semibold text-[#53617f]">Submission deadline</p>
                    <p className="mt-1 text-[1rem] font-semibold text-[#091333]">
                      {formatDateLabel(effectiveMonthPack.dueDate)}
                    </p>
                    <p className="mt-0.5 text-[0.76rem] text-[#53617f]">{dueDaysRemaining} days remaining</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[auto_auto] xl:grid-cols-[auto_auto]">
                <Button
                  className={monthlyPackActionButtonClass}
                  onClick={handleOpenChecklist}
                >
                  <span>Continue Pack</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  className={monthlyPackActionButtonClass}
                  disabled={
                    backendMode
                      ? !backendSubmittableSlot || isSyncingBackendPack
                      : !effectiveMonthPack.canComplete || isPackReadOnly
                  }
                  onClick={() => void handleSubmitAction()}
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  <span>{backendMode ? "Submit Ready Slot" : "Submit Month"}</span>
                </Button>
                {highlightedSlot ? (
                  <Button
                    className={`${monthlyPackActionButtonClass} sm:col-span-2 lg:col-span-2 xl:col-span-2`}
                    disabled={isPackReadOnly || isSyncingBackendPack}
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
              helper={`Confirm required files for ${effectiveMonthPack.monthLabel}`}
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

      <section className="grid items-stretch gap-5">
        <div className="h-full" id="pack-checklist">
          <MonthlyPackChecklist
            onDownload={(slot) => void handleDownloadSlot(slot)}
            isReadOnly={isPackReadOnly}
            onUpload={handleOpenUpload}
            onView={() => navigate("/client/documents")}
            pack={effectiveMonthPack}
          />
        </div>

        <PreviousMonthComparisonCard
          actionLabel="Open documents"
          comparisonOptions={monthComparisonOptions}
          comparison={effectivePreviousMonthComparison}
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
        onUploaded={(submission) => {
          if (!backendMode) {
            uploadToSlot(submission);
            return;
          }

          if (!livePackId || !submission.file || !user?.clientIds[0]) {
            showFeedbackNotice(
              "danger",
              "Upload failed",
              "The live monthly pack context is missing. Refresh the page and try again.",
            );
            return;
          }

          const targetSlotMeta = liveSlotMetaById[submission.slotId];
          const form = buildSlotUploadForm({
            clientId: user.clientIds[0],
            monthlyPackId: livePackId,
            submission,
            currentDocumentId: targetSlotMeta?.currentDocumentId,
          });

          void apiPostForm<{
            id: string;
            clientId: string;
            monthlyPackId: string;
            documentSlotId: string;
            documentType: string;
            name: string;
            status: string;
          }>("/api/documents/upload", form)
            .then(async () => {
              await loadBackendMonthlyPack();
              showFeedbackNotice(
                "success",
                targetSlotMeta?.currentDocumentId ? "New version uploaded" : "Upload saved",
                `${submission.documentType} was uploaded into its slot and is ready for the next review step.`,
              );
            })
            .catch((error: unknown) => {
              showFeedbackNotice(
                "danger",
                "Upload failed",
                error instanceof ApiError
                  ? error.message
                  : "The document could not be uploaded to the backend.",
              );
            });
        }}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
