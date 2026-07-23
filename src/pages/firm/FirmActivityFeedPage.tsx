import { useEffect, useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { formatDateLabel } from "../../utils/formatters";

interface FeedItem {
  id: string;
  title: string;
  detail: string;
  actor: string;
  timestamp: string;
  source: "request" | "review" | "compliance";
}

interface BackendRequestRecord {
  id: string;
  clientId: string;
  title: string;
  status: string;
  updatedAtUtc: string;
}

interface BackendReviewQueueRecord {
  id: string;
  clientName?: string | null;
  status?: string | null;
  documentType?: string | null;
  documentCategory?: string | null;
  submittedAtUtc?: string | null;
  uploadedAtUtc?: string;
}

interface BackendNotificationRecord {
  id: string;
  clientId?: string | null;
  type: string;
  title: string;
  message: string;
  createdAtUtc: string;
}

export function FirmActivityFeedPage() {
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveFeed, setLiveFeed] = useState<FeedItem[] | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<
    { tone: "neutral" | "info" | "success" | "warning" | "danger"; title: string; message: string } | null
  >(null);

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isActive = true;

    async function loadLiveFeed() {
      try {
        const [requests, reviewQueue, notifications] = await Promise.all([
          apiGetJson<BackendRequestRecord[]>("/api/requests"),
          apiGetJson<BackendReviewQueueRecord[]>("/api/review-queue"),
          apiGetJson<BackendNotificationRecord[]>("/api/notifications"),
        ]);

        if (!isActive) {
          return;
        }

        const requestItems: FeedItem[] = requests.map((request) => ({
          id: `request-${request.id}`,
          title: request.title,
          detail: request.status.replace(/_/g, " "),
          actor:
            portal.adminClients.find((client) => client.id === request.clientId)?.assignedAccountant ??
            "Assigned accountant",
          timestamp: request.updatedAtUtc,
          source: "request",
        }));

        const reviewItems: FeedItem[] = reviewQueue.map((item) => ({
          id: `review-${item.id}`,
          title: `${item.clientName ?? "Client"} - ${item.documentType ?? item.documentCategory ?? "Document"}`,
          detail: (item.status ?? "uploaded").replace(/_/g, " "),
          actor:
            portal.adminClients.find((client) => client.clientName === item.clientName)?.assignedAccountant ??
            "Assigned accountant",
          timestamp: item.submittedAtUtc ?? item.uploadedAtUtc ?? new Date().toISOString(),
          source: "review",
        }));

        const complianceItems: FeedItem[] = notifications
          .filter((item) => {
            const type = item.type.trim().toLowerCase();
            return type.includes("compliance") || type.includes("expired") || type.includes("expiring");
          })
          .map((item) => ({
            id: `compliance-${item.id}`,
            title: item.title,
            detail: item.message,
            actor:
              portal.adminClients.find((client) => client.id === item.clientId)?.assignedAccountant ?? "System",
            timestamp: item.createdAtUtc,
            source: "compliance",
          }));

        setLiveFeed(
          [...requestItems, ...reviewItems, ...complianceItems]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 200),
        );
        setFeedbackNotice(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setFeedbackNotice({
          tone: "warning",
          title: "Live activity feed unavailable",
          message:
            error instanceof ApiError
              ? error.message
              : "The live activity feed could not be loaded, so the seeded view is still shown.",
        });
      }
    }

    void loadLiveFeed();

    return () => {
      isActive = false;
    };
  }, [backendMode, portal.adminClients]);

  const feed = useMemo<FeedItem[]>(() => {
    const requestItems = portal.adminClients
      .flatMap((client) => portal.getClientWorkspace(client.id).requests)
      .flatMap((request) =>
        request.auditTrail.map((entry) => ({
          id: `${request.id}-${entry.id}`,
          title: request.title,
          detail: entry.status,
          actor: entry.actor,
          timestamp: entry.timestamp,
          source: "request" as const,
        })),
      );

    const reviewItems = portal
      .getReviewQueue()
      .map((item) => ({
        id: `review-${item.id}`,
        title: `${item.clientName} - ${item.documentType}`,
        detail: item.status.replace(/_/g, " "),
        actor: item.assignedAccountant,
        timestamp: item.submittedAt,
        source: "review" as const,
      }));

    const complianceItems = portal.accountantComplianceCentre.auditTrail.map((entry) => ({
      id: `compliance-${entry.id}`,
      title: entry.action.replace(/_/g, " "),
      detail: entry.detail,
      actor: entry.actor,
      timestamp: entry.timestamp,
      source: "compliance" as const,
    }));

    return [...requestItems, ...reviewItems, ...complianceItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200);
  }, [portal]);

  const visibleFeed = backendMode && liveFeed ? liveFeed : feed;

  return (
    <>
      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h1 className="text-xl font-semibold text-slate-950">Unified Activity / Audit Feed</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cross-module timeline for requests, review actions, and compliance events.
        </p>

        <div className="mt-4 space-y-3">
          {visibleFeed.map((item) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {item.source}
                </span>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.detail}</p>
              <p className="mt-1 text-xs text-slate-500">{item.actor} - {formatDateLabel(item.timestamp)}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </>
  );
}
