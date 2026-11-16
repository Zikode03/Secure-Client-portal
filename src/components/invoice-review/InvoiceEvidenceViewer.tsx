import { lazy, Suspense, useState } from "react";
import type { ReviewEvidence } from "../../services/invoiceReviewScanner";
import { Button } from "../ui/Button";

const InvoicePdfSource = lazy(() => import("./InvoicePdfSource").then(module => ({ default: module.InvoicePdfSource })));

interface Props {
  url?: string;
  mimeType?: string;
  fileName: string;
  evidence: ReviewEvidence[];
  selectedField: string | null;
}
export function InvoiceEvidenceViewer({
  url,
  mimeType,
  fileName,
  evidence,
  selectedField,
}: Props) {
  const [zoom, setZoom] = useState(100);
  const image =
    mimeType?.startsWith("image/") || /\.(?:jpe?g|png)$/i.test(fileName);
  const pdf = mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
  const regions = evidence.filter((region) => region.field === selectedField);
  return (
    <section aria-label="Original invoice" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">
          Original invoice
        </h4>
        {image && url ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={zoom === 100}
              aria-label="Zoom out invoice"
              onClick={() => setZoom((z) => Math.max(100, z - 25))}
            >
              −
            </Button>
            <span className="text-xs text-slate-500">{zoom}%</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={zoom === 200}
              aria-label="Zoom in invoice"
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
            >
              +
            </Button>
          </div>
        ) : null}
      </div>
      <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
        {!url ? (
          <p role="status" className="p-4 text-sm text-slate-500">
            Loading original document…
          </p>
        ) : image ? (
          <div className="relative" style={{ width: `${zoom}%` }}>
            <img src={url} alt={fileName} className="block h-auto w-full" />
            {regions.map((region, index) => (
              <span
                key={`${region.field}-${index}`}
                aria-label={`Source for ${region.field}`}
                className="pointer-events-none absolute rounded-sm border-2 border-amber-500 bg-amber-300/25"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`,
                }}
              />
            ))}
          </div>
        ) : pdf && regions.length ? (
          <Suspense fallback={<p role="status">Loading source preview…</p>}><InvoicePdfSource url={url} fileName={fileName} regions={regions} /></Suspense>
        ) : pdf ? (
          <iframe
            src={url}
            title={fileName}
            className="h-[65vh] w-full bg-white"
          />
        ) : (
          <a
            href={url}
            download={fileName}
            className="block p-4 text-sm font-medium text-brand-700"
          >
            Download original document
          </a>
        )}
      </div>
      {selectedField ? (
        <p className="text-xs leading-5 text-slate-500">
          {regions.length
            ? regions.map((r) => r.text).join(" · ")
            : "Source location unavailable. Compare this field with the original document."}
        </p>
      ) : null}
    </section>
  );
}
