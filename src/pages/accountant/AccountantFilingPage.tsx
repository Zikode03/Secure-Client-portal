// Friendly guide: this module (AccountantFilingPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import {
  buildReviewDocumentFromInvoice,
  buildUnifiedSearchResults,
  parseAmountLabel,
} from "../../services/workflowEngine";
import type {
  DocumentRecord,
  UnifiedSearchFilters,
  UnifiedSearchResult,
  WorkflowStatus,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatStatusLabel,
  statusToTone,
  toneToAccentClass,
} from "../../utils/formatters";
import { getScopedClients } from "../../utils/permissions";

const defaultFilters: UnifiedSearchFilters = {
  query: "",
  clientId: "",
  month: "",
  year: "",
  documentType: "",
  status: "",
  expiryStatus: "",
  requiredFlag: "all",
  uploadedBy: "",
  reviewedBy: "",
};

const previewReferenceDate = new Date("2026-05-08T08:00:00.000Z");
const resultsPerPage = 7;

// Shared shape notes: these types keep UI and data contracts aligned.
type ResultTab = "all" | "documents" | "invoices" | "requests" | "compliance";
type ViewerTab = "details" | "history" | "related";
type FiledHistoryEntry = {
  id: string;
  actionLabel: string;
  actor: string;
  isFinalFiledVersion: boolean;
  note: string;
  timestamp: string;
  versionLabel: string;
};
const allowedFilingTypeLabels = new Set([
  "bank statement",
  "invoices",
  "signed documents",
  "compliance record",
  "payroll summary",
  "tax working papers",
  "proof of payment",
  "credit notes",
  "debit notes",
]);

// Component flow: gather data first, then render a focused UI state.
function SearchIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.75v9.5m0 0 3.5-3.5m-3.5 3.5-3.5-3.5M5.5 18.25h13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function OpenInNewIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M13 5.75h5.25V11m-6.25 6.25L18.25 11m-8.5-4.25H7A1.25 1.25 0 0 0 5.75 8v9A1.25 1.25 0 0 0 7 18.25h9A1.25 1.25 0 0 0 17.25 17v-2.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 12h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 7v10M7 12h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 4.75H4.75V8M20 8V4.75h-3.25M16 19.25h3.25V16M4.75 16v3.25H8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m10 7 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function belongsToResultTab(result: UnifiedSearchResult, tab: ResultTab) {
  if (tab === "all") {
    return true;
  }

  if (tab === "invoices") {
    return result.resultType === "invoice";
  }

  if (tab === "requests") {
    return result.resultType === "request";
  }

  if (tab === "compliance") {
    return result.resultType === "compliance_document";
  }

  return [
    "document",
    "bank_statement",
    "signed_document",
    "monthly_pack_item",
  ].includes(result.resultType);
}

function isAllowedFilingType(result: UnifiedSearchResult) {
  if (result.resultType === "invoice") {
    return true;
  }
  return allowedFilingTypeLabels.has(result.typeLabel.trim().toLowerCase());
}

function buildFiledHistoryEntries(document: DocumentRecord): FiledHistoryEntry[] {
  const sortedTrail = [...document.auditTrail].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  const entries = sortedTrail.map((entry, index) => {
    const normalizedStatus = entry.status.trim().toLowerCase();
    const actionLabel =
      normalizedStatus.includes("accepted")
        ? "Accepted by accountant"
        : normalizedStatus.includes("reject")
          ? "Rejected during review"
          : normalizedStatus.includes("review")
            ? "Under review"
            : normalizedStatus.includes("submit") || normalizedStatus.includes("upload")
              ? "Uploaded by client"
              : entry.status;

    return {
      id: entry.id,
      actionLabel,
      actor: entry.actor,
      isFinalFiledVersion: false,
      note: entry.note,
      timestamp: entry.timestamp,
      versionLabel: `v${index + 1}`,
    };
  });

  if (entries.length === 0) {
    return [];
  }

  const acceptedIndex =
    [...entries]
      .map((entry, index) => ({ entry, index }))
      .reverse()
      .find((item) => item.entry.actionLabel === "Accepted by accountant")?.index ??
    entries.length - 1;

  entries[acceptedIndex] = {
    ...entries[acceptedIndex],
    actionLabel: "Filed (accepted and locked)",
    isFinalFiledVersion: true,
  };

  return entries.reverse();
}

function buildSelectOptions(values: string[], allLabel: string) {
  return [
    { label: allLabel, value: "" },
    ...values.map((value) => ({ label: value, value })),
  ];
}

