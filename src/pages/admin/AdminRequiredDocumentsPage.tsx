import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Layers, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { requiredDocumentsEndpoint, type RequiredDocumentTemplate } from "../../services/requiredDocuments";
import type { Tone } from "../../types/portal";
import "./requiredDocuments.css";

export function AdminRequiredDocumentsPage() {
  const [documents, setDocuments] = useState<RequiredDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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
    const invalid = documents.find(item => !item.name.trim() || !item.documentCategory.trim() || (item.defaultDueDayOfMonth !== null && (!Number.isInteger(item.defaultDueDayOfMonth) || item.defaultDueDayOfMonth < 1 || item.defaultDueDayOfMonth > 31)));
    if (invalid) {
      setSelectedId(invalid.id);
      setFeedback({ tone: "warning", title: "Check this requirement", message: "Enter a document name and category. The due day must be blank or a whole number from 1 to 31." });
      return;
    }
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

  const selected = documents.find(item => item.id === selectedId) ?? documents[0];
  const matching = documents.filter(item => `${item.name} ${item.documentCategory}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <form className="required-documents-page space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <header className="portal-page-header flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Document setup</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Document types</h1>
          <p className="text-sm leading-6 text-slate-500">Define what a client should upload and explain what the document must contain. Choose which documents apply in monthly pack templates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? <span className="text-xs text-slate-500">Unsaved changes</span> : null}
          <Button disabled={!loaded || loading || saving} type="button" variant="secondary" onClick={() => {
            const id = crypto.randomUUID();
            setDocuments((rows) => [...rows, { id, name: "", description: "", documentCategory: "general", isRequired: true, defaultDueDayOfMonth: null }]);
            setSelectedId(id);
            setQuery("");
            setDirty(true);
          }}>Add requirement</Button>
          <Button disabled={!loaded || !dirty || loading || saving} type="submit">{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </header>

      <div className="requirements-guide" aria-label="How document requirements work">
        <div><FileText aria-hidden="true" size={20} /><span><strong>1. Define the document</strong><small>Name it and explain what is needed.</small></span></div>
        <div><Layers aria-hidden="true" size={20} /><span><strong>2. Choose it for a pack</strong><small>Include only documents relevant to that business.</small></span></div>
        <div><Save aria-hidden="true" size={20} /><span><strong>3. Save your changes</strong><small>This page defines requirements, not file uploads.</small></span></div>
      </div>

      {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">Loading required documents…</p> : !loaded ? (
        <Button onClick={() => void loadDocuments()} type="button" variant="secondary">Retry</Button>
      ) : (
        <fieldset disabled={saving} className="min-w-0">
          <legend className="sr-only">Document requirement library</legend>
          <div className="requirements-workspace">
          <aside className="requirements-directory" aria-label="Document library">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-slate-950">Document library</h2><span className="text-xs text-slate-500">{documents.length} total</span></div>
            <TextField label="Find a requirement" placeholder="Search name or category" value={query} onChange={event => setQuery(event.target.value)} />
            <div className="requirements-directory-list">
              {matching.map(item => <button key={item.id} type="button" aria-pressed={selected?.id === item.id} aria-controls="requirement-editor" className="requirements-choice" onClick={() => setSelectedId(item.id)}>
                <FileText aria-hidden="true" size={18} /><span><strong>{item.name || "New requirement"}</strong><small>{item.documentCategory || "No category"} · {item.isRequired ? "Required" : "Optional"}</small></span><ArrowRight aria-hidden="true" size={15} />
              </button>)}
              {!matching.length && <p className="py-5 text-sm text-slate-500">{documents.length ? "No matching requirements. Try another search." : "Your library is empty. Add your first requirement above."}</p>}
            </div>
            <Link className="requirements-pack-link" to="/firm/admin/monthly-packs">Manage pack templates <ArrowRight aria-hidden="true" size={15} /></Link>
          </aside>
          <div id="requirement-editor" className="requirements-editor">
          {!selected && <div className="py-10 text-sm leading-6 text-slate-500">Start with a document your clients actually need, such as a bank statement. Add a requirement, describe it, then save.</div>}
          {selected ? [selected].map((item) => (
            <section className="space-y-5" key={item.id} aria-label={item.name || "New requirement"}>
              <div className="border-b border-slate-200 pb-4"><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Requirement details</p><h2 className="break-words text-slate-950">{item.name || "New requirement"}</h2><p className="mt-1 text-sm text-slate-500">Use wording your clients and accountants can understand.</p></div>
              <TextField label="Document name" placeholder="e.g. Business bank statement" required value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} />
              <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Description</span><textarea className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" rows={3} placeholder="e.g. Include every page for each business bank account, covering the full month." value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} /><span className="block text-xs text-slate-500">Explain which accounts, date range or supporting details to include.</span></label>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <TextField label="Category" placeholder="e.g. banking" hint="Groups related documents, such as banking or payroll." required value={item.documentCategory} onChange={(event) => update(item.id, { documentCategory: event.target.value })} />
                <TextField label="Default due day" hint="Day of the month (1–31), not a full date. Leave blank for no default." type="number" min={1} max={31} step={1} placeholder="No default" value={item.defaultDueDayOfMonth ?? ""} onChange={(event) => update(item.id, { defaultDueDayOfMonth: event.target.value === "" ? null : Number(event.target.value) })} />
              </div>
              <div className="requirements-rule">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-900"><input type="checkbox" checked={item.isRequired} onChange={(event) => update(item.id, { isRequired: event.target.checked })} />Required when included in a pack</label>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.isRequired ? "Marked as required when selected for a pack." : "Marked as optional when selected for a pack."} This does not request the document from every client.</p>
              </div>
              <div className="portal-page-header flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">Edits take effect after you save changes.</p>
                <Button type="button" variant="danger" aria-label={`Remove ${item.name || "new requirement"}`} onClick={() => {
                  if (!window.confirm("Remove this requirement? Monthly pack templates may reference it. Changes take effect when you save.")) return;
                  setDocuments((rows) => rows.filter((row) => row.id !== item.id));
                  setDirty(true);
                }}>Remove</Button>
              </div>
            </section>
          )) : null}
          </div>
          </div>
        </fieldset>
      )}
    </form>
  );
}
