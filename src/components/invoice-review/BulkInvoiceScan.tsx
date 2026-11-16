import { useEffect, useRef, useState } from "react";
import { scanBulkInvoice, type BulkInvoice } from "../../services/invoiceBulkScanner";
import type { SaveInvoiceReviewRequest } from "../../services/invoiceReviewApi";
import { Button } from "../ui/Button";

type Job = BulkInvoice & { status: "waiting" | "running" | "saved" | "skipped" | "failed" | "cancelled"; detail: string };
export function BulkInvoiceScan({ invoices, onFinished, disabled = false }: {
  invoices: BulkInvoice[]; onFinished: () => void; disabled?: boolean;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const prepared = useRef(new Map<string, SaveInvoiceReviewRequest>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const requests = prepared.current;
    return () => { mounted.current = false; controller.current?.abort(); requests.clear(); };
  }, []);
  async function run(rows: BulkInvoice[], retry = false) {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort; setRunning(true);
    if (!retry) { prepared.current.clear(); setJobs(rows.map(row => ({ ...row, status: "waiting", detail: "Waiting" }))); }
    const update = (id: string, status: Job["status"], detail: string) => {
      if (mounted.current) setJobs(current => current.map(job => job.id === id ? { ...job, status, detail } : job));
    };
    try {
      for (const row of rows) {
        if (abort.signal.aborted) { update(row.id, "cancelled", "Cancelled before saving"); continue; }
        try {
          const status = await scanBulkInvoice(row, abort.signal, (phase, percent) => update(row.id, "running", `${phase}${phase === "Reading" ? ` ${percent}%` : "…"}`), prepared.current);
          update(row.id, status, status === "saved" ? "Suggestions saved · accountant review required" : "Skipped · already has a saved review");
        } catch (error) {
          update(row.id, abort.signal.aborted ? "cancelled" : "failed", abort.signal.aborted ? "Cancelled" : error instanceof Error ? error.message : "Could not read this invoice.");
        }
      }
    } finally {
      controller.current = null;
      if (mounted.current) { setRunning(false); onFinished(); }
    }
  }
  const retry = jobs.filter(job => job.status === "failed" || job.status === "cancelled");
  return <section aria-label="Bulk invoice scanning" className="space-y-3 border-b border-slate-200 px-5 py-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-slate-900">Read invoices together</p>
        <p className="mt-1 text-xs text-slate-500">Scans up to 50 invoices in the current filters on this device. Saved reviews are skipped. Each invoice still needs accountant confirmation. Cancelling lets any save already sent finish.</p></div>
      <Button size="sm" variant="secondary" disabled={disabled || running || invoices.length === 0} onClick={() => void run(invoices.slice(0, 50))}>Scan invoices ({Math.min(invoices.length, 50)})</Button>
      {running ? <Button size="sm" variant="ghost" onClick={() => controller.current?.abort()}>Cancel batch</Button> : retry.length ? <Button size="sm" variant="ghost" disabled={disabled} onClick={() => void run(retry, true)}>Retry failed or cancelled ({retry.length})</Button> : null}
    </div>
    {jobs.length ? <details open><summary className="text-xs text-slate-600">{jobs.filter(job => job.status === "saved").length} saved · {jobs.filter(job => job.status === "skipped").length} skipped · {jobs.filter(job => job.status === "failed").length} failed</summary>
      <ul className="mt-2 max-h-48 space-y-2 overflow-auto text-xs" aria-live="polite">{jobs.map(job => <li key={job.id} className="flex flex-wrap justify-between gap-2"><span className="font-medium text-slate-800">{job.fileName}</span><span className={job.status === "failed" ? "text-red-700" : "text-slate-500"}>{job.detail}</span></li>)}</ul>
    </details> : null}
  </section>;
}
