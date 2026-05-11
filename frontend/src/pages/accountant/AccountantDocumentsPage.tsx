import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
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

type ResultTab = "all" | "documents" | "invoices" | "requests" | "compliance";
type ViewerTab = "details" | "comments" | "history" | "related";

function SearchIcon() {
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

function FilterIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 6.5h15l-6 6v5l-3 1v-6l-6-6Z"
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

function isLiveReviewableResult(result: UnifiedSearchResult) {
  return (
    (result.clientId === "client-apex" || result.clientId === "firm-client-1") &&
    ["document", "bank_statement", "signed_document", "invoice"].includes(
      result.resultType,
    )
  );
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
      <p>${escapeHtml(document.documentType)} • ${escapeHtml(document.clientName)} • ${escapeHtml(document.monthLabel)}</p>
      <pre>${escapeHtml(buildPreviewText(document))}</pre>
    </article>
  </body>
</html>`);
  previewWindow.document.close();
  return true;
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
  return (
    <label className="space-y-2">
      <span className="text-[0.78rem] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
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
  const showInvoicePreview =
    result.resultType === "invoice" || document.documentType.toLowerCase().includes("invoice");

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
            {document.clientName} • {document.monthLabel}
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

function Pagination({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: Array<number | "..."> = [];

  if (totalPages <= 5) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
  } else if (currentPage <= 3) {
    pages.push(1, 2, 3, "...", totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, "...", currentPage, "...", totalPages);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <span>{"<"}</span>
      </button>
      {pages.map((page, index) =>
        page === "..." ? (
          <span className="px-2 text-sm text-slate-400" key={`ellipsis-${index}`}>
            ...
          </span>
        ) : (
          <button
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-medium transition",
              page === currentPage
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            key={page}
            onClick={() => onPageChange(page)}
            type="button"
          >
            {page}
          </button>
        ),
      )}
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        <span>{">"}</span>
      </button>
    </div>
  );
}

export function AccountantDocumentsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [filters, setFilters] = useState<UnifiedSearchFilters>(defaultFilters);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>("all");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState<ViewerTab>("details");
  const [openMenuResultId, setOpenMenuResultId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);

  const assignedClients = useMemo(
    () =>
      portal.adminClients.filter(
        (client) => client.assignedAccountant === user?.fullName || user?.role === "admin",
      ),
    [portal.adminClients, user?.fullName, user?.role],
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
    () => portal.filterSearchResults(allResults, filters),
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
      ...Array.from(new Set(allResults.map((result) => result.status)))
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ label: formatStatusLabel(value), value })),
    ],
    [allResults],
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
      { id: "details" as const, label: "Details" },
      { id: "comments" as const, label: `Comments ${selectedDocument ? selectedDocument.comments.length : 0}` },
      { id: "history" as const, label: "History" },
      { id: "related" as const, label: "Related" },
    ],
    [selectedDocument],
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

  function handleDownloadResult(result: UnifiedSearchResult) {
    const document = resolveDocumentForResult(result);
    downloadPreview(document.fileName, buildPreviewText(document));
    setFeedbackMessage(`${displayResultTitle(result)} downloaded as a preview file.`);
    setOpenMenuResultId("");
  }

  function handleRequestReupload(result: UnifiedSearchResult) {
    handleOpenResultTab(result, "comments");
    setFeedbackMessage(
      `Re-upload request prepared for ${displayResultTitle(result)}. Add the exact correction note in comments or continue in the review workspace.`,
    );
  }

  function handleMarkUnderReview(result: UnifiedSearchResult) {
    if (!user) {
      setFeedbackMessage("Sign in as an accountant to update document workflow status.");
      setOpenMenuResultId("");
      return;
    }

    if (isLiveReviewableResult(result)) {
      const reviewResult = portal.reviewRecord({
        action: "under_review",
        recordId: result.id,
        reviewer: user.fullName,
      });

      setFeedbackMessage(reviewResult.message);
      if (reviewResult.ok) {
        handleOpenResultTab(result, "details");
      } else {
        setOpenMenuResultId("");
      }
      return;
    }

    handleOpenResultTab(result, "details");
    setFeedbackMessage(
      `${displayResultTitle(result)} opened. Mark it under review from the live review workflow when you are ready to update status.`,
    );
  }

  function handleEscalateIssue(result: UnifiedSearchResult) {
    handleOpenResultTab(result, "history");
    setFeedbackMessage(
      `Issue escalated for ${displayResultTitle(result)}. History and comments remain attached to this record.`,
    );
  }

  function handleComment(message: string) {
    if (!selectedDocument || !selectedResult || !user) {
      return { ok: false, message: "Select a live document record before commenting." };
    }

    if (
      selectedResult.clientId !== "client-apex" &&
      selectedResult.clientId !== "firm-client-1"
    ) {
      return {
        ok: false,
        message: "This preview is read-only in the mock document centre.",
      };
    }

    const result = portal.addDocumentComment(
      selectedDocument.id,
      user.fullName,
      user.role,
      message,
    );
    setFeedbackMessage(result.message);
    return result;
  }

  function handleClearFilters() {
    setFilters(defaultFilters);
    setActiveResultTab("all");
    setSelectedResultId("");
    setViewerOpen(false);
    setViewerTab("details");
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      {feedbackMessage ? (
        <div className="rounded-[1.35rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <div className={cn("grid gap-6", viewerOpen ? "xl:grid-cols-[minmax(0,1.45fr)_430px]" : "")}>
        <div className="space-y-6">
          <SurfaceCard className="rounded-[1.7rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <SearchIcon />
                  </span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, query: event.target.value }))
                    }
                    placeholder="Search documents, clients, invoice numbers..."
                    value={filters.query}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button className="h-11 rounded-xl px-4 text-brand-700" variant="secondary">
                    <FilterIcon />
                    <span>Filters</span>
                  </Button>
                  <button
                    className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    onClick={handleClearFilters}
                    type="button"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
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
                  label="Month / period"
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
                  label="Status"
                  onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                  options={statusOptions}
                  value={filters.status}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
                <ResultFilterSelect
                  label="Uploaded by"
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, uploadedBy: value }))
                  }
                  options={uploadedByOptions}
                  value={filters.uploadedBy}
                />
                <ResultFilterSelect
                  label="Reviewed by"
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
                <ResultFilterSelect
                  label="Year"
                  onChange={(value) => setFilters((current) => ({ ...current, year: value }))}
                  options={yearOptions}
                  value={filters.year}
                />
                <button
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
                  onClick={() =>
                    setFeedbackMessage("Extended filter presets can be added here later.")
                  }
                  type="button"
                >
                  <span>More filters</span>
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden rounded-[1.7rem] border border-slate-200/90 bg-white p-0 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 px-5 pt-4">
              <div className="flex flex-wrap items-center gap-6">
                {[
                  { id: "all" as const, label: "All results", count: tabCounts.all },
                  { id: "documents" as const, label: "Documents", count: tabCounts.documents },
                  { id: "invoices" as const, label: "Invoices", count: tabCounts.invoices },
                  { id: "requests" as const, label: "Requests", count: tabCounts.requests },
                  { id: "compliance" as const, label: "Compliance", count: tabCounts.compliance },
                ].map((tab) => (
                  <button
                    className={cn(
                      "relative flex items-center gap-2 pb-4 text-sm font-medium transition",
                      activeResultTab === tab.id
                        ? "text-brand-700"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                    key={tab.id}
                    onClick={() => setActiveResultTab(tab.id)}
                    type="button"
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.72rem] font-semibold",
                        activeResultTab === tab.id
                          ? "bg-brand-50 text-brand-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {tab.count}
                    </span>
                    {activeResultTab === tab.id ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {visibleResults.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  description="Try broadening the search terms or removing a few filters."
                  title="No results match this view"
                />
              </div>
            ) : (
              <>
                <div className="hidden border-b border-slate-100 px-5 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid lg:grid-cols-[1.85fr_1fr_0.88fr_0.72fr_3.5rem] lg:gap-4">
                  <div>Document</div>
                  <div>Client</div>
                  <div>Uploaded</div>
                  <div>Status</div>
                  <div aria-hidden="true" />
                </div>

                <div className="divide-y divide-slate-100">
                  {pagedResults.map((result) => {
                    const fileLabel = inferFileLabel(result, selectedResultId === result.id ? selectedDocument : null);
                    const selected = viewerOpen && result.id === selectedResultId;

                    return (
                      <div
                        className={cn(
                          "border-l-[3px] px-5 py-4 transition lg:grid lg:grid-cols-[1.85fr_1fr_0.88fr_0.72fr_3.5rem] lg:items-center lg:gap-4",
                          selected
                            ? "border-l-brand-500 bg-brand-50/35"
                            : "border-l-transparent hover:bg-slate-50/80",
                        )}
                        key={result.id}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] border text-[0.72rem] font-semibold",
                              fileLabelClasses(fileLabel),
                            )}
                          >
                            {fileLabel}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[0.95rem] font-semibold text-slate-950">
                                {displayResultTitle(result)}
                              </p>
                              {isNewResult(result.date) ? (
                                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.68rem] font-semibold text-brand-700">
                                  New
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[0.84rem] text-slate-500">
                              {resultFamilyLabel(result)} • {result.monthLabel}
                            </p>
                            {result.amountLabel ? (
                              <p className="mt-1 text-[0.84rem] text-slate-400">
                                {result.amountLabel}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 lg:mt-0">
                          <p className="text-[0.9rem] font-semibold text-slate-950">
                            {result.clientName}
                          </p>
                        </div>

                        <div className="mt-3 lg:mt-0">
                          <p className="text-[0.9rem] font-semibold text-slate-950">
                            {formatDateLabel(result.date)}
                          </p>
                          <p className="mt-1 text-[0.84rem] text-slate-500">
                            {new Intl.DateTimeFormat("en-ZA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(result.date))}{" "}
                            by {result.uploadedBy ?? "Client"}
                          </p>
                        </div>

                        <div className="mt-3 lg:mt-0">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset",
                              toneToAccentClass(statusToTone(result.status)),
                            )}
                          >
                            {formatStatusLabel(result.status)}
                          </span>
                        </div>

                        <div className="relative mt-3 flex items-center lg:mt-0 lg:justify-end">
                          <button
                            aria-label="Open result actions"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            onClick={() =>
                              setOpenMenuResultId((current) =>
                                current === result.id ? "" : result.id,
                              )
                            }
                            type="button"
                          >
                            <MoreHorizontalIcon />
                          </button>

                          {openMenuResultId === result.id ? (
                            <div className="absolute right-0 top-[calc(100%+0.45rem)] z-10 min-w-[220px] rounded-[1rem] border border-slate-200 bg-white p-2 shadow-[0_20px_42px_rgba(15,23,42,0.14)]">
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleOpenResult(result)}
                                type="button"
                              >
                                Preview file
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleDownloadResult(result)}
                                type="button"
                              >
                                Download
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleOpenResultTab(result, "history")}
                                type="button"
                              >
                                View version history
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleOpenResultTab(result, "comments")}
                                type="button"
                              >
                                View comments
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleRequestReupload(result)}
                                type="button"
                              >
                                Request re-upload
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleMarkUnderReview(result)}
                                type="button"
                              >
                                Mark under review
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => handleEscalateIssue(result)}
                                type="button"
                              >
                                Escalate issue
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {(currentPage - 1) * resultsPerPage + 1} to{" "}
                    {Math.min(currentPage * resultsPerPage, visibleResults.length)} of{" "}
                    {visibleResults.length} results
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    totalPages={totalPages}
                  />
                </div>
              </>
            )}
          </SurfaceCard>
        </div>

        {viewerOpen && selectedResult && selectedDocument ? (
          <SurfaceCard className="h-fit rounded-[1.7rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] xl:sticky xl:top-4">
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
                onClick={() => downloadPreview(selectedDocument.fileName, buildPreviewText(selectedDocument))}
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

                <div className="flex items-center gap-3 text-sm text-slate-500">
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
              <div className="flex flex-wrap items-center gap-6">
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
                        Reviewed by
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {detailValue(selectedDocument.reviewedBy, "Waiting for review")}
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

                  <Button
                    className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#4338ca,#4f46e5)] hover:bg-[linear-gradient(135deg,#3730a3,#4338ca)]"
                    onClick={() =>
                      setFeedbackMessage(
                        `Open the review workspace to continue with ${displayResultTitle(selectedResult)}.`,
                      )
                    }
                  >
                    <span>Review document</span>
                    <ChevronRightIcon />
                  </Button>
                </div>
              ) : null}

              {viewerTab === "comments" ? (
                <CommentThread
                  comments={selectedDocument.comments}
                  currentAuthor={user?.fullName ?? "Accountant"}
                  currentRole="accountant"
                  helperText={
                    selectedResult.clientId === "client-apex" ||
                    selectedResult.clientId === "firm-client-1"
                      ? undefined
                      : "This preview is read-only in the mock document centre."
                  }
                  onSubmitComment={handleComment}
                />
              ) : null}

              {viewerTab === "history" ? (
                selectedDocument.auditTrail.length > 0 ? (
                  <AuditTrail entries={selectedDocument.auditTrail} />
                ) : (
                  <EmptyState
                    description="History will appear here once this record has moved through the workflow."
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
                            {resultFamilyLabel(result)} • {formatStatusLabel(result.status)}
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
        ) : null}
      </div>
    </div>
  );
}
