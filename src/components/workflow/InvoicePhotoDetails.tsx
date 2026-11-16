import { useEffect, useRef, useState } from "react";
import { apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { duplicateInvoiceReasons, scanInvoicePhoto, type InvoiceDetails } from "../../services/invoiceScanner";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";

interface Props {
  file: File; clientId?: string; details: InvoiceDetails; confirmed: boolean; allowDuplicate: boolean;
  onChange: (details: InvoiceDetails) => void; onConfirmed: (value: boolean) => void;
  onAllowDuplicate: (value: boolean) => void; onBusy: (value: boolean) => void;
}
export function InvoicePhotoDetails(props: Props) {
  const { file, details, clientId, onChange, confirmed, onConfirmed, allowDuplicate, onAllowDuplicate, onBusy } = props;
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Array<{ name: string; reasons: string[] }>>([]);
  const [preview, setPreview] = useState("");
  const run = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { generation.current++; run.current?.abort(); }, []);
  async function scan() {
    run.current?.abort();
    const abort = new AbortController(); run.current = abort;
    const current = ++generation.current;
    setBusy(true); onBusy(true); setError(""); setProgress(0); onConfirmed(false);
    try {
      const value = await scanInvoicePhoto(file, abort.signal, setProgress);
      if (current === generation.current) onChange(value);
    } catch {
      if (!abort.signal.aborted && current === generation.current) setError("The photo could not be read. Try a clearer photo or enter the details yourself.");
    } finally {
      if (current === generation.current) { setBusy(false); onBusy(false); }
    }
  }
  useEffect(() => {
    onConfirmed(false); onAllowDuplicate(false); setMatches([]); setChecking(false);
    if (!hasApiBaseUrl() || !clientId || !Object.values(details).some(Boolean)) return;
    let active = true; setChecking(true);
    void apiGetJson<Array<{ clientId: string; name: string; invoiceDetailsJson?: string | null }>>("/api/documents")
      .then(documents => {
        if (!active) return;
        const found = documents.filter(document => document.clientId === clientId && document.invoiceDetailsJson).flatMap(document => {
          try {
            const reasons = duplicateInvoiceReasons(details, JSON.parse(document.invoiceDetailsJson!) as InvoiceDetails);
            return reasons.length >= 2 ? [{ name: document.name, reasons }] : [];
          } catch { return []; }
        });
        setMatches(found);
        if (found.length) onConfirmed(false);
      }).catch(() => { if (active) setError("Existing invoices could not be checked here. The server will check again when you save."); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
    // Setters are intentionally supplied by the parent; only identity/details trigger a check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, details]);
  const valid = details.supplierName.trim() && details.invoiceDate && /^\d+(\.\d{1,2})?$/.test(details.amount) && Number(details.amount) > 0;
  const photo = ['image/jpeg', 'image/png'].includes(file.type);
  return <section className="space-y-4 border-t border-slate-100 pt-4" aria-label="Invoice and receipt details">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-semibold text-slate-900">Invoice details <span className="font-normal text-slate-400">· Optional</span></h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{photo ? "Read the photo on this device, then check the suggestions." : "Add the details from your document, or upload without them."}</p></div>
      {photo ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void scan()}>{busy ? `Reading photo… ${progress}%` : "Read details from photo"}</Button> : null}
      {busy ? <Button size="sm" variant="ghost" onClick={() => { generation.current++; run.current?.abort(); setBusy(false); onBusy(false); }}>Cancel scan</Button> : null}
    </div>
    {error ? <p role="status" className="text-xs leading-5 text-amber-800">{error}</p> : null}
    <div className={preview ? "grid items-start gap-4 sm:grid-cols-[80px_1fr]" : ""}>
      {preview ? <a href={preview} target="_blank" rel="noreferrer" className="block w-20 rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Open selected invoice preview"><img src={preview} className="h-24 w-full rounded object-contain" alt="Selected invoice or receipt for checking" /></a> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField className="rounded-lg" label="Supplier" value={details.supplierName} maxLength={160} onChange={e => onChange({ ...details, supplierName: e.target.value })} />
        <TextField className="rounded-lg" label="Invoice / receipt number (if shown)" value={details.invoiceNumber} maxLength={80} onChange={e => onChange({ ...details, invoiceNumber: e.target.value })} />
        <TextField className="rounded-lg" label="Invoice / receipt date" type="date" value={details.invoiceDate} onChange={e => onChange({ ...details, invoiceDate: e.target.value })} />
        <TextField className="rounded-lg" label="Total amount (ZAR)" inputMode="decimal" value={details.amount} onChange={e => onChange({ ...details, amount: e.target.value })} />
      </div>
    </div>
    {matches.length ? <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs leading-5" role="alert"><p className="font-semibold text-amber-900">Possible duplicate invoice</p><ul>{matches.slice(0, 5).map((match, index) => <li key={index}>{match.name}: matching {match.reasons.join(", ")}</li>)}</ul><label className="mt-3 flex gap-2"><input type="checkbox" checked={allowDuplicate} onChange={e => { onAllowDuplicate(e.target.checked); onConfirmed(false); }} />I checked these matches. This is a separate document.</label></div> : null}
    {Object.values(details).some(Boolean) || checking ? <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input className="mt-1 accent-emerald-700" type="checkbox" checked={confirmed} disabled={busy || checking || !valid || (matches.length > 0 && !allowDuplicate)} onChange={e => onConfirmed(e.target.checked)} />{checking ? "Checking existing invoices..." : "I checked the supplier, date, amount and number against the document."}</label> : null}
    <p className="text-xs text-slate-400">Leave these fields blank to upload without scanning.</p>
  </section>;
}
