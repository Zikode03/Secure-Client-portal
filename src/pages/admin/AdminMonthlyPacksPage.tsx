import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { requiredDocumentsEndpoint, type RequiredDocumentTemplate } from "../../services/requiredDocuments";
import type { Tone } from "../../types/portal";

interface MonthlyPackTemplate {
  id: string;
  name: string;
  description: string;
  requiredDocumentTemplateIds: string[];
  autoCreateDayOfMonth: number;
}

const endpoint = "/api/admin/firm-management/templates/monthly-pack";

export function AdminMonthlyPacksPage() {
  const [packs, setPacks] = useState<MonthlyPackTemplate[]>([]);
  const [documents, setDocuments] = useState<RequiredDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: Tone; title: string; message: string } | null>(null);

  async function load() {
    setLoading(true);
    setLoaded(false);
    try {
      if (!hasApiBaseUrl()) throw new Error("Connect the backend to manage monthly packs.");
      const [packRows, documentRows] = await Promise.all([
        apiGetJson<MonthlyPackTemplate[]>(endpoint),
        apiGetJson<RequiredDocumentTemplate[]>(requiredDocumentsEndpoint),
      ]);
      setPacks(packRows);
      setDocuments(documentRows);
      setLoaded(true);
      setDirty(false);
      setFeedback(null);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Could not load monthly packs", message: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function update(id: string, patch: Partial<MonthlyPackTemplate>) {
    setPacks((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
    setDirty(true);
  }

  async function save() {
    if (!loaded || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiPutJson<unknown, MonthlyPackTemplate[]>(endpoint, packs);
      setDirty(false);
      setFeedback({ tone: "success", title: "Monthly packs saved", message: "Your monthly pack templates and document selections have been saved." });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Could not save monthly packs", message: error instanceof ApiError ? error.message : "Your changes are still here. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <header className="portal-page-header flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Document settings</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Monthly packs</h1>
          <p className="text-sm leading-6 text-slate-500">Define reusable monthly pack templates, their creation day, and the document requirements each pack includes.</p>
          <Link className="text-sm font-medium text-brand-700 hover:underline" to="/firm/admin/required-documents">Manage required documents →</Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? <span className="text-xs text-slate-500">Unsaved changes</span> : null}
          <Button disabled={!loaded || loading || saving} type="button" variant="secondary" onClick={() => {
            setPacks((rows) => [...rows, { id: crypto.randomUUID(), name: "", description: "", requiredDocumentTemplateIds: [], autoCreateDayOfMonth: 1 }]);
            setDirty(true);
          }}>Add pack template</Button>
          <Button disabled={!loaded || !dirty || loading || saving} type="submit">{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </header>
      {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">Loading monthly packs…</p> : !loaded ? (
        <Button onClick={() => void load()} type="button" variant="secondary">Retry</Button>
      ) : (
        <fieldset disabled={saving} className="min-w-0 divide-y divide-slate-200 border-b border-slate-200">
          <legend className="pb-4 text-sm font-medium text-slate-600">{packs.length} {packs.length === 1 ? "template" : "templates"}</legend>
          {packs.length === 0 ? <p className="py-10 text-sm text-slate-500">No monthly pack templates yet. Add a template and choose the documents it needs.</p> : null}
          {packs.map((pack) => (
            <section className="space-y-4 py-6 first:pt-2" key={pack.id} aria-label={pack.name || "New pack template"}>
              <div className="grid items-start gap-4 md:grid-cols-[2fr_1fr]">
                <TextField label="Template name" required value={pack.name} onChange={(event) => update(pack.id, { name: event.target.value })} />
                <TextField label="Auto-create day" required type="number" min={1} max={31} step={1} value={pack.autoCreateDayOfMonth} onChange={(event) => update(pack.id, { autoCreateDayOfMonth: Number(event.target.value) })} />
              </div>
              <TextField label="Description" value={pack.description} onChange={(event) => update(pack.id, { description: event.target.value })} />
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-700">Included document requirements</legend>
                {!documents.length ? <p className="text-sm text-slate-500">Add required documents first to make them available here.</p> : null}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {documents.map((document) => (
                    <label className="flex items-center gap-3 text-sm text-slate-700" key={document.id}>
                      <input type="checkbox" checked={pack.requiredDocumentTemplateIds.includes(document.id)} onChange={(event) => update(pack.id, { requiredDocumentTemplateIds: event.target.checked ? [...pack.requiredDocumentTemplateIds, document.id] : pack.requiredDocumentTemplateIds.filter((id) => id !== document.id) })} />
                      {document.name || "Unnamed document"}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end"><Button type="button" variant="danger" aria-label={`Remove ${pack.name || "new pack template"}`} onClick={() => {
                if (!window.confirm("Remove this monthly pack template? Changes take effect when you save.")) return;
                setPacks((rows) => rows.filter((row) => row.id !== pack.id));
                setDirty(true);
              }}>Remove</Button></div>
            </section>
          ))}
        </fieldset>
      )}
    </form>
  );
}
