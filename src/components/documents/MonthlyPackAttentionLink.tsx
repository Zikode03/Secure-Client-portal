import { Link } from "react-router-dom";

interface MonthlyPackAttentionLinkProps {
  outstandingCount: number;
}

/**
 * Documents is a permanent register, not a second Monthly Packs workspace.
 * This lightweight hand-off keeps monthly collection in the module that owns it.
 */
export function MonthlyPackAttentionLink({ outstandingCount }: MonthlyPackAttentionLinkProps) {
  if (outstandingCount <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-y border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{outstandingCount}</span>{" "}
        {outstandingCount === 1 ? "monthly-pack requirement needs" : "monthly-pack requirements need"} your attention.
      </p>
      <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800" to="/client/packs">
        Open monthly pack
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
