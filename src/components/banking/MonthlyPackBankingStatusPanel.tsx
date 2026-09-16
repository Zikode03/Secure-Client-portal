import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";
import { bankingApi, type BankingOverviewDto, type MonthlyPackBankingStatusDto } from "../../services/bankingApi";

interface MonthlyPackBankingStatusPanelProps {
  clientId: string;
  year: number;
  month: number;
  bankingPath?: string;
  showConnections?: boolean;
}

function formatDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not available";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(value));
}

const statuses: Record<string, { label: string; classes: string }> = {
  not_connected: { label: "Not connected", classes: "text-slate-600 bg-slate-50" },
  current: { label: "Current", classes: "text-blue-700 bg-blue-50" },
  complete: { label: "Complete", classes: "text-emerald-700 bg-emerald-50" },
  incomplete: { label: "Incomplete", classes: "text-amber-800 bg-amber-50" },
  needs_attention: { label: "Needs attention", classes: "text-red-700 bg-red-50" },
};

function readinessMessage(status: MonthlyPackBankingStatusDto) {
  switch (status.status) {
    case "not_connected": return "Bank statements are being handled manually.";
    case "complete": return "Bank data covers the full monthly-pack period.";
    case "current": return `Bank data is current through ${formatDate(status.requiredThroughUtc)}. The month is still in progress.`;
    case "needs_attention": return "One or more bank connections need attention.";
    case "incomplete": return status.missingFromUtc && status.missingToUtc
      ? `Bank data is missing from ${formatDate(status.missingFromUtc)} to ${formatDate(status.missingToUtc)}.`
      : "Bank data does not cover the required period for every connected bank.";
    default: return "Banking readiness could not be verified.";
  }
}

export function MonthlyPackBankingStatusPanel({
  clientId, year, month, bankingPath, showConnections = false,
}: MonthlyPackBankingStatusPanelProps) {
  const [status, setStatus] = useState<MonthlyPackBankingStatusDto | null>(null);
  const [overview, setOverview] = useState<BankingOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setStatus(null);
    setOverview(null);
    void bankingApi.getMonthlyPackStatus(clientId, year, month)
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    if (showConnections) {
      void bankingApi.getOverview(clientId)
        .then((result) => { if (active) setOverview(result); })
        .catch(() => { if (active) setOverview(null); });
    }
    return () => { active = false; };
  }, [clientId, year, month, showConnections, revision]);

  const meta = status ? statuses[status.status] : undefined;
  const verified = !error && status && meta;
  const blocked = !verified || (status.hasActiveConnection && (!status.isPeriodComplete || status.status !== "complete"));
  const activeConnections = overview?.connections.filter((connection) => connection.status !== "disconnected") ?? [];
  const StatusIcon = status?.status === "complete" ? CheckCircle2 : blocked ? TriangleAlert : Building2;

  return (
    <section aria-label="Monthly pack bank data" className="border-y border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Building2 aria-hidden="true" className="h-4 w-4 text-brand-700" />
          <h2 className="text-sm font-semibold text-slate-950">Bank data</h2>
          {!loading && <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${meta?.classes ?? "bg-amber-50 text-amber-800"}`}>
            <StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />
            {verified ? meta.label : "Banking status unavailable"}
          </span>}
        </div>
        <div className="flex items-center gap-3">
          {bankingPath && <Link className="text-sm font-semibold text-brand-700 hover:underline" to={bankingPath}>Open Banking</Link>}
          <button aria-label="Refresh banking readiness" title="Refresh banking readiness" type="button"
            disabled={loading} onClick={() => setRevision((value) => value + 1)}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 disabled:opacity-50">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {loading ? <p className="px-4 py-4 text-sm text-slate-500">Checking bank data...</p> : !verified ? (
        <div role="alert" className="px-4 py-4 text-sm text-amber-800">
          Banking readiness could not be loaded. Retry before submitting or closing this pack.
        </div>
      ) : <>
        <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Connected accounts", String(status.connectedAccountCount)],
            ["Required period", `${formatDate(status.periodStartUtc)} - ${formatDate(status.periodEndUtc)}`],
            ["Required through", formatDate(status.requiredThroughUtc)],
            ["Data from", formatDate(status.dataFromUtc)],
            ["Data through", formatDate(status.dataThroughUtc)],
          ].map(([label, value]) => <div className="min-w-0" key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
          </div>)}
        </dl>
        {showConnections && <div className="border-t border-slate-100 px-4 py-3">
          {overview ? activeConnections.length ? activeConnections.map((connection) => {
            const accounts = overview.accounts.filter((account) => account.bankConnectionId === connection.id);
            return <div className="break-words py-1 text-sm text-slate-700" key={connection.id}>
              <span className="font-semibold">{connection.provider}</span>{" - "}
              {accounts.length ? accounts.map((account) => `${account.bankName}: ${account.accountName} (${account.accountNumberMasked})`).join("; ") : "No accounts returned"}
            </div>;
          }) : <p className="text-sm text-slate-500">No active bank connections.</p>
            : <p className="text-sm text-slate-500">Bank/account details could not be loaded.</p>}
        </div>}
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-600">{readinessMessage(status)}</p>
          {status.hasActiveConnection && status.missingFromUtc && status.missingToUtc && <p className="mt-1 text-sm text-amber-800">
            Missing period: {formatDate(status.missingFromUtc)} - {formatDate(status.missingToUtc)}
          </p>}
          <p className={`mt-1 text-xs font-semibold ${blocked ? "text-amber-800" : "text-emerald-700"}`}>
            {blocked ? "Banking is blocking submission and closure." : status.hasActiveConnection
              ? "Banking is ready for submission and closure." : "Manual bank-statement requirements control readiness."}
          </p>
        </div>
      </>}
    </section>
  );
}
