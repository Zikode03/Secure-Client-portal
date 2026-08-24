import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

type Section = "documents" | "packs" | "requests" | "reminders" | "deadlines" | "escalations";

interface RequiredDocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentCategory: string;
  isRequired: boolean;
  defaultDueDayOfMonth: number | null;
}

interface MonthlyPackTemplate {
  id: string;
  name: string;
  description: string;
  requiredDocumentTemplateIds: string[];
  autoCreateDayOfMonth: number;
}

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
  { key: "documents", label: "Required documents", description: "Control the document requirements available to monthly packs." },
  { key: "packs", label: "Monthly packs", description: "Define which documents belong to each standard monthly pack." },
  { key: "requests", label: "Request templates", description: "Standardise common client follow-up requests and due dates." },
  { key: "reminders", label: "Reminder rules", description: "Control automated reminders before deadlines." },
  { key: "deadlines", label: "Deadline rules", description: "Set due days, grace periods, and priority rules." },
  { key: "escalations", label: "Escalation rules", description: "Define what happens when deadlines are missed." },
];

const endpoints: Record<Section, string> = {
  documents: "/api/admin/firm-management/templates/required-documents",
  packs: "/api/admin/firm-management/templates/monthly-pack",
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
  const [activeSection, setActiveSection] = useState<Section>("documents");
  const [documents, setDocuments] = useState<RequiredDocumentTemplate[]>([]);
  const [packs, setPacks] = useState<MonthlyPackTemplate[]>([]);
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
      const [documentRows, packRows, requestRows, reminderRows, deadlineRows, escalationRows] = await Promise.all([
        apiGetJson<RequiredDocumentTemplate[]>(endpoints.documents),
        apiGetJson<MonthlyPackTemplate[]>(endpoints.packs),
        apiGetJson<RequestTemplate[]>(endpoints.requests),
        apiGetJson<ReminderRule[]>(endpoints.reminders),
        apiGetJson<DeadlineRule[]>(endpoints.deadlines),
        apiGetJson<EscalationRule[]>(endpoints.escalations),
      ]);
      setDocuments(documentRows);
      setPacks(packRows);
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
    documents: documents.length,
    packs: packs.length,
    requests: requests.length,
    reminders: reminders.length,
    deadlines: deadlines.length,
    escalations: escalations.length,
  }), [deadlines.length, documents.length, escalations.length, packs.length, reminders.length, requests.length]);

  async function saveSection() {
    setSaving(true);
    try {
      const payload = activeSection === "documents" ? documents
        : activeSection === "packs" ? packs
          : activeSection === "requests" ? requests
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
      <PageHeader
        actions={
          <>
            <Button disabled={loading || saving || !backendMode} onClick={() => void seedDefaults()} variant="secondary">Seed defaults</Button>
            <Button disabled={loading || saving || !backendMode} onClick={() => void saveSection()}>Save current section</Button>
          </>
        }
        description="Manage the rules and templates that drive document collection, monthly packs, reminders, deadlines, and escalations across the firm."
        eyebrow="Administration"
        title="System configuration"
      />

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-2 self-start">
          {sectionLabels.map((section) => (
            <button
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${activeSection === section.key ? "border-brand-300 bg-brand-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-950">{section.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{sectionCount[section.key]}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{section.description}</p>
            </button>
          ))}
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div>
            <h2 className="portal-section-title text-slate-950">{sectionLabels.find((item) => item.key === activeSection)?.label}</h2>
            <p className="mt-1 text-sm text-slate-500">Changes only take effect after you save the current section.</p>
          </div>

          {activeSection === "documents" ? (
            <div className="space-y-4">
              {documents.map((item, index) => (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Name" onChange={(e) => setDocuments(documents.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} value={item.name} />
                    <TextField label="Category" onChange={(e) => setDocuments(documents.map((row, i) => i === index ? { ...row, documentCategory: e.target.value } : row))} value={item.documentCategory} />
                    <TextField label="Description" onChange={(e) => setDocuments(documents.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} value={item.description} />
                    <NumberField label="Default due day" nullable onChange={(value) => setDocuments(documents.map((row, i) => i === index ? { ...row, defaultDueDayOfMonth: value } : row))} value={item.defaultDueDayOfMonth} />
                  </div>
                  <div className="flex items-center justify-between gap-3"><Toggle checked={item.isRequired} label="Required document" onChange={(checked) => setDocuments(documents.map((row, i) => i === index ? { ...row, isRequired: checked } : row))} /><Button onClick={() => removeAt(documents, setDocuments, index)} variant="danger">Remove</Button></div>
                </div>
              ))}
              <Button onClick={() => setDocuments([...documents, { id: newId(), name: "", description: "", documentCategory: "general", isRequired: true, defaultDueDayOfMonth: null }])} variant="secondary">Add document template</Button>
            </div>
          ) : null}

          {activeSection === "packs" ? (
            <div className="space-y-4">
              {packs.map((item, index) => (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Name" onChange={(e) => setPacks(packs.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} value={item.name} />
                    <NumberField label="Auto-create day" onChange={(value) => setPacks(packs.map((row, i) => i === index ? { ...row, autoCreateDayOfMonth: value ?? 1 } : row))} value={item.autoCreateDayOfMonth} />
                    <TextField label="Description" onChange={(e) => setPacks(packs.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} value={item.description} />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">Required documents</p>
                    <div className="grid gap-2 md:grid-cols-2">{documents.map((document) => <Toggle checked={item.requiredDocumentTemplateIds.includes(document.id)} key={document.id} label={document.name || "Unnamed document"} onChange={(checked) => setPacks(packs.map((row, i) => i === index ? { ...row, requiredDocumentTemplateIds: checked ? [...row.requiredDocumentTemplateIds, document.id] : row.requiredDocumentTemplateIds.filter((id) => id !== document.id) } : row))} />)}</div>
                  </div>
                  <div className="flex justify-end"><Button onClick={() => removeAt(packs, setPacks, index)} variant="danger">Remove</Button></div>
                </div>
              ))}
              <Button onClick={() => setPacks([...packs, { id: newId(), name: "", description: "", requiredDocumentTemplateIds: [], autoCreateDayOfMonth: 1 }])} variant="secondary">Add monthly pack template</Button>
            </div>
          ) : null}

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
        </SurfaceCard>
      </div>
    </div>
  );
}
