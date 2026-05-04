import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: EmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button onClick={onAction} variant="secondary">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
