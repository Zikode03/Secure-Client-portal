import { useMemo } from "react";
import { usePortal } from "../../app/portal";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

interface ExceptionItem {
  id: string;
  clientName: string;
  label: string;
  severity: "high" | "medium";
  source: "request" | "review" | "compliance";
  dueDate?: string;
}

export function FirmExceptionsQueuePage() {
  const portal = usePortal();

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

  return (
    <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
      <h1 className="text-xl font-semibold text-slate-950">Approval / Exception Queue</h1>
      <p className="mt-1 text-sm text-slate-500">
        Operational inbox for overdue requests, unresolved review items, and compliance exceptions.
      </p>

      <div className="mt-4 space-y-3">
        {queue.map((item) => (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" key={item.id}>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{item.clientName} · {item.source}</p>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.severity === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                {item.severity}
              </span>
              <p className="mt-1 text-xs text-slate-500">{item.dueDate ? formatDateLabel(item.dueDate) : "No due date"}</p>
            </div>
          </div>
        ))}
        {queue.length === 0 ? <p className="text-sm text-slate-500">No exceptions at this time.</p> : null}
      </div>
    </SurfaceCard>
  );
}
