import type { Tone } from "../../types/portal";
import { Button } from "./Button";

interface FeedbackBannerProps {
  tone: Tone;
  title: string;
  message: string;
  onDismiss?: () => void;
}

function toneClasses(tone: Tone) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "info":
      return "border-brand-100 bg-brand-50 text-brand-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function FeedbackBanner({
  message,
  onDismiss,
  title,
  tone,
}: FeedbackBannerProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[1.5rem] border px-5 py-4 sm:flex-row sm:items-start sm:justify-between ${toneClasses(
        tone,
      )}`}
      role="status"
    >
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6">{message}</p>
      </div>
      {onDismiss ? (
        <Button onClick={onDismiss} size="sm" variant="ghost">
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}
