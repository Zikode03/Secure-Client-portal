// Friendly guide: this module (DocumentPreviewPane) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { Download, Expand, FileText, FolderClock, UserRound } from "lucide-react";
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
  const openHref = hasRealFile ? document.fileDataUrl : undefined;
  const metadata = [
    { label: "Document type", value: document.documentType, icon: FileText },
    { label: "Reporting period", value: document.monthLabel, icon: FolderClock },
    { label: "Uploaded by", value: document.uploadedBy, icon: UserRound },
    { label: "File size", value: document.sizeLabel, icon: Expand },
  ];
// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{document.documentType}</p>
            <h3 className="mt-1 break-all text-[1.35rem] font-medium leading-8 text-slate-950">
              {document.fileName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {document.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={document.status} />
            {openHref ? (
              <>
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
                  download={document.fileName}
                  href={openHref}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#061b41] px-4 text-sm font-medium text-white shadow-[0_12px_24px_rgba(6,27,65,0.22)] transition hover:bg-[#09275c]"
                  href={openHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Expand className="h-4 w-4" />
                  Open full screen
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-3 lg:grid-cols-4">
          {metadata.map((item) => {
            const Icon = item.icon;
            return (
              <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]" key={item.label}>
                <div className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.1em] text-slate-400">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
              </div>
            );
          })}
        </div>

        {hasRealFile ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fbff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            {isImage ? (
              <img
                alt={document.fileName}
                className="max-h-[78vh] w-full rounded-xl border border-slate-200 bg-white object-contain"
                src={document.fileDataUrl}
              />
            ) : isPdf ? (
              <iframe
                className="h-[78vh] w-full rounded-xl border border-slate-200 bg-white"
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
          <div className="rounded-[1.75rem] border border-brand-200 bg-brand-700 p-6 text-white shadow-inner">
            <div className="mx-auto max-w-md rounded-[1.75rem] bg-white p-6 text-slate-900 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      Preview
                    </p>
                    <p className="mt-1 text-lg font-medium">{document.documentType}</p>
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

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Use the full screen action for detailed review, or download the uploaded file to inspect it outside the workspace.
        </div>
      </div>
    </SurfaceCard>
  );
}
