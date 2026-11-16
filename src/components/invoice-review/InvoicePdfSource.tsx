import { useEffect, useRef, useState } from "react";
import type { ReviewEvidence } from "../../services/invoiceReviewScanner";
import { Button } from "../ui/Button";

export function InvoicePdfSource({ url, fileName, regions }: { url: string; fileName: string; regions: ReviewEvidence[] }) {
  const targetPage = regions[0]?.pageIndex ?? 0;
  const [page, setPage] = useState(targetPage);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canvasHost = useRef<HTMLDivElement>(null);
  useEffect(() => setPage(targetPage), [targetPage, regions]);
  useEffect(() => {
    const abort = new AbortController();
    let dispose = () => {};
    let cancelRender = () => {};
    setLoading(true); setError("");
    canvasHost.current?.replaceChildren();
    void (async () => {
      const { localPdfEngine } = await import("../../services/invoicePdfReader");
      const pdfjs = await localPdfEngine();
      abort.signal.throwIfAborted();
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error("Could not load the original PDF.");
      const data = new Uint8Array(await response.arrayBuffer());
      abort.signal.throwIfAborted();
      const task = pdfjs.getDocument({ data, useSystemFonts: true });
      dispose = () => { void task.destroy().catch(() => undefined); };
      const pdf = await task.promise;
      abort.signal.throwIfAborted();
      setPages(pdf.numPages);
      if (page < 0 || page >= pdf.numPages) throw new Error("The saved source page is unavailable. Compare the original PDF manually.");
      const original = await pdf.getPage(page + 1);
      const base = original.getViewport({ scale: 1 });
      const viewport = original.getViewport({ scale: Math.min(2, Math.sqrt(8_000_000 / (base.width * base.height))) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      canvas.style.width = "100%"; canvas.style.height = "auto";
      canvas.setAttribute("aria-label", `${fileName}, page ${page + 1}`);
      const render = original.render({ canvas, viewport });
      cancelRender = () => render.cancel();
      await render.promise;
      abort.signal.throwIfAborted();
      canvasHost.current?.replaceChildren(canvas);
      setLoading(false);
    })().catch(reason => {
      if (!abort.signal.aborted) { setError(reason instanceof Error ? reason.message : "Source preview unavailable."); setLoading(false); }
    });
    return () => { abort.abort(); cancelRender(); dispose(); };
  }, [url, fileName, page]);
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Button size="sm" variant="ghost" disabled={page <= 0 || loading} onClick={() => setPage(value => value - 1)}>Previous page</Button>
      <span>Page {page + 1}{pages ? ` of ${pages}` : ""}</span>
      <Button size="sm" variant="ghost" disabled={!pages || page + 1 >= pages || loading} onClick={() => setPage(value => value + 1)}>Next page</Button>
      <label>Zoom <select aria-label="PDF zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[100, 125, 150, 200].map(value => <option key={value} value={value}>{value}%</option>)}</select></label>
    </div>
    {loading ? <p role="status" className="p-3 text-xs text-slate-500">Loading source page…</p> : null}
    {error ? <><p role="alert" className="text-xs text-slate-600">{error}</p><iframe src={url} title={fileName} className="h-[65vh] w-full" /></> : null}
    <div className="relative" style={{ width: `${zoom}%` }}>
      <div ref={canvasHost} />
      {!loading && !error ? regions.filter(region => (region.pageIndex ?? 0) === page).map((region, index) => <span key={index} aria-label={`Source for ${region.field}, page ${page + 1}`} className="pointer-events-none absolute border-2 border-amber-500 bg-amber-300/25" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} />) : null}
    </div>
  </div>;
}
