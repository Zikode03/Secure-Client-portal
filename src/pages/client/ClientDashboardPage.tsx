// Friendly guide: this module (ClientDashboardPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  slotProgress,
  supportsExpiryDate,
  type SlotSubmissionMeta,
} from "../../services/clientMonthlyPackBackend";
import { recalculatePack } from "../../services/workflowEngine";
import type {
  DocumentRecord,
  ExpiringDocumentItem,
  InvoiceRecord,
  LatestRecordItem,
  MonthlyDocumentSlot,
  MonthlyPack,
  SmartAlertItem,
  Tone,
  UploadSubmission,
  WorkflowRequest,
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
  "client-dashboard-action-button inline-flex items-center justify-center rounded-lg font-medium transition hover:-translate-y-0.5 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

interface BackendMonthlyPackRecord {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendDocumentSlotRecord {
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
  rejectionReason?: string | null;
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
  currentVersionNumber: number;
  uploadedAtUtc: string;
  updatedAtUtc: string;
}

interface BackendRequestRecord {
  id: string;
  clientId: string;
  requestType: string;
  relatedDocumentId?: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDateUtc?: string | null;
  requestedByUserId: string;
  requestedAtUtc: string;
  updatedAtUtc: string;
}

interface BackendNotificationRecord {
  id: string;
  userId: string;
  clientId?: string | null;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAtUtc: string;
}

interface BackendComplianceAlertRecord {
  complianceItemId: string;
  clientId: string;
  name: string;
  categoryName?: string | null;
  status: string;
  riskLevel: string;
  expiryDateUtc?: string | null;
  dueDateUtc?: string | null;
  ownerName?: string | null;
  alertLevel?: string | null;
  message: string;
}

interface BackendComplianceSummaryClientRecord {
  clientId: string;
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  missing: number;
  pending: number;
  rejected: number;
  criticalRisk: number;
  highRisk: number;
  complianceScore: number;
}

interface BackendComplianceSummaryResponse {
  generatedAtUtc: string;
  clients: BackendComplianceSummaryClientRecord[];
  totals: {
    totalItems: number;
    valid: number;
    expiringSoon: number;
    expired: number;
    missing: number;
    criticalRisk: number;
    highRisk: number;
  };
}

interface LiveClientDashboardData {
  monthPack: MonthlyPack;
  documents: DocumentRecord[];
  invoices: InvoiceRecord[];
  requests: WorkflowRequest[];
  latestOverallDocuments: LatestRecordItem[];
  expiringDocuments: ExpiringDocumentItem[];
  smartAlerts: SmartAlertItem[];
  complianceScore: number;
  expiredComplianceCount: number;
  expiringComplianceCount: number;
}


function normalizeClientRequestStatus(
  status: string | undefined,
  requestedByUserId: string,
  currentUserId: string,
): WorkflowRequest["status"] {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "resolved") {
    return "resolved";
  }

  if (normalized === "closed") {
    return "closed";
  }

  if (normalized === "awaiting_client" || normalized === "waiting_on_client" || normalized === "client_replied") {
    return "awaiting_client";
  }

  if (normalized === "awaiting_accountant" || normalized === "waiting_on_accountant") {
    return "awaiting_accountant";
  }

  if (normalized === "overdue") {
    return requestedByUserId === currentUserId ? "awaiting_accountant" : "awaiting_client";
  }

  return requestedByUserId === currentUserId ? "awaiting_accountant" : "awaiting_client";
}

function toRequestPriority(priority?: string): WorkflowRequest["priority"] {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function mapComplianceTone(status: string, riskLevel: string): Tone {
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedRisk = riskLevel.trim().toLowerCase();

  if (normalizedStatus === "expired" || normalizedStatus === "rejected" || normalizedRisk === "critical") {
    return "danger";
  }

  if (normalizedStatus === "expiring_soon" || normalizedStatus === "missing" || normalizedRisk === "high") {
    return "warning";
  }

  return "info";
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

function AlertListIcon() {
  return (
    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef4fa] text-brand-700 ring-1 ring-[#d7e3ee]">
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

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7e3ee] bg-[#eef4fa] text-brand-700">
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

function slotAccent(status: MonthlyDocumentSlot["status"]) {
  if (status === "accepted" || status === "filed" || status === "under_review" || status === "uploaded") {
    return "bg-emerald-400";
  }

  if (status === "rejected") {
    return "bg-rose-400";
  }

  if (status === "pending_signature" || status === "partial" || status === "pending") {
    return "bg-amber-400";
  }

  return "bg-slate-300";
}

function MonthlyPackPreviewCard({
  pack,
  onOpenPack,
}: {
  pack: MonthlyPack;
  onOpenPack: () => void;
}) {
  const progress = Math.max(0, Math.min(pack.progressPercent, 100));
  const activeReviewCount = pack.slots.filter((slot) =>
    ["uploaded", "under_review"].includes(slot.status),
  ).length;
  const rejectedCount = pack.slots.filter((slot) => slot.status === "rejected").length;
  const remainingCount = Math.max(0, pack.totalCount - pack.completedCount);
  const packSlots = [...pack.slots].sort((first, second) => {
    if (first.isRequired !== second.isRequired) {
      return first.isRequired ? -1 : 1;
    }

    return first.documentType.localeCompare(second.documentType);
  });

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

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center xl:grid-cols-[300px_minmax(0,1fr)]">
        <div
          aria-label={`${progress}% complete`}
          className="client-dashboard-progress-track relative mx-auto flex h-48 w-48 items-center justify-center rounded-full lg:h-56 lg:w-56"
          style={{
            background: `conic-gradient(var(--client-dashboard-progress-fill) ${progress * 3.6}deg, var(--client-dashboard-progress-track) 0deg)`,
          }}
        >
          <div className="flex h-[152px] w-[152px] flex-col items-center justify-center rounded-full bg-white shadow-inner lg:h-[178px] lg:w-[178px]">
            <span className="text-[2rem] font-medium tracking-tight text-[#091333]">{progress}%</span>
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-[#e8ecf5] bg-[#fbfcff] px-4 py-3">
              <p className="text-[0.72rem] font-semibold text-[#53617f]">Due Date</p>
              <p className="mt-1 text-[0.88rem] font-semibold text-[#091333]">{formatDateLabel(pack.dueDate)}</p>
            </div>
            <div className="rounded-xl border border-[#e8ecf5] bg-[#fbfcff] px-4 py-3">
              <p className="text-[0.72rem] font-semibold text-[#53617f]">Status</p>
              <p className="mt-1 text-[0.88rem] font-semibold text-brand-700">
                {rejectedCount > 0
                  ? "Needs attention"
                  : activeReviewCount > 0
                    ? "Review active"
                    : remainingCount === 0
                      ? "Ready"
                      : "Awaiting uploads"}
              </p>
            </div>
            <div className="rounded-xl border border-[#e8ecf5] bg-[#fbfcff] px-4 py-3 sm:col-span-2 xl:col-span-1">
              <p className="text-[0.72rem] font-semibold text-[#53617f]">Checklist</p>
              <p className="mt-1 text-[0.88rem] font-semibold text-[#091333]">
                {pack.totalCount - pack.completedCount} remaining
              </p>
            </div>
          </div>

          {packSlots.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {packSlots.map((slot) => (
                <div
                  className="group relative min-h-[94px] overflow-hidden rounded-xl border border-[#e4ebf3] bg-[#fbfcff] px-4 py-3 transition hover:-translate-y-0.5 hover:border-brand-700/20 hover:bg-white hover:shadow-[0_14px_28px_rgba(4,24,52,0.08)]"
                  key={slot.id}
                >
                  <span className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", slotAccent(slot.status))} />
                  <div className="flex h-full min-w-0 flex-col items-start justify-between gap-3 pl-1">
                    <div className="min-w-0">
                      <p className="text-[0.84rem] font-semibold leading-5 text-[#091333]">{slot.documentType}</p>
                      {slot.lastSubmission ? (
                        <p className="mt-1 text-[0.74rem] text-[#53617f]">
                          Updated {formatDateLabel(slot.lastSubmission)}
                        </p>
                      ) : null}
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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [liveDashboardData, setLiveDashboardData] = useState<LiveClientDashboardData | null>(null);
  const [liveLoadStatus, setLiveLoadStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [dashboardNotice, setDashboardNotice] = useState<{
    tone: Tone;
    title: string;
    message: string;
  } | null>(null);
  const [livePackId, setLivePackId] = useState("");
  const [liveSlotMetaById, setLiveSlotMetaById] = useState<Record<string, SlotSubmissionMeta>>({});
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
  const backendClientId = user?.clientIds[0] ?? "";
  const backendMode = hasApiBaseUrl() && Boolean(backendClientId);

  async function triggerBackendDownload(documentId: string, fileName: string) {
    const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(documentId)}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function loadBackendDashboard() {
    if (!backendMode) {
      return;
    }

    setLiveLoadStatus("loading");

    try {
      const [packs, allDocuments, requestsData, notifications, alerts, summary] = await Promise.all([
        apiGetJson<BackendMonthlyPackRecord[]>(
          `/api/monthly-packs?clientId=${encodeURIComponent(backendClientId)}`,
        ),
        apiGetJson<BackendDocumentRecord[]>("/api/documents"),
        apiGetJson<BackendRequestRecord[]>("/api/requests"),
        apiGetJson<BackendNotificationRecord[]>("/api/notifications"),
        apiGetJson<BackendComplianceAlertRecord[]>(
          `/api/compliance/alerts?clientId=${encodeURIComponent(backendClientId)}`,
        ),
        apiGetJson<BackendComplianceSummaryResponse>(
          `/api/compliance/reports/summary?clientId=${encodeURIComponent(backendClientId)}`,
        ),
      ]);

      const currentPack = packs[0];
      if (!currentPack) {
        setLiveDashboardData(null);
        setLivePackId("");
        setLiveSlotMetaById({});
        setLiveLoadStatus("empty");
        return;
      }

      const slots = await apiGetJson<BackendDocumentSlotRecord[]>(
        `/api/document-slots/${encodeURIComponent(currentPack.id)}`,
      );

      const packById = new Map(
        packs.map((pack) => [pack.id, pack] satisfies [string, BackendMonthlyPackRecord]),
      );
      const businessName = user?.company ?? "Client";
      const currentUserName = user?.fullName ?? user?.name ?? "Client user";
      const clientDocuments = allDocuments.filter((document) => document.clientId === backendClientId);

      const mappedSlots = slots.map<MonthlyDocumentSlot>((slot) => {
        const pack = packById.get(slot.monthlyPackId) ?? currentPack;
        const mappedStatus = mapBackendSlotStatus(slot.status, slot.isRequired);
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

      const mappedDocuments = clientDocuments.map<DocumentRecord>((document) => {
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

      const mappedInvoices = clientDocuments
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

      const mappedRequests = requestsData
        .filter((request) => request.clientId === backendClientId)
        .map<WorkflowRequest>((request) => ({
          id: request.id,
          clientId: request.clientId,
          clientName: businessName,
          title: request.title,
          description: request.description,
          monthLabel: formatDateLabel(request.dueDateUtc ?? request.requestedAtUtc),
          status: normalizeClientRequestStatus(request.status, request.requestedByUserId, user?.id ?? ""),
          priority: toRequestPriority(request.priority),
          relatedDocumentId: request.relatedDocumentId ?? undefined,
          requestedBy: request.requestedByUserId === user?.id ? currentUserName : "Assigned accountant",
          requestedByRole: request.requestedByUserId === user?.id ? "client" : "accountant",
          assignedTo: "Assigned accountant",
          dueDate: request.dueDateUtc ?? request.updatedAtUtc,
          createdAt: request.requestedAtUtc,
          comments: [],
          auditTrail: [],
        }));

      const latestRecords = [...mappedDocuments]
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
        .slice(0, 5)
        .map<LatestRecordItem>((document) => ({
          id: document.id,
          name: document.fileName,
          type: document.documentType,
          date: document.uploadedAt,
          status: document.status,
          kind: isInvoiceCategory(document.documentType) ? "invoice" : "document",
        }));

      const expiringDocuments = alerts
        .filter((alert) => alert.status === "expired" || alert.status === "expiring_soon")
        .slice(0, 4)
        .map<ExpiringDocumentItem>((alert) => {
          const expiryDate = alert.expiryDateUtc ?? alert.dueDateUtc ?? new Date().toISOString();
          const daysRemaining = Math.ceil(
            (new Date(expiryDate).getTime() - Date.now()) / 86_400_000,
          );

          return {
            id: alert.complianceItemId,
            fileName: alert.name,
            documentType: alert.categoryName ?? alert.name,
            expiresOn: expiryDate,
            owner: alert.ownerName ?? "Client",
            tone: mapComplianceTone(alert.status, alert.riskLevel),
            daysRemaining,
            status: alert.status === "expired" ? "expired" : "expiring_soon",
            alertMessage: alert.message,
          };
        });

      const smartAlerts = alerts
        .slice(0, 4)
        .map<SmartAlertItem>((alert) => ({
          id: alert.complianceItemId,
          title: alert.name,
          message: alert.message,
          tone: mapComplianceTone(alert.status, alert.riskLevel),
          category:
            alert.status === "missing"
              ? "completeness"
              : alert.riskLevel === "critical" || alert.riskLevel === "high"
                ? "anomaly"
                : "reconciliation",
        }));

      const clientSummary = summary.clients.find((item) => item.clientId === backendClientId);
      const missingDocumentNotifications = notifications.filter((item) =>
        item.type.trim().toLowerCase().includes("missing"),
      );

      setLivePackId(currentPack.id);
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
      setLiveDashboardData({
        monthPack: mappedPack,
        documents: mappedDocuments,
        invoices: mappedInvoices,
        requests: mappedRequests,
        latestOverallDocuments: latestRecords,
        expiringDocuments,
        smartAlerts:
          smartAlerts.length > 0
            ? smartAlerts
            : missingDocumentNotifications.slice(0, 2).map((notification) => ({
                id: notification.id,
                title: notification.title,
                message: notification.message,
                tone: "warning",
                category: "completeness",
              })),
        complianceScore: clientSummary?.complianceScore ?? 0,
        expiredComplianceCount: clientSummary?.expired ?? 0,
        expiringComplianceCount: clientSummary?.expiringSoon ?? 0,
      });
      setDashboardNotice(null);
      setLiveLoadStatus("ready");
    } catch (error) {
      setLiveDashboardData(null);
      setLiveLoadStatus("error");
      setDashboardNotice({
        tone: "danger",
        title: "Live dashboard unavailable",
        message:
          error instanceof ApiError
            ? error.message
            : "The dashboard could not load live data. No demo records are being shown.",
      });
    }
  }

  useEffect(() => {
    void loadBackendDashboard();
  }, [backendClientId, backendMode, user?.id, user?.fullName, user?.company]);

  const effectiveDocuments = backendMode && liveDashboardData ? liveDashboardData.documents : documents;
  const effectiveInvoices = backendMode && liveDashboardData ? liveDashboardData.invoices : invoices;
  const effectiveMonthPack = backendMode && liveDashboardData ? liveDashboardData.monthPack : monthPack;
  const effectiveRequests = backendMode && liveDashboardData ? liveDashboardData.requests : requests;
  const effectiveLatestOverallDocuments =
    backendMode && liveDashboardData ? liveDashboardData.latestOverallDocuments : latestOverallDocuments;
  const effectiveExpiringDocuments =
    backendMode && liveDashboardData ? liveDashboardData.expiringDocuments : expiringDocuments;
  const effectiveSmartAlerts =
    backendMode && liveDashboardData ? liveDashboardData.smartAlerts : smartAlerts;
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

  const highlightedEffectiveSlot = useMemo(
    () => getHighlightedSlot(effectiveMonthPack),
    [effectiveMonthPack],
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
  const expiringPreview = useMemo(() => effectiveExpiringDocuments.slice(0, 2), [effectiveExpiringDocuments]);
  const alertsPreview = useMemo(() => effectiveSmartAlerts.slice(0, 2), [effectiveSmartAlerts]);
  const latestRecordsPreview = useMemo(
    () => effectiveLatestOverallDocuments.slice(0, 5),
    [effectiveLatestOverallDocuments],
  );
  const nextActions = useMemo<NextActionItem[]>(() => {
    const items: NextActionItem[] = [];
    const rejectedSlot = blockingSlots.find((slot) => slot.status === "rejected");
    const missingSlot = blockingSlots.find((slot) => slot.status === "missing");
    const signatureSlot = blockingSlots.find((slot) => slot.status === "pending_signature");
    const openFollowUps = effectiveRequests
      .filter((request) => request.status !== "resolved" && request.status !== "closed")
      .slice(0, 2);
    const expiringDocument = effectiveExpiringDocuments[0];

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

    if (
      (backendMode ? Boolean(backendSubmittableSlot) : effectiveMonthPack.canComplete) &&
      !isPackReadOnly
    ) {
      items.push({
        id: backendMode ? "submit-slot" : "submit-month",
        title: backendMode ? "Submit the next ready slot" : "Submit this month",
        detail: backendMode
          ? "The next slot that passes backend validation is ready for accountant review."
          : "All required documents are ready for accountant review.",
        ctaLabel: "Submit",
        tone: "success",
        onAction: () => {
          if (backendMode) {
            void handleLiveSubmit();
            return;
          }

          submitMonth();
        },
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
  }, [
    backendMode,
    backendSubmittableSlot,
    blockingSlots,
    effectiveExpiringDocuments,
    effectiveMonthPack.canComplete,
    isPackReadOnly,
    navigate,
    effectiveRequests,
    submitMonth,
  ]);

  const openRequestsCount = useMemo(
    () => effectiveRequests.filter((request) => request.status !== "resolved" && request.status !== "closed").length,
    [effectiveRequests],
  );

  const waitingOnClientCount = useMemo(
    () => effectiveRequests.filter((request) => request.status === "awaiting_client").length,
    [effectiveRequests],
  );

  const complianceHealth =
    backendMode && liveDashboardData
      ? liveDashboardData.complianceScore
      : portal.clientComplianceCentre.overallScore;
  const expiredComplianceCount =
    backendMode && liveDashboardData
      ? liveDashboardData.expiredComplianceCount
      : portal.clientComplianceCentre.expiredDocuments.length;
  const expiringComplianceCount =
    backendMode && liveDashboardData
      ? liveDashboardData.expiringComplianceCount
      : portal.clientComplianceCentre.expiringDocuments.length;

  function handleOpenUpload(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      showFeedbackNotice("danger", "No slot selected", "Choose a checklist slot before uploading.");
      return;
    }

    setSelectedSlot(slot);
    uploadModal.open();
  }

  async function handleLiveUpload(submission: UploadSubmission) {
    if (!livePackId || !submission.file || !backendClientId) {
      showFeedbackNotice(
        "danger",
        "Upload failed",
        "The live monthly pack context is missing. Refresh the page and try again.",
      );
      return;
    }

    const targetSlotMeta = liveSlotMetaById[submission.slotId];
    const form = buildSlotUploadForm({
      clientId: backendClientId,
      monthlyPackId: livePackId,
      submission,
      currentDocumentId: targetSlotMeta?.currentDocumentId,
    });

    try {
      await apiPostForm("/api/documents/upload", form);
      await loadBackendDashboard();
      showFeedbackNotice(
        "success",
        targetSlotMeta?.currentDocumentId ? "New version uploaded" : "Upload saved",
        `${submission.documentType} was uploaded into its slot and is ready for the next review step.`,
      );
    } catch (error) {
      showFeedbackNotice(
        "danger",
        "Upload failed",
        error instanceof ApiError
          ? error.message
          : "The document could not be uploaded to the backend.",
      );
    }
  }

  async function handleLiveSubmit() {
    if (!backendSubmittableSlot) {
      showFeedbackNotice(
        "warning",
        "Nothing ready to submit",
        "Upload or correct a checklist slot before sending it for accountant review.",
      );
      return;
    }

    try {
      await apiPostJson(`/api/document-slots/${encodeURIComponent(backendSubmittableSlot.id)}/submit`, {});
      await loadBackendDashboard();
      showFeedbackNotice(
        "success",
        "Slot submitted",
        `${backendSubmittableSlot.documentType} was submitted as its own review task.`,
      );
    } catch (error) {
      showFeedbackNotice(
        "danger",
        "Submission failed",
        error instanceof ApiError
          ? error.message
          : "The selected slot could not be submitted for review.",
      );
    }
  }

  function handleOpenWorkspace() {
    navigate("/client/packs#pack-checklist");
    setOptionsOpen(false);
  }

  if (backendMode && liveLoadStatus !== "ready") {
    const isLoading = liveLoadStatus === "idle" || liveLoadStatus === "loading";
    return (
      <div className="portal-page mx-auto max-w-[1240px] space-y-5">
        {dashboardNotice ? (
          <FeedbackBanner
            message={dashboardNotice.message}
            onDismiss={() => setDashboardNotice(null)}
            title={dashboardNotice.title}
            tone={dashboardNotice.tone}
          />
        ) : null}
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            description={
              isLoading
                ? "Your live client workspace is being loaded securely."
                : liveLoadStatus === "empty"
                  ? "No monthly pack has been created for this client yet. Ask your accountant to open the current pack."
                  : "The live dashboard could not be loaded. Check the connection and try again."
            }
            title={isLoading ? "Loading dashboard" : liveLoadStatus === "empty" ? "No active monthly pack" : "Dashboard unavailable"}
          />
          {!isLoading ? (
            <div className="mt-5 flex justify-center">
              <Button onClick={() => void loadBackendDashboard()}>Try again</Button>
            </div>
          ) : null}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="portal-page mx-auto max-w-[1240px] space-y-5">
      <section className="relative overflow-visible rounded-2xl border border-[#dce6ef] bg-[linear-gradient(135deg,#062044_0%,#0a2f66_54%,#1d8b66_100%)] p-5 text-white shadow-[0_24px_60px_rgba(4,24,52,0.18)] md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(150,224,113,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_34%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white/80">
              Client Workspace
            </div>
            <h1 className="portal-page-title text-white">
              Welcome back, {user?.name?.split(" ")[0] ?? "John"}
            </h1>
            <p className="max-w-2xl text-[0.95rem] leading-6 text-white/78">
              Resolve blockers, upload missing files, and keep each slot moving through review. Pack progress stays visible as a summary while slot actions stay front and centre.
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-2.5 sm:flex-nowrap lg:justify-end">
          <Button
            className="client-dashboard-action-button h-10 rounded-lg border-0 px-4 text-sm font-medium ring-0 hover:-translate-y-0.5 active:translate-y-px"
            disabled={isPackReadOnly}
            onClick={() => handleOpenUpload(highlightedEffectiveSlot)}
          >
            <CloudUpload aria-hidden="true" className="h-4 w-4" />
            <span>Upload missing</span>
          </Button>
          <Button
            className="h-10 rounded-xl bg-[#8ccf45] px-4 text-sm text-[#062044] shadow-[0_14px_28px_rgba(9,34,66,0.22)] hover:bg-[#9ad955]"
            disabled={
              (backendMode ? !backendSubmittableSlot : !effectiveMonthPack.canComplete) ||
              isPackReadOnly
            }
            onClick={() => {
              if (backendMode) {
                void handleLiveSubmit();
                return;
              }

              submitMonth();
            }}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            <span>{backendMode ? "Submit ready slot" : "Submit month"}</span>
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

      {dashboardNotice ? (
        <FeedbackBanner
          message={dashboardNotice.message}
          onDismiss={() => setDashboardNotice(null)}
          title={dashboardNotice.title}
          tone={dashboardNotice.tone}
        />
      ) : null}

      <div className="grid items-stretch gap-5 md:grid-cols-2">
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
          helper={`${effectiveMonthPack.progressPercent}% complete`}
          icon={<FolderOpen aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />}
          label="Pack Progress"
          progress={effectiveMonthPack.progressPercent}
          value={`${effectiveMonthPack.completedCount} / ${effectiveMonthPack.totalCount}`}
        />
      </div>

      <section className="grid items-stretch gap-5">
        <NextActionsCard items={nextActions} />
        <MonthlyPackPreviewCard onOpenPack={handleOpenWorkspace} pack={effectiveMonthPack} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <CompactListCard
          className="bg-white"
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
          className="bg-white"
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
                <AlertListIcon />
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
                            onClick={() => {
                              if (backendMode) {
                                void triggerBackendDownload(item.id, item.name);
                                return;
                              }

                              triggerDownload(item.name);
                            }}
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
        onUploaded={(submission) => {
          if (backendMode) {
            void handleLiveUpload(submission);
            return;
          }

          uploadToSlot(submission);
        }}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
