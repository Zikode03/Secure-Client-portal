import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";
import { bankingApi, type MonthlyPackBankingStatusDto } from "../../services/bankingApi";

interface MonthlyPackBankingStatusPanelProps {
  clientId: string;
  year: number;
  month: number;
  bankingPath?: string;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function statusMeta(status: string) {
  switch (status) {
    case "complete":
      return {
        label: "Complete",
        classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    case "current":
      return {
        label: "Current",
        classes: "bg-blue-50 text-blue-700 border-blue-200",
        icon: RefreshCw,
      };
    case "needs_attention":
      return {
        label: "Needs attention",
        classes: "bg-red-50 text-red-700 border-red-200",
        icon: TriangleAlert,
      };
    case "incomplete":
      return {
        label: "Incomplete",
        classes: "bg-amber-50 text-amber-700 border-amber-200",
        icon: TriangleAlert,
      };
    default:
      return {
        label: "Not connected",
        classes: "bg-slate-50 text-slate-600 border-slate-200",
        icon: Building2,
      };
  }
}

export function MonthlyPackBankingStatusPanel({
  clientId,
  year,
  month,
  bankingPath,
}: MonthlyPackBankingStatusPanelProps) {
  const [status, setStatus] = useState<MonthlyPackBankingStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void bankingApi.getMonthlyPackStatus(clientId, year, month)
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Banking readiness could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [clientId, year, month]);

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <p className="text-sm text-slate-500">Checking bank data for this monthly pack…</p>
      </section>
    );
  }

  if (error || !status) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TriangleAlert className="h-4 w-4 text-amber-600" />
          Banking status unavailable
        </div>
        <p className="mt-1 text-sm text-slate-500">{error || "The banking readiness check could not be completed."}</p>
      </section>
    );
  }

  const meta = statusMeta(status.status);
  const StatusIcon = meta.icon;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Bank data</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Banking is checked separately from uploaded documents and must cover the full month before a connected-feed pack can be finalised.
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.classes}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Connected accounts</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{status.connectedAccountCount}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Required through</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(status.requiredThroughUtc)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Data from</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(status.dataFromUtc)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Data through</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(status.dataThroughUtc)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm text-slate-600">{status.message}</p>
          {status.missingFromUtc && status.missingToUtc ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Missing period: {formatDate(status.missingFromUtc)} – {formatDate(status.missingToUtc)}
            </p>
          ) : null}
        </div>
        {bankingPath ? (
          <Link className="text-sm font-semibold text-brand-700 hover:text-brand-800" to={bankingPath}>
            Open Banking
          </Link>
        ) : null}
      </div>
    </section>
  );
}
