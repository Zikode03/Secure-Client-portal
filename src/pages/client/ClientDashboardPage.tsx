// Friendly guide: this module (ClientDashboardPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudUpload,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderOpen,
  MoreHorizontal,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type {
  ExpiringDocumentItem,
  LatestRecordItem,
  MonthlyDocumentSlot,
  MonthlyPack,
  SmartAlertItem,
  Tone,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";

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
  "h-full rounded-2xl border border-[#dce6ef] bg-white shadow-[0_16px_38px_rgba(4,24,52,0.08)]";

const iconTileClass =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee]";

const dashboardLinkClass =
  "client-dashboard-link font-semibold transition";

const dashboardActionButtonClass =
  "client-dashboard-action-button inline-flex items-center justify-center rounded-lg font-bold transition hover:-translate-y-0.5 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

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

function ExpiryIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8v4l2.5 2.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function AlertListIcon({ tone }: { tone: Tone }) {
  const classes =
    tone === "danger"
      ? "bg-rose-50 text-rose-500 ring-rose-100"
      : tone === "warning"
        ? "bg-amber-50 text-amber-500 ring-amber-100"
        : "bg-brand-50 text-brand-500 ring-brand-100";

  return (
    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${classes}`}>
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

function getHighlightedSlot(pack: MonthlyPack) {
  const blockingSlots = pack.slots.filter(
    (slot) => slot.isRequired && blockingStatuses.has(slot.status),
  );

  return (
    blockingSlots.find((slot) => slot.status === "rejected") ??
    blockingSlots.find((slot) => slot.status === "missing") ??
    blockingSlots.find((slot) => slot.status === "partial") ??
    blockingSlots.find((slot) => slot.status === "pending_signature") ??
    blockingSlots[0] ??
    pack.slots[0] ??
    null
  );
}

function SectionHeader({
  actionLabel,
  onAction,
  title,
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[1rem] font-semibold text-[#091333]">{title}</h2>
      {actionLabel && onAction ? (
        <button
          className={cn(dashboardActionButtonClass, "h-8 gap-1.5 px-3 text-[0.78rem]")}
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function MetricTile({
  accent = false,
  helper,
  icon,
  label,
  progress,
  value,
}: {
  accent?: boolean;
  helper: string;
  icon: ReactNode;
  label: string;
  progress?: number;
  value: ReactNode;
}) {
  return (
    <div className={cn(panelClass, "flex min-h-[152px] flex-col justify-between p-5")}>
      <div className="flex items-start gap-4">
        <div className={iconTileClass}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.82rem] font-semibold text-[#091333]">{label}</p>
          <p className={cn("mt-2 text-[1.7rem] font-semibold tracking-tight", accent ? "text-brand-700" : "text-[#091333]")}>
            {value}
          </p>
          <p className="mt-1 text-[0.78rem] leading-5 text-[#53617f]">{helper}</p>
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="client-dashboard-progress-track mt-4 h-1.5 rounded-full">
          <div
            className="client-dashboard-progress-fill h-1.5 rounded-full"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function PriorityIcon({ tone }: { tone: Tone }) {
  const Icon = tone === "danger" ? AlertTriangle : tone === "success" ? ShieldCheck : CloudUpload;
  const classes =
    tone === "danger"
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-[#d7e3ee] bg-[#eef4fa] text-brand-700";

  return (
    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", classes)}>
      <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
    </div>
  );
}

function CompactListCard({
  className,
  emptyDescription,
  emptyTitle,
  headerBadge,
  items,
  renderItem,
  title,
  viewAllLabel = "View all",
  onViewAll,
}: {
  className?: string;
  emptyDescription: string;
  emptyTitle: string;
  headerBadge?: string;
  items: { id: string }[];
  renderItem: (item: { id: string }, index: number) => React.ReactNode;
  title: string;
  viewAllLabel?: string;
  onViewAll: () => void;
}) {
  return (
    <SurfaceCard
      className={cn(
        "rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[1rem] font-semibold text-slate-950">{title}</h2>
            {headerBadge ? (
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600 ring-1 ring-slate-200/70 backdrop-blur">
                {headerBadge}
              </span>
            ) : null}
          </div>
          <button
            className={cn(dashboardLinkClass, "text-sm")}
            onClick={onViewAll}
            type="button"
          >
            {viewAllLabel}
          </button>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="space-y-0 px-5 pb-5">
          {items.map((item, index) => renderItem(item, index))}
        </div>
      ) : (
        <div className="px-5 pb-5">
          <EmptyState description={emptyDescription} title={emptyTitle} />
        </div>
      )}
    </SurfaceCard>
  );
}

// Shared shape notes: these types keep UI and data contracts aligned.
interface NextActionItem {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  tone: Tone;
  onAction: () => void;
}

function NextActionsCard({
  items,
}: {
  items: NextActionItem[];
}) {
  return (
    <SurfaceCard className={cn(panelClass, "p-0")}>
      <div className="px-5 pb-3 pt-5">
        <SectionHeader title="Today's Priorities" />
      </div>

      {items.length > 0 ? (
        <div className="space-y-3 px-5 pb-5">
          {items.map((item) => (
            <div
              className="flex flex-col gap-3 rounded-xl border border-[#e8ecf5] bg-white px-3 py-3 transition hover:border-brand-700/25 hover:shadow-[0_14px_28px_rgba(4,24,52,0.08)] sm:flex-row sm:items-center sm:justify-between"
              key={item.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <PriorityIcon tone={item.tone} />
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] font-semibold text-[#091333]">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[0.78rem] leading-5 text-[#53617f]">{item.detail}</p>
                </div>
              </div>
              <button
                className={cn(dashboardActionButtonClass, "h-9 shrink-0 px-3 text-[0.8rem]")}
                onClick={item.onAction}
                type="button"
              >
                {item.ctaLabel}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 pb-5">
          <EmptyState
            description="There are no urgent client actions right now. You can review documents or compliance records."
            title="Everything is on track"
          />
        </div>
      )}
    </SurfaceCard>
  );
}

function slotTone(status: MonthlyDocumentSlot["status"]) {
  if (status === "accepted" || status === "filed" || status === "under_review" || status === "uploaded") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (status === "pending_signature" || status === "partial" || status === "pending") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function MonthlyPackPreviewCard({
  pack,
  onOpenPack,
}: {
  pack: MonthlyPack;
  onOpenPack: () => void;
}) {
  const progress = Math.max(0, Math.min(pack.progressPercent, 100));
  const previewSlots = pack.slots
    .filter((slot) => slot.documentType === "Bank Statement" || slot.documentType === "Invoices")
    .slice(0, 3);

  return (
    <SurfaceCard className={cn(panelClass, "p-5")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[1rem] font-semibold text-[#091333]">Monthly Pack Status</h2>
        <button
          className={cn(dashboardLinkClass, "text-sm")}
          onClick={onOpenPack}
          type="button"
        >
          View Monthly Pack
        </button>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div
          aria-label={`${progress}% complete`}
          className="client-dashboard-progress-track relative mx-auto flex h-48 w-48 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--client-dashboard-progress-fill) ${progress * 3.6}deg, var(--client-dashboard-progress-track) 0deg)`,
          }}
        >
          <div className="flex h-[152px] w-[152px] flex-col items-center justify-center rounded-full bg-white shadow-inner">
            <span className="text-[2.25rem] font-semibold tracking-tight text-[#091333]">{progress}%</span>
            <span className="text-[0.78rem] font-semibold text-[#53617f]">Complete</span>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#53617f]">Current Month</p>
            <p className="mt-1 text-[1.35rem] font-semibold text-brand-700">
              {pack.monthLabel}
            </p>
            <p className="mt-2 text-[0.86rem] font-semibold text-[#091333]">
              {pack.completedCount} of {pack.totalCount} documents complete
            </p>
            <div className="client-dashboard-progress-track mt-3 h-2 rounded-full">
              <div className="client-dashboard-progress-fill h-2 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e8ecf5] bg-[#fbfcff] px-4 py-3">
              <p className="text-[0.72rem] font-semibold text-[#53617f]">Due Date</p>
              <p className="mt-1 text-[0.88rem] font-semibold text-[#091333]">{formatDateLabel(pack.dueDate)}</p>
            </div>
            <div className="rounded-xl border border-[#e8ecf5] bg-[#fbfcff] px-4 py-3">
              <p className="text-[0.72rem] font-semibold text-[#53617f]">Status</p>
              <p className="mt-1 text-[0.88rem] font-semibold text-brand-700">
                {pack.submissionStatus === "under_accountant_review" ? "Under Review" : pack.canComplete ? "Ready" : "Awaiting Uploads"}
              </p>
            </div>
          </div>

          {previewSlots.length > 0 ? (
            <div className="space-y-2">
              {previewSlots.map((slot) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#e8ecf5] bg-white px-3 py-2.5"
                  key={slot.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.82rem] font-semibold text-[#091333]">{slot.documentType}</p>
                    <p className="mt-0.5 text-[0.74rem] text-[#53617f]">
                      {slot.lastSubmission ? `Updated ${formatDateLabel(slot.lastSubmission)}` : "No upload yet"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold",
                      slotTone(slot.status),
                    )}
                  >
                    {formatStatusLabel(slot.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}

export function ClientDashboardPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const uploadModal = useDisclosure(false);
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [optionsOpen, setOptionsOpen] = useState(false);
  const {
    documents,
    dismissFeedbackNotice,
    expiringDocuments,
    feedbackNotice,
    invoices,
    latestOverallDocuments,
    monthPack,
    requests,
    showFeedbackNotice,
    smartAlerts,
    submitMonth,
    triggerDownload,
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

  const highlightedSlot = useMemo(() => getHighlightedSlot(monthPack), [monthPack]);
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
  const expiringPreview = useMemo(() => expiringDocuments.slice(0, 2), [expiringDocuments]);
  const alertsPreview = useMemo(() => smartAlerts.slice(0, 2), [smartAlerts]);
  const latestRecordsPreview = useMemo(
    () => latestOverallDocuments.slice(0, 5),
    [latestOverallDocuments],
  );
  const nextActions = useMemo<NextActionItem[]>(() => {
    const items: NextActionItem[] = [];
    const rejectedSlot = blockingSlots.find((slot) => slot.status === "rejected");
    const missingSlot = blockingSlots.find((slot) => slot.status === "missing");
    const signatureSlot = blockingSlots.find((slot) => slot.status === "pending_signature");
    const openFollowUps = requests
      .filter((request) => request.status !== "resolved" && request.status !== "closed")
      .slice(0, 2);
    const expiringDocument = expiringDocuments[0];

    if (rejectedSlot) {
      items.push({
        id: `fix-${rejectedSlot.id}`,
        title: `Fix ${rejectedSlot.documentType.toLowerCase()}`,
        detail: rejectedSlot.rejectionReason ?? "Accountant review flagged this upload for correction.",
        ctaLabel: "Re-upload",
        tone: "danger",
        onAction: () => handleOpenUpload(rejectedSlot),
      });
    }

    if (missingSlot) {
      items.push({
        id: `upload-${missingSlot.id}`,
        title: `Upload ${missingSlot.documentType.toLowerCase()}`,
        detail: missingSlot.dueDate
          ? `Required before ${formatDateLabel(missingSlot.dueDate)}.`
          : "This required slot is still blocking submission.",
        ctaLabel: "Upload",
        tone: "warning",
        onAction: () => handleOpenUpload(missingSlot),
      });
    }

    if (signatureSlot) {
      items.push({
        id: `sign-${signatureSlot.id}`,
        title: `Complete ${signatureSlot.documentType.toLowerCase()}`,
        detail: "A signed version is still needed before the pack can move forward.",
        ctaLabel: "Upload",
        tone: "warning",
        onAction: () => handleOpenUpload(signatureSlot),
      });
    }

    for (const request of openFollowUps) {
      items.push({
        id: `request-${request.id}`,
        title: request.title,
        detail: request.description,
        ctaLabel: request.status === "awaiting_client" ? "Respond" : "Open",
        tone: "info",
        onAction: () => navigate("/client/inbox"),
      });
    }

    if (monthPack.canComplete && monthPack.submissionStatus !== "under_accountant_review") {
      items.push({
        id: "submit-month",
        title: "Submit this month",
        detail: "All required documents are ready for accountant review.",
        ctaLabel: "Submit",
        tone: "success",
        onAction: submitMonth,
      });
    }

    if (expiringDocument) {
      items.push({
        id: `expiry-${expiringDocument.id}`,
        title: `Review ${expiringDocument.documentType.toLowerCase()}`,
        detail: expiringDocument.alertMessage,
        ctaLabel: "View",
        tone: expiringDocument.tone,
        onAction: () => navigate("/client/compliance"),
      });
    }

    return items.slice(0, 5);
  }, [blockingSlots, expiringDocuments, monthPack.canComplete, monthPack.submissionStatus, navigate, requests, submitMonth]);

  const openRequestsCount = useMemo(
    () => requests.filter((request) => request.status !== "resolved" && request.status !== "closed").length,
    [requests],
  );

  const waitingOnClientCount = useMemo(
    () => requests.filter((request) => request.status === "awaiting_client").length,
    [requests],
  );

  const complianceHealth = portal.clientComplianceCentre.overallScore;
  const expiredComplianceCount = portal.clientComplianceCentre.expiredDocuments.length;
  const expiringComplianceCount = portal.clientComplianceCentre.expiringDocuments.length;

  function handleOpenUpload(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      showFeedbackNotice("danger", "No slot selected", "Choose a checklist slot before uploading.");
      return;
    }

    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handleOpenWorkspace() {
    navigate("/client/packs#pack-checklist");
    setOptionsOpen(false);
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-5">
      <section className="relative overflow-visible rounded-2xl border border-[#dce6ef] bg-[linear-gradient(135deg,#062044_0%,#0a2f66_54%,#1d8b66_100%)] p-5 text-white shadow-[0_24px_60px_rgba(4,24,52,0.18)] md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(150,224,113,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_34%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white/80">
              Client Workspace
            </div>
            <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.35rem]">
              Welcome back, {user?.name?.split(" ")[0] ?? "John"}
            </h1>
            <p className="max-w-2xl text-[0.95rem] leading-6 text-white/78">
              Your monthly document pack is {monthPack.progressPercent}% complete. Resolve blockers, upload missing files, and submit the month for accountant review.
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-2.5 sm:flex-nowrap lg:justify-end">
          <Button
            className="client-dashboard-action-button h-10 rounded-lg border-0 px-4 text-sm font-bold ring-0 hover:-translate-y-0.5 active:translate-y-px"
            disabled={monthPack.submissionStatus === "under_accountant_review"}
            onClick={() => handleOpenUpload(highlightedSlot)}
          >
            <CloudUpload aria-hidden="true" className="h-4 w-4" />
            <span>Upload missing</span>
          </Button>
          <Button
            className="h-10 rounded-xl bg-[#8ccf45] px-4 text-sm text-[#062044] shadow-[0_14px_28px_rgba(9,34,66,0.22)] hover:bg-[#9ad955]"
            disabled={!monthPack.canComplete || monthPack.submissionStatus === "under_accountant_review"}
            onClick={submitMonth}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            <span>Submit month</span>
          </Button>
          <button
            aria-label="Open dashboard options"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm transition hover:bg-white/15"
            onClick={() => setOptionsOpen((current) => !current)}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>

          {optionsOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 min-w-[210px] rounded-xl border border-[#dce6ef] bg-white p-2 text-[#091333] shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
              <button
                className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm", dashboardLinkClass)}
                onClick={handleOpenWorkspace}
                type="button"
              >
                Open monthly pack
                <ChevronRightIcon />
              </button>
              <button
                className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm", dashboardLinkClass)}
                onClick={() => {
                  navigate("/client/documents");
                  setOptionsOpen(false);
                }}
                type="button"
              >
                Open documents
                <ChevronRightIcon />
              </button>
              <button
                className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm", dashboardLinkClass)}
                onClick={() => {
                  navigate("/client/compliance");
                  setOptionsOpen(false);
                }}
                type="button"
              >
                Open compliance
                <ChevronRightIcon />
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </section>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          accent
          helper={`${expiredComplianceCount} expired / ${expiringComplianceCount} expiring soon`}
          icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />}
          label="Compliance Health"
          progress={complianceHealth}
          value={`${complianceHealth}%`}
        />
        <MetricTile
          helper={waitingOnClientCount > 0 ? `${waitingOnClientCount} waiting on you` : "No requests waiting on you"}
          icon={<FileText aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />}
          label="Open Requests"
          progress={openRequestsCount > 0 ? Math.min(openRequestsCount * 18, 100) : 0}
          value={openRequestsCount}
        />
        <MetricTile
          helper={rejectedRequiredCount > 0 ? `${rejectedRequiredCount} rejected` : "Required checklist blockers"}
          icon={<FileCheck2 aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />}
          label="Missing Documents"
          progress={missingRequiredCount > 0 ? Math.min(missingRequiredCount * 22, 100) : 0}
          value={missingRequiredCount}
        />
        <MetricTile
          accent
          helper={`${monthPack.progressPercent}% complete`}
          icon={<FolderOpen aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />}
          label="Pack Progress"
          progress={monthPack.progressPercent}
          value={`${monthPack.completedCount} / ${monthPack.totalCount}`}
        />
      </div>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,0.98fr)_minmax(360px,1fr)]">
        <MonthlyPackPreviewCard onOpenPack={handleOpenWorkspace} pack={monthPack} />
        <NextActionsCard items={nextActions} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <CompactListCard
          className="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)]"
          emptyDescription="No compliance records are expiring soon."
          emptyTitle="No expiring documents"
          items={expiringPreview}
          onViewAll={() => navigate("/client/compliance")}
          renderItem={(item, index) => {
            const typedItem = item as ExpiringDocumentItem;
            return (
              <div
                className={`flex items-start gap-3 py-2.5 ${
                  index !== expiringPreview.length - 1 ? "border-b border-slate-100" : ""
                }`}
                key={typedItem.id}
              >
                <ExpiryIcon />
                <div className="space-y-0.5">
                  <p className="text-[0.95rem] font-medium text-slate-950">{typedItem.documentType}</p>
                  <p className="text-[0.84rem] text-slate-500">
                    {typedItem.status === "expired"
                      ? `Expired ${formatDateLabel(typedItem.expiresOn)}`
                      : `Expires ${formatDateLabel(typedItem.expiresOn)}`}
                  </p>
                </div>
              </div>
            );
          }}
          title="Expiring documents"
        />

        <CompactListCard
          className="bg-[radial-gradient(circle_at_top_left,rgba(84,66,255,0.07),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)]"
          emptyDescription="No unusual activity has been flagged in the current month."
          emptyTitle="No smart alerts"
          items={alertsPreview}
          onViewAll={() => navigate("/client/documents")}
          renderItem={(item, index) => {
            const typedItem = item as SmartAlertItem;
            return (
              <div
                className={`flex items-start gap-3 py-2.5 ${
                  index !== alertsPreview.length - 1 ? "border-b border-slate-100" : ""
                }`}
                key={typedItem.id}
              >
                <AlertListIcon tone={typedItem.tone} />
                <div className="space-y-0.5">
                  <p className="text-[0.95rem] font-medium leading-6 text-slate-950">{typedItem.title}</p>
                  <p className="text-[0.84rem] text-slate-500">{typedItem.message}</p>
                </div>
              </div>
            );
          }}
          title="Smart alerts"
        />
      </section>

      <section>
        <SurfaceCard className={cn(panelClass, "p-0")}>
          <div className="px-5 pb-4 pt-5">
            <SectionHeader
              actionLabel="View All Documents"
              onAction={() => navigate("/client/documents")}
              title="Latest Documents"
            />
          </div>
          {latestRecordsPreview.length > 0 ? (
            <div className="overflow-x-auto px-5 pb-5">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[0.72rem] font-semibold text-[#53617f]">
                    <th className="whitespace-nowrap border-b border-t border-[#edf0f6] bg-[#fbfcff] px-3 py-2 first:rounded-l-lg first:border-l">Document</th>
                    <th className="whitespace-nowrap border-b border-t border-[#edf0f6] bg-[#fbfcff] px-3 py-2">Type</th>
                    <th className="whitespace-nowrap border-b border-t border-[#edf0f6] bg-[#fbfcff] px-3 py-2">Updated</th>
                    <th className="whitespace-nowrap border-b border-t border-[#edf0f6] bg-[#fbfcff] px-3 py-2 text-right last:rounded-r-lg last:border-r">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRecordsPreview.map((item: LatestRecordItem) => (
                    <tr key={item.id}>
                      <td className="border-b border-[#edf0f6] px-3 py-3">
                        <div className="flex min-w-[220px] items-center gap-2.5">
                          <FileText aria-hidden="true" className="h-4 w-4 text-brand-700" />
                          <span className="truncate text-[0.84rem] font-medium text-[#2f3a5f]">{item.name}</span>
                        </div>
                      </td>
                      <td className="border-b border-[#edf0f6] px-3 py-3 text-[0.8rem] text-[#53617f]">{item.type}</td>
                      <td className="border-b border-[#edf0f6] px-3 py-3 text-[0.8rem] text-[#53617f]">
                        {formatDateLabel(item.date)}
                      </td>
                      <td className="border-b border-[#edf0f6] px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            aria-label={`${readyStatuses.has(item.status as MonthlyDocumentSlot["status"]) ? "Download" : "Open"} ${item.name}`}
                            className={cn(dashboardActionButtonClass, "h-8 px-3 text-[0.78rem]")}
                            onClick={() => triggerDownload(item.name)}
                            type="button"
                          >
                            {readyStatuses.has(item.status as MonthlyDocumentSlot["status"]) ? (
                              <Download aria-hidden="true" className="h-4 w-4" />
                            ) : (
                              <Eye aria-hidden="true" className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <EmptyState
                description="Uploaded documents will appear here once this month starts moving."
                title="No latest documents"
              />
            </div>
          )}
        </SurfaceCard>
      </section>

      <DocumentUploadModal
        clientName={user?.company ?? "Apex Trading Ltd"}
        existingFileNames={existingSlotFileNames}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={uploadToSlot}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
