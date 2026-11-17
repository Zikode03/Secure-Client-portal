import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetBlob, apiGetJson } from "../../services/apiClient";
import { Button } from "../ui/Button";
import { formatDateTimeLabel } from "../../utils/formatters";
import type { components } from "../../services/generated/portal-api";

type FiledDocument = components["schemas"]["Source.SecureClientPortal.Backend.Domain.Modules.Documents.Document"];

export function LiveFilingRegister() {
  const [rows, setRows] = useState<FiledDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setRows([]);
    void apiGetJson("/api/documents/filing-register")
      .then(value => { if (active) setRows(value.filter(document => document.isFiled)); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Filed documents could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const visible = useMemo(() => rows.filter(document => `${document.name} ${document.category}`.toLowerCase().includes(query.trim().toLowerCase())), [rows, query]);
  async function download(document: FiledDocument) {
    setDownloading(document.id); setError("");
    try {
      const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(document.id)}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = document.name;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) { setError(error instanceof Error ? error.message : "Download failed. Please retry."); }
    finally { setDownloading(""); }
  }
  return <section className="portal-page space-y-5">
    <header className="portal-page-header"><h1 className="workspace-duplicate-title text-2xl font-semibold text-slate-950">Filing Register</h1><p className="mt-2 text-sm text-slate-600">Accepted documents filed in the portal. Filing here does not confirm submission to a government authority.</p></header>
    <div className="flex flex-wrap items-end gap-3"><label className="flex-1 text-sm font-medium">Search filed documents<input className="mt-2 block w-full rounded-lg border border-slate-300 p-3" value={query} onChange={event => setQuery(event.target.value)} /></label><Button variant="secondary" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh register</Button></div>
    {loading ? <p role="status">Loading filed documents...</p> : null}
    {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4"><p>{error}</p><Button className="mt-3" variant="secondary" onClick={() => setRevision(value => value + 1)}>Retry register</Button></div> : null}
    {!loading && !error && visible.length === 0 ? <p>No filed documents match this view.</p> : null}
    {!loading && visible.length > 0 ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Document</th><th className="p-3">Type</th><th className="p-3">Version</th><th className="p-3">Filed</th><th className="p-3">Actions</th></tr></thead><tbody>{visible.map(document => <tr key={document.id} className="border-t border-slate-200"><td className="p-3">{document.name}</td><td className="p-3">{document.category}</td><td className="p-3">{document.currentVersionNumber}</td><td className="p-3">{document.filedAtUtc ? formatDateTimeLabel(document.filedAtUtc) : "Date not recorded"}</td><td className="flex gap-3 p-3"><Link className="font-semibold text-brand-700" to={`/firm/documents?client=${encodeURIComponent(document.clientId)}`}>Client documents</Link><Button size="sm" variant="secondary" disabled={Boolean(downloading)} onClick={() => void download(document)}>{downloading === document.id ? "Downloading..." : "Download"}</Button></td></tr>)}</tbody></table></div> : null}
  </section>;
}
