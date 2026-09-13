import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { requiredDocumentsEndpoint, type RequiredDocumentTemplate } from "../../services/requiredDocuments";
import type { Tone } from "../../types/portal";

export function AdminRequiredDocumentsPage() {
  const [documents, setDocuments] = useState<RequiredDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: Tone; title: string; message: string } | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setLoaded(false);
    try {
      if (!hasApiBaseUrl()) throw new Error("Connect the backend to manage required documents.");
      setDocuments(await apiGetJson<RequiredDocumentTemplate[]>(requiredDocumentsEndpoint));
      setLoaded(true);
      setDirty(false);
      setFeedback(null);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Could not load required documents", message: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDocuments(); }, []);

  function update(id: string, patch: Partial<RequiredDocumentTemplate>) {
    setDocuments((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
    setDirty(true);
  }

  async function save() {
    if (!loaded || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiPutJson<unknown, RequiredDocumentTemplate[]>(requiredDocumentsEndpoint, documents);
      setDirty(false);
      setFeedback({ tone: "success", title: "Required documents saved", message: "Monthly pack templates continue to use these same document requirements." });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Could not save required documents", message: error instanceof ApiError ? error.message : "Your changes are still here. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <header className="portal-page-header flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Document settings</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Required documents</h1>
          <p className="text-sm leading-6 text-slate-500">Maintain the firm's document requirements. Monthly pack templates choose which requirements apply; this list does not require every client to submit every document.</p>
          <Link className="text-sm font-medium text-brand-700 hover:underline" to="/firm/admin/monthly-packs">Manage monthly pack templates →</Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? <span className="text-xs text-slate-500">Unsaved changes</span> : null}
          <Button disabled={!loaded || loading || saving} type="button" variant="secondary" onClick={() => {
            setDocuments((rows) => [...rows, { id: crypto.randomUUID(), name: "", description: "", documentCategory: "general", isRequired: true, defaultDueDayOfMonth: null }]);
            setDirty(true);
          }}>Add requirement</Button>
          <Button disabled={!loaded || !dirty || loading || saving} type="submit">{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </header>

      {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">Loading required documents…</p> : !loaded ? (
        <Button onClick={() => void loadDocuments()} type="button" variant="secondary">Retry</Button>
      ) : (
        <fieldset disabled={saving} className="min-w-0 divide-y divide-slate-200 border-b border-slate-200">
          <legend className="pb-4 text-sm font-medium text-slate-600">{documents.length} {documents.length === 1 ? "requirement" : "requirements"}</legend>
          {documents.length === 0 ? <p className="py-10 text-sm text-slate-500">No requirements yet. Add a requirement to make it available to monthly pack templates.</p> : null}
          {documents.map((item) => (
            <section className="space-y-4 py-6 first:pt-2" key={item.id} aria-label={item.name || "New requirement"}>
              <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
                <TextField label="Document name" required value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} />
                <TextField label="Category" required value={item.documentCategory} onChange={(event) => update(item.id, { documentCategory: event.target.value })} />
                <TextField label="Default due day" type="number" min={1} max={31} step={1} placeholder="Not set" value={item.defaultDueDayOfMonth ?? ""} onChange={(event) => update(item.id, { defaultDueDayOfMonth: event.target.value === "" ? null : Number(event.target.value) })} />
              </div>
              <TextField label="Description" value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} />
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={item.isRequired} onChange={(event) => update(item.id, { isRequired: event.target.checked })} />Required when included in a pack</label>
                <Button type="button" variant="danger" aria-label={`Remove ${item.name || "new requirement"}`} onClick={() => {
                  if (!window.confirm("Remove this requirement? Monthly pack templates may reference it. Changes take effect when you save.")) return;
                  setDocuments((rows) => rows.filter((row) => row.id !== item.id));
                  setDirty(true);
                }}>Remove</Button>
              </div>
            </section>
          ))}
        </fieldset>
      )}
    </form>
  );
}
