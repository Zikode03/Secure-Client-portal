import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";

export function MfaChallengePage() {
  const { pendingMfa, verifyMfa, finishMfa, cancelMfa } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function finish() {
    setBusy(true);
    const result = await finishMfa();
    if (result.user) navigate(defaultPathForRole(result.user.role));
    else setError(result.message ?? "Please sign in again.");
    setBusy(false);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await verifyMfa(code, recovery);
    setCode(""); setBusy(false);
    if (!result.ok) { setError(result.message ?? "Verification failed."); return; }
    if (result.mfaRequired) { setRecovery(false); return; }
    if (result.recoveryCodes?.length) { setCodes(result.recoveryCodes); return; }
    await finish();
  }
  return <main className="grid min-h-svh place-items-center bg-slate-100 px-5 py-8 dark:bg-slate-950">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Secure client portal</p>
      <h1 className="mt-3 text-2xl font-semibold">{codes.length ? "Save your recovery codes" : pendingMfa?.setupKey ? "Protect your account" : "Verify your identity"}</h1>
      {codes.length ? <>
        <p className="mt-3 text-sm text-slate-600">Store these in your password manager now. Each code works once and is only shown here. You need one if you lose your authenticator.</p>
        <div className="my-5 grid gap-2 rounded-lg bg-slate-50 p-3 font-mono text-xs dark:bg-slate-800">{codes.map(value => <span key={value}>{value}</span>)}</div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />I have saved my recovery codes securely.</label>
        <button disabled={!saved || busy} onClick={finish} className="mt-5 w-full rounded-lg bg-slate-900 p-3 text-white disabled:opacity-50 dark:bg-emerald-700">Continue to workspace</button>
      </> : <form onSubmit={submit} className="mt-4 space-y-4">
        {pendingMfa?.setupKey ? <>
          <p className="text-sm text-slate-600">In your authenticator app, add an account using a setup key. Choose time-based codes, then enter the six-digit code below.</p>
          <div className="select-all break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:bg-slate-800">{pendingMfa.setupKey}</div>
        </> : <p className="text-sm text-slate-600">{recovery ? "Enter one of your saved recovery codes. You will then register a replacement authenticator." : "Enter the six-digit code from your authenticator app."}</p>}
        <label className="block text-sm font-medium" htmlFor="mfa-code">{recovery ? "Recovery code" : "Authenticator code"}</label>
        <input id="mfa-code" autoFocus autoComplete="one-time-code" inputMode={recovery ? "text" : "numeric"} maxLength={recovery ? 32 : 6} value={code} onChange={e => setCode(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-transparent p-3 font-mono tracking-wider" />
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 p-3 font-semibold text-white disabled:opacity-50 dark:bg-emerald-700">{busy ? "Verifying…" : "Verify and continue"}</button>
        {!pendingMfa?.setupKey && <button type="button" onClick={() => { setRecovery(!recovery); setCode(""); setError(""); }} className="text-sm text-emerald-700">{recovery ? "Use authenticator instead" : "Lost your authenticator? Use a recovery code"}</button>}
        <button type="button" onClick={cancelMfa} className="block text-sm text-slate-500">Back to sign in</button>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
    </section>
  </main>;
}
