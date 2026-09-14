import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { requiredDocumentsEndpoint, type RequiredDocumentTemplate } from "../../services/requiredDocuments";
import type { Tone } from "../../types/portal";
import "./requiredDocuments.css";
import "./packTemplates.css";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [documentQuery, setDocumentQuery] = useState("");
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
    const invalid = packs.find(pack => !pack.name.trim() || !Number.isInteger(pack.autoCreateDayOfMonth) || pack.autoCreateDayOfMonth < 1 || pack.autoCreateDayOfMonth > 31);
    if (invalid) {
      setSelectedId(invalid.id);
      setFeedback({ tone: "warning", title: "Check this template", message: "Enter a template name and a creation day from 1 to 31." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await apiPutJson<unknown, MonthlyPackTemplate[]>(endpoint, packs);
      setDirty(false);
      setFeedback({ tone: "success", title: "Pack templates saved", message: "Your reusable templates and document selections have been saved. No client files were uploaded or submitted." });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Could not save monthly packs", message: error instanceof ApiError ? error.message : "Your changes are still here. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const selected = packs.find(pack => pack.id === selectedId) ?? packs[0];
  const matching = packs.filter(pack => `${pack.name} ${pack.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const matchingDocuments = documents.filter(document => `${document.name} ${document.documentCategory ?? ""}`.toLowerCase().includes(documentQuery.trim().toLowerCase()));

  return (
    <form className="required-documents-page pack-builder space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <header className="portal-page-header flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Document setup</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Pack templates</h1>
          <p className="text-sm leading-6 text-slate-500">Choose the documents a business needs each month. Client uploads are managed separately.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? <span className="text-xs text-slate-500">Unsaved changes</span> : null}
          <Button disabled={!loaded || loading || saving} type="button" variant="secondary" onClick={() => {
            const id = crypto.randomUUID();
            setPacks((rows) => [...rows, { id, name: "", description: "", requiredDocumentTemplateIds: [], autoCreateDayOfMonth: 1 }]);
            setSelectedId(id); setQuery(""); setDocumentQuery("");
            setDirty(true);
          }}>Add pack template</Button>
          <Button disabled={!loaded || !dirty || loading || saving} type="submit">{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </header>
      {feedback ? <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} /> : null}
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">Loading monthly packs…</p> : !loaded ? (
        <Button onClick={() => void load()} type="button" variant="secondary">Retry</Button>
      ) : (
        <fieldset disabled={saving} className="min-w-0">
          <legend className="sr-only">Pack template library</legend>
          <div>
          <section className="pack-template-picker" aria-label="Template library">
            <div className="pack-picker-toolbar"><div><h2 className="text-slate-950">Your templates <span className="pack-template-total">{packs.length}</span></h2></div>
            <TextField label="Find a template" placeholder="Search business or template" value={query} onChange={event => setQuery(event.target.value)} />
            </div>
            <div className="pack-template-buttons">{matching.map(pack => <button key={pack.id} className="pack-template-button" type="button" aria-pressed={selected?.id === pack.id} aria-controls="pack-template-editor" onClick={() => { setSelectedId(pack.id); setDocumentQuery(""); }}>
              <Layers size={18} aria-hidden="true" /><span><strong>{pack.name || "New pack template"}</strong></span>
            </button>)}</div>
            {!matching.length && <p className="py-5 text-sm text-slate-500">{packs.length ? "No matching templates. Try another search." : "No templates yet. Add a template to build your first checklist."}</p>}
          </section>
          <div id="pack-template-editor" className="pack-template-canvas">
          {!selected && <p className="py-10 text-sm leading-6 text-slate-500">Create a template for a specific business type, then choose the documents it needs. For example, a consultancy may need bank statements and sales invoices.</p>}
          {selected ? [selected].map((pack) => (
            <section className="pack-builder-layout" key={pack.id} aria-label={pack.name || "New pack template"}>
              <div className="pack-builder-main">
              <div className="grid items-start gap-5 md:grid-cols-[1fr_1.4fr_0.7fr]">
                <TextField label="Template name" placeholder="e.g. Small consultancy" required value={pack.name} onChange={(event) => update(pack.id, { name: event.target.value })} />
              <TextField label="Who is this template for?" placeholder="e.g. Service businesses without stock or payroll" value={pack.description} onChange={(event) => update(pack.id, { description: event.target.value })} />
              <TextField label="Auto-create day" hint="Day 1–31, not a deadline." required type="number" min={1} max={31} step={1} value={pack.autoCreateDayOfMonth} onChange={(event) => update(pack.id, { autoCreateDayOfMonth: Number(event.target.value) })} />
              </div>
              <div className="pack-documents-heading"><h2 className="text-slate-950">Included documents</h2><span className="text-sm text-slate-500">{pack.requiredDocumentTemplateIds.length} selected</span></div>
              <fieldset className="space-y-3">
                <legend className="sr-only">Choose documents for this template</legend>
                <TextField label="Find a document type" placeholder="Search name or category" value={documentQuery} onChange={event => setDocumentQuery(event.target.value)} />
                <div className="pack-document-options">
                  {matchingDocuments.map((document) => (
                    <label className="pack-document-option" key={document.id}>
                      <input type="checkbox" aria-label={document.name || "Unnamed document"} checked={pack.requiredDocumentTemplateIds.includes(document.id)} onChange={(event) => update(pack.id, { requiredDocumentTemplateIds: event.target.checked ? [...pack.requiredDocumentTemplateIds, document.id] : pack.requiredDocumentTemplateIds.filter((id) => id !== document.id) })} />
                      <span><strong>{document.name || "Unnamed document"}</strong><small>{document.isRequired ? "Required" : "Optional"}</small></span>
                    </label>
                  ))}
                </div>
                {!matchingDocuments.length && <p className="text-sm text-slate-500">{documents.length ? "No matching document types." : "Add document types first using the link below."}</p>}
              </fieldset>
              <Link className="requirements-pack-link" to="/firm/admin/required-documents">Missing a document? Manage document types <ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
              <details className="pack-preview-disclosure" open={pack.requiredDocumentTemplateIds.some(id => !documents.some(document => document.id === id)) || undefined}>
              <summary>Checklist preview · {pack.requiredDocumentTemplateIds.length} selected</summary>
                {!pack.requiredDocumentTemplateIds.length ? <p className="mt-2 text-xs text-slate-600">No documents selected. This template currently defines an empty checklist.</p> : <ul className="pack-checklist-preview">{pack.requiredDocumentTemplateIds.map(id => {
                  const document = documents.find(item => item.id === id);
                  return <li key={id}>{document ? <><span>{document.name}</span><span>{document.isRequired ? "Required" : "Optional"}</span></> : <><span>Unavailable document type. Remove it or restore it in Document Types.</span><button className="underline" type="button" aria-label={`Remove unavailable document ${id}`} onClick={() => update(pack.id, { requiredDocumentTemplateIds: pack.requiredDocumentTemplateIds.filter(item => item !== id) })}>Remove reference</button></>}</li>;
                })}</ul>}
              </details>
              <div className="pack-builder-footer portal-page-header flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-xs text-slate-500">Changes to all templates are saved together.</p><Button type="button" variant="danger" aria-label={`Remove ${pack.name || "new pack template"}`} onClick={() => {
                if (!window.confirm("Remove this monthly pack template? Changes take effect when you save.")) return;
                setPacks((rows) => rows.filter((row) => row.id !== pack.id));
                setDirty(true);
              }}>Remove</Button></div>
            </section>
          )) : null}
          </div></div>
        </fieldset>
      )}
    </form>
  );
}
