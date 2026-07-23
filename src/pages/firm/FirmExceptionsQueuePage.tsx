import { useEffect, useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { formatDateLabel } from "../../utils/formatters";

interface ExceptionItem {
  id: string;
  clientName: string;
  label: string;
  severity: "high" | "medium";
  source: "request" | "review" | "compliance";
  dueDate?: string;
}

interface BackendRequestRecord {
  id: string;
  clientId: string;
  title: string;
  priority: string;
  status: string;
  dueDateUtc?: string | null;
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
  createdAtUtc: string;
}

export function FirmExceptionsQueuePage() {
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveQueue, setLiveQueue] = useState<ExceptionItem[] | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<
    { tone: "neutral" | "info" | "success" | "warning" | "danger"; title: string; message: string } | null
  >(null);

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isActive = true;

    async function loadLiveQueue() {
      try {
        const [requests, reviewQueue, notifications] = await Promise.all([
          apiGetJson<BackendRequestRecord[]>("/api/requests"),
          apiGetJson<BackendReviewQueueRecord[]>("/api/review-queue"),
          apiGetJson<BackendNotificationRecord[]>("/api/notifications"),
        ]);

        if (!isActive) {
          return;
        }

        const requestExceptions: ExceptionItem[] = requests
          .filter((request) => ["awaiting_client", "awaiting_accountant", "client_replied"].includes(request.status))
          .map((request) => ({
            id: `req-${request.id}`,
            clientName:
              portal.adminClients.find((client) => client.id === request.clientId)?.clientName ?? "Client",
            label: request.title,
            severity: request.priority === "high" ? "high" : "medium",
            source: "request",
            dueDate: request.dueDateUtc ?? request.updatedAtUtc,
          }));

        const reviewExceptions: ExceptionItem[] = reviewQueue
          .filter((item) => {
            const status = (item.status ?? "").trim().toLowerCase();
            return status === "under_review" || status === "uploaded";
          })
          .map((item) => ({
            id: `review-${item.id}`,
            clientName: item.clientName ?? "Client",
            label: `${item.documentType ?? item.documentCategory ?? "Document"} review pending`,
            severity: "medium",
            source: "review",
            dueDate: item.submittedAtUtc ?? item.uploadedAtUtc,
          }));

        const complianceExceptions: ExceptionItem[] = notifications
          .filter((item) => {
            const type = item.type.trim().toLowerCase();
            return type.includes("compliance") || type.includes("expired") || type.includes("expiring");
          })
          .map((item) => ({
            id: `comp-${item.id}`,
            clientName:
              portal.adminClients.find((client) => client.id === item.clientId)?.clientName ?? "Client",
            label: item.title,
            severity: item.type.toLowerCase().includes("expired") ? "high" : "medium",
            source: "compliance",
            dueDate: item.createdAtUtc,
          }));

        setLiveQueue(
          [...complianceExceptions, ...requestExceptions, ...reviewExceptions].sort((a, b) =>
            (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
          ),
        );
        setFeedbackNotice(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setFeedbackNotice({
          tone: "warning",
          title: "Live exception queue unavailable",
          message:
            error instanceof ApiError
              ? error.message
              : "The live exception queue could not be loaded, so the seeded view is still shown.",
        });
      }
    }

    void loadLiveQueue();

    return () => {
      isActive = false;
    };
  }, [backendMode, portal.adminClients]);

  const queue = useMemo<ExceptionItem[]>(() => {
    const requestExceptions = portal.adminClients
      .flatMap((client) => portal.getClientWorkspace(client.id).requests)
      .filter((request) => ["awaiting_client", "awaiting_accountant"].includes(request.status))
      .map((request) => ({
        id: `req-${request.id}`,
        clientName: request.clientName,
        label: request.title,
        severity: "medium" as const,
        source: "request" as const,
        dueDate: request.dueDate,
      }));

    const reviewExceptions = portal
      .getReviewQueue()
      .filter((item) => item.status === "under_review")
      .map((item) => ({
        id: `review-${item.id}`,
        clientName: item.clientName,
        label: `${item.documentType} review pending`,
        severity: "medium" as const,
        source: "review" as const,
        dueDate: item.submittedAt,
      }));

    const complianceExceptions = portal.accountantComplianceCentre.expiredDocuments.map((document) => ({
      id: `comp-${document.id}`,
      clientName: document.clientName,
      label: `${document.name} expired`,
      severity: "high" as const,
      source: "compliance" as const,
      dueDate: document.expiryDate,
    }));

    return [...complianceExceptions, ...requestExceptions, ...reviewExceptions].sort((a, b) =>
      (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
    );
  }, [portal]);

  const visibleQueue = backendMode && liveQueue ? liveQueue : queue;

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
        <h1 className="text-xl font-semibold text-slate-950">Approval / Exception Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Operational inbox for overdue requests, unresolved review items, and compliance exceptions.
        </p>

        <div className="mt-4 space-y-3">
          {visibleQueue.map((item) => (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" key={item.id}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.clientName} - {item.source}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.severity === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                  {item.severity}
                </span>
                <p className="mt-1 text-xs text-slate-500">{item.dueDate ? formatDateLabel(item.dueDate) : "No due date"}</p>
              </div>
            </div>
          ))}
          {visibleQueue.length === 0 ? <p className="text-sm text-slate-500">No exceptions at this time.</p> : null}
        </div>
      </SurfaceCard>
    </>
  );
}
