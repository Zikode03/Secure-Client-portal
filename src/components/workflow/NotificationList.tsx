// Friendly guide: this module (NotificationList) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { NotificationItem } from "../../types/portal";
import { formatDateTimeLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface NotificationListProps {
  items: NotificationItem[];
  onAction?: (href: string) => void;
}

// Component flow: gather data first, then render a focused UI state.
export function NotificationList({ items, onAction }: NotificationListProps) {
// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <SurfaceCard className="p-5" key={item.id}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.kind.replace(/_/g, " ")}
              </p>
              <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="text-sm leading-6 text-slate-500">{item.message}</p>
              <p className="text-sm text-slate-400">{formatDateTimeLabel(item.createdAt)}</p>
            </div>
            <Button
              className="lg:self-center"
              onClick={() => onAction?.(item.actionHref)}
              variant="secondary"
            >
              {item.actionLabel}
            </Button>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}