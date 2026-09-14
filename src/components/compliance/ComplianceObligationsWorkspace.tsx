import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { FeedbackBanner } from "../ui/FeedbackBanner";
import { PageHeader } from "../ui/PageHeader";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import { apiGetJson } from "../../services/apiClient";
import { formatDateLabel } from "../../utils/formatters";
import type { Tone } from "../../types/portal";
import {
  complianceAutomationApi,
  complianceStatusLabel,
  formatCompliancePeriod,
  type ClientComplianceProfile,
  type ComplianceObligation,
  type ComplianceRuleSet,
} from "./complianceAutomation";
import "./complianceAutomation.css";

interface ClientOption { id: string; name: string }
type Notice = { tone: Tone; title: string; message: string };
type WorkspaceMode = "accountant" | "client";
type BooleanChoice = "unknown" | "yes" | "no";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("en-ZA", { month: "long" }).format(new Date(2026, index, 1)),
}));
const booleanOptions = [
  { value: "unknown", label: "Not confirmed" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function toChoice(value: boolean | null): BooleanChoice { return value === true ? "yes" : value === false ? "no" : "unknown"; }
function fromChoice(value: string): boolean | null { return value === "yes" ? true : value === "no" ? false : null; }
function dateValue(value?: string | null) { return value ? value.slice(0, 10) : ""; }
function money(value: number | null) { return value == null ? "—" : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value); }

export function ComplianceObligationsWorkspace({ mode }: { mode: WorkspaceMode }) {
  const accountant = mode === "accountant";
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [rules, setRules] = useState<ComplianceRuleSet | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [profile, setProfile] = useState<ClientComplianceProfile | null>(null);

  const selected = obligations.find(item => item.id === selectedId) ?? null;

  async function load() {
    setLoading(true);
    setNotice(null);
    try {
      const [rows, ruleSet, clientRows] = await Promise.all([
        complianceAutomationApi.getObligations(accountant && clientFilter !== "all" ? clientFilter : undefined),
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
    complianceAutomationApi.getProfile(clientFilter).then(setProfile).catch(error => {
      setNotice({ tone: "danger", title: "Profile unavailable", message: error instanceof Error ? error.message : "Please try again." });
    });
  }, [accountant, clientFilter]);

  const visible = useMemo(() => obligations.filter(item => {
    const text = `${item.code} ${item.name} ${item.clientName} ${item.authority}`.toLowerCase();
    return (clientFilter === "all" || item.clientId === clientFilter)
      && (statusFilter === "all" || item.workflowStatus === statusFilter)
      && text.includes(query.trim().toLowerCase());
  }), [obligations, clientFilter, statusFilter, query]);

  const attention = obligations.filter(item => ["waiting_for_client", "overdue", "payment_outstanding"].includes(item.workflowStatus)).length;
  const ready = obligations.filter(item => ["ready_for_review", "ready_to_file"].includes(item.workflowStatus)).length;
  const complete = obligations.filter(item => item.workflowStatus === "complete").length;

  async function runAutomation() {
    if (!accountant || busy) return;
    setBusy(true); setNotice(null);
    try {
      const result = await complianceAutomationApi.run(clientFilter === "all" ? undefined : clientFilter);
      setNotice({
        tone: result.warnings.length ? "warning" : "success",
        title: "Compliance automation completed",
        message: `${result.obligationsCreated} obligation(s) created, ${result.obligationsRefreshed} refreshed and ${result.missingEvidenceRequestsCreated} missing-evidence request(s) created.${result.warnings.length ? ` ${result.warnings.length} configuration warning(s) need attention.` : ""}`,
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

  return <div className="compliance-automation space-y-5">
    <PageHeader
      eyebrow={accountant ? "Compliance automation" : "Your compliance"}
      title="Compliance Centre"
      description={accountant
        ? "Manage obligations generated from each client's confirmed compliance profile. External filing remains accountant-controlled."
        : "See what is due, what evidence is missing and what your accounting team has submitted."}
      actions={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} /> Refresh</Button>
        {accountant && <Button disabled={busy} onClick={() => void runAutomation()}>{busy ? "Running…" : "Run automation"}</Button>}
      </div>}
    />

    {notice && <FeedbackBanner {...notice} onDismiss={() => setNotice(null)} />}

    <div className="compliance-summary-strip" aria-label="Compliance work summary">
      <span><strong>{obligations.length}</strong> obligations</span>
      <span className={attention ? "is-attention" : ""}><strong>{attention}</strong> need attention</span>
      <span><strong>{ready}</strong> ready for professional action</span>
      <span><strong>{complete}</strong> complete</span>
      {rules && <span className={rules.rules.some(rule => rule.dueDayOfMonth == null) ? "is-attention" : ""}><strong>{rules.version}</strong> rule set</span>}
    </div>

    {accountant && rules?.rules.some(rule => rule.dueDayOfMonth == null) && <div className="compliance-config-warning">
      <AlertCircle size={18} />
      <div><strong>Deadline configuration required</strong><p>Starter rules deliberately do not guess statutory due days. Verify the firm's current rules before relying on deadline alerts.</p></div>
      <Button variant="secondary" onClick={() => setShowRules(value => !value)}><Settings2 size={16} /> {showRules ? "Hide rules" : "Review rules"}</Button>
    </div>}

    {accountant && showRules && rules && <RulesEditor rules={rules} busy={busy} onBusy={setBusy} onSaved={next => { setRules(next); setNotice({ tone: "success", title: "Rules saved", message: `Rule set ${next.version} is now active for future automation runs.` }); }} />}

    {accountant && showProfile && clientFilter !== "all" && profile && <ComplianceProfileEditor profile={profile} busy={busy} onBusy={setBusy} onSaved={setProfile} />}

    <section className="compliance-obligation-register">
      <div className="compliance-register-toolbar">
        <div>
          <h2>Obligations</h2>
          <p>One row per client, obligation type and compliance period.</p>
        </div>
        {accountant && clientFilter !== "all" && <Button variant="secondary" onClick={() => setShowProfile(value => !value)}><Settings2 size={16} /> {showProfile ? "Close profile" : "Compliance profile"}</Button>}
      </div>

      <div className="compliance-filter-row">
        <TextField label="Search" placeholder="VAT201, client, SARS…" value={query} onChange={event => setQuery(event.target.value)} />
        {accountant && <SelectField label="Client" value={clientFilter} options={[{ value: "all", label: "All clients" }, ...clients.map(client => ({ value: client.id, label: client.name }))]} onChange={event => setClientFilter(event.target.value)} />}
        <SelectField label="Status" value={statusFilter} options={[
          { value: "all", label: "All statuses" },
          ...["waiting_for_client", "ready_to_prepare", "in_preparation", "ready_for_review", "ready_to_file", "payment_outstanding", "complete", "overdue", "not_applicable"].map(value => ({ value, label: complianceStatusLabel(value) })),
        ]} onChange={event => setStatusFilter(event.target.value)} />
      </div>

      <div className="compliance-table-wrap">
        <table className="compliance-obligation-table">
          <thead><tr><th>Obligation</th>{accountant && <th>Client</th>}<th>Period</th><th>Due</th><th>Readiness</th><th>Evidence</th><th>Filing</th><th>Payment</th><th></th></tr></thead>
          <tbody>
            {visible.map(item => <tr key={item.id} className={item.workflowStatus === "overdue" ? "is-overdue" : ""}>
              <td><strong>{item.code}</strong><span>{item.authority}</span></td>
              {accountant && <td>{item.clientName}</td>}
              <td>{formatCompliancePeriod(item.periodStartUtc, item.periodEndUtc)}</td>
              <td>{item.dueDateUtc ? formatDateLabel(item.dueDateUtc) : <span className="muted">Not configured</span>}</td>
              <td><StatusPill value={item.workflowStatus} /></td>
              <td>{item.evidenceFound}/{item.evidenceRequired}</td>
              <td>{complianceStatusLabel(item.submissionStatus)}</td>
              <td>{item.paymentRequired ? complianceStatusLabel(item.paymentStatus) : "—"}</td>
              <td><Button variant="secondary" onClick={() => setSelectedId(item.id)}>Open</Button></td>
            </tr>)}
            {!loading && visible.length === 0 && <tr><td colSpan={accountant ? 9 : 8} className="compliance-empty">No obligations match these filters. {accountant ? "Confirm a client's compliance profile, then run automation." : "Your accounting team has no generated obligations to show yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    {selected && <ObligationDrawer obligation={selected} accountant={accountant} busy={busy} setBusy={setBusy} onClose={() => setSelectedId(null)} onUpdated={replaceObligation} onNotice={setNotice} />}
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

  async function act(action: () => Promise<ComplianceObligation>, success: string) {
    if (busy) return;
    setBusy(true); onNotice(null);
    try { onUpdated(await action()); onNotice({ tone: "success", title: success, message: "The obligation and audit history were updated." }); }
    catch (error) { onNotice({ tone: "danger", title: "Action failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  return <div className="compliance-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="compliance-drawer" aria-label={`${obligation.code} compliance obligation`}>
      <div className="compliance-drawer-head"><div><p>{obligation.authority}</p><h2>{obligation.code} · {formatCompliancePeriod(obligation.periodStartUtc, obligation.periodEndUtc)}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
      <div className="compliance-drawer-status"><StatusPill value={obligation.workflowStatus} /><span>{obligation.dueDateUtc ? `Due ${formatDateLabel(obligation.dueDateUtc)}` : "Deadline not configured"}</span></div>

      <section><h3>Why this exists</h3><p>{obligation.createdReason}</p><small>Rule version: {obligation.ruleVersion}</small></section>
      <section><h3>Evidence readiness</h3><p><strong>{obligation.evidenceFound}/{obligation.evidenceRequired}</strong> required categories found in the relevant monthly-pack period.</p>{obligation.missingEvidenceCategories.length > 0 && <p className="missing-list">Missing: {obligation.missingEvidenceCategories.join(", ")}</p>}</section>
      <section className="workflow-list"><h3>Workflow</h3><div><span>Preparation</span><strong>{complianceStatusLabel(obligation.preparationStatus)}</strong></div><div><span>Review</span><strong>{complianceStatusLabel(obligation.reviewStatus)}</strong></div><div><span>External filing</span><strong>{complianceStatusLabel(obligation.submissionStatus)}</strong></div><div><span>Payment</span><strong>{obligation.paymentRequired ? complianceStatusLabel(obligation.paymentStatus) : "Not required"}</strong></div></section>

      {accountant && <>
        <section><h3>Professional actions</h3><div className="action-row">
          <Button variant="secondary" disabled={busy || obligation.missingEvidenceCategories.length > 0} onClick={() => void act(() => complianceAutomationApi.preparation(obligation.id, { complete: true }), "Preparation completed")}>Mark prepared</Button>
          <Button variant="secondary" disabled={busy || obligation.preparationStatus !== "complete"} onClick={() => void act(() => complianceAutomationApi.review(obligation.id, { approved: true }), "Review approved")}>Approve review</Button>
        </div></section>

        {obligation.reviewStatus === "approved" && obligation.submissionStatus !== "submitted" && <section className="manual-filing-panel"><h3><ExternalLink size={17} /> Record external submission</h3><p>Submit on the authority's portal first. Then record the real result here; this portal does not submit externally.</p>
          <TextField label="Submitted on" type="date" value={submittedOn} onChange={event => setSubmittedOn(event.target.value)} />
          <TextField label="Submission reference" value={submissionRef} onChange={event => setSubmissionRef(event.target.value)} />
          <div className="two-col"><TextField label="Amount payable" type="number" value={amountPayable} onChange={event => setAmountPayable(event.target.value)} /><TextField label="Amount refundable" type="number" value={amountRefundable} onChange={event => setAmountRefundable(event.target.value)} /></div>
          <label className="check-row"><input type="checkbox" checked={paymentRequired} onChange={event => setPaymentRequired(event.target.checked)} /> Payment is required after submission</label>
          <Button disabled={busy || !submissionRef.trim() || !submittedOn} onClick={() => void act(() => complianceAutomationApi.submission(obligation.id, {
            submittedAtUtc: new Date(`${submittedOn}T12:00:00Z`).toISOString(), submissionReference: submissionRef.trim(),
            amountPayable: amountPayable ? Number(amountPayable) : null, amountRefundable: amountRefundable ? Number(amountRefundable) : null, paymentRequired,
          }), "Submission recorded")}>Record submission</Button>
        </section>}

        {obligation.submissionStatus === "submitted" && obligation.paymentRequired && obligation.paymentStatus !== "paid" && <section className="manual-filing-panel"><h3>Record payment</h3><p>Keep payment separate from filing so a submitted return cannot appear complete while payment remains outstanding.</p>
          <TextField label="Paid on" type="date" value={paidOn} onChange={event => setPaidOn(event.target.value)} />
          <TextField label="Payment reference" value={paymentRef} onChange={event => setPaymentRef(event.target.value)} />
          <TextField label="Amount paid" type="number" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} />
          <Button disabled={busy || !paymentRef.trim() || !paidOn} onClick={() => void act(() => complianceAutomationApi.payment(obligation.id, { paidAtUtc: new Date(`${paidOn}T12:00:00Z`).toISOString(), paymentReference: paymentRef.trim(), amountPaid: Number(amountPaid || 0) }), "Payment recorded")}>Confirm payment</Button>
        </section>}
      </>}

      {obligation.submissionStatus === "submitted" && <section className="submission-summary"><CheckCircle2 size={18} /><div><strong>Submission recorded</strong><p>{obligation.submissionReference} · {obligation.submittedAtUtc ? formatDateLabel(obligation.submittedAtUtc) : ""}</p><p>Payable {money(obligation.amountPayable)} · Refund {money(obligation.amountRefundable)}</p></div></section>}
    </aside>
  </div>;
}

function ComplianceProfileEditor({ profile, busy, onBusy, onSaved }: { profile: ClientComplianceProfile; busy: boolean; onBusy: (value: boolean) => void; onSaved: (value: ClientComplianceProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  const fields: Array<[keyof ClientComplianceProfile, string]> = [
    ["vatRegistered", "VAT registered"], ["payeRegistered", "PAYE registered"], ["uifRegistered", "UIF registered"],
    ["coidaRegistered", "COIDA registered"], ["provisionalTaxpayer", "Provisional taxpayer"], ["companyTaxRegistered", "Company tax registered"], ["cipcRegistered", "CIPC registered"],
  ];
  async function save() {
    onBusy(true);
    try {
      onSaved(await complianceAutomationApi.updateProfile(profile.clientId, {
        vatRegistered: draft.vatRegistered, vatCycleMonths: draft.vatCycleMonths, vatAnchorMonth: draft.vatAnchorMonth,
        payeRegistered: draft.payeRegistered, uifRegistered: draft.uifRegistered, coidaRegistered: draft.coidaRegistered,
        provisionalTaxpayer: draft.provisionalTaxpayer, companyTaxRegistered: draft.companyTaxRegistered, cipcRegistered: draft.cipcRegistered,
        financialYearEndMonth: draft.financialYearEndMonth,
      }));
    } finally { onBusy(false); }
  }
  return <section className="compliance-profile-editor"><div><h2>Client compliance profile</h2><p>Only confirmed registrations generate obligations. “Not confirmed” never guesses applicability.</p></div>
    <div className="profile-grid">{fields.map(([key, label]) => <SelectField key={key} label={label} options={booleanOptions} value={toChoice(draft[key] as boolean | null)} onChange={event => setDraft(value => ({ ...value, [key]: fromChoice(event.target.value) }))} />)}
      <SelectField label="VAT cycle" value={String(draft.vatCycleMonths)} options={[1, 2, 3, 6, 12].map(value => ({ value: String(value), label: `${value} month${value === 1 ? "" : "s"}` }))} onChange={event => setDraft(value => ({ ...value, vatCycleMonths: Number(event.target.value) }))} />
      <SelectField label="VAT anchor month" value={String(draft.vatAnchorMonth)} options={monthOptions} onChange={event => setDraft(value => ({ ...value, vatAnchorMonth: Number(event.target.value) }))} />
      <SelectField label="Financial year end" value={String(draft.financialYearEndMonth)} options={monthOptions} onChange={event => setDraft(value => ({ ...value, financialYearEndMonth: Number(event.target.value) }))} />
    </div><div className="flex justify-end"><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save profile"}</Button></div>
  </section>;
}

function RulesEditor({ rules, busy, onBusy, onSaved }: { rules: ComplianceRuleSet; busy: boolean; onBusy: (value: boolean) => void; onSaved: (value: ComplianceRuleSet) => void }) {
  const [draft, setDraft] = useState(rules);
  useEffect(() => setDraft(rules), [rules]);
  async function save() {
    onBusy(true);
    try { onSaved(await complianceAutomationApi.updateRules({ version: draft.version, rules: draft.rules })); }
    finally { onBusy(false); }
  }
  return <section className="compliance-rules-editor"><div className="rules-title"><div><h2>Compliance rule set</h2><p>Version rules instead of hard-coding changing statutory dates.</p></div><TextField label="Version" value={draft.version} onChange={event => setDraft(value => ({ ...value, version: event.target.value }))} /></div>
    <div className="rules-list">{draft.rules.map((rule, index) => <div className="rule-row" key={rule.code}><div><strong>{rule.code}</strong><span>{rule.authority} · every {rule.cadenceMonths} month(s)</span></div><div className="rule-deadline"><label>Due offset (months)<input type="number" min={0} max={24} value={rule.dueOffsetMonths} onChange={event => setDraft(value => ({ ...value, rules: value.rules.map((item, i) => i === index ? { ...item, dueOffsetMonths: Number(event.target.value) } : item) }))} /></label><label>Due day<input type="number" min={1} max={31} placeholder="Verify" value={rule.dueDayOfMonth ?? ""} onChange={event => setDraft(value => ({ ...value, rules: value.rules.map((item, i) => i === index ? { ...item, dueDayOfMonth: event.target.value ? Number(event.target.value) : null } : item) }))} /></label></div></div>)}</div>
    <div className="rules-foot"><span><ShieldCheck size={16} /> Saving a new version affects automation going forward; existing obligation history keeps its rule version.</span><Button disabled={busy || !draft.version.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save rule set"}</Button></div>
  </section>;
}
