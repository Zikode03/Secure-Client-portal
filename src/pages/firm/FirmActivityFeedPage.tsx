// Friendly guide: this module (FirmActivityFeedPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo } from "react";
import { usePortal } from "../../app/portal";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";

// Shared shape notes: these types keep UI and data contracts aligned.
interface FeedItem {
  id: string;
  title: string;
  detail: string;
  actor: string;
  timestamp: string;
  source: "request" | "review" | "compliance";
}

// Component flow: gather data first, then render a focused UI state.
export function FirmActivityFeedPage() {
  const portal = usePortal();

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

// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
      <h1 className="text-xl font-semibold text-slate-950">Unified Activity / Audit Feed</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cross-module timeline for requests, review actions, and compliance events.
      </p>

      <div className="mt-4 space-y-3">
        {feed.map((item) => (
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
  );
}