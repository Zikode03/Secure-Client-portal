import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { components } from "../../services/generated/portal-api";
import { Button } from "../../components/ui/Button";

type Operations = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.AdminOperationsResponse"];
type Run = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.UsersRoles.OperationResult"];
function result(value: Run | null | undefined, recovery = false) {
  if (!value) return "No result recorded";
  if (value.status !== "succeeded") return `${value.status === "failed" ? "Failed" : "Running"} · ${new Date(value.atUtc).toLocaleString()}`;
  return `${recovery ? value.verified ? "Verified" : "Not verified" : "Completed"} · ${new Date(value.atUtc).toLocaleString()}`;
}

export function AdminOperationsPanel() {
  const [data, setData] = useState<Operations | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    if (!hasApiBaseUrl()) { setLoading(false); setError(true); return; }
    void apiGetJson<Operations>("/api/admin/operations").then(value => {
      if (!value?.checkedAtUtc) throw new Error("No operations data");
      if (active) setData(value);
    }).catch(() => { if (active) { setError(true); setData(null); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const row = (label: string, value: string | number) => <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0" key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="text-right text-sm font-medium text-slate-950">{value}</dd></div>;
  return <section aria-label="Firm operations" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-950">Work and system status</h2><p className="mt-1 text-sm text-slate-500">Live status for this firm. Refresh to check recent changes.</p></div><Button variant="secondary" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Refresh status</Button></div>
    {loading ? <p className="py-5 text-sm text-slate-500" role="status">Checking firm operations…</p> : error || !data ? <p className="py-5 text-sm text-amber-800" role="status">Operations data is unavailable. Your account needs permission to read system settings.</p> : <>
      <div className="mt-4 grid gap-x-8 lg:grid-cols-3">
        <div><h3 className="text-sm font-semibold text-slate-900">Client work</h3><dl>{row("Outstanding required documents", data.missingDocuments)}{row("Overdue required documents", data.overdueDocuments)}{row("Overdue requests", data.overdueRequests)}{row("Months under review", data.packsUnderReview)}{row("Completed months", data.packsClosed)}</dl><Link className="mt-3 inline-block text-sm font-medium text-brand-700" to="/firm/inbox">Open requests →</Link></div>
        <div className="mt-5 lg:mt-0"><h3 className="text-sm font-semibold text-slate-900">Email and automation</h3><dl>{row("Account emails", data.accessEmailEnabled ? "Enabled" : "Disabled")}{row("Notification emails", data.notificationEmailEnabled ? "Enabled" : "Disabled")}{row("Notification emails queued", data.emailPending)}{row("Notification emails failed", data.emailFailed)}{row("Automatic reminders", data.automationEnabled ? "Enabled" : "Disabled")}{row("Last automation run", result(data.automationLastRun))}</dl><Link className="mt-3 inline-block text-sm font-medium text-brand-700" to="/firm/admin/system-settings">Open settings →</Link></div>
        <div className="mt-5 lg:mt-0"><h3 className="text-sm font-semibold text-slate-900">Storage and recovery</h3><dl>{row("Document storage", data.storageAvailable && data.storageBytes != null ? `${(data.storageBytes / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB used` : "Unavailable")}{row("Storage limit", `${(data.storageQuotaBytes / 1_000_000_000).toLocaleString()} GB`)}{row("Last backup", result(data.lastBackup, true))}{row("Last restore", result(data.lastRestore, true))}</dl><p className="mt-3 text-xs leading-5 text-slate-500">Backups run outside the portal during a maintenance window. No recorded result means recovery has not been verified for this installation.</p></div>
      </div><p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Checked {new Date(data.checkedAtUtc).toLocaleString()} · One firm per installation</p>
    </>}
  </section>;
}