function displayResultTitle(result: UnifiedSearchResult) {
  if (result.resultType === "invoice") {
    return `Invoice ${result.title}`;
  }

  if (result.resultType === "document" || result.resultType === "bank_statement") {
    return result.typeLabel;
  }

  if (result.resultType === "signed_document") {
    return result.typeLabel;
  }

  if (result.resultType === "monthly_pack_item") {
    return result.title;
  }

  return result.title;
}

function resultFamilyLabel(result: UnifiedSearchResult) {
  switch (result.resultType) {
    case "invoice":
      return "Invoices";
    case "request":
      return "Requests";
    case "compliance_document":
      return "Compliance";
    default:
      return "Documents";
  }
}

function inferFileLabel(result: UnifiedSearchResult, document?: DocumentRecord | null) {
  const fileName = document?.fileName ?? result.title;
  const extension = fileName.split(".").pop()?.toUpperCase();

  if (extension && extension.length <= 4 && extension !== fileName.toUpperCase()) {
    return extension;
  }

  if (result.resultType === "invoice") {
    return "PDF";
  }

  if (result.typeLabel.toLowerCase().includes("payroll")) {
    return "XLS";
  }

  if (result.typeLabel.toLowerCase().includes("vat")) {
    return "XLS";
  }

  return "PDF";
}

