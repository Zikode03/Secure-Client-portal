import { recognizeInvoiceImage } from "./invoiceScanner";

const MAX_PAGES = 20;
const MAX_BYTES = 25 * 1024 * 1024;

export interface PdfSourceLine {
  text: string; x: number; y: number; width: number; height: number; pageIndex: number; confidence?: number;
}
export async function localPdfEngine() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: workerUrl } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}
/** Local PDF text extraction, with local OCR for pages containing no usable text. */
export async function readInvoicePdfWithSources(
  file: File,
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<{text: string; lines: PdfSourceLine[]}> {
  signal.throwIfAborted();
  if (file.size > MAX_BYTES)
    throw new Error("Automatic reading supports PDFs up to 25 MB. Review this document manually.");
  const pdfjs = await localPdfEngine();
  signal.throwIfAborted();
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
  });
  const cancel = () => { void task.destroy().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PAGES)
      throw new Error("Automatic reading supports up to 20 pages per invoice. Review this document manually.");
    const pages: string[] = [];
    const lines: PdfSourceLine[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      let text = "";
      const pageLines: PdfSourceLine[] = [];
      const sourceViewport = page.getViewport({ scale: 1 });
      let group: PdfSourceLine | undefined;
      let lastY: number | undefined;
      let lastRight: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (lastY !== undefined && Math.abs(y - lastY) > 3) text += "\n";
        if (lastY !== undefined && Math.abs(y - lastY) <= 3 && lastRight !== undefined && item.transform[4] - lastRight > 6) text += "  ";
        // Unusual text rotations stay available in the original preview without a guessed box.
        if (sourceViewport.transform && item.transform[1] === 0 && item.transform[2] === 0) {
          const [a,b,c,d,e,f] = sourceViewport.transform;
          const left = item.transform[4];
          const corners = [[left, y], [left + item.width, y], [left, y + item.height], [left + item.width, y + item.height]].map(([x,y]) => [a*x+c*y+e, b*x+d*y+f]);
          const rectangle = [Math.min(...corners.map(point => point[0])), Math.min(...corners.map(point => point[1])), Math.max(...corners.map(point => point[0])), Math.max(...corners.map(point => point[1]))];
          const x = Math.max(0, Math.min(...[rectangle[0], rectangle[2]]) / sourceViewport.width);
          const top = Math.max(0, Math.min(rectangle[1], rectangle[3]) / sourceViewport.height);
          const right = Math.min(1, Math.max(rectangle[0], rectangle[2]) / sourceViewport.width);
          const bottom = Math.min(1, Math.max(rectangle[1], rectangle[3]) / sourceViewport.height);
          if (group && lastY !== undefined && Math.abs(y - lastY) <= 3) {
            const end = Math.max(group.x + group.width, right);
            const lower = Math.max(group.y + group.height, bottom);
            group.x = Math.min(group.x, x); group.y = Math.min(group.y, top);
            group.width = end - group.x; group.height = lower - group.y; group.text += " " + item.str;
          } else {
            group = { text: item.str, x, y: top, width: right - x, height: bottom - top, pageIndex: number - 1 };
            pageLines.push(group);
          }
          if (item.hasEOL) group = undefined;
        }
        text += item.str + (item.hasEOL ? "\n" : " ");
        lastY = y;
        lastRight = item.transform[4] + item.width;
      }
      if (text.replace(/\s/g, "").length < 20) {
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, Math.sqrt(8_000_000 / (base.width * base.height)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const render = page.render({ canvas, viewport });
        const cancelRender = () => render.cancel();
        signal.addEventListener("abort", cancelRender, { once: true });
        try {
          await render.promise;
          signal.throwIfAborted();
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PDF page could not be read.")), "image/png"),
          );
          const result = await recognizeInvoiceImage(
            new File([blob], `page-${number}.png`, { type: "image/png" }),
            signal,
            (value) => progress(Math.round(((number - 1 + value / 100) / pdf.numPages) * 100)),
            true,
          );
          text = result.text;
          pageLines.length = 0;
          for (const block of result.blocks ?? []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) {
            pageLines.push({ text: line.text, x: line.bbox.x0 / canvas.width, y: line.bbox.y0 / canvas.height,
              width: (line.bbox.x1 - line.bbox.x0) / canvas.width, height: (line.bbox.y1 - line.bbox.y0) / canvas.height,
              pageIndex: number - 1, confidence: line.confidence });
          }
        } finally {
          signal.removeEventListener("abort", cancelRender);
          canvas.width = canvas.height = 0;
        }
      }
      signal.throwIfAborted();
      pages.push(text);
      lines.push(...pageLines.filter(line => line.width > 0 && line.height > 0));
      page.cleanup();
      progress(Math.round((number / pdf.numPages) * 100));
    }
    const invoiceNumbers = [...pages.join("\n").matchAll(/(?:invoice|receipt)\s*(?:number|no\.?|#)\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]*)/gi)].map(match => match[1].toUpperCase());
    if (new Set(invoiceNumbers).size > 1) throw new Error("This PDF may contain multiple invoices. Split it into one invoice per file or review it manually.");
    // Repeated headers/totals on continuation pages are equivalent evidence.
    // Different totals remain separate so the conservative parser leaves them unresolved.
    return { text: [...new Set(pages.join("\n").split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].join("\n"), lines };
  } finally {
    signal.removeEventListener("abort", cancel);
    await task.destroy();
  }
}

export async function readInvoicePdf(file: File, signal: AbortSignal, progress: (value: number) => void) {
  return (await readInvoicePdfWithSources(file, signal, progress)).text;
}
