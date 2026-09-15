import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Settings2, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "../../app/auth";
import { apiGetBlob, apiGetJson } from "../../services/apiClient";
import type { Tone } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { FeedbackBanner } from "../ui/FeedbackBanner";
import { PageHeader } from "../ui/PageHeader";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import {
  complianceAutomationApi,
  complianceStatusLabel,
  formatCompliancePeriod,
  type ClientComplianceProfile,
  type ComplianceObligation,
  type ComplianceRuleSet,
  type ObligationEvidence,
} from "./complianceAutomation";
import "./complianceAutomation.css";

interface ClientOption { id: string; name: string }
type Notice = { tone: Tone; title: string; message: string };
type WorkspaceMode = "accountant" | "client";
type BooleanChoice = "unknown" | "yes" | "no";

const booleanOptions = [
  { value: "unknown", label: "Not confirmed" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("en-ZA", { month: "long" }).format(new Date(2026, index, 1)),
}));
const workflowOptions = [
  "waiting_for_client", "ready_to_prepare", "in_preparation", "ready_for_review", "ready_to_file",
  "payment_outstanding", "complete", "overdue", "not_applicable",
];

const toChoice = (value: boolean | null): BooleanChoice => value === true ? "yes" : value === false ? "no" : "unknown";
const fromChoice = (value: string): boolean | null => value === "yes" ? true : value === "no" ? false : null;
const dateValue = (value?: string | null) => value ? value.slice(0, 10) : "";
const money = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);