function fileLabelClasses(label: string) {
  if (label === "PDF") {
    return "border-rose-100 bg-rose-50 text-rose-600";
  }

  if (label === "XLS") {
    return "border-emerald-100 bg-emerald-50 text-emerald-600";
  }

  if (label === "DOC") {
    return "border-indigo-100 bg-indigo-50 text-indigo-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function isNewResult(value: string) {
  const submittedAt = new Date(value).getTime();
  const ageInDays =
    (previewReferenceDate.getTime() - submittedAt) / (1000 * 60 * 60 * 24);

  return ageInDays <= 10;
}

function mapWorkflowStatusToDocumentStatus(
  value: WorkflowStatus,
): DocumentRecord["status"] {
  switch (value) {
    case "accepted":
    case "filed":
    case "uploaded":
    case "under_review":
    case "rejected":
      return value;
    case "compliant":
    case "valid":
      return "accepted";
    default:
      return "uploaded";
  }
}

function buildSyntheticDocument(result: UnifiedSearchResult): DocumentRecord {
  const safeTitle = displayResultTitle(result)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const description =
    result.resultType === "request"
      ? "Workflow request attached to the client file in the unified document centre."
      : `Preview shell for ${result.typeLabel.toLowerCase()} in the unified document centre.`;

  return {
    id: result.id,
    clientId: result.clientId,
    clientName: result.clientName,
    documentType: result.typeLabel,
    fileName: `${safeTitle || "record"}.${inferFileLabel(result).toLowerCase()}`,
    monthLabel: result.monthLabel,
    description,
    status: mapWorkflowStatusToDocumentStatus(result.status),
    uploadedBy: result.uploadedBy ?? `${result.clientName} finance team`,
    uploadedAt: result.date,
    reviewedBy: result.reviewedBy,
    reviewedAt: result.reviewedBy ? result.date : undefined,
    sizeLabel: result.amountLabel ?? "1.4 MB",
    keywordTags: [result.title, result.typeLabel, result.monthLabel],
    supplierName: result.supplierName,
    amountLabel: result.amountLabel,
    extractedText: [displayResultTitle(result), result.clientName, result.monthLabel, description].join(
      "\n",
    ),
    expiryDate: result.expiryDate,
    comments: [],
    auditTrail: [
      {
        id: `${result.id}-audit-1`,
        status: formatStatusLabel(result.status),
        actor: result.reviewedBy ?? result.uploadedBy ?? result.clientName,
        timestamp: result.date,
        note: `This ${result.typeLabel.toLowerCase()} record is visible in the unified document centre.`,
      },
    ],
  };
}

function documentPreviewLines(document: DocumentRecord) {
  return (document.extractedText ?? `${document.fileName}\n${document.description}`)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 18);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPreviewText(document: DocumentRecord) {
  return documentPreviewLines(document).join("\n");
}

function downloadPreview(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.replace(/\.[^.]+$/, "") + "-preview.txt";
  link.click();
  window.URL.revokeObjectURL(url);
}

function openPreviewInNewTab(document: DocumentRecord) {
  if (document.fileDataUrl) {
    const fileWindow = window.open(document.fileDataUrl, "_blank", "noopener,noreferrer");
    return Boolean(fileWindow);
  }

  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) {
    return false;
  }

  previewWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.fileName)}</title>
    <style>
      body { margin: 0; padding: 32px; font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      article { max-width: 880px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 8px; color: #475569; }
      pre { margin-top: 24px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; white-space: pre-wrap; word-break: break-word; color: #0f172a; }
    </style>
  </head>
  <body>
    <article>
      <h1>${escapeHtml(document.fileName)}</h1>
      <p>${escapeHtml(document.documentType)} | ${escapeHtml(document.clientName)} | ${escapeHtml(document.monthLabel)}</p>
      <pre>${escapeHtml(buildPreviewText(document))}</pre>
    </article>
  </body>
</html>`);
  previewWindow.document.close();
  return true;
}

function downloadDocumentFile(fileRecord: DocumentRecord) {
  if (fileRecord.fileDataUrl) {
    const link = document.createElement("a");
    link.href = fileRecord.fileDataUrl;
    link.download = fileRecord.fileName;
    link.click();
    return;
  }

  downloadPreview(fileRecord.fileName, buildPreviewText(fileRecord));
}

function formatPreviewMoney(value: number) {
  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildInvoiceLineItems(amountLabel?: string) {
  const total = parseAmountLabel(amountLabel) || 2497;
  const subtotal = Number((total / 1.1).toFixed(2));
  const tax = Number((total - subtotal).toFixed(2));
  const amounts = [
    Number((subtotal * 0.55).toFixed(2)),
    Number((subtotal * 0.3).toFixed(2)),
  ];
  const remainder = Number((subtotal - amounts[0] - amounts[1]).toFixed(2));

  return {
    subtotal,
    tax,
    total,
    rows: [
      { description: "Consulting Services", quantity: 1, rate: amounts[0], amount: amounts[0] },
      {
        description: "Implementation Support",
        quantity: 4,
        rate: Number((amounts[1] / 4).toFixed(2)),
        amount: amounts[1],
      },
      {
        description: "Software Subscription",
        quantity: 1,
        rate: remainder,
        amount: remainder,
      },
    ],
  };
}

function detailValue(value: string | undefined, fallback = "-") {
  return value && value.trim().length > 0 ? value : fallback;
}

function ResultFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption?.label ?? options[0]?.label ?? "All";

  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="text-[0.78rem] font-medium text-slate-500">{label}</span>
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={cn(
            "flex h-12 w-full items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-4 text-left text-sm font-semibold shadow-sm transition",
            isOpen || value
              ? "text-[#00856f] ring-1 ring-[#0a2f66]/10"
              : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]",
          )}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDownIcon />
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 top-14 z-50 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)]"
            role="menu"
          >
            {options.map((option) => (
              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition",
                  value === option.value
                    ? "bg-[#eaf7f0] text-[#087d69]"
                    : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]",
                )}
                key={option.value || option.label}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreviewShell({
  document,
  result,
  zoomLevel,
}: {
  document: DocumentRecord;
  result: UnifiedSearchResult;
  zoomLevel: number;
}) {
  const previewScale = Math.max(0.85, zoomLevel / 100);
  const previewLines = documentPreviewLines(document);
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
  const showInvoicePreview =
    result.resultType === "invoice" || document.documentType.toLowerCase().includes("invoice");

  if (hasRealFile) {
    return (
      <div
        className="mx-auto w-full max-w-[900px] origin-top rounded-[1rem] bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.08)]"
        style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
      >
        {isImage ? (
          <img
            alt={document.fileName}
            className="max-h-[72vh] w-full rounded-lg border border-slate-200 object-contain"
            src={document.fileDataUrl}
          />
        ) : isPdf ? (
          <iframe
            className="h-[72vh] w-full rounded-lg border border-slate-200 bg-white"
            src={document.fileDataUrl}
            title={document.fileName}
          />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            This file type cannot be embedded here. Use Open in new tab to view it.
          </div>
        )}
      </div>
    );
  }

  if (showInvoicePreview) {
    const invoiceLayout = buildInvoiceLineItems(document.amountLabel);

    return (
      <div
        className="mx-auto w-full max-w-[540px] origin-top rounded-[1rem] bg-white px-8 py-7 shadow-[0_10px_32px_rgba(15,23,42,0.08)]"
        style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[1.95rem] font-semibold uppercase tracking-tight text-brand-700">
              Invoice
            </p>
            <p className="mt-3 text-[1.05rem] font-semibold text-slate-950">
              {document.clientName}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              12 Market Street
              <br />
              Sandton, Johannesburg
              <br />
              ABN 12 345 678 901
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-400">Invoice No:</span>{" "}
              {result.title.replace(/^Invoice\s+/i, "")}
            </p>
            <p>
              <span className="font-medium text-slate-400">Date:</span>{" "}
              {formatDateLabel(document.uploadedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-400">Due Date:</span>{" "}
              {formatDateLabel(document.reviewedAt ?? document.uploadedAt)}
            </p>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-[0.95rem] border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceLayout.rows.map((row) => (
                <tr className="border-t border-slate-100" key={row.description}>
                  <td className="px-4 py-3 text-slate-700">{row.description}</td>
                  <td className="px-4 py-3 text-slate-500">{row.quantity}</td>
                  <td className="px-4 py-3 text-slate-500">{formatPreviewMoney(row.rate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPreviewMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-6 max-w-[220px] space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatPreviewMoney(invoiceLayout.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>GST (10%)</span>
            <span>{formatPreviewMoney(invoiceLayout.tax)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-950">
            <span>Total Due</span>
            <span>{formatPreviewMoney(invoiceLayout.total)}</span>
          </div>
        </div>

        <p className="mt-10 text-sm text-slate-500">Thank you for your business.</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[540px] origin-top rounded-[1rem] bg-white px-7 py-6 shadow-[0_10px_32px_rgba(15,23,42,0.08)]"
      style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
            {document.documentType}
          </p>
          <h3 className="mt-2 text-[1.35rem] font-semibold text-slate-950">
            {displayResultTitle(result)}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {document.clientName} | {document.monthLabel}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          {document.sizeLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Uploaded
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {formatDateTimeLabel(document.uploadedAt)}
          </p>
        </div>
        <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Reviewed by
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {detailValue(document.reviewedBy, "Waiting for review")}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1rem] border border-slate-200 px-5 py-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Preview snapshot
        </p>
        <div className="mt-4 space-y-3 font-mono text-[0.84rem] leading-7 text-slate-600">
          {previewLines.map((line, index) => (
            <p key={`${document.id}-preview-${index}`}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountantFilingPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<UnifiedSearchFilters>(defaultFilters);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>("documents");
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedResultId, setSelectedResultId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState<ViewerTab>("details");
  const [openMenuResultId, setOpenMenuResultId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const assignedClients = useMemo(
    () => getScopedClients(user, portal.adminClients),
    [portal.adminClients, user],
  );

  const allResults = useMemo(
    () =>
      assignedClients.flatMap((client) => {
        const workspace = portal.getClientWorkspace(client.id);
        return buildUnifiedSearchResults({
          clientId: client.id,
          clientName: client.clientName,
          documents: workspace.documents,
          invoices: workspace.invoices,
          monthPack: workspace.monthPack,
          requests: workspace.requests,
          complianceDocuments:
            client.id === "firm-client-1"
              ? portal.accountantComplianceCentre.categoryGroups.flatMap(
                  (group) => group.documents,
                )
              : [],
        });
      }),
    [assignedClients, portal],
  );

  const filteredResults = useMemo(
    () =>
      portal
        .filterSearchResults(allResults, filters)
        .filter((result) => result.status === "accepted")
        .filter((result) => isAllowedFilingType(result)),
    [allResults, filters, portal],
  );

  const visibleResults = useMemo(
    () => filteredResults.filter((result) => belongsToResultTab(result, activeResultTab)),
    [activeResultTab, filteredResults],
  );

  const totalPages = Math.max(1, Math.ceil(visibleResults.length / resultsPerPage));

  const pagedResults = useMemo(
    () =>
      visibleResults.slice(
        (currentPage - 1) * resultsPerPage,
        currentPage * resultsPerPage,
      ),
    [currentPage, visibleResults],
  );

  const selectedResult = useMemo(
    () => filteredResults.find((result) => result.id === selectedResultId) ?? null,
    [filteredResults, selectedResultId],
  );

  const selectedDocument = useMemo<DocumentRecord | null>(() => {
    if (!selectedResult) {
      return null;
    }

    return resolveDocumentForResult(selectedResult);
  }, [portal, selectedResult]);
  const filedHistoryEntries = useMemo(
    () => (selectedDocument ? buildFiledHistoryEntries(selectedDocument) : []),
    [selectedDocument],
  );

  const tabCounts = useMemo(
    () => ({
      all: filteredResults.length,
      documents: filteredResults.filter((result) => belongsToResultTab(result, "documents"))
        .length,
      invoices: filteredResults.filter((result) => belongsToResultTab(result, "invoices"))
        .length,
      requests: filteredResults.filter((result) => belongsToResultTab(result, "requests"))
        .length,
      compliance: filteredResults.filter((result) => belongsToResultTab(result, "compliance"))
        .length,
    }),
    [filteredResults],
  );

  const clientOptions = useMemo(
    () => buildSelectOptions(assignedClients.map((client) => client.clientName), "All clients"),
    [assignedClients],
  );

  const monthOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(new Set(allResults.map((result) => result.monthLabel))).sort((left, right) =>
          left.localeCompare(right),
        ),
        "All periods",
      ),
    [allResults],
  );

  const documentTypeOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(new Set(allResults.map((result) => result.typeLabel))).sort((left, right) =>
          left.localeCompare(right),
        ),
        "All types",
      ),
    [allResults],
  );

  const statusOptions = useMemo(
    () => [
      { label: "All statuses", value: "" },
      { label: formatStatusLabel("accepted"), value: "accepted" },
    ],
    [],
  );

  const uploadedByOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(
          new Set(
            allResults
              .map((result) => result.uploadedBy)
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort((left, right) => left.localeCompare(right)),
        "All",
      ),
    [allResults],
  );

  const reviewedByOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(
          new Set(
            allResults
              .map((result) => result.reviewedBy)
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort((left, right) => left.localeCompare(right)),
        "All",
      ),
    [allResults],
  );

  const yearOptions = useMemo(
    () =>
      buildSelectOptions(
        Array.from(
          new Set(allResults.map((result) => String(new Date(result.date).getFullYear()))),
        ).sort((left, right) => Number(right) - Number(left)),
        "All",
      ),
    [allResults],
  );

  const viewerTabs = useMemo(
    () => [
      { id: "details" as const, label: "Filing details" },
      { id: "history" as const, label: "Version history" },
      { id: "related" as const, label: "Related filings" },
    ],
    [],
  );

  const relatedResults = useMemo(() => {
    if (!selectedResult) {
      return [];
    }

    return filteredResults
      .filter(
        (result) =>
          result.id !== selectedResult.id &&
          result.clientName === selectedResult.clientName &&
          result.monthLabel === selectedResult.monthLabel,
      )
      .slice(0, 4);
  }, [filteredResults, selectedResult]);

  const selectedAccountant = useMemo(() => {
    if (!selectedResult) {
      return user?.fullName ?? "Assigned accountant";
    }

    return (
      portal.adminClients.find((client) => client.id === selectedResult.clientId)
        ?.assignedAccountant ??
      portal.adminClients.find((client) => client.clientName === selectedResult.clientName)
        ?.assignedAccountant ??
      user?.fullName ??
      "Assigned accountant"
    );
  }, [portal.adminClients, selectedResult, user?.fullName]);

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeResultTab, filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (selectedResultId && !filteredResults.some((result) => result.id === selectedResultId)) {
      setSelectedResultId("");
      setViewerOpen(false);
    }
  }, [filteredResults, selectedResultId]);

  useEffect(() => {
    const clientFromQuery = searchParams.get("client");
    if (!clientFromQuery) {
      return;
    }
    if (filters.clientId === clientFromQuery) {
      return;
    }
    setFilters((current) => ({ ...current, clientId: clientFromQuery }));
  }, [filters.clientId, searchParams]);

  useEffect(() => {
    if (openMenuResultId && !pagedResults.some((result) => result.id === openMenuResultId)) {
      setOpenMenuResultId("");
    }
  }, [openMenuResultId, pagedResults]);

  function resolveDocumentForResult(result: UnifiedSearchResult) {
    const workspace = portal.getClientWorkspace(result.clientId);
    const documentMatch = workspace.documents.find((document) => document.id === result.id);

    if (documentMatch) {
      return documentMatch;
    }

    const invoiceMatch = workspace.invoices.find((invoice) => invoice.id === result.id);
    if (invoiceMatch) {
      return buildReviewDocumentFromInvoice(invoiceMatch);
    }

    if (result.clientId === "firm-client-1" || result.clientId === "client-apex") {
      const liveRecord = portal.getReviewRecord(result.id);
      if (liveRecord.id === result.id) {
        return liveRecord;
      }
    }

    return buildSyntheticDocument(result);
  }

  function handleOpenResultTab(result: UnifiedSearchResult, tab: ViewerTab) {
    setSelectedResultId(result.id);
    setViewerOpen(true);
    setViewerTab(tab);
    setPreviewZoom(100);
    setOpenMenuResultId("");
  }

  function handleOpenResult(result: UnifiedSearchResult) {
    handleOpenResultTab(result, "details");
  }

  function handleViewVersionHistory(result: UnifiedSearchResult) {
    handleOpenResultTab(result, "history");
    setFeedbackMessage(`Opened version history for ${displayResultTitle(result)}.`);
  }

  function handleDownloadResult(result: UnifiedSearchResult) {
    const document = resolveDocumentForResult(result);
    downloadDocumentFile(document);
    setFeedbackMessage(`${displayResultTitle(result)} downloaded as a preview file.`);
    setOpenMenuResultId("");
  }

  function handleClearFilters() {
    setFilters(defaultFilters);
    setActiveResultTab("documents");
    setSelectedResultId("");
    setViewerOpen(false);
    setViewerTab("details");
    setCurrentPage(1);
  }

  return (
    <div
      className="mx-auto max-w-[1280px] space-y-6"
      onClick={() => setOpenMenuResultId("")}
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">
            Document Filing Register
          </h1>
          <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">
            Archive-only register of accepted records. Use this page for retrieval, audit trace, and version reference.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setFeedbackMessage("Saved views are available for this filing register layout.")}
            type="button"
          >
            Saved views
            <ChevronDownIcon />
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            onClick={() => setFeedbackMessage("Export register action is ready.")}
            type="button"
          >
            <PlusIcon />
            Export register
          </button>
        </div>
      </section>

      {feedbackMessage ? (
        <div className="rounded-[1.35rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <div className={cn("grid gap-6", viewerOpen ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,430px)]" : "")}>
        <div className="space-y-6">
          <SurfaceCard className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_22px_52px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 lg:grid-cols-1 lg:items-center">
                <div className="relative">
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <SearchIcon />
                  </span>
                  <input
                    className="h-14 w-full rounded-full border border-slate-200 bg-white pl-14 pr-5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, query: event.target.value }))
                    }
                    placeholder="Search filed records, clients, reference numbers..."
                    value={filters.query}
                  />
                </div>
              </div>

              <div className="grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-5">
                <ResultFilterSelect
                  label="Client"
                  onChange={(value) => {
                    const clientId =
                      assignedClients.find((client) => client.clientName === value)?.id ?? "";
                    setFilters((current) => ({ ...current, clientId }));
                  }}
                  options={clientOptions}
                  value={
                    assignedClients.find((client) => client.id === filters.clientId)?.clientName ??
                    ""
                  }
                />
                <ResultFilterSelect
                  label="Filing period"
                  onChange={(value) => setFilters((current) => ({ ...current, month: value }))}
                  options={monthOptions}
                  value={filters.month}
                />
                <ResultFilterSelect
                  label="Document type"
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, documentType: value }))
                  }
                  options={documentTypeOptions}
                  value={filters.documentType}
                />
                <ResultFilterSelect
                  label="Filing status"
                  onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                  options={statusOptions}
                  value={filters.status}
                />
                <ResultFilterSelect
                  label="Year"
                  onChange={(value) => setFilters((current) => ({ ...current, year: value }))}
                  options={yearOptions}
                  value={filters.year}
                />
              </div>

              <button
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                type="button"
              >
                More filters
                <span className={cn("transition", showAdvancedFilters ? "rotate-180" : "")}>
                  <ChevronDownIcon />
                </span>
              </button>

              {showAdvancedFilters ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <ResultFilterSelect
                    label="Uploaded by"
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, uploadedBy: value }))
                    }
                    options={uploadedByOptions}
                    value={filters.uploadedBy}
                  />
                  <ResultFilterSelect
                    label="Filed by"
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, reviewedBy: value }))
                    }
                    options={reviewedByOptions}
                    value={filters.reviewedBy}
                  />
                  <ResultFilterSelect
                    label="Expiry status"
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, expiryStatus: value }))
                    }
                    options={[
                      { label: "All", value: "" },
                      { label: "Expiring soon", value: "expiring" },
                      { label: "Expired", value: "expired" },
                    ]}
                    value={filters.expiryStatus}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                  onClick={() => setFeedbackMessage("Saved this filing register view.")}
                  type="button"
                >
                  <span className="h-3.5 w-3.5 rounded-sm border border-brand-400 bg-brand-50" />
                  Save this view
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={handleClearFilters}
                    type="button"
                  >
                    Reset
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                    onClick={() => setFeedbackMessage("Applied filing register filters.")}
                    type="button"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </div>
          </SurfaceCard>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[1.08rem] font-semibold text-[#091333]">Filed documents</h2>
              <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                {tabCounts.documents} files
              </span>
            </div>

            <SurfaceCard className="overflow-visible rounded-lg border border-slate-200 bg-white p-0 shadow-none">
              {visibleResults.length === 0 ? (
                <div className="px-5 py-10">
                  <EmptyState
                    description={
                      assignedClients.length === 0 && user?.role === "accountant"
                        ? "No filed records found in your assigned client portfolio."
                        : "Only accepted core filing types are shown here (for example invoices, bank statements, signed documents, and compliance records)."
                    }
                    title="No filed records match this view"
                  />
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(0,1.35fr)_minmax(130px,0.68fr)_minmax(170px,0.92fr)_72px] gap-6 border-b border-slate-100 px-5 py-4 text-[0.82rem] font-bold text-[#091333] lg:grid">
                    <span>Name</span>
                    <span>Filed Date</span>
                    <span>Filed By</span>
                    <span className="text-center">More Actions</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {pagedResults.map((result) => {
                      const fileLabel = inferFileLabel(result, selectedResultId === result.id ? selectedDocument : null);
                      const selected = viewerOpen && result.id === selectedResultId;
                      const filedBy = result.uploadedBy ?? "Client";

                      return (
                        <div
                          className={cn(
                            "grid gap-3 px-5 py-4 transition lg:grid-cols-[minmax(0,1.35fr)_minmax(130px,0.68fr)_minmax(170px,0.92fr)_72px] lg:items-center lg:gap-6",
                            selected ? "bg-brand-50/35 ring-1 ring-inset ring-brand-100" : "hover:bg-slate-50",
                          )}
                          key={result.id}
                        >
                          <button
                            className="flex min-w-0 items-center gap-3 text-left"
                            onClick={() => handleOpenResult(result)}
                            type="button"
                          >
                            <div
                              className={cn(
                                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-[0.68rem] font-semibold",
                                fileLabelClasses(fileLabel),
                              )}
                            >
                              {fileLabel}
                            </div>
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate text-[0.9rem] font-semibold text-[#091333]">
                                  {displayResultTitle(result)}
                                </p>
                                {isNewResult(result.date) ? (
                                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[0.68rem] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                                    New
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-[0.78rem] text-slate-500">
                                <span className="truncate">
                                  {result.clientName} / {resultFamilyLabel(result)} / {result.monthLabel}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[0.66rem] font-semibold ring-1 ring-inset",
                                    toneToAccentClass(statusToTone(result.status)),
                                  )}
                                >
                                  {formatStatusLabel(result.status)}
                                </span>
                              </div>
                              {result.amountLabel ? (
                                <p className="mt-0.5 truncate text-[0.76rem] text-slate-400">
                                  {result.amountLabel}
                                </p>
                              ) : null}
                            </div>
                          </button>

                          <div className="text-[0.86rem] font-medium text-slate-700">
                            <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                              Filed Date
                            </span>
                            {formatDateLabel(result.date)}
                          </div>

                          <div className="min-w-0 text-[0.86rem] font-medium text-slate-700">
                            <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                              Filed By
                            </span>
                            <span className="truncate">{filedBy}</span>
                          </div>

                          <div className="relative flex min-w-0 items-center justify-start lg:justify-center">
                            <button
                              aria-label={`More actions for ${displayResultTitle(result)}`}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                                openMenuResultId === result.id
                                  ? "bg-[#0a2f66]/10 text-[#00856f]"
                                  : "text-[#091333] hover:bg-slate-100"
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuResultId((current) =>
                                  current === result.id ? "" : result.id,
                                );
                              }}
                              type="button"
                            >
                              <MoreHorizontalIcon />
                            </button>

                            {openMenuResultId === result.id ? (
                              <div
                                className="absolute right-auto top-[calc(100%+0.35rem)] z-50 min-w-[220px] rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)] lg:right-0"
                                onClick={(event) => event.stopPropagation()}
                                role="menu"
                              >
                                <button
                                  className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                                  onClick={() => handleOpenResult(result)}
                                  role="menuitem"
                                  type="button"
                                >
                                  Preview file
                                </button>
                                <button
                                  className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                                  onClick={() => handleDownloadResult(result)}
                                  role="menuitem"
                                  type="button"
                                >
                                  Download
                                </button>
                                <button
                                  className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                                  onClick={() => handleViewVersionHistory(result)}
                                  role="menuitem"
                                  type="button"
                                >
                                  View version history
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex min-h-[92px] items-center justify-between border-t border-slate-100 bg-white px-5 py-[18px] text-xs font-medium text-[#53617f]">
                    <span className="font-semibold text-[#091333]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-7">
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#9aa8ba] transition hover:text-[#53617f] disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        type="button"
                      >
                        Prev
                      </button>
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#9aa8ba] transition hover:text-[#53617f] disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </SurfaceCard>
          </div>
        </div>

        {viewerOpen && selectedResult && selectedDocument ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/55 px-3 py-4 sm:px-6 sm:py-6"
            onClick={() => setViewerOpen(false)}
          >
            <SurfaceCard
              className="mx-auto h-full w-full max-w-[1080px] overflow-y-auto rounded-[1.7rem] border border-slate-200/90 bg-white p-5 shadow-[0_22px_56px_rgba(15,23,42,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  {displayResultTitle(selectedResult)}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span
                    className={cn(
                      "inline-flex rounded-lg border px-2 py-0.5 text-[0.72rem] font-semibold",
                      fileLabelClasses(inferFileLabel(selectedResult, selectedDocument)),
                    )}
                  >
                    {inferFileLabel(selectedResult, selectedDocument)}
                  </span>
                  <span>{selectedResult.clientName}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{selectedResult.monthLabel}</span>
                </div>
              </div>

              <button
                aria-label="Close document viewer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={() => setViewerOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                className="h-10 flex-1 rounded-xl px-4 text-brand-700"
                onClick={() => {
                  if (!openPreviewInNewTab(selectedDocument)) {
                    setFeedbackMessage("Pop-up blocked. Please allow pop-ups to open the preview.");
                  }
                }}
                variant="secondary"
              >
                <OpenInNewIcon />
                <span>Open in new tab</span>
              </Button>
              <Button
                className="h-10 flex-1 rounded-xl bg-[linear-gradient(135deg,#4f46e5,#4338ca)] px-4 hover:bg-[linear-gradient(135deg,#4338ca,#3730a3)]"
                onClick={() => downloadDocumentFile(selectedDocument)}
              >
                <DownloadIcon />
                <span>Download</span>
              </Button>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    onClick={() => setPreviewZoom((current) => Math.max(80, current - 10))}
                    type="button"
                  >
                    <ZoomOutIcon />
                  </button>
                  <span className="min-w-[52px] text-center text-sm font-medium text-slate-700">
                    {previewZoom}%
                  </span>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    onClick={() => setPreviewZoom((current) => Math.min(140, current + 10))}
                    type="button"
                  >
                    <ZoomInIcon />
                  </button>
                </div>

                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto text-sm text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    1 / 2
                  </span>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    onClick={() => openPreviewInNewTab(selectedDocument)}
                    type="button"
                  >
                    <ExpandIcon />
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-[1rem] border border-slate-200 bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_22%)]">
                <div className="h-[24rem] overflow-y-auto px-4 py-5">
                  <PreviewShell
                    document={selectedDocument}
                    result={selectedResult}
                    zoomLevel={previewZoom}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 border-b border-slate-200">
              <div className="flex flex-nowrap items-center gap-6 overflow-x-auto pb-1">
                {viewerTabs.map((tab) => (
                  <button
                    className={cn(
                      "relative pb-3 text-sm font-medium transition",
                      viewerTab === tab.id
                        ? "text-brand-700"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                    key={tab.id}
                    onClick={() => setViewerTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                    {viewerTab === tab.id ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              {viewerTab === "details" ? (
                <div className="space-y-5">
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Document type
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedResult.typeLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Status
                      </p>
                      <div className="mt-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset",
                            toneToAccentClass(statusToTone(selectedResult.status)),
                          )}
                        >
                          {formatStatusLabel(selectedResult.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Uploaded by
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {detailValue(selectedDocument.uploadedBy)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Uploaded on
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {formatDateTimeLabel(selectedDocument.uploadedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Filed by
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {detailValue(selectedDocument.reviewedBy, "Filed by assigned accountant")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Period
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedResult.monthLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Assigned to
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {selectedAccountant}
                        {selectedAccountant === user?.fullName ? " (You)" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Archived records are locked. Review decisions happen in the Documents workflow page.
                  </div>
                </div>
              ) : null}

              {viewerTab === "history" ? (
                filedHistoryEntries.length > 0 ? (
                  <div className="space-y-3">
                    {filedHistoryEntries.map((entry) => (
                      <article
                        className={cn(
                          "rounded-[1rem] border px-4 py-3",
                          entry.isFinalFiledVersion
                            ? "border-emerald-200 bg-emerald-50/70"
                            : "border-slate-200 bg-slate-50",
                        )}
                        key={entry.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-slate-600 ring-1 ring-slate-200">
                              {entry.versionLabel}
                            </span>
                            <p className="text-sm font-semibold text-slate-950">{entry.actionLabel}</p>
                            {entry.isFinalFiledVersion ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-700">
                                Final filed version
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatDateTimeLabel(entry.timestamp)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">By {entry.actor}</p>
                        <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="Version timeline will appear once this record has workflow events."
                    title="No history yet"
                  />
                )
              ) : null}

              {viewerTab === "related" ? (
                relatedResults.length > 0 ? (
                  <div className="space-y-3">
                    {relatedResults.map((result) => (
                      <button
                        className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/50"
                        key={result.id}
                        onClick={() => handleOpenResult(result)}
                        type="button"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {displayResultTitle(result)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {resultFamilyLabel(result)} | {formatStatusLabel(result.status)}
                          </p>
                        </div>
                        <ChevronRightIcon />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No closely related records were found in this filtered result set."
                    title="Nothing related yet"
                  />
                )
              ) : null}
            </div>
            </SurfaceCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
