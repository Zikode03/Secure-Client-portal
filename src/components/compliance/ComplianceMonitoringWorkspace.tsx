import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, History, Settings2, Unplug } from "lucide-react";
import { useAuth } from "../../app/auth";
import { apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import "./complianceMonitoring.css";

interface Verification {
  id: string; checkCode: string; method: string; outcome: string; evidenceReference: string;
  checkedAtUtc: string; recordedAtUtc: string; reviewAfterUtc: string;
  recordedByName: string; matchesCurrentIdentifiers: boolean;
}
interface Check {
  code: string; source: string; name: string; description: string;
  applicability: string; reason: string; connectionStatus: string; verificationStatus: string;
  latestVerification: Verification | null;
}
export interface MonitoringProfile {
  clientId: string; clientName: string; version: string; canManage: boolean;
  registrationNumber: string; taxNumber: string; csdSupplierNumber: string; checks: Check[];
}
const applicabilityLabels: Record<string, string> = { undecided: "Needs assessment", applies: "Applies", not_applicable: "Not applicable" };
const statusLabels: Record<string, string> = { not_checked: "Not checked", accountant_confirmed: "Manually checked", stale: "Recheck due", identifiers_changed: "Identifier changed — recheck" };
const outcomeLabels: Record<string, string> = { pass: "No issue recorded", fail: "Issue recorded", unknown: "Inconclusive" };
const timeLabel = (value: string) => new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

/** Authority monitoring is independent of the older document/evidence register. */
export function ComplianceMonitoringWorkspace({ records }: { records: ReactNode }) {
  const { user } = useAuth();
  const [view, setView] = useState("checks");
  return <>
    <nav className="monitoring-tabs" aria-label="Compliance views">
      <button type="button" aria-pressed={view === "checks"} onClick={() => setView("checks")}>Authority checks</button>
      <button type="button" aria-pressed={view === "records"} onClick={() => setView("records")}>Document records</button>
    </nav>
    {view === "checks" ? <MonitoringBusinesses key={user?.id ?? "signed-out"} /> : <>
      <p className="monitoring-disclaimer">These are document and evidence records, not live authority verification or an overall compliance assessment.</p>
      {records}
    </>}
  </>;
}

function MonitoringBusinesses() {
  const { user } = useAuth();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setClients([]); setClientId("");
    (async () => {
      if (!hasApiBaseUrl()) throw new Error("Connect the backend to load authority monitoring.");
      if (!user) throw new Error("Sign in to view your businesses.");
      const rows = await apiGetJson<{ id: string; name: string }[]>("/api/clients");
      if (active) { setClients(rows); setClientId(rows[0]?.id ?? ""); }
    })().catch(error => { if (active) setError(errorMessage(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, reload]);
  return <div className="authority-monitoring">
    <PageHeader title="Compliance Centre" eyebrow={user?.role === "client" ? "Your business" : "Business oversight"}
      description="See what needs checking, where the information came from and what to do next." />
    <div className="monitoring-intro"><Unplug aria-hidden="true" size={20} /><p><strong>Authority connections are not active yet.</strong> Prepare your business details now. Manual checks are labelled separately and never presented as live verification.</p></div>
    {loading ? <p role="status">Loading businesses…</p> : error ? <div role="alert"><p>{error}</p><Button variant="secondary" onClick={() => setReload(x => x + 1)}>Retry businesses</Button></div> : !clients.length ? <p>No accessible businesses. Ask your administrator to check your business assignment.</p> : <>
      <div className="monitoring-business"><SelectField label="Business to monitor" value={clientId} options={clients.map(client => ({ label: client.name, value: client.id }))} onChange={event => setClientId(event.target.value)} /></div>
      <ComplianceMonitoringPanel key={clientId} clientId={clientId} />
    </>}
  </div>;
}

export function ComplianceMonitoringPanel({ clientId }: { clientId: string }) {
  const [profile, setProfile] = useState<MonitoringProfile | null>(null);
  const [draft, setDraft] = useState<MonitoringProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Check | null>(null);
  const [historyCheck, setHistoryCheck] = useState<Check | null>(null);
  const [historyReload, setHistoryReload] = useState(0);
  const [manual, setManual] = useState({ outcome: "unknown", evidenceReference: "", checkedAt: "", reviewAfter: "" });
  const path = `/api/compliance/monitoring/${encodeURIComponent(clientId)}`;

  useEffect(() => {
    if (selected) document.getElementById("manual-verification-form")?.focus();
  }, [selected]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setProfile(null); setDraft(null); setEditing(false); setSelected(null); setHistoryCheck(null);
    apiGetJson<MonitoringProfile>(path).then(result => {
      if (active) { setProfile(result); setDraft(result); }
    }).catch(error => { if (active) setError(errorMessage(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, reload]);

  async function saveSetup(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !profile?.canManage || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await apiPutJson<MonitoringProfile, object>(path, {
        version: profile.version, registrationNumber: draft.registrationNumber, taxNumber: draft.taxNumber,
        csdSupplierNumber: draft.csdSupplierNumber, checks: draft.checks.map(check => ({ checkCode: check.code, applicability: check.applicability, reason: check.reason })),
      });
      setProfile(updated); setDraft(updated); setEditing(false); setNotice("Monitoring setup saved. No authority check was performed.");
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function recordManual(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !profile?.canManage || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await apiPostJson<MonitoringProfile, object>(`${path}/manual-verifications`, {
        version: profile.version, checkCode: selected.code, outcome: manual.outcome,
        evidenceReference: manual.evidenceReference, checkedAtUtc: new Date(manual.checkedAt).toISOString(),
        reviewAfterUtc: new Date(manual.reviewAfter).toISOString(),
      });
      setProfile(updated); setDraft(updated); setSelected(null); setHistoryReload(x => x + 1);
      setNotice("Manual verification recorded. This is not an automated authority result.");
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Loading monitoring setup…</p>;
  if (!profile || !draft) return <div role="alert"><p>Monitoring unavailable. No compliance conclusion can be shown.</p><p>{error}</p><Button variant="secondary" onClick={() => setReload(x => x + 1)}>Retry monitoring</Button></div>;
  const incomplete = profile.checks.filter(check => check.applicability === "undecided" || (check.applicability === "applies" && (check.verificationStatus !== "accountant_confirmed" || check.latestVerification?.outcome === "unknown"))).length;
  return <section aria-label={`Authority monitoring for ${profile.clientName}`} className="monitoring-content">
    <div className="monitoring-heading"><div><h2>{profile.clientName}</h2><p>{incomplete ? `${incomplete} check${incomplete === 1 ? " needs" : "s need"} assessment or verification.` : "Review the scope and source of each result below."} No overall compliance conclusion is available.</p></div><div className="monitoring-actions">
      <Button variant="secondary" disabled={busy || editing || !!selected} onClick={() => { setNotice(""); setReload(x => x + 1); }}>Reload saved data</Button>
      {profile.canManage && <Button variant="secondary" disabled={busy || !!selected} onClick={() => { setDraft(profile); setEditing(x => !x); setError(""); }}><Settings2 size={16} aria-hidden="true" />{editing ? "Close setup" : "Configure checks"}</Button>}
    </div></div>
    {error && <p role="alert" className="monitoring-error">{error} Your entries have been kept. If the setup changed, close the form and reload saved data.</p>}
    {notice && <p role="status" className="monitoring-notice">{notice}</p>}
    {!editing && <details className="monitoring-identifiers-summary"><summary>Business identifiers</summary><dl className="monitoring-identifiers"><div><dt>Company registration number</dt><dd>{profile.registrationNumber || "Not provided"}</dd></div><div><dt>Tax reference number</dt><dd>{profile.taxNumber || "Not provided"}</dd></div><div><dt>CSD supplier number</dt><dd>{profile.csdSupplierNumber || "Not provided"}</dd></div></dl></details>}
    {editing && profile.canManage && <form aria-label="Monitoring setup" onSubmit={saveSetup} className="monitoring-editor">
      <fieldset disabled={busy}><legend>Business identifiers</legend><p>Use business reference numbers only—not passwords, TCS PINs or API keys. Registration and tax numbers are shared with the business profile.</p>
        <div className="monitoring-identifiers">
          <TextField label="Company registration number" maxLength={100} value={draft.registrationNumber} onChange={event => setDraft({ ...draft, registrationNumber: event.target.value })} />
          <TextField label="Tax reference number" maxLength={100} value={draft.taxNumber} onChange={event => setDraft({ ...draft, taxNumber: event.target.value })} />
          <TextField label="CSD supplier number" maxLength={100} value={draft.csdSupplierNumber} onChange={event => setDraft({ ...draft, csdSupplierNumber: event.target.value })} />
        </div>
        <h3>Which checks apply?</h3><p>Assess each business individually. Nothing is automatically marked applicable or compliant.</p>
        {draft.checks.map(check => <div key={check.code} className="monitoring-setting"><div><strong>{check.name}</strong><small>{check.source}</small></div>
          <SelectField label={`Applicability — ${check.name}`} value={check.applicability} options={Object.entries(applicabilityLabels).map(([value, label]) => ({ value, label }))} onChange={event => setDraft({ ...draft, checks: draft.checks.map(row => row.code === check.code ? { ...row, applicability: event.target.value } : row) })} />
          <TextField label={`Reason — ${check.name}`} required={check.applicability === "not_applicable"} maxLength={500} placeholder={check.applicability === "not_applicable" ? "Explain why this does not apply" : "Optional assessment note"} value={check.reason} onChange={event => setDraft({ ...draft, checks: draft.checks.map(row => row.code === check.code ? { ...row, reason: event.target.value } : row) })} />
        </div>)}
      </fieldset><div className="monitoring-actions"><Button variant="secondary" type="button" disabled={busy} onClick={() => { setDraft(profile); setEditing(false); setError(""); }}>Cancel setup</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save monitoring setup"}</Button></div>
    </form>}
    <div className="monitoring-table-wrap"><table className="monitoring-table"><thead><tr><th scope="col">Check / scope</th><th scope="col">Applicability</th><th scope="col">Connection / verification</th><th scope="col">Last observation</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {profile.checks.map(check => <tr key={check.code}>
        <th scope="row"><small className="monitoring-source">{check.source}</small><strong>{check.name}</strong><small>{check.description}</small></th>
        <td>{applicabilityLabels[check.applicability] ?? "Needs assessment"}{check.reason && <small>{check.reason}</small>}</td>
        <td><span className="monitoring-pill">{check.connectionStatus === "not_connected" ? "Not connected" : "Connection unavailable"}</span><small>{statusLabels[check.verificationStatus] ?? "Verification unavailable"}</small></td>
        <td>{check.latestVerification ? <><strong>{outcomeLabels[check.latestVerification.outcome] ?? "Inconclusive"}</strong><small>Manual · {timeLabel(check.latestVerification.checkedAtUtc)}</small><small>Review after {timeLabel(check.latestVerification.reviewAfterUtc)}</small>{!check.latestVerification.matchesCurrentIdentifiers && <small>Earlier identifier — do not rely on this result.</small>}</> : <small>No verification recorded</small>}</td>
        <td><div className="monitoring-row-actions"><button type="button" disabled={busy} onClick={() => setHistoryCheck(check)} aria-label={`History — ${check.name}`}><History size={15} aria-hidden="true" />History</button>{profile.canManage && check.applicability === "applies" && <button type="button" disabled={busy || editing} aria-label={`Record manual check — ${check.name}`} onClick={() => { setSelected(check); setManual({ outcome: "unknown", evidenceReference: "", checkedAt: "", reviewAfter: "" }); setError(""); }}>Record manual check <ArrowRight size={15} aria-hidden="true" /></button>}</div></td>
      </tr>)}
    </tbody></table></div>
    {!profile.canManage && <p className="monitoring-disclaimer">Your accountant maintains the identifiers and decides which checks apply. Contact them if any details need correcting.</p>}
    {selected && <form id="manual-verification-form" tabIndex={-1} aria-label={`Manual verification — ${selected.name}`} className="monitoring-editor" onSubmit={recordManual}>
      <h3>Record manual check · {selected.name}</h3><p>Only record a check you actually performed using an authorised source. This does not connect the provider. Record a reference to evidence already held securely; never paste PINs or credentials.</p>
      <fieldset disabled={busy} className="monitoring-manual-fields">
        <SelectField label="Observed outcome" value={manual.outcome} options={Object.entries(outcomeLabels).map(([value, label]) => ({ value, label }))} onChange={event => setManual({ ...manual, outcome: event.target.value })} />
        <TextField label="Evidence reference" required maxLength={500} value={manual.evidenceReference} onChange={event => setManual({ ...manual, evidenceReference: event.target.value })} />
        <TextField label="Checked at (your local time)" required type="datetime-local" value={manual.checkedAt} onChange={event => setManual({ ...manual, checkedAt: event.target.value })} />
        <TextField label="Review after (your local time)" required type="datetime-local" hint="Your follow-up date, not an authority guarantee of validity." value={manual.reviewAfter} onChange={event => setManual({ ...manual, reviewAfter: event.target.value })} />
      </fieldset><div className="monitoring-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => { setSelected(null); setError(""); }}>Cancel manual check</Button><Button type="submit" disabled={busy}>{busy ? "Recording…" : "Save manual verification"}</Button></div>
    </form>}
    {historyCheck && <VerificationHistory key={`${historyCheck.code}-${historyReload}`} path={path} check={historyCheck} onClose={() => setHistoryCheck(null)} />}
  </section>;
}

function VerificationHistory({ path, check, onClose }: { path: string; check: Check; onClose: () => void }) {
  const [rows, setRows] = useState<Verification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { document.getElementById("authority-verification-history")?.focus(); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setRows([]);
    apiGetJson<Verification[]>(`${path}/history?checkCode=${encodeURIComponent(check.code)}&page=${page}`)
      .then(result => { if (active) setRows(result); }).catch(error => { if (active) setError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, check.code, page, retry]);
  return <section id="authority-verification-history" tabIndex={-1} className="monitoring-history" aria-label={`Verification history — ${check.name}`}>
    <div className="monitoring-heading"><h3>Verification history · {check.name}</h3><button type="button" onClick={onClose}>Close history</button></div>
    {loading ? <p role="status">Loading verification history…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(x => x + 1)}>Retry history</button></div> : !rows.length ? <p>No verification recorded{page > 1 ? " on this page" : " yet"}. Uploading a document does not create a verification.</p> : <ol>{rows.map(row => <li key={row.id}>
      <strong>{outcomeLabels[row.outcome] ?? "Inconclusive"} · {row.method === "accountant_confirmed" ? "Manual verification" : "Unrecognised method"}</strong>
      <p>Checked {timeLabel(row.checkedAtUtc)} · Recorded by {row.recordedByName} on {timeLabel(row.recordedAtUtc)}</p>
      <p>Evidence: {row.evidenceReference}</p><p>Review after {timeLabel(row.reviewAfterUtc)}{!row.matchesCurrentIdentifiers ? " · Business identifier has changed" : ""}</p>
    </li>)}</ol>}
    <div className="monitoring-actions"><Button variant="secondary" disabled={loading || page === 1} onClick={() => setPage(x => x - 1)}>Previous history</Button><span>Page {page}</span><Button variant="secondary" disabled={loading || !!error || rows.length < 20} onClick={() => setPage(x => x + 1)}>Next history</Button></div>
  </section>;
}
