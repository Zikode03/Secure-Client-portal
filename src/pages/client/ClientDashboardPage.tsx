// Friendly guide: this module (ClientDashboardPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
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
  ActivityItem,
  ExpiringDocumentItem,
  LatestRecordItem,
  MonthlyDocumentSlot,
  MonthlyPack,
  SmartAlertItem,
  Tone,
  WorkflowRequest,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel, formatDateTimeLabel, formatStatusLabel } from "../../utils/formatters";

const readyStatuses = new Set<MonthlyDocumentSlot["status"]>([
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

// Component flow: gather data first, then render a focused UI state.
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

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 9 6 6 6-6"
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

function BannerIcon({ tone }: { tone: "warning" | "success" | "info" }) {
  const classes =
    tone === "success"
      ? "bg-emerald-100 text-emerald-600"
      : tone === "info"
        ? "bg-brand-100 text-brand-600"
        : "bg-orange-100 text-orange-500";

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${classes}`}>
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
        {tone === "success" ? (
          <>
            <path
              d="m7.5 12.5 2.75 2.75L16.5 9"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          </>
        ) : tone === "info" ? (
          <>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 10.25v5m0-8v.25"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </>
        ) : (
          <path
            d="M12 8.5v4m0 3h.01M10.26 4.76 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25H18.8a1.5 1.5 0 0 0 1.3-2.25L12.74 4.76a1.5 1.5 0 0 0-2.48 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        )}
      </svg>
    </div>
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

function RequestIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8.5v4m0 3h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function ActivityIcon({ tone }: { tone: Tone }) {
  const classes =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
      : tone === "warning"
        ? "bg-amber-50 text-amber-500 ring-amber-100"
        : tone === "danger"
          ? "bg-rose-50 text-rose-500 ring-rose-100"
          : "bg-brand-50 text-brand-500 ring-brand-100";

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${classes}`}>
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

function bannerClasses(tone: "warning" | "success" | "info") {
  if (tone === "success") {
    return "border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_40%),linear-gradient(135deg,#f7fefb_0%,#ffffff_100%)]";
  }

  if (tone === "info") {
    return "border-brand-100 bg-[radial-gradient(circle_at_top_left,rgba(84,66,255,0.14),transparent_40%),linear-gradient(135deg,#f7f8ff_0%,#ffffff_100%)]";
  }

  return "border-orange-100 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_40%),linear-gradient(135deg,#fff9f2_0%,#ffffff_100%)]";
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
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[1rem] font-semibold text-slate-950">{title}</h2>
      {actionLabel && onAction ? (
        <button
          className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
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
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
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
    <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(84,66,255,0.06),transparent_34%),linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
      <div className="px-5 pb-4 pt-5">
        <SectionHeader title="Next actions" />
        <p className="mt-1 text-[0.82rem] text-slate-500">
          The fastest path to getting this month ready and keeping the workspace tidy.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-0 px-5 pb-5">
          {items.map((item, index) => (
            <div
              className={`flex items-start justify-between gap-4 py-3 ${
                index !== items.length - 1 ? "border-b border-slate-100" : ""
              }`}
              key={item.id}
            >
              <div className="flex min-w-0 items-start gap-3">
                <AlertListIcon tone={item.tone} />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[0.95rem] font-medium leading-6 text-slate-950">{item.title}</p>
                  <p className="text-[0.84rem] text-slate-500">{item.detail}</p>
                </div>
              </div>
              <button
                className="shrink-0 text-sm font-medium text-brand-600 transition hover:text-brand-700"
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
            description="There are no urgent client actions right now. You can use this time to review documents or compliance records."
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
  const previewSlots = pack.slots.filter(
    (slot) => slot.documentType === "Bank Statement" || slot.documentType === "Invoices",
  );

  return (
    <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[1rem] font-semibold text-slate-950">Monthly pack snapshot</h2>
            <p className="mt-1 text-[0.82rem] text-slate-500">
              Quick view only. Open the pack workspace to upload, correct, and submit.
            </p>
          </div>
          <button
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
            onClick={onOpenPack}
            type="button"
          >
            Open workspace
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(220px,0.18fr)]">
        <div className="space-y-3">
          {previewSlots.map((slot) => (
            <div
              className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3"
              key={slot.id}
            >
              <div className="min-w-0">
                <p className="text-[0.95rem] font-semibold text-slate-950">{slot.documentType}</p>
                <p className="mt-1 text-[0.82rem] text-slate-500">
                  {slot.month} {slot.year}
                  {slot.lastSubmission ? ` • Updated ${formatDateLabel(slot.lastSubmission)}` : " • No upload yet"}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold",
                  slotTone(slot.status),
                )}
              >
                {formatStatusLabel(slot.status)}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] px-4 py-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Pack status
          </p>
          <p className="mt-2 text-[1.28rem] font-semibold tracking-tight text-slate-950">
            {pack.completedCount} / {pack.totalCount}
          </p>
          <p className="mt-1 text-[0.84rem] text-slate-500">{pack.progressPercent}% complete</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-500"
              style={{ width: `${pack.progressPercent}%` }}
            />
          </div>
          <p className="mt-4 text-[0.8rem] leading-6 text-slate-500">
            Due {formatDateLabel(pack.dueDate)}
          </p>
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
    activity,
    dismissFeedbackNotice,
    expiringDocuments,
    feedbackNotice,
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
  const expiringPreview = useMemo(() => expiringDocuments.slice(0, 2), [expiringDocuments]);
  const requestsPreview = useMemo(() => requests.slice(0, 2), [requests]);
  const alertsPreview = useMemo(() => smartAlerts.slice(0, 2), [smartAlerts]);
  const activityPreview = useMemo(() => activity.slice(0, 5), [activity]);
  const latestRecordsPreview = useMemo(
    () => latestOverallDocuments.slice(0, 5),
    [latestOverallDocuments],
  );
  const nextActions = useMemo<NextActionItem[]>(() => {
    const items: NextActionItem[] = [];
    const rejectedSlot = blockingSlots.find((slot) => slot.status === "rejected");
    const missingSlot = blockingSlots.find((slot) => slot.status === "missing");
    const signatureSlot = blockingSlots.find((slot) => slot.status === "pending_signature");
    const openRequest = requests.find((request) => request.status !== "resolved" && request.status !== "closed");
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

    if (openRequest) {
      items.push({
        id: `request-${openRequest.id}`,
        title: "Respond to accountant request",
        detail: openRequest.title,
        ctaLabel: "Open",
        tone: "info",
        onAction: () => navigate("/client/requests"),
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

    return items.slice(0, 3);
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

  const submissionState = useMemo(() => {
    if (monthPack.submissionStatus === "under_accountant_review") {
      return {
        label: "Under Review",
        tone: "info" as const,
        bannerTitle: "This month has been submitted.",
        bannerMessage: "The monthly pack is awaiting accountant review.",
        statusHelper: "Awaiting accountant review",
      };
    }

    if (monthPack.canComplete) {
      return {
        label: "Ready",
        tone: "success" as const,
        bannerTitle: "This month is ready to submit.",
        bannerMessage: "All required documents are ready for accountant review.",
        statusHelper: "Ready for submission",
      };
    }

    return {
      label: "Not Ready",
      tone: "warning" as const,
      bannerTitle: "This month is not ready to submit.",
      bannerMessage: blockerSummaryText(missingRequiredCount, rejectedRequiredCount),
      statusHelper: "Fix blockers to enable submission",
    };
  }, [missingRequiredCount, monthPack.canComplete, monthPack.submissionStatus, rejectedRequiredCount]);

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
    <div className="mx-auto max-w-[1180px] space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-brand-600">Client Workspace</div>
          <h1 className="text-[1.8rem] font-semibold tracking-tight text-slate-950">
            Monthly Document Control
          </h1>
          <p className="max-w-2xl text-[0.9rem] leading-6 text-slate-500">
            Complete the required document slots, resolve blockers, and submit the month for accountant review.
          </p>
        </div>

        <div className="relative flex flex-wrap items-center gap-2.5 sm:flex-nowrap lg:justify-end">
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 ring-0 hover:bg-slate-50"
            disabled={monthPack.submissionStatus === "under_accountant_review"}
            onClick={() => handleOpenUpload(highlightedSlot)}
            variant="secondary"
          >
            <UploadIcon />
            <span>Upload missing</span>
          </Button>
          <Button
            className="h-10 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-4 text-sm shadow-[0_14px_28px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            disabled={!monthPack.canComplete || monthPack.submissionStatus === "under_accountant_review"}
            onClick={submitMonth}
          >
            <SubmitIcon />
            <span>Submit month</span>
          </Button>
          <button
            aria-label="Open dashboard options"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            onClick={() => setOptionsOpen((current) => !current)}
            type="button"
          >
            <MoreIcon />
          </button>

          {optionsOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 min-w-[210px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
              <button
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={handleOpenWorkspace}
                type="button"
              >
                Open monthly pack
                <ChevronRightIcon />
              </button>
              <button
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
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
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
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

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard
        className={`rounded-[1.5rem] border px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] ${bannerClasses(
          submissionState.tone,
        )}`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <BannerIcon tone={submissionState.tone} />
            <div className="space-y-1">
              <h2 className="text-[1rem] font-semibold text-slate-900">
                {submissionState.bannerTitle}
              </h2>
              <p className="text-[0.88rem] text-slate-700">{submissionState.bannerMessage}</p>
            </div>
          </div>
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 ring-0 hover:bg-slate-50"
            onClick={handleOpenWorkspace}
            variant="secondary"
          >
            <span>View details</span>
            <ChevronDownIcon />
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
        <div className="grid md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 px-5 py-4 lg:border-r lg:border-slate-100">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Compliance Health
            </p>
            <p className="text-[1.38rem] font-semibold tracking-tight text-slate-950">
              {complianceHealth}%
            </p>
            <p className="text-[0.86rem] text-slate-500">
              {expiredComplianceCount} expired / {expiringComplianceCount} expiring soon
            </p>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${complianceHealth}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 px-5 py-4 lg:border-r lg:border-slate-100">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Requests
            </p>
            <p className="text-[1.38rem] font-semibold tracking-tight text-slate-950">
              {openRequestsCount}
            </p>
            <p className="text-[0.86rem] text-slate-500">
              {waitingOnClientCount > 0
                ? `${waitingOnClientCount} waiting on you`
                : "No requests waiting on you"}
            </p>
          </div>

          <div className="space-y-2 px-5 py-4 lg:border-r lg:border-slate-100">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Documents Missing
            </p>
            <p className="text-[1.38rem] font-semibold tracking-tight text-slate-950">
              {missingRequiredCount}
            </p>
            <p className="text-[0.86rem] text-slate-500">
              {rejectedRequiredCount > 0
                ? `${rejectedRequiredCount} rejected still need correction`
                : "Required checklist blockers"}
            </p>
          </div>

          <div className="space-y-2 px-5 py-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Pack Progress
            </p>
            <p className="text-[1.38rem] font-semibold tracking-tight text-slate-950">
              {monthPack.completedCount} of {monthPack.totalCount}
            </p>
            <p className="text-[0.86rem] text-slate-500">{monthPack.progressPercent}% complete</p>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-brand-500"
                style={{ width: `${monthPack.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <section>
        <MonthlyPackPreviewCard onOpenPack={handleOpenWorkspace} pack={monthPack} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
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
          className="bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.08),transparent_36%),linear-gradient(180deg,#ffffff_0%,#fffafb_100%)]"
          emptyDescription="Any accountant follow-ups for this month will appear here."
          emptyTitle="No follow-up requests"
          items={requestsPreview}
          onViewAll={() => navigate("/client/requests")}
          renderItem={(item, index) => {
            const typedItem = item as WorkflowRequest;
            return (
              <div
                className={`flex items-start justify-between gap-4 py-2.5 ${
                  index !== requestsPreview.length - 1 ? "border-b border-slate-100" : ""
                }`}
                key={typedItem.id}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <RequestIcon />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[0.95rem] font-medium leading-6 text-slate-950">{typedItem.title}</p>
                    <p className="text-[0.84rem] text-slate-500">
                      {typedItem.requestedByRole === "client"
                        ? `Assigned to ${typedItem.assignedTo}`
                        : `Requested by ${typedItem.requestedBy}`} - {formatDateLabel(typedItem.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  className="text-sm font-medium text-amber-600 transition hover:text-amber-700"
                  onClick={() => navigate("/client/requests")}
                  type="button"
                >
                  Open
                </button>
              </div>
            );
          }}
          title="Follow-up requests"
          viewAllLabel="View all"
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <CompactListCard
          emptyDescription="Recent client and accountant actions will appear here."
          emptyTitle="No recent activity"
          items={activityPreview}
          onViewAll={() => navigate("/client/notifications")}
          renderItem={(item, index) => {
            const typedItem = item as ActivityItem;
            return (
              <div
                className={`flex items-start gap-3 py-3 ${
                  index !== activityPreview.length - 1 ? "border-b border-slate-100" : ""
                }`}
                key={typedItem.id}
              >
                <ActivityIcon tone={typedItem.tone} />
                <div className="space-y-0.5">
                  <p className="text-[0.95rem] font-medium leading-6 text-slate-950">{typedItem.title}</p>
                  <p className="text-[0.82rem] text-slate-500">
                    {formatDateTimeLabel(typedItem.timestamp)}
                    {typedItem.actor ? ` by ${typedItem.actor}` : ""}
                  </p>
                </div>
              </div>
            );
          }}
          title="Recent activity"
        />

        <NextActionsCard items={nextActions} />
      </section>

      <section>
        <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
          <div className="px-5 pb-4 pt-5">
            <SectionHeader
              actionLabel="View all"
              onAction={() => navigate("/client/documents")}
              title="Latest documents"
            />
          </div>
          {latestRecordsPreview.length > 0 ? (
            <div className="overflow-x-auto px-5 pb-5">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    <th className="pb-3 pr-4">Document</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Updated</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRecordsPreview.map((item: LatestRecordItem) => (
                    <tr className="border-b border-slate-100 last:border-b-0" key={item.id}>
                      <td className="py-3 pr-4 text-[0.92rem] text-slate-800">{item.name}</td>
                      <td className="py-3 pr-4 text-[0.84rem] text-slate-500">{item.type}</td>
                      <td className="py-3 pr-4 text-[0.84rem] text-slate-500">
                        {formatDateLabel(item.date)}
                      </td>
                      <td className="py-3">
                        <button
                          className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
                          onClick={() => triggerDownload(item.name)}
                          type="button"
                        >
                          {readyStatuses.has(item.status as MonthlyDocumentSlot["status"]) ? "Download" : "Open"}
                        </button>
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
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={uploadToSlot}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}