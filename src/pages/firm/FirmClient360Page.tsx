import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { portalServiceApi } from "../../services/portalApi";
import type { FirmClientAccount, Tone } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

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
  reviewStatus?: string | null;
  rejectionReason?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendRequestRecord {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDateUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendReviewQueueRecord {
  id: string;
  clientId: string;
  status: string;
  documentType?: string | null;
  submittedAtUtc?: string | null;
}

interface LiveComplianceSummary {
  score: number;
  expiredCount: number;
  expiringCount: number;
  missingRequiredCount: number;
  approvedRequiredCount: number;
  requiredCount: number;
}

interface LiveClientWorkspace {
  client: FirmClientAccount;
  latestPack: BackendMonthlyPackRecord | null;
  slots: BackendDocumentSlotRecord[];
  openRequests: BackendRequestRecord[];
  pendingReviewCount: number;
  compliance: LiveComplianceSummary;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

type SlotDisplayStatus =
  | "missing"
  | "draft"
  | "partial"
  | "pending"
  | "pending_signature"
  | "uploaded"
  | "under_review"
  | "accepted"
  | "rejected"
  | "filed";

function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

function mapBackendSlotStatus(status: string): SlotDisplayStatus {
  const normalized = status.trim().toLowerCase();

  if (normalized === "not_started") return "missing";
  if (normalized === "draft") return "draft";
  if (normalized === "partial") return "partial";
  if (normalized === "pending") return "pending";
  if (normalized === "pending_signature") return "pending_signature";
  if (normalized === "submitted" || normalized === "uploaded") return "uploaded";
  if (normalized === "under_review") return "under_review";
  if (normalized === "accepted") return "accepted";
  if (normalized === "reupload_required" || normalized === "rejected") return "rejected";
  return "filed";
}

function mapRequestStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function slotStatusBadge(status: SlotDisplayStatus) {
  if (status === "accepted" || status === "filed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "under_review" || status === "uploaded") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function buildPackDueDate(pack: BackendMonthlyPackRecord, slots: BackendDocumentSlotRecord[]) {
  const dueDates = slots
    .map((slot) => slot.dueDateUtc)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right));

  if (dueDates.length > 0) {
    return dueDates[0];
  }

  const safeDay = Math.min(28, new Date(pack.year, pack.month, 0).getDate());
  return new Date(Date.UTC(pack.year, pack.month - 1, safeDay)).toISOString();
}

function buildLiveComplianceSummary(slots: BackendDocumentSlotRecord[]): LiveComplianceSummary {
  const requiredSlots = slots.filter((slot) => slot.isRequired);
  const now = Date.now();

  const approvedRequiredCount = requiredSlots.filter((slot) => {
    const mappedStatus = mapBackendSlotStatus(slot.status);
    return mappedStatus === "accepted" || mappedStatus === "filed";
  }).length;

  const missingRequiredCount = requiredSlots.filter((slot) => {
    const mappedStatus = mapBackendSlotStatus(slot.status);
    return (
      mappedStatus === "missing" ||
      mappedStatus === "draft" ||
      mappedStatus === "partial" ||
      mappedStatus === "pending" ||
      mappedStatus === "pending_signature" ||
      mappedStatus === "rejected"
    );
  }).length;

  const expiredCount = requiredSlots.filter((slot) => {
    if (!slot.dueDateUtc) {
      return false;
    }

    const mappedStatus = mapBackendSlotStatus(slot.status);
    return mappedStatus !== "accepted" && mappedStatus !== "filed" && new Date(slot.dueDateUtc).getTime() < now;
  }).length;

  const expiringCount = requiredSlots.filter((slot) => {
    if (!slot.dueDateUtc) {
      return false;
    }

    const mappedStatus = mapBackendSlotStatus(slot.status);
    const dueTime = new Date(slot.dueDateUtc).getTime();
    const daysUntilDue = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
    return mappedStatus !== "accepted" && mappedStatus !== "filed" && daysUntilDue >= 0 && daysUntilDue <= 14;
  }).length;

  const progressSource = requiredSlots.length > 0 ? requiredSlots : slots;
  const completedCount = progressSource.filter((slot) => {
    const mappedStatus = mapBackendSlotStatus(slot.status);
    return mappedStatus === "accepted" || mappedStatus === "filed" || mappedStatus === "under_review" || mappedStatus === "uploaded";
  }).length;
  const score = progressSource.length > 0 ? Math.round((completedCount / progressSource.length) * 100) : 0;

  return {
    score,
    expiredCount,
    expiringCount,
    missingRequiredCount,
    approvedRequiredCount,
    requiredCount: requiredSlots.length,
  };
}

export function FirmClient360Page() {
  const { clientId } = useParams();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveWorkspace, setLiveWorkspace] = useState<LiveClientWorkspace | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  const fallbackWorkspace = useMemo(() => {
    if (!clientId) {
      return null;
    }

    return portal.getClientWorkspace(clientId);
  }, [clientId, portal]);

  useEffect(() => {
    if (!backendMode || !clientId) {
      return;
    }

    let isActive = true;

    async function loadLiveWorkspace() {
      try {
        const [clients, requests, packs, reviewQueue] = await Promise.all([
          portalServiceApi.getAdminClients(),
          apiGetJson<BackendRequestRecord[]>("/api/requests"),
          apiGetJson<BackendMonthlyPackRecord[]>("/api/monthly-packs"),
          apiGetJson<BackendReviewQueueRecord[]>("/api/review-queue"),
        ]);

        const client = clients.find((item) => item.id === clientId);
        if (!client) {
          throw new Error("The selected client could not be loaded from the live backend.");
        }

        const latestPack = packs
          .filter((pack) => pack.clientId === clientId)
          .sort((left, right) => right.year * 100 + right.month - (left.year * 100 + left.month))[0] ?? null;

        const slots = latestPack
          ? await apiGetJson<BackendDocumentSlotRecord[]>(`/api/document-slots/${encodeURIComponent(latestPack.id)}`)
          : [];

        if (!isActive) {
          return;
        }

        const openRequests = requests
          .filter(
            (request) =>
              request.clientId === clientId &&
              !["resolved", "closed"].includes(request.status.trim().toLowerCase()),
          )
          .sort((left, right) => {
            const leftDue = left.dueDateUtc ?? left.createdAtUtc;
            const rightDue = right.dueDateUtc ?? right.createdAtUtc;
            return new Date(leftDue).getTime() - new Date(rightDue).getTime();
          });

        const pendingReviewCount = reviewQueue.filter((item) => item.clientId === clientId).length;

        setLiveWorkspace({
          client,
          latestPack,
          slots,
          openRequests,
          pendingReviewCount,
          compliance: buildLiveComplianceSummary(slots),
        });
        setFeedbackNotice(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setFeedbackNotice({
          tone: "warning",
          title: "Live client profile unavailable",
          message:
            error instanceof ApiError || error instanceof Error
              ? error.message
              : "The live client profile could not be loaded, so the seeded workspace view is still shown.",
        });
      }
    }

    void loadLiveWorkspace();

    return () => {
      isActive = false;
    };
  }, [backendMode, clientId]);

  if (!clientId) {
    return (
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <EmptyState title="Client not found" description="No client profile is available for this route." />
      </SurfaceCard>
    );
  }

  const activeClient = liveWorkspace?.client ?? fallbackWorkspace?.client ?? null;

  if (!activeClient) {
    return (
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <EmptyState title="Client not found" description="No client profile is available for this route." />
      </SurfaceCard>
    );
  }

  const compliance = liveWorkspace
    ? liveWorkspace.compliance
    : {
        score: fallbackWorkspace?.compliance?.score ?? activeClient.completionRate,
        expiredCount: fallbackWorkspace?.compliance?.expiredCount ?? 0,
        expiringCount: fallbackWorkspace?.compliance?.expiringCount ?? 0,
        missingRequiredCount: fallbackWorkspace?.compliance?.missingRequiredCount ?? 0,
        approvedRequiredCount: 0,
        requiredCount: 0,
      };

  const openRequests = liveWorkspace?.openRequests ?? fallbackWorkspace?.requests.filter((request) => !["resolved", "closed"].includes(request.status)) ?? [];
  const latestPack = liveWorkspace?.latestPack ?? null;
  const slots = liveWorkspace?.slots ?? [];
  const latestPackDueDate = latestPack ? buildPackDueDate(latestPack, slots) : null;
  const pendingReviewCount = liveWorkspace?.pendingReviewCount ?? 0;
  const previewSlots = slots.slice(0, 5);

  return (
    <div className="space-y-4">
      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h1 className="text-xl font-semibold text-slate-950">Client 360 Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Business, monthly packs, compliance, and open requests in one workspace.
        </p>
      </SurfaceCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Business Profile</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Client</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{activeClient.clientName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Industry</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{activeClient.industry}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Primary accountant</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{activeClient.assignedAccountant}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Completion</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{compliance.score}%</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
          <h2 className="text-sm font-semibold text-slate-900">Compliance Profile</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>Score: {compliance.score}</p>
            <p>Expired: {compliance.expiredCount}</p>
            <p>Expiring: {compliance.expiringCount}</p>
            <p>Missing required: {compliance.missingRequiredCount}</p>
            {liveWorkspace ? (
              <p>Approved required: {compliance.approvedRequiredCount}/{Math.max(compliance.requiredCount, 0)}</p>
            ) : null}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
          <h2 className="text-sm font-semibold text-slate-900">Monthly Pack Snapshot</h2>
          {latestPack ? (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Current pack</p>
                <p className="mt-1 font-semibold text-slate-900">{formatMonthLabel(latestPack.year, latestPack.month)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Required slots approved</p>
                  <p className="mt-1 font-semibold text-slate-900">{compliance.approvedRequiredCount}/{Math.max(compliance.requiredCount, 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Pending review</p>
                  <p className="mt-1 font-semibold text-slate-900">{pendingReviewCount}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Pack due date</p>
                <p className="mt-1 font-semibold text-slate-900">{latestPackDueDate ? formatDateLabel(latestPackDueDate) : "Not set"}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No live monthly pack was returned for this client yet.</p>
          )}
        </SurfaceCard>

        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
          <h2 className="text-sm font-semibold text-slate-900">Open Requests</h2>
          <div className="mt-3 space-y-2">
            {openRequests.map((request) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={request.id}>
                <p className="text-sm font-semibold text-slate-900">{request.title}</p>
                <p className="mt-1 text-xs text-slate-500">{mapRequestStatusLabel(request.status)}{(("dueDateUtc" in request && request.dueDateUtc) ? ` | Due ${formatDateLabel(request.dueDateUtc)}` : ("dueDate" in request && request.dueDate ? ` | Due ${formatDateLabel(request.dueDate)}` : ""))}</p>
                {"description" in request && request.description ? (
                  <p className="mt-2 text-sm text-slate-600">{request.description}</p>
                ) : null}
              </div>
            ))}
            {openRequests.length === 0 ? <p className="text-sm text-slate-500">No open requests.</p> : null}
          </div>
        </SurfaceCard>
      </div>

      {previewSlots.length > 0 ? (
        <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
          <h2 className="text-sm font-semibold text-slate-900">Current Slot Status</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {previewSlots.map((slot) => {
              const mappedStatus = mapBackendSlotStatus(slot.status);
              return (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={slot.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{slot.category}{slot.dueDateUtc ? ` | Due ${formatDateLabel(slot.dueDateUtc)}` : ""}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.04em] ring-1 ring-inset ${slotStatusBadge(mappedStatus)}`}>
                      {mapRequestStatusLabel(mappedStatus)}
                    </span>
                  </div>
                  {slot.rejectionReason ? (
                    <p className="mt-2 text-sm text-rose-700">{slot.rejectionReason}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

