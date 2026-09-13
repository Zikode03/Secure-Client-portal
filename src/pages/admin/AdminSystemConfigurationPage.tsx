import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageSection } from "../../components/ui/PageSection";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

type Section = "requests" | "reminders" | "deadlines" | "escalations";

interface RequestTemplate {
  id: string;
  name: string;
  requestType: string;
  titleTemplate: string;
  descriptionTemplate: string;
  priority: string;
  defaultDueInDays: number | null;
}

interface ReminderRule {
  id: string;
  name: string;
  triggerType: string;
  daysBeforeDue: number;
  audienceRole: string;
  messageTemplate: string;
  isEnabled: boolean;
}

interface DeadlineRule {
  id: string;
  name: string;
  scope: string;
  dueDayOfMonth: number;
  graceDays: number;
  priority: string;
  isEnabled: boolean;
}

interface EscalationRule {
  id: string;
  name: string;
  triggerType: string;
  daysAfterDue: number;
  escalateToRole: string;
  action: string;
  isEnabled: boolean;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const sectionLabels: Array<{ key: Section; label: string; description: string }> = [
  { key: "requests", label: "Request templates", description: "Standardise common client follow-up requests and due dates." },
  { key: "reminders", label: "Reminder rules", description: "Control automated reminders before deadlines." },
  { key: "deadlines", label: "Deadline rules", description: "Set due days, grace periods, and priority rules." },
  { key: "escalations", label: "Escalation rules", description: "Define what happens when deadlines are missed." },
];

const endpoints: Record<Section, string> = {
  requests: "/api/admin/firm-management/templates/requests",
  reminders: "/api/admin/firm-management/rules/reminders",
  deadlines: "/api/admin/firm-management/rules/deadlines",
  escalations: "/api/admin/firm-management/rules/escalations",
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, "0").slice(-12)}`;
}

function NumberField({ label, value, onChange, nullable = false }: { label: string; value: number | null; onChange: (value: number | null) => void; nullable?: boolean }) {
  return (
    <TextField
      label={label}
      min={0}
      onChange={(event) => {
        if (nullable && event.target.value === "") {
          onChange(null);
          return;
        }
        onChange(Number(event.target.value));
      }}
      type="number"
      value={value ?? ""}
    />
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

export function AdminSystemConfigurationPage() {
  const backendMode = hasApiBaseUrl();
  const [activeSection, setActiveSection] = useState<Section>("requests");
  const [requests, setRequests] = useState<RequestTemplate[]>([]);
  const [reminders, setReminders] = useState<ReminderRule[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineRule[]>([]);
  const [escalations, setEscalations] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  async function loadAll() {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Backend required", message: "System configuration is a live administration function and requires the backend API." });
      return;
    }

    setLoading(true);
    try {
      const [requestRows, reminderRows, deadlineRows, escalationRows] = await Promise.all([
        apiGetJson<RequestTemplate[]>(endpoints.requests),
        apiGetJson<ReminderRule[]>(endpoints.reminders),
        apiGetJson<DeadlineRule[]>(endpoints.deadlines),
        apiGetJson<EscalationRule[]>(endpoints.escalations),
      ]);
      setRequests(requestRows);
      setReminders(reminderRows);
      setDeadlines(deadlineRows);
      setEscalations(escalationRows);
      setFeedback(null);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Configuration could not be loaded", message: error instanceof ApiError ? error.message : "The firm configuration could not be loaded." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [backendMode]);

  const sectionCount = useMemo<Record<Section, number>>(() => ({
    requests: requests.length,
    reminders: reminders.length,
    deadlines: deadlines.length,
    escalations: escalations.length,
  }), [deadlines.length, escalations.length, reminders.length, requests.length]);

  async function saveSection() {
    setSaving(true);
    try {
      const payload = activeSection === "requests" ? requests
        : activeSection === "reminders" ? reminders
          : activeSection === "deadlines" ? deadlines
            : escalations;
      await apiPutJson<unknown, typeof payload>(endpoints[activeSection], payload);
      setFeedback({ tone: "success", title: "Configuration saved", message: `${sectionLabels.find((item) => item.key === activeSection)?.label ?? "Configuration"} has been saved to the backend.` });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Configuration could not be saved", message: error instanceof ApiError ? error.message : "The configuration update failed." });
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    try {
      await apiPostJson<{ seeded: boolean }, Record<string, never>>("/api/admin/firm-management/seed-defaults", {});
      setFeedback({ tone: "success", title: "Defaults seeded", message: "Default firm templates and rules have been created where required." });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Defaults could not be seeded", message: error instanceof ApiError ? error.message : "The default configuration could not be created." });
    } finally {
      setSaving(false);
    }
  }

  function removeAt<T>(rows: T[], setRows: (rows: T[]) => void, index: number) {
    setRows(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div className="space-y-6">
      <header className="portal-page-header flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Administration / Settings</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">System configuration</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">Configure firm-wide request templates and automation rules.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3" role="group" aria-label="Configuration actions">
          <Button className="border border-slate-300" disabled={loading || saving || !backendMode} onClick={() => void seedDefaults()} variant="ghost">Seed defaults</Button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#061b41] bg-[#061b41] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#09275c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || saving || !backendMode}
            onClick={() => void saveSection()}
            title="Save changes to the selected section"
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h9" /></svg>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <div className="space-y-5">
        <div aria-label="Configuration sections" className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group">
          {sectionLabels.map((section) => (
            <button
              aria-controls="configuration-section-editor"
              aria-pressed={activeSection === section.key}
              className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold leading-5 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activeSection === section.key ? "border-brand-700 bg-brand-700 text-white hover:bg-brand-800" : "border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50"}`}
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              type="button"
            >
              <span>{section.label}</span>
              <span className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs tabular-nums ${activeSection === section.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{sectionCount[section.key]}</span>
            </button>
          ))}
        </div>

        <PageSection className="space-y-5" id="configuration-section-editor">
          <div>
            <h2 className="portal-section-title text-slate-950">{sectionLabels.find((item) => item.key === activeSection)?.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{sectionLabels.find((item) => item.key === activeSection)?.description}</p>
            <p className="mt-1 text-sm text-slate-500">Changes only take effect after you save the current section.</p>
          </div>


          {activeSection === "requests" ? (
            <div className="space-y-4">{requests.map((item, index) => <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}><div className="grid gap-4 md:grid-cols-2"><TextField label="Name" value={item.name} onChange={(e) => setRequests(requests.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /><TextField label="Request type" value={item.requestType} onChange={(e) => setRequests(requests.map((row, i) => i === index ? { ...row, requestType: e.target.value } : row))} /><TextField label="Title template" value={item.titleTemplate} onChange={(e) => setRequests(requests.map((row, i) => i === index ? { ...row, titleTemplate: e.target.value } : row))} /><TextField label="Description template" value={item.descriptionTemplate} onChange={(e) => setRequests(requests.map((row, i) => i === index ? { ...row, descriptionTemplate: e.target.value } : row))} /><TextField label="Priority" value={item.priority} onChange={(e) => setRequests(requests.map((row, i) => i === index ? { ...row, priority: e.target.value } : row))} /><NumberField label="Default due in days" nullable value={item.defaultDueInDays} onChange={(value) => setRequests(requests.map((row, i) => i === index ? { ...row, defaultDueInDays: value } : row))} /></div><div className="flex justify-end"><Button onClick={() => removeAt(requests, setRequests, index)} variant="danger">Remove</Button></div></div>)}<Button onClick={() => setRequests([...requests, { id: newId(), name: "", requestType: "document", titleTemplate: "", descriptionTemplate: "", priority: "normal", defaultDueInDays: 3 }])} variant="secondary">Add request template</Button></div>
          ) : null}

          {activeSection === "reminders" ? (
            <div className="space-y-4">{reminders.map((item, index) => <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}><div className="grid gap-4 md:grid-cols-2"><TextField label="Name" value={item.name} onChange={(e) => setReminders(reminders.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /><TextField label="Trigger type" value={item.triggerType} onChange={(e) => setReminders(reminders.map((row, i) => i === index ? { ...row, triggerType: e.target.value } : row))} /><NumberField label="Days before due" value={item.daysBeforeDue} onChange={(value) => setReminders(reminders.map((row, i) => i === index ? { ...row, daysBeforeDue: value ?? 0 } : row))} /><TextField label="Audience role" value={item.audienceRole} onChange={(e) => setReminders(reminders.map((row, i) => i === index ? { ...row, audienceRole: e.target.value } : row))} /><TextField label="Message template" value={item.messageTemplate} onChange={(e) => setReminders(reminders.map((row, i) => i === index ? { ...row, messageTemplate: e.target.value } : row))} /></div><div className="flex items-center justify-between gap-3"><Toggle checked={item.isEnabled} label="Rule enabled" onChange={(checked) => setReminders(reminders.map((row, i) => i === index ? { ...row, isEnabled: checked } : row))} /><Button onClick={() => removeAt(reminders, setReminders, index)} variant="danger">Remove</Button></div></div>)}<Button onClick={() => setReminders([...reminders, { id: newId(), name: "", triggerType: "deadline", daysBeforeDue: 3, audienceRole: "client", messageTemplate: "", isEnabled: true }])} variant="secondary">Add reminder rule</Button></div>
          ) : null}

          {activeSection === "deadlines" ? (
            <div className="space-y-4">{deadlines.map((item, index) => <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}><div className="grid gap-4 md:grid-cols-2"><TextField label="Name" value={item.name} onChange={(e) => setDeadlines(deadlines.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /><TextField label="Scope" value={item.scope} onChange={(e) => setDeadlines(deadlines.map((row, i) => i === index ? { ...row, scope: e.target.value } : row))} /><NumberField label="Due day of month" value={item.dueDayOfMonth} onChange={(value) => setDeadlines(deadlines.map((row, i) => i === index ? { ...row, dueDayOfMonth: value ?? 1 } : row))} /><NumberField label="Grace days" value={item.graceDays} onChange={(value) => setDeadlines(deadlines.map((row, i) => i === index ? { ...row, graceDays: value ?? 0 } : row))} /><TextField label="Priority" value={item.priority} onChange={(e) => setDeadlines(deadlines.map((row, i) => i === index ? { ...row, priority: e.target.value } : row))} /></div><div className="flex items-center justify-between gap-3"><Toggle checked={item.isEnabled} label="Rule enabled" onChange={(checked) => setDeadlines(deadlines.map((row, i) => i === index ? { ...row, isEnabled: checked } : row))} /><Button onClick={() => removeAt(deadlines, setDeadlines, index)} variant="danger">Remove</Button></div></div>)}<Button onClick={() => setDeadlines([...deadlines, { id: newId(), name: "", scope: "monthly_pack", dueDayOfMonth: 5, graceDays: 0, priority: "normal", isEnabled: true }])} variant="secondary">Add deadline rule</Button></div>
          ) : null}

          {activeSection === "escalations" ? (
            <div className="space-y-4">{escalations.map((item, index) => <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}><div className="grid gap-4 md:grid-cols-2"><TextField label="Name" value={item.name} onChange={(e) => setEscalations(escalations.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /><TextField label="Trigger type" value={item.triggerType} onChange={(e) => setEscalations(escalations.map((row, i) => i === index ? { ...row, triggerType: e.target.value } : row))} /><NumberField label="Days after due" value={item.daysAfterDue} onChange={(value) => setEscalations(escalations.map((row, i) => i === index ? { ...row, daysAfterDue: value ?? 0 } : row))} /><TextField label="Escalate to role" value={item.escalateToRole} onChange={(e) => setEscalations(escalations.map((row, i) => i === index ? { ...row, escalateToRole: e.target.value } : row))} /><TextField label="Action" value={item.action} onChange={(e) => setEscalations(escalations.map((row, i) => i === index ? { ...row, action: e.target.value } : row))} /></div><div className="flex items-center justify-between gap-3"><Toggle checked={item.isEnabled} label="Rule enabled" onChange={(checked) => setEscalations(escalations.map((row, i) => i === index ? { ...row, isEnabled: checked } : row))} /><Button onClick={() => removeAt(escalations, setEscalations, index)} variant="danger">Remove</Button></div></div>)}<Button onClick={() => setEscalations([...escalations, { id: newId(), name: "", triggerType: "overdue", daysAfterDue: 1, escalateToRole: "accountant", action: "notify", isEnabled: true }])} variant="secondary">Add escalation rule</Button></div>
          ) : null}
        </PageSection>
      </div>
    </div>
  );
}
