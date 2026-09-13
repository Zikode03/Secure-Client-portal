import { useEffect, useState } from "react";
import { apiGetJson, apiPostJson } from "../../services/apiClient";
export function SmtpVerificationPanel() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiGetJson<{verifiedAtUtc: string | null}>("/api/admin/smtp-verification").then(r => setVerified(r.verifiedAtUtc)).catch(() => {}); }, []);
  async function request(confirm: boolean) {
    setBusy(true); setMessage("");
    try {
      const response = await apiPostJson<{message?: string; verifiedAtUtc?: string}, object>(
        "/api/admin/smtp-verification" + (confirm ? "/confirm" : ""), confirm ? {code: code.trim()} : {});
      setVerified(response.verifiedAtUtc ?? null);
      setMessage(response.message ?? "Email receipt verified successfully.");
      if (confirm) setCode("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Email verification failed."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 border-t border-slate-200 py-6">
    <h2 className="text-lg font-semibold">Production email delivery</h2>
    <p className="text-sm text-slate-500">Verify that invitation and recovery emails can reach your inbox. Send a test, then enter the code from the email. Repeat after changing mail settings.</p>
    {verified && <p className="text-sm text-emerald-700">Last confirmed receipt: {new Date(verified).toLocaleString()}</p>}
    <div className="flex flex-wrap items-end gap-3">
      <button disabled={busy} onClick={() => request(false)} className="rounded-lg border border-slate-300 px-4 py-3 text-sm disabled:opacity-50">Send verification email</button>
      <label className="text-sm">Email verification code<input className="mt-1 block rounded-lg border border-slate-300 bg-transparent px-3 py-3" value={code} maxLength={32} onChange={e => setCode(e.target.value)} autoComplete="off" /></label>
      <button disabled={busy || code.trim().length !== 32} onClick={() => request(true)} className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white disabled:opacity-50">Confirm receipt</button>
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
