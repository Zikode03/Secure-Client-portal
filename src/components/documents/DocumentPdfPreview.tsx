import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ApiError, apiGetBlob } from "../../services/apiClient";
import { Button } from "../ui/Button";

interface Props { documentId: string; fileName: string; onReady: (id: string, ready: boolean) => void }
export function DocumentPdfPreview({ documentId, fileName, onReady }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(0);
  const [area, setArea] = useState({ width: 800, height: 600 });
  const [status, setStatus] = useState("Loading document...");
  const [error, setError] = useState("");
  const [passwordPrompt, setPasswordPrompt] = useState("");
  const [password, setPassword] = useState("");
  const unlock = useRef<((password: string) => void) | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    if (!host.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(100, Math.round(entry.contentRect.width));
      const height = Math.max(100, Math.round(entry.contentRect.height));
      setArea(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    let dispose = () => {};
    let phase: "engine" | "download" | "pdf" = "engine";
    setPdf(null); setPage(1); setError(""); setPassword(""); setPasswordPrompt("");
    ready.current(documentId, false); host.current?.replaceChildren();
    void (async () => {
      const { localPdfEngine } = await import("../../services/invoicePdfReader");
      const engine = await localPdfEngine();
      abort.signal.throwIfAborted();
      phase = "download";
      let bytes: Uint8Array | undefined;
      for (let retry = 0; retry < 3; retry++) {
        abort.signal.throwIfAborted();
        setStatus(retry ? `Connection interrupted. Retrying (${retry}/2)...` : "Loading document...");
        const request = new AbortController();
        const timeout = window.setTimeout(() => request.abort(), 30_000);
        const cancel = () => request.abort();
        abort.signal.addEventListener("abort", cancel, { once: true });
        try {
          const result = await apiGetBlob(`/api/documents/${encodeURIComponent(documentId)}/download`, { signal: request.signal });
          bytes = new Uint8Array(await result.blob.arrayBuffer());
          break;
        } catch (reason) {
          abort.signal.throwIfAborted();
          const transient = !(reason instanceof ApiError) || [408, 429].includes(reason.status) || reason.status >= 500;
          if (!transient || retry === 2) throw reason;
        } finally { window.clearTimeout(timeout); abort.signal.removeEventListener("abort", cancel); }
      }
      abort.signal.throwIfAborted();
      phase = "pdf";
      const task = engine.getDocument({ data: bytes, useSystemFonts: true, cMapUrl: `${import.meta.env.BASE_URL}pdf/cmaps/`, cMapPacked: true, standardFontDataUrl: `${import.meta.env.BASE_URL}pdf/standard_fonts/`, wasmUrl: `${import.meta.env.BASE_URL}pdf/wasm/`, iccUrl: `${import.meta.env.BASE_URL}pdf/iccs/` });
      dispose = () => { void task.destroy().catch(() => undefined); };
      task.onPassword = (submit: (password: string) => void, reason: number) => {
        if (abort.signal.aborted) return;
        unlock.current = submit;
        setStatus("");
        setPasswordPrompt(reason === 2 ? "Incorrect password. Try again." : "This PDF is password protected.");
      };
      task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (!abort.signal.aborted && !unlock.current) setStatus(total > 0 ? `Loading document... ${Math.min(100, Math.round(loaded / total * 100))}%` : "Loading document...");
      };
      const document = await task.promise;
      if (abort.signal.aborted) { dispose(); return; }
      unlock.current = null; setPasswordPrompt(""); setPdf(document); setStatus("Rendering page...");
    })().catch(reason => {
      if (abort.signal.aborted) return;
      setStatus("");
      const name = reason instanceof Error ? reason.name : "UnknownError";
      if (reason instanceof ApiError) {
        setError([401, 403].includes(reason.status)
          ? "Your session expired or you no longer have access. Sign in again to view this document."
          : reason.status === 404 ? "The original file could not be found in document storage. Retrying cannot restore a missing file."
          : `The document download failed (HTTP ${reason.status}). ${reason.message}`);
      } else if (phase === "engine") {
        setError("The PDF viewer could not start. Retry to reload the viewer files.");
      } else if (phase === "download") {
        setError("The document download was interrupted. Check the backend connection, then retry the preview.");
      } else if (name === "InvalidPDFException") {
        setError("This PDF is damaged or is not a valid PDF. Request a corrected file.");
      } else {
        setError("The file downloaded, but the PDF viewer could not open it. Retry the preview.");
      }
      if (import.meta.env.DEV) console.error("Document preview failed", { phase, name, message: reason instanceof Error ? reason.message : String(reason) });

    });
    return () => { abort.abort(); unlock.current = null; dispose(); };
  }, [documentId, attempt]);

  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let cancel = () => {};
    ready.current(documentId, false); setStatus("Rendering page..."); setError(""); host.current?.replaceChildren();
    void (async () => {
      const source = await pdf.getPage(page);
      if (!active) return;
      const base = source.getViewport({ scale: 1 });
      const fit = zoom === 0 ? Math.min(area.width / base.width, area.height / base.height) : zoom === -1 ? area.width / base.width : zoom / 100;
      const scale = Math.min(2 * fit, Math.sqrt(8_000_000 / (base.width * base.height)));
      const viewport = source.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.floor(base.width * fit)}px`;
      canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", `${fileName}, page ${page} of ${pdf.numPages}`);
      const render = source.render({ canvas, viewport }); cancel = () => render.cancel();
      await render.promise;
      if (active) { host.current?.replaceChildren(canvas); setStatus(""); ready.current(documentId, true); }
    })().catch(() => { if (active) { setStatus(""); setError("This page could not be rendered. Retry the preview before approving."); ready.current(documentId, false); } });
    return () => { active = false; cancel(); };
  }, [pdf, page, zoom, documentId, fileName, area.width, area.height]);

  return <div className="document-pdf-preview">
    <div className="document-pdf-toolbar">
      <Button variant="ghost" size="sm" disabled={!pdf || page <= 1 || Boolean(status)} onClick={() => setPage(value => value - 1)}>Previous page</Button>
      <span>Page {page}{pdf ? ` of ${pdf.numPages}` : ""}</span>
      <Button variant="ghost" size="sm" disabled={!pdf || page >= pdf.numPages || Boolean(status)} onClick={() => setPage(value => value + 1)}>Next page</Button>
      <label>Zoom <select aria-label="Document zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={0}>Fit page</option><option value={-1}>Fit width</option>{[100, 125, 150, 200].map(value => <option key={value} value={value}>{value}%</option>)}</select></label>
    </div>
    {status ? <p role="status">{status}</p> : null}
    {passwordPrompt ? <form className="document-pdf-password" onSubmit={event => { event.preventDefault(); const submit = unlock.current; unlock.current = null; setPasswordPrompt(""); setStatus("Unlocking document..."); submit?.(password); setPassword(""); }}>
      <p>{passwordPrompt} The password is used only in this browser.</p>
      <label>PDF password<input type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <Button type="submit" size="sm">Unlock PDF</Button>
    </form> : null}
    {error ? <div role="alert"><p>{error}</p><Button variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>Retry preview</Button></div> : null}
    <div className="document-pdf-pages" ref={host} />
  </div>;
}
