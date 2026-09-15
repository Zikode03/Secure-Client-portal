import { useEffect, useState } from "react";
import { Bell, Building2, CalendarDays, Check, ChevronRight, FileText, GitBranch, Mail, Plus, Save, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { SmtpVerificationPanel } from "../../components/auth/SmtpVerificationPanel";
import { ApiError, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";
import { AdminFirmProfilePanel } from "./AdminFirmProfilePanel";
import "./systemSettings.css";

type RuleSection = "requests" | "reminders" | "deadlines" | "escalations";
type Section = "profile" | RuleSection | "email";
interface BaseRecord { id: string; name: string }
interface RequestTemplate extends BaseRecord { requestType: string; titleTemplate: string; descriptionTemplate: string; priority: string; defaultDueInDays: number | null }
interface ReminderRule extends BaseRecord { triggerType: string; daysBeforeDue: number; audienceRole: string; messageTemplate: string; isEnabled: boolean }
interface DeadlineRule extends BaseRecord { scope: string; dueDayOfMonth: number; graceDays: number; priority: string; isEnabled: boolean }
interface EscalationRule extends BaseRecord { triggerType: string; daysAfterDue: number; escalateToRole: string; action: string; isEnabled: boolean }
interface Configuration { requests: RequestTemplate[]; reminders: ReminderRule[]; deadlines: DeadlineRule[]; escalations: EscalationRule[] }
interface FeedbackNotice { tone: Tone; title: string; message: string }
const emptyConfiguration: Configuration = { requests: [], reminders: [], deadlines: [], escalations: [] };
const sections = [
  { key: "profile", label: "Firm profile", icon: Building2 },
  { key: "requests", label: "Request templates", icon: FileText },
  { key: "reminders", label: "Reminder rules", icon: Bell },
  { key: "deadlines", label: "Deadline rules", icon: CalendarDays },
  { key: "escalations", label: "Escalation rules", icon: GitBranch },
  { key: "email", label: "Email delivery", icon: Mail },
] as const;
const descriptions: Record<RuleSection, string> = {
  requests: "Reusable messages for requesting documents, corrections, and signatures from clients.",
  reminders: "Choose who receives a reminder and how many days before a deadline it is sent.",
  deadlines: "Set monthly due dates and record the grace period for each type of work.",
  escalations: "Route overdue client or accountant actions to the person who should follow up.",
};
const endpoints: Record<RuleSection, string> = {
  requests: "/api/admin/firm-management/templates/requests", reminders: "/api/admin/firm-management/rules/reminders",
  deadlines: "/api/admin/firm-management/rules/deadlines", escalations: "/api/admin/firm-management/rules/escalations",
};
const priorityOptions = ["low", "medium", "high", "urgent", "critical"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const roleOptions = [{ value: "client", label: "Client" }, { value: "accountant", label: "Accountant" }, { value: "admin", label: "Administrator" }];
const requestOptions = [{ value: "missing_document", label: "Missing document" }, { value: "reupload_required", label: "Document correction / re-upload" }, { value: "signature_required", label: "Signature required" }];
const scopeOptions = [{ value: "monthly_pack", label: "Monthly packs" }, { value: "compliance_item", label: "Compliance items" }];
const triggerOptions = [{ value: "overdue_client_action", label: "Waiting for a client action" }, { value: "overdue_accountant_action", label: "Waiting for an accountant action" }];
const actionOptions = [{ value: "notify", label: "Send a notification" }, { value: "notify_admin", label: "Notify administrator" }, { value: "create_request", label: "Request follow-up (notification only)" }];

function Choice({ label, value, options, onChange, hint }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; hint?: string }) {
  const choices = options.some(option => option.value === value) ? options : [...options, { value, label: `${value.split("_").join(" ")} (existing value)` }];
  return <SelectField label={label} value={value} options={choices} hint={hint} onChange={event => onChange(event.target.value)} />;
}
function NumberField({ label, value, onChange, min = 0, max, hint, nullable = false }: { label: string; value: number | null; onChange: (value: number | null) => void; min?: number; max?: number; hint?: string; nullable?: boolean }) {
  return <TextField label={label} type="number" min={min} max={max} step={1} required={!nullable} value={value === null || Number.isNaN(value) ? "" : value} hint={hint} onChange={event => onChange(event.target.value === "" ? null : Number(event.target.value))} />;
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" className="settings-toggle" role="switch" aria-label="Rule enabled" aria-checked={checked} onClick={() => onChange(!checked)}><span className="settings-switch-track"><span /></span>{checked ? "Enabled" : "Paused"}</button>;
}
function dayLabel(value: number) { return Number.isFinite(value) ? `${value} ${value === 1 ? "day" : "days"}` : "… days"; }
function labelFor(options: { value: string; label: string }[], value: string) { return options.find(option => option.value === value)?.label ?? value.split("_").join(" "); }
function exampleMessage(value: string) { return value.split("{{documentName}}").join("September bank statement").split("{{reason}}").join("The last page is missing. Please upload the complete statement."); }

export function AdminSystemConfigurationPage() {
  const backendMode = hasApiBaseUrl();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [draft, setDraft] = useState<Configuration>(emptyConfiguration);
  const [saved, setSaved] = useState<Configuration>(emptyConfiguration);
  const [selectedIds, setSelectedIds] = useState<Partial<Record<RuleSection, string>>>({});
  const [loading, setLoading] = useState(backendMode);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [query, setQuery] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    if (!backendMode) { setFeedback({ tone: "warning", title: "Settings unavailable", message: "Connect to the portal service to load and update firm settings." }); return; }
    let cancelled = false;
    setLoading(true);
    void Promise.all([apiGetJson<RequestTemplate[]>(endpoints.requests), apiGetJson<ReminderRule[]>(endpoints.reminders), apiGetJson<DeadlineRule[]>(endpoints.deadlines), apiGetJson<EscalationRule[]>(endpoints.escalations)])
      .then(([requests, reminders, deadlines, escalations]) => {
        if (cancelled) return;
        const result = { requests, reminders, deadlines, escalations };
        setDraft(result); setSaved(result); setLoaded(true); setFeedback(null);
      }).catch(error => {
        if (!cancelled) setFeedback({ tone: "danger", title: "Settings could not be loaded", message: error instanceof ApiError ? error.message : "Please try loading the settings again." });
      }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [backendMode, loadAttempt]);
  const dirty = (section: RuleSection) => JSON.stringify(draft[section]) !== JSON.stringify(saved[section]);
  const anyDirty = (Object.keys(endpoints) as RuleSection[]).some(dirty);
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);
  function update<K extends RuleSection>(section: K, id: string, patch: Partial<Configuration[K][number]>) {
    setDraft(current => ({ ...current, [section]: current[section].map(row => row.id === id ? { ...row, ...patch } : row) }));
  }
  function add(section: RuleSection) {
    const id = crypto.randomUUID();
    const defaults = {
      requests: { id, name: "New request template", requestType: "missing_document", titleTemplate: "Missing document: {{documentName}}", descriptionTemplate: "Please upload the complete document so we can continue your review.", priority: "medium", defaultDueInDays: 3 },
      reminders: { id, name: "New reminder", triggerType: "deadline_approaching", daysBeforeDue: 3, audienceRole: "client", messageTemplate: "Please review your upcoming deadline and complete any outstanding items.", isEnabled: true },
      deadlines: { id, name: "New deadline", scope: "monthly_pack", dueDayOfMonth: 5, graceDays: 0, priority: "medium", isEnabled: false },
      escalations: { id, name: "New escalation", triggerType: "overdue_client_action", daysAfterDue: 2, escalateToRole: "accountant", action: "notify", isEnabled: true },
    };
    setDraft(current => ({ ...current, [section]: [...current[section], defaults[section]] }));
    setSelectedIds(current => ({ ...current, [section]: id })); setQuery(""); setFeedback(null);
  }
  async function saveSection(section: RuleSection) {
    // All records in this section are saved, including records not currently selected.
    const payload = draft[section];
    const invalid = payload.find(row => !row.name.trim() ||
      ("titleTemplate" in row && (!row.titleTemplate.trim() || !row.descriptionTemplate.trim() || (row.defaultDueInDays !== null && (!Number.isInteger(row.defaultDueInDays) || row.defaultDueInDays < 0)))) ||
      ("daysBeforeDue" in row && (!row.messageTemplate.trim() || !Number.isInteger(row.daysBeforeDue) || row.daysBeforeDue < 0)) ||
      ("dueDayOfMonth" in row && (!Number.isInteger(row.dueDayOfMonth) || row.dueDayOfMonth < 1 || row.dueDayOfMonth > 31 || !Number.isInteger(row.graceDays) || row.graceDays < 0)) ||
      ("daysAfterDue" in row && (!Number.isInteger(row.daysAfterDue) || row.daysAfterDue < 0)));
    if (invalid) {
      setSelectedIds(current => ({ ...current, [section]: invalid.id })); setQuery("");
      setFeedback({ tone: "warning", title: "Check the selected item", message: "Complete the name and message fields, use whole numbers of days, and choose a monthly due day from 1 to 31." }); return;
    }
    setSaving(true); setFeedback(null);
    try {
      await apiPutJson<unknown, typeof payload>(endpoints[section], payload);
      setSaved(current => ({ ...current, [section]: payload }));
      setFeedback({ tone: "success", title: "Changes saved", message: `${sections.find(item => item.key === section)?.label} have been saved. Drafts in other sections are kept.` });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Changes could not be saved", message: error instanceof ApiError ? error.message : "Your draft is still here. Please try again." });
    } finally { setSaving(false); }
  }
  function remove(section: RuleSection, id: string) { setDraft(current => ({ ...current, [section]: current[section].filter(row => row.id !== id) })); }
  function summary(section: RuleSection, id: string) {
    if (section === "requests") { const row = draft.requests.find(item => item.id === id)!; return `${labelFor(requestOptions, row.requestType)} · ${row.defaultDueInDays === null ? "No default due date" : `${dayLabel(row.defaultDueInDays)} to respond`}`; }
    if (section === "reminders") { const row = draft.reminders.find(item => item.id === id)!; return `${row.daysBeforeDue === 0 ? "On the due date" : `${dayLabel(row.daysBeforeDue)} before due`} · ${labelFor(roleOptions, row.audienceRole)}`; }
    if (section === "deadlines") { const row = draft.deadlines.find(item => item.id === id)!; return `${labelFor(scopeOptions, row.scope)} · Day ${Number.isFinite(row.dueDayOfMonth) ? row.dueDayOfMonth : "…"}`; }
    const row = draft.escalations.find(item => item.id === id)!; return `${dayLabel(row.daysAfterDue)} overdue · ${labelFor(roleOptions, row.escalateToRole)}`;
  }
  function renderEditor(section: RuleSection, id: string) {
    if (section === "requests") {
      const row = draft.requests.find(item => item.id === id)!;
      const change = (patch: Partial<RequestTemplate>) => update("requests", id, patch);
      return <>
        <div className="settings-fields"><TextField required maxLength={160} label="Template name" hint="An internal name your team can recognise." value={row.name} onChange={event => change({ name: event.target.value })} /><Choice label="What do you need?" value={row.requestType} options={requestOptions} onChange={requestType => change({ requestType })} /></div>
        <div className="settings-form-group"><h3>Client message</h3><TextField required maxLength={300} label="Request subject" value={row.titleTemplate} onChange={event => change({ titleTemplate: event.target.value })} /><TextAreaField required maxLength={2000} label="Instructions for the client" value={row.descriptionTemplate} onChange={event => change({ descriptionTemplate: event.target.value })} /><p className="settings-help">Use <code>{"{{documentName}}"}</code> for the document name and <code>{"{{reason}}"}</code> for the reason supplied with the request.</p></div>
        <div className="settings-fields"><Choice label="Priority" value={row.priority} options={priorityOptions} onChange={priority => change({ priority })} /><NumberField label="Response due in days" nullable value={row.defaultDueInDays} hint="Calendar days from the request. Leave blank for no default." onChange={defaultDueInDays => change({ defaultDueInDays })} /></div>
        <aside className="settings-preview"><span className="settings-eyebrow">Example client message</span><h3>{exampleMessage(row.titleTemplate) || "Your request subject"}</h3><p className="settings-message">{exampleMessage(row.descriptionTemplate) || "Your instructions will appear here."}</p><small>Sample document: September bank statement. Nothing is sent from this editor.</small></aside>
      </>;
    }
    if (section === "reminders") {
      const row = draft.reminders.find(item => item.id === id)!;
      const change = (patch: Partial<ReminderRule>) => update("reminders", id, patch);
      return <>
        <TextField required maxLength={160} label="Rule name" value={row.name} onChange={event => change({ name: event.target.value })} />
        <div className="settings-fields"><Choice label="When should this run?" value={row.triggerType} options={[{ value: "deadline_approaching", label: "A deadline is approaching" }]} onChange={triggerType => change({ triggerType })} /><Choice label="Who receives it?" value={row.audienceRole} options={roleOptions} onChange={audienceRole => change({ audienceRole })} /><NumberField label="Days before the deadline" value={row.daysBeforeDue} hint="Use 0 for a reminder on the due date." onChange={value => change({ daysBeforeDue: value ?? NaN })} /></div>
        <TextAreaField required maxLength={1000} label="Reminder message" hint="Saved message wording. Current automated reminders use a standard message with the item and its due date." value={row.messageTemplate} onChange={event => change({ messageTemplate: event.target.value })} />
        <aside className="settings-preview"><span className="settings-eyebrow">Rule summary</span><h3>Remind the {labelFor(roleOptions, row.audienceRole).toLowerCase()} {row.daysBeforeDue === 0 ? "on the due date" : `${dayLabel(row.daysBeforeDue)} before the deadline`}.</h3><p>Applies to open monthly packs and dated compliance items. Add separate rules for additional reminder days.</p></aside>
      </>;
    }
    if (section === "deadlines") {
      const row = draft.deadlines.find(item => item.id === id)!;
      const change = (patch: Partial<DeadlineRule>) => update("deadlines", id, patch);
      return <>
        <TextField required maxLength={160} label="Rule name" value={row.name} onChange={event => change({ name: event.target.value })} />
        <div className="settings-fields"><Choice label="Applies to" value={row.scope} options={scopeOptions} onChange={scope => change({ scope })} /><Choice label="Priority" value={row.priority} options={priorityOptions} onChange={priority => change({ priority })} /><NumberField label="Due day of the month" min={1} max={31} value={row.dueDayOfMonth} hint="Choose a day from 1 to 31." onChange={value => change({ dueDayOfMonth: value ?? NaN })} /><NumberField label="Grace period in days" value={row.graceDays} hint="Recorded allowance after the due date; this does not shift reminder dates." onChange={value => change({ graceDays: value ?? NaN })} /></div>
        <aside className="settings-preview"><span className="settings-eyebrow">Rule summary</span><h3>{labelFor(scopeOptions, row.scope)} · due on day {Number.isFinite(row.dueDayOfMonth) ? row.dueDayOfMonth : "…"} each month.</h3><p>{row.graceDays ? `${dayLabel(row.graceDays)} of grace recorded.` : "No grace period recorded."} Priority: {labelFor(priorityOptions, row.priority).toLowerCase()}.</p><small>{row.scope === "monthly_pack" ? "For shorter months, the last available day is used. If several monthly pack rules are enabled, the earliest due day takes precedence." : "Compliance reminders follow the due or expiry date on each item. This saved rule does not replace those dates."}</small></aside>
      </>;
    }
    const row = draft.escalations.find(item => item.id === id)!;
    const change = (patch: Partial<EscalationRule>) => update("escalations", id, patch);
    return <>
      <TextField required maxLength={160} label="Rule name" value={row.name} onChange={event => change({ name: event.target.value })} />
      <div className="settings-fields"><Choice label="What is overdue?" value={row.triggerType} options={triggerOptions} onChange={triggerType => change({ triggerType })} /><NumberField label="Days after the due date" value={row.daysAfterDue} hint="Calendar days overdue before escalation is eligible." onChange={value => change({ daysAfterDue: value ?? NaN })} /><Choice label="Escalate to" value={row.escalateToRole} options={roleOptions.filter(role => role.value !== "client")} onChange={escalateToRole => change({ escalateToRole })} /><Choice label="Follow-up action" value={row.action} options={actionOptions} onChange={action => change({ action })} /></div>
      <aside className="settings-preview"><span className="settings-eyebrow">Escalation path</span><div className="settings-rule-path"><span>{labelFor(triggerOptions, row.triggerType)}</span><ChevronRight size={16} aria-hidden="true" /><span>{dayLabel(row.daysAfterDue)} overdue</span><ChevronRight size={16} aria-hidden="true" /><span>{labelFor(roleOptions, row.escalateToRole)}</span></div><p>Escalation currently sends a notification to the selected role. The follow-up action is recorded; it does not create a new request automatically.</p></aside>
    </>;
  }
  const ruleSection = activeSection !== "profile" && activeSection !== "email" ? activeSection : null;
  const rows = ruleSection ? draft[ruleSection] : [];
  const selected = ruleSection ? rows.find(row => row.id === selectedIds[ruleSection]) ?? rows[0] : null;
  const filteredRows = ruleSection ? rows.filter(row => `${row.name} ${summary(ruleSection, row.id)}`.toLowerCase().includes(query.toLowerCase())) : [];
  const sectionLabel = sections.find(section => section.key === activeSection)!.label;
  return <div className="system-settings">
    <header className="settings-page-heading"><div><p className="settings-eyebrow">Administration</p><h1>System settings</h1><p>Set up your firm and the rules that keep client work moving.</p></div><span className="settings-access"><Building2 size={15} aria-hidden="true" />Firm-wide settings</span></header>
    <nav aria-label="Settings sections" className="settings-sections">{sections.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={activeSection === key} aria-controls={`settings-panel-${key}`} onClick={() => { setActiveSection(key); setQuery(""); }}><Icon size={17} aria-hidden="true" /><span>{label}</span>{(key === "profile" ? profileDirty : key in endpoints && dirty(key as RuleSection)) ? <span className="settings-dirty-dot" aria-label="Unsaved changes" /> : null}</button>)}</nav>
    <div hidden={activeSection !== "profile"} id="settings-panel-profile"><AdminFirmProfilePanel onDirtyChange={setProfileDirty} /></div>
    <div hidden={activeSection !== "email"} id="settings-panel-email" className="settings-surface settings-email"><SmtpVerificationPanel /></div>
    {ruleSection && <section id={`settings-panel-${ruleSection}`} aria-label={sectionLabel}>
      <div className="settings-section-heading"><div><h2>{sectionLabel}</h2><p>{descriptions[ruleSection]}</p></div><Button variant="secondary" disabled={!loaded || loading || saving} onClick={() => add(ruleSection)}><Plus size={16} aria-hidden="true" />Add {ruleSection === "requests" ? "template" : "rule"}</Button></div>
      {ruleSection === "requests" && <div className="settings-context"><FileText size={18} aria-hidden="true" /><p>Request templates define a reusable client message. To choose the documents collected each month, use <Link to="/firm/admin/monthly-packs">Pack templates</Link>.</p></div>}
      {feedback && <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} />}
      {loading ? <div className="settings-empty" role="status">Loading firm settings…</div> : !loaded ? <div className="settings-empty"><h3>Settings are unavailable</h3><p>Your saved configuration must load before it can be edited.</p><Button variant="secondary" disabled={!backendMode} onClick={() => setLoadAttempt(value => value + 1)}>Try again</Button></div> : <form onSubmit={event => { event.preventDefault(); void saveSection(ruleSection); }}>
        <fieldset disabled={saving} className="settings-workbench"><legend className="sr-only">{sectionLabel} editor</legend>
          <aside className="settings-library"><div className="settings-library-heading"><h3>{ruleSection === "requests" ? "Template library" : "Your rules"}</h3><span>{rows.length}</span></div><TextField label={`Search ${ruleSection === "requests" ? "templates" : "rules"}`} placeholder="Search by name…" value={query} onChange={event => setQuery(event.target.value)} /><div className="settings-library-list">{filteredRows.map(row => <button key={row.id} type="button" aria-pressed={selected?.id === row.id} onClick={() => setSelectedIds(current => ({ ...current, [ruleSection]: row.id }))}><span><strong>{row.name || "Untitled"}</strong><small>{summary(ruleSection, row.id)}</small></span>{"isEnabled" in row && <i className={row.isEnabled ? "is-enabled" : "is-paused"} aria-label={row.isEnabled ? "Enabled" : "Paused"} />}</button>)}{!filteredRows.length && <p className="settings-help">{rows.length ? "No matches. Try a different name." : `No ${ruleSection === "requests" ? "templates" : "rules"} yet. Add your first one to get started.`}</p>}</div></aside>
          <div className="settings-editor">{selected ? <><div className="settings-editor-heading"><div><p className="settings-eyebrow">{ruleSection === "requests" ? "Template details" : "Rule details"}</p><h3>{selected.name || "Untitled"}</h3></div>{"isEnabled" in selected && <Toggle checked={selected.isEnabled} onChange={isEnabled => update(ruleSection, selected.id, { isEnabled })} />}</div>{renderEditor(ruleSection, selected.id)}<div className="settings-remove"><Button type="button" variant="ghost" onClick={() => remove(ruleSection, selected.id)}><Trash2 size={15} aria-hidden="true" />Remove {ruleSection === "requests" ? "template" : "rule"}</Button><small>Removal takes effect when you save. Discard changes to undo.</small></div></> : <div className="settings-empty"><FileText size={30} aria-hidden="true" /><h3>Start with one clear {ruleSection === "requests" ? "request" : "rule"}</h3><p>{descriptions[ruleSection]}</p></div>}</div>
        </fieldset>
        <footer className="settings-save-bar"><p role="status">{dirty(ruleSection) ? <><span className="settings-dirty-dot" />Unsaved changes in {sectionLabel.toLowerCase()}</> : <><Check size={16} aria-hidden="true" />No unsaved changes</>}</p><div><Button type="button" variant="ghost" disabled={saving || !dirty(ruleSection)} onClick={() => { setDraft(current => ({ ...current, [ruleSection]: saved[ruleSection] })); setFeedback(null); }}>Discard changes</Button><Button type="submit" disabled={saving || !dirty(ruleSection)}><Save size={16} aria-hidden="true" />{saving ? "Saving…" : `Save ${ruleSection === "requests" ? "templates" : "rules"}`}</Button></div></footer>
      </form>}
    </section>}
  </div>;
}
