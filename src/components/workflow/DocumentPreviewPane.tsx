// Friendly guide: this module (DocumentPreviewPane) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { DocumentRecord } from "../../types/portal";
import { StatusBadge } from "../ui/StatusBadge";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface DocumentPreviewPaneProps {
  document: DocumentRecord;
}

// Component flow: gather data first, then render a focused UI state.
export function DocumentPreviewPane({ document }: DocumentPreviewPaneProps) {
  const hasRealFile = Boolean(document.fileDataUrl);
  const mimeType = (document.fileMimeType ?? "").toLowerCase();
  const dataUrl = document.fileDataUrl ?? "";
  const isImage =
    mimeType.startsWith("image/") ||
    dataUrl.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(document.fileName);
  const isPdf =
    mimeType === "application/pdf" ||
    dataUrl.startsWith("data:application/pdf") ||
    /\.pdf$/i.test(document.fileName);
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{document.documentType}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{document.fileName}</h3>
          </div>
          <StatusBadge status={document.status} />
        </div>
      </div>

      <div className="space-y-6 p-6">
        {hasRealFile ? (
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
            {isImage ? (
              <img
                alt={document.fileName}
                className="max-h-[70vh] w-full rounded-lg object-contain"
                src={document.fileDataUrl}
              />
            ) : isPdf ? (
              <iframe
                className="h-[70vh] w-full rounded-lg border border-slate-200"
                src={document.fileDataUrl}
                title={document.fileName}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This file type cannot be embedded here. Open in a new tab to view it.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-inner">
            <div className="mx-auto max-w-md rounded-[1.75rem] bg-white p-6 text-slate-900 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Preview
                    </p>
                    <p className="mt-1 text-lg font-semibold">{document.documentType}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {document.sizeLabel}
                  </span>
                </div>
                <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-3 w-2/3 rounded-full bg-slate-200" />
                  <div className="h-3 w-5/6 rounded-full bg-slate-100" />
                  <div className="h-3 w-4/6 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-700">
          This preview keeps the review context visible, but the real integration point later can swap this shell for a proper PDF or image renderer without changing the page structure.
        </div>
      </div>
    </SurfaceCard>
  );
}
