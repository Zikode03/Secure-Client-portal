import type { WorkflowRequest } from "../../types/portal";
import { cn } from "../../utils/cn";

export type InboxAudience = "client" | "firm";

export function inboxStatusLabel(
  status: WorkflowRequest["status"],
  audience: InboxAudience,
) {
  if (status === "resolved" || status === "closed") return "Resolved";
  if (status === "awaiting_client") return audience === "client" ? "Waiting for you" : "Waiting for client";
  return audience === "client" ? "Waiting for accountant" : "Needs your attention";
}

export function InboxStatusBadge({
  audience,
  className,
  status,
}: {
  audience: InboxAudience;
  className?: string;
  status: WorkflowRequest["status"];
}) {
  const label = inboxStatusLabel(status, audience);
  const tone = status === "resolved" || status === "closed"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : status === "awaiting_client"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : audience === "firm"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-sky-50 text-sky-700 ring-sky-200";

  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