export function ComplianceObligationsWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const accountant = mode === "accountant";
  const canEditRules = user?.role === "admin";
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [rules, setRules] = useState<ComplianceRuleSet | null>(null);
  const [profile, setProfile] = useState<ClientComplianceProfile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState(searchParams.get("clientId") || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showProfile, setShowProfile] = useState(searchParams.get("setup") === "1");
  const [showRules, setShowRules] = useState(false);

  const selected = obligations.find(item => item.id === selectedId) ?? null;

  async function load() {
    setLoading(true);
    try {
      const [rows, ruleSet, clientRows] = await Promise.all([
        complianceAutomationApi.getObligations(),
        complianceAutomationApi.getRules(),
        accountant ? apiGetJson<ClientOption[]>("/api/clients") : Promise.resolve([]),
      ]);
      setObligations(rows);
      setRules(ruleSet);
      setClients(clientRows);
    } catch (error) {
      setNotice({ tone: "danger", title: "Compliance automation unavailable", message: error instanceof Error ? error.message : "Please try again." });
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!accountant || clientFilter === "all") { setProfile(null); return; }
    let active = true;
    setProfile(null);
    complianceAutomationApi.getProfile(clientFilter).then(value => { if (active) setProfile(value); }).catch(error => {
      if (active) setNotice({ tone: "danger", title: "Profile unavailable", message: error instanceof Error ? error.message : "Please try again." });
    });
    return () => { active = false; };
  }, [accountant, clientFilter]);

  const visible = useMemo(() => obligations.filter(item => {
    const text = `${item.code} ${item.name} ${item.clientName} ${item.authority}`.toLowerCase();
    return (clientFilter === "all" || item.clientId === clientFilter)
      && (statusFilter === "all" || item.workflowStatus === statusFilter)
      && text.includes(query.trim().toLowerCase());
  }), [obligations, clientFilter, statusFilter, query]);

  const needsAttention = obligations.filter(item => ["waiting_for_client", "overdue", "payment_outstanding"].includes(item.workflowStatus)).length;
  const readyForProfessionalAction = obligations.filter(item => ["ready_for_review", "ready_to_file"].includes(item.workflowStatus)).length;
  const complete = obligations.filter(item => item.workflowStatus === "complete").length;

  async function runAutomation() {
    if (!accountant || busy) return;
    setBusy(true); setNotice(null);
    try {
      const result = await complianceAutomationApi.run(clientFilter === "all" ? undefined : clientFilter);
      setNotice({
        tone: result.warnings.length ? "warning" : "success",
        title: "Compliance automation completed",
        message: `${result.obligationsCreated} created, ${result.obligationsRefreshed} refreshed and ${result.missingEvidenceRequestsCreated} missing-evidence request(s) created.${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}`,
      });
      await load();
    } catch (error) {
      setNotice({ tone: "danger", title: "Automation failed", message: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  }

  function replaceObligation(updated: ComplianceObligation) {
    setObligations(rows => rows.map(row => row.id === updated.id ? updated : row));
    setSelectedId(updated.id);
  }

  // CSD is a standing supplier-registration check and intentionally has no statutory filing due day.
  const hasUnverifiedDeadlines = rules?.rules.some(rule => rule.code !== "CSD" && rule.dueDayOfMonth == null) ?? false;

  return <div className="compliance-automation space-y-5">
    <PageHeader
      eyebrow={accountant ? "Compliance automation" : "Your compliance"}
      title="Compliance Centre"
      description={accountant
        ? "Manage generated obligations, evidence readiness and manual external filing from one workflow."
        : "See what is due, what evidence is missing and what your accounting team has submitted."}
      actions={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} /> Refresh</Button>
        {accountant && <Button disabled={busy} onClick={() => void runAutomation()}>{busy ? "Running…" : "Run automation"}</Button>}
      </div>}
    />

    {notice && <FeedbackBanner {...notice} onDismiss={() => setNotice(null)} />}

    <div className="compliance-summary-strip" aria-label="Compliance work summary">
      <span><strong>{obligations.length}</strong> obligations</span>
      <span className={needsAttention ? "is-attention" : ""}><strong>{needsAttention}</strong> need attention</span>
      <span><strong>{readyForProfessionalAction}</strong> ready for action</span>
      <span><strong>{complete}</strong> complete</span>
      {rules && <span className={hasUnverifiedDeadlines ? "is-attention" : ""}><strong>{rules.version}</strong> rule set</span>}
    </div>

    {accountant && hasUnverifiedDeadlines && <div className="compliance-config-warning">
      <AlertCircle size={18} />
      <div><strong>Deadline configuration required</strong><p>The starter rules intentionally do not guess statutory due days. An administrator must verify current rules before deadline alerts are relied upon. CSD is excluded because it is tracked as a standing registration requirement.</p></div>
      {canEditRules && <Button variant="secondary" onClick={() => setShowRules(value => !value)}><Settings2 size={16} /> {showRules ? "Hide rules" : "Review rules"}</Button>}
    </div>}

    {accountant && canEditRules && showRules && rules && <RulesEditor rules={rules} busy={busy} onBusy={setBusy} onSaved={next => {
      setRules(next); setNotice({ tone: "success", title: "Rules saved", message: `Rule set ${next.version} is active for future automation runs.` });
    }} />}

    {accountant && showProfile && clientFilter !== "all" && profile && <ComplianceProfileEditor profile={profile} busy={busy} onBusy={setBusy} onSaved={next => {
      setProfile(next); setNotice({ tone: "success", title: "Compliance profile saved", message: "Run automation to reconcile this client's obligations." });
    }} />}

    <section className="compliance-obligation-register">
      <div className="compliance-register-toolbar"><div><h2>Obligations</h2><p>One row per client, compliance type and period.</p></div>
        {accountant && clientFilter !== "all" && <Button variant="secondary" onClick={() => setShowProfile(value => !value)}><Settings2 size={16} /> {showProfile ? "Close profile" : "Compliance profile"}</Button>}
      </div>
      <div className="compliance-filter-row">
        <TextField label="Search" placeholder="VAT201, CSD, client, SARS…" value={query} onChange={event => setQuery(event.target.value)} />
        {accountant && <SelectField label="Client" value={clientFilter} options={[{ value: "all", label: "All clients" }, ...clients.map(client => ({ value: client.id, label: client.name }))]} onChange={event => setClientFilter(event.target.value)} />}
        <SelectField label="Status" value={statusFilter} options={[{ value: "all", label: "All statuses" }, ...workflowOptions.map(value => ({ value, label: complianceStatusLabel(value) }))]} onChange={event => setStatusFilter(event.target.value)} />
      </div>
      <div className="compliance-table-wrap"><table className="compliance-obligation-table">
        <thead><tr><th>Obligation</th>{accountant && <th>Client</th>}<th>Period</th><th>Due</th><th>Readiness</th><th>Evidence</th><th>Filing</th><th>Payment</th><th></th></tr></thead>
        <tbody>{visible.map(item => <tr key={item.id} className={item.workflowStatus === "overdue" ? "is-overdue" : ""}>
          <td><strong>{item.code}</strong><span>{item.authority}</span></td>{accountant && <td>{item.clientName}</td>}
          <td>{item.code === "CSD" ? "Standing registration" : formatCompliancePeriod(item.periodStartUtc, item.periodEndUtc)}</td><td>{item.dueDateUtc ? formatDateLabel(item.dueDateUtc) : <span className="muted">{item.code === "CSD" ? "Standing registration" : "Not configured"}</span>}</td>
          <td><StatusPill value={item.workflowStatus} /></td><td>{item.evidenceFound}/{item.evidenceRequired}</td><td>{complianceStatusLabel(item.submissionStatus)}</td><td>{item.paymentRequired ? complianceStatusLabel(item.paymentStatus) : "—"}</td>
          <td><Button variant="secondary" onClick={() => setSelectedId(item.id)}>Open</Button></td>
        </tr>)}
        {!loading && visible.length === 0 && <tr><td colSpan={accountant ? 9 : 8} className="compliance-empty">{accountant ? "No generated obligations match these filters. Confirm a client profile and run automation." : "There are no generated obligations to show yet."}</td></tr>}
        </tbody></table></div>
    </section>

    {selected && <ObligationDrawer key={selected.id} obligation={selected} accountant={accountant} busy={busy} setBusy={setBusy} onClose={() => setSelectedId(null)} onUpdated={replaceObligation} onNotice={setNotice} />}
  </div>;
}

function StatusPill({ value }: { value: string }) {
  const tone = value === "complete" ? "good" : value === "overdue" ? "danger" : ["waiting_for_client", "payment_outstanding"].includes(value) ? "warning" : "neutral";
  return <span className={`compliance-status compliance-status--${tone}`}>{complianceStatusLabel(value)}</span>;
}

function ObligationDrawer({ obligation, accountant, busy, setBusy, onClose, onUpdated, onNotice }: {
  obligation: ComplianceObligation; accountant: boolean; busy: boolean; setBusy: (value: boolean) => void;
  onClose: () => void; onUpdated: (value: ComplianceObligation) => void; onNotice: (value: Notice | null) => void;
}) {
  const [submissionRef, setSubmissionRef] = useState(obligation.submissionReference ?? "");
  const [submittedOn, setSubmittedOn] = useState(dateValue(obligation.submittedAtUtc) || new Date().toISOString().slice(0, 10));
  const [amountPayable, setAmountPayable] = useState(obligation.amountPayable?.toString() ?? "");
  const [amountRefundable, setAmountRefundable] = useState(obligation.amountRefundable?.toString() ?? "");
  const [paymentRequired, setPaymentRequired] = useState(obligation.paymentRequired);
  const [paymentRef, setPaymentRef] = useState(obligation.paymentReference ?? "");
  const [paidOn, setPaidOn] = useState(dateValue(obligation.paidAtUtc) || new Date().toISOString().slice(0, 10));
  const [amountPaid, setAmountPaid] = useState(obligation.amountPayable?.toString() ?? "");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [savedEvidence, setSavedEvidence] = useState<ObligationEvidence[] | null>(null);

  async function viewEvidence() {
    setBusy(true);
    try { setSavedEvidence(await complianceAutomationApi.getEvidence(obligation.id)); }
    catch (error) { onNotice({ tone: "danger", title: "Evidence unavailable", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  async function downloadEvidence(item: ObligationEvidence) {
    setBusy(true);
    try {
      const { blob } = await apiGetBlob(`/api/compliance/evidence/${encodeURIComponent(item.id)}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = item.fileName;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { onNotice({ tone: "danger", title: "Download failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  async function act(action: () => Promise<ComplianceObligation>, title: string) {
    if (busy) return;
    setBusy(true); onNotice(null);
    try { onUpdated(await action()); onNotice({ tone: "success", title, message: "The obligation and audit history were updated." }); }
    catch (error) { onNotice({ tone: "danger", title: "Action failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  async function uploadReceipt() {
    if (!evidenceFile || busy) return;
    setBusy(true);
    try {
      const result = await complianceAutomationApi.uploadEvidence(obligation.id, evidenceFile, `${obligation.code} compliance evidence for ${formatCompliancePeriod(obligation.periodStartUtc, obligation.periodEndUtc)}`);
      onUpdated(result.obligation);
      setSavedEvidence(current => current ? [result.evidence, ...current] : null);
      setEvidenceFile(null);
      onNotice({ tone: "success", title: "Evidence uploaded", message: "The evidence is retained against this compliance obligation." });
    } catch (error) {
      onNotice({ tone: "danger", title: "Evidence upload failed", message: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  }

  return <div className="compliance-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="compliance-drawer" aria-label={`${obligation.code} compliance obligation`}>
    <div className="compliance-drawer-head"><div><p>{obligation.authority}</p><h2>{obligation.code} · {obligation.code === "CSD" ? "Standing registration" : formatCompliancePeriod(obligation.periodStartUtc, obligation.periodEndUtc)}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
    <div className="compliance-drawer-status"><StatusPill value={obligation.workflowStatus} /><span>{obligation.dueDateUtc ? `Due ${formatDateLabel(obligation.dueDateUtc)}` : obligation.code === "CSD" ? "Standing supplier registration" : "Deadline not configured"}</span></div>
    <section><h3>Why this exists</h3><p>{obligation.createdReason}</p><small>Rule version: {obligation.ruleVersion}</small></section>
    <section><h3>Evidence readiness</h3><p><strong>{obligation.evidenceFound}/{obligation.evidenceRequired}</strong> required categories found in the relevant monthly-pack period.</p>{obligation.missingEvidenceCategories.length > 0 && <p className="missing-list">Missing: {obligation.missingEvidenceCategories.join(", ")}</p>}</section>
    <section><Button variant="secondary" disabled={busy} onClick={() => void viewEvidence()}>View saved evidence</Button>
      {savedEvidence?.length === 0 && <p>No evidence has been uploaded for this obligation.</p>}
      {savedEvidence?.map(item => <p key={item.id}><Button variant="secondary" disabled={busy} onClick={() => void downloadEvidence(item)}>{item.fileName} · version {item.versionNumber}</Button></p>)}
    </section>
    <section className="workflow-list"><h3>Workflow</h3><div><span>Preparation</span><strong>{complianceStatusLabel(obligation.preparationStatus)}</strong></div><div><span>Review</span><strong>{complianceStatusLabel(obligation.reviewStatus)}</strong></div><div><span>External filing</span><strong>{complianceStatusLabel(obligation.submissionStatus)}</strong></div><div><span>Payment</span><strong>{obligation.paymentRequired ? complianceStatusLabel(obligation.paymentStatus) : "Not required"}</strong></div></section>

    {accountant && <>
      <section><h3>Professional actions</h3><div className="action-row"><Button variant="secondary" disabled={busy || obligation.missingEvidenceCategories.length > 0} onClick={() => void act(() => complianceAutomationApi.preparation(obligation.id, { complete: true }), "Preparation completed")}>Mark prepared</Button><Button variant="secondary" disabled={busy || obligation.preparationStatus !== "complete"} onClick={() => void act(() => complianceAutomationApi.review(obligation.id, { approved: true }), "Review approved")}>Approve review</Button></div></section>
      {obligation.reviewStatus === "approved" && obligation.submissionStatus === "not_submitted" && <section className="manual-filing-panel"><h3><ExternalLink size={17} /> Record external submission</h3><p>File on the authority's portal first. Then record the real result here; Secure Client Portal does not submit externally.</p>
        <TextField label="Submitted on" type="date" value={submittedOn} onChange={event => setSubmittedOn(event.target.value)} /><TextField label="Submission reference" value={submissionRef} onChange={event => setSubmissionRef(event.target.value)} />
        <div className="two-col"><TextField label="Amount payable" type="number" value={amountPayable} onChange={event => setAmountPayable(event.target.value)} /><TextField label="Amount refundable" type="number" value={amountRefundable} onChange={event => setAmountRefundable(event.target.value)} /></div>
        <label className="check-row"><input type="checkbox" checked={paymentRequired} onChange={event => setPaymentRequired(event.target.checked)} /> Payment is required after submission</label>
        <Button disabled={busy || !submissionRef.trim() || !submittedOn} onClick={() => void act(() => complianceAutomationApi.submission(obligation.id, { submittedAtUtc: new Date(`${submittedOn}T12:00:00Z`).toISOString(), submissionReference: submissionRef.trim(), amountPayable: amountPayable ? Number(amountPayable) : null, amountRefundable: amountRefundable ? Number(amountRefundable) : null, paymentRequired }), "Submission recorded")}>Record submission</Button>
      </section>}
      {obligation.submissionStatus === "submitted" && <section className="manual-filing-panel"><h3><Upload size={17} /> Filing receipt / authority confirmation</h3><p>Keep the external receipt as evidence against this obligation.</p><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={event => setEvidenceFile(event.target.files?.[0] ?? null)} /><Button variant="secondary" disabled={busy || !evidenceFile} onClick={() => void uploadReceipt()}>Upload evidence</Button></section>}
      {obligation.code === "CSD" && obligation.submissionStatus === "not_required" && <section className="manual-filing-panel"><h3><Upload size={17} /> CSD registration evidence</h3><p>Upload the current CSD registration report or supplier-registration evidence. CSD is tracked as a standing supplier record rather than an external filing return.</p><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={event => setEvidenceFile(event.target.files?.[0] ?? null)} /><Button variant="secondary" disabled={busy || !evidenceFile} onClick={() => void uploadReceipt()}>Upload CSD evidence</Button></section>}
      {obligation.submissionStatus === "submitted" && obligation.paymentRequired && obligation.paymentStatus !== "paid" && <section className="manual-filing-panel"><h3>Record payment</h3><p>Filing and payment stay separate so a submitted return cannot appear complete while payment is outstanding.</p><TextField label="Paid on" type="date" value={paidOn} onChange={event => setPaidOn(event.target.value)} /><TextField label="Payment reference" value={paymentRef} onChange={event => setPaymentRef(event.target.value)} /><TextField label="Amount paid" type="number" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} /><Button disabled={busy || !paymentRef.trim() || !paidOn} onClick={() => void act(() => complianceAutomationApi.payment(obligation.id, { paidAtUtc: new Date(`${paidOn}T12:00:00Z`).toISOString(), paymentReference: paymentRef.trim(), amountPaid: Number(amountPaid || 0) }), "Payment recorded")}>Confirm payment</Button></section>}
    </>}
    {obligation.submissionStatus === "submitted" && <section className="submission-summary"><CheckCircle2 size={18} /><div><strong>Submission recorded</strong><p>{obligation.submissionReference} · {obligation.submittedAtUtc ? formatDateLabel(obligation.submittedAtUtc) : ""}</p><p>Payable {money(obligation.amountPayable)} · Refund {money(obligation.amountRefundable)}</p></div></section>}
  </aside></div>;
}

function ComplianceProfileEditor({ profile, busy, onBusy, onSaved }: { profile: ClientComplianceProfile; busy: boolean; onBusy: (value: boolean) => void; onSaved: (value: ClientComplianceProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  const fields: Array<["vatRegistered" | "payeRegistered" | "uifRegistered" | "coidaRegistered" | "provisionalTaxpayer" | "companyTaxRegistered" | "cipcRegistered" | "governmentSupplier" | "csdRegistered", string]> = [
    ["vatRegistered", "VAT registered"],
    ["payeRegistered", "PAYE registered"],
    ["uifRegistered", "UIF registered"],
    ["coidaRegistered", "COIDA registered"],
    ["provisionalTaxpayer", "Provisional taxpayer"],
    ["companyTaxRegistered", "Company tax registered"],
    ["cipcRegistered", "CIPC registered"],
    ["governmentSupplier", "Supplies government / needs CSD"],
    ["csdRegistered", "CSD registered"],
  ];
  async function save() {
    onBusy(true);
    try {
      onSaved(await complianceAutomationApi.updateProfile(profile.clientId, {
        vatRegistered: draft.vatRegistered,
        vatCycleMonths: draft.vatCycleMonths,
        vatAnchorMonth: draft.vatAnchorMonth,
        payeRegistered: draft.payeRegistered,
        uifRegistered: draft.uifRegistered,
        coidaRegistered: draft.coidaRegistered,
        provisionalTaxpayer: draft.provisionalTaxpayer,
        companyTaxRegistered: draft.companyTaxRegistered,
        cipcRegistered: draft.cipcRegistered,
        governmentSupplier: draft.governmentSupplier,
        csdRegistered: draft.csdRegistered,
        csdSupplierNumber: draft.csdSupplierNumber,
        financialYearEndMonth: draft.financialYearEndMonth,
      }));
    } finally { onBusy(false); }
  }
  return <section className="compliance-profile-editor"><div><h2>Client compliance profile</h2><p>Only confirmed registrations generate obligations. “Not confirmed” never guesses applicability. CSD is generated only for clients confirmed as government suppliers.</p></div><div className="profile-grid">
    {fields.map(([key, label]) => <SelectField key={key} label={label} options={booleanOptions} value={toChoice(draft[key])} onChange={event => setDraft(value => ({ ...value, [key]: fromChoice(event.target.value) }))} />)}
    <TextField label="CSD supplier number" placeholder="e.g. MAAA…" value={draft.csdSupplierNumber ?? ""} onChange={event => setDraft(value => ({ ...value, csdSupplierNumber: event.target.value || null }))} />
    <SelectField label="VAT cycle" value={String(draft.vatCycleMonths)} options={[1,2,3,6,12].map(value => ({ value: String(value), label: `${value} month${value === 1 ? "" : "s"}` }))} onChange={event => setDraft(value => ({ ...value, vatCycleMonths: Number(event.target.value) }))} />
    <SelectField label="VAT anchor month" value={String(draft.vatAnchorMonth)} options={monthOptions} onChange={event => setDraft(value => ({ ...value, vatAnchorMonth: Number(event.target.value) }))} /><SelectField label="Financial year end" value={String(draft.financialYearEndMonth)} options={monthOptions} onChange={event => setDraft(value => ({ ...value, financialYearEndMonth: Number(event.target.value) }))} />
  </div><div className="flex justify-end"><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save profile"}</Button></div></section>;
}

function RulesEditor({ rules, busy, onBusy, onSaved }: { rules: ComplianceRuleSet; busy: boolean; onBusy: (value: boolean) => void; onSaved: (value: ComplianceRuleSet) => void }) {
  const [draft, setDraft] = useState(rules);
  useEffect(() => setDraft(rules), [rules]);
  async function save() { onBusy(true); try { onSaved(await complianceAutomationApi.updateRules({ version: draft.version, rules: draft.rules })); } finally { onBusy(false); } }
  return <section className="compliance-rules-editor"><div className="rules-title"><div><h2>Compliance rule set</h2><p>Version verified rules instead of hard-coding changing statutory dates.</p></div><TextField label="Version" value={draft.version} onChange={event => setDraft(value => ({ ...value, version: event.target.value }))} /></div><div className="rules-list">
    {draft.rules.map((rule, index) => <div className="rule-row" key={rule.code}><div><strong>{rule.code}</strong><span>{rule.authority} · every {rule.cadenceMonths} month(s){rule.code === "CSD" ? " · standing registration" : ""}</span></div><div className="rule-deadline"><label>Due offset (months)<input type="number" min={0} max={24} value={rule.dueOffsetMonths} disabled={rule.code === "CSD"} onChange={event => setDraft(value => ({ ...value, rules: value.rules.map((item, i) => i === index ? { ...item, dueOffsetMonths: Number(event.target.value) } : item) }))} /></label><label>Due day<input type="number" min={1} max={31} placeholder={rule.code === "CSD" ? "N/A" : "Verify"} value={rule.dueDayOfMonth ?? ""} disabled={rule.code === "CSD"} onChange={event => setDraft(value => ({ ...value, rules: value.rules.map((item, i) => i === index ? { ...item, dueDayOfMonth: event.target.value ? Number(event.target.value) : null } : item) }))} /></label></div></div>)}
  </div><div className="rules-foot"><span><ShieldCheck size={16} /> Existing obligations keep the rule version that created them.</span><Button disabled={busy || !draft.version.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save rule set"}</Button></div></section>;
}
