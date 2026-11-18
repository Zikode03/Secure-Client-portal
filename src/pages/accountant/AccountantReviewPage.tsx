import { DocumentPdfPreview } from "../../components/documents/DocumentPdfPreview";
import { RefreshCw, Search } from "lucide-react";
import "./workQueue.css";
import { InvoiceReviewPanel, type InvoiceReviewReady } from "../../components/invoice-review/InvoiceReviewPanel";
import { reviewQueueApi } from "../../services/reviewQueueApi";
// Friendly guide: this module (AccountantReviewPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetBlob, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type {
  AuditTrailEntry,
  DocumentComment,
  DocumentRecord,
  ReviewQueueItem,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatStatusLabel,
} from "../../utils/formatters";
import { hasPermission, getScopedReviewQueue } from "../../utils/permissions";

const reviewSnapshotDate = new Date();

// Shared shape notes: these types keep UI and data contracts aligned.
interface ReviewVersionEntry {
  id: string;
  isLatest: boolean;
  rejectionReason?: string;
  status: DocumentRecord["status"];
  uploadedAt: string;
  uploadedBy: string;
  versionNumber: number;
}

// Component flow: gather data first, then render a focused UI state.
function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function fileExtensionLabel(fileName: string) {
  const extension = fileName.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 4 ? extension : "DOC";
}

function queueStatusMeta(item: ReviewQueueItem) {
  return item.status === "under_review"
    ? { key: "under_review", label: "Under review", pill: "bg-brand-50 text-brand-700 ring-brand-200" }
    : { key: "awaiting_review", label: "Awaiting review", pill: "bg-slate-50 text-slate-700 ring-slate-200" };
}

function queueDueMeta(item: ReviewQueueItem) {
  return { label: "Not specified", helper: `Received ${formatDateLabel(item.submittedAt)}`, helperClass: "text-slate-500" };
}

interface BackendReviewQueueItem {
  documentId: string;
  clientId: string;
  clientName: string;
  monthlyPackId?: string | null;
  year?: number | null;
  month?: number | null;
  documentSlotId?: string | null;
  slotLabel?: string | null;
  documentName: string;
  documentCategory: string;
  documentStatus: string;
  slotStatus?: string | null;
  reviewPriority: string;
  reviewAgeDays: number;
  currentVersionNumber: number;
  uploadedAtUtc: string;
  submittedAtUtc?: string | null;
  rejectionReason?: string | null;
  assistantState?: string | null;
  assistantAttentionCount?: number;
  assistantUnverifiedCount?: number;
}

interface BackendReviewQueueComment {
  id: string;
  documentId: string;
  authorUserId: string;
  authorRole: string;
  message: string;
  createdAtUtc: string;
}

interface BackendReviewQueueDecision {
  id: string;
  documentId: string;
  decision: string;
  reviewerUserId: string;
  reviewerRole: string;
  reason?: string | null;
  internalNote?: string | null;
  decidedAtUtc: string;
}

interface BackendReviewQueueVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  name: string;
  originalFileName: string;
  storedFileName: string;
  fileType: string;
  sizeBytes: number;
  isCurrent: boolean;
  uploadedByUserId: string;
  createdAtUtc: string;
}

interface BackendReviewWorkspace {
  item: BackendReviewQueueItem;
  downloadUrl: string;
  versions: BackendReviewQueueVersion[];
  comments: BackendReviewQueueComment[];
  reviewHistory: BackendReviewQueueDecision[];
}

function monthLabelFromParts(year: number | null | undefined, month: number | null | undefined) {
  if(!year||!month)return "Non-monthly record";
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, Math.max(0, month - 1), 1)),
  );
}

function validBackendTimestamp(...values: Array<string | null | undefined>) {
  const value = values.find((candidate) => candidate && Number.isFinite(Date.parse(candidate)));
  return value ? new Date(value).toISOString() : reviewSnapshotDate.toISOString();
}

function mapBackendStatus(status: string): DocumentRecord["status"] {
  switch (status.trim().toLowerCase()) {
    case "under_review":
      return "under_review";
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "filed":
      return "filed";
    default:
      return "uploaded";
  }
}

function mapBackendComment(comment: BackendReviewQueueComment): DocumentComment {
  const role = comment.authorRole?.trim().toLowerCase() === "client" ? "client" : "accountant";
  return {
    id: comment.id,
    author: role === "client" ? "Client user" : "Accountant reviewer",
    role,
    message: comment.message,
    createdAt: comment.createdAtUtc,
  };
}

function mapBackendQueueItem(
  item: BackendReviewQueueItem,
  currentUserName?: string,
): ReviewQueueItem {
  return {
    id: item.documentId,
    clientName: item.clientName,
    documentType: item.slotLabel || item.documentCategory,
    monthLabel: monthLabelFromParts(item.year, item.month),
    submittedAt: validBackendTimestamp(item.submittedAtUtc, item.uploadedAtUtc),
    status: mapBackendStatus(item.slotStatus || item.documentStatus),
    assignedAccountant: currentUserName || "Assigned accountant",
  };
}

export function mapBackendQueueRecord(item: BackendReviewQueueItem): DocumentRecord {
  const uploadedAt = validBackendTimestamp(item.submittedAtUtc, item.uploadedAtUtc);
  const documentType = item.slotLabel || item.documentCategory || "Document";
  const fileName = item.documentName || documentType;

  return {
    id: item.documentId,
    clientId: item.clientId,
    clientName: item.clientName,
    documentType,
    fileName,
    monthLabel: monthLabelFromParts(item.year, item.month),
    description: `${documentType} is waiting in the live review queue.`,
    status: mapBackendStatus(item.documentStatus),
    uploadedBy: "Portal user",
    versionNumber: item.currentVersionNumber,
    monthlyPackId: item.monthlyPackId,
    documentSlotId: item.documentSlotId ?? undefined,
    uploadedAt,
    sizeLabel: "Available when opened",
    keywordTags: [item.documentCategory, item.slotLabel, item.documentName].filter(
      (value): value is string => Boolean(value),
    ),
    rejectionReason: item.rejectionReason ?? undefined,
    comments: [],
    auditTrail: [
      {
        id: `queue-${item.documentId}`,
        status: "Submitted for review",
        actor: "Portal user",
        timestamp: uploadedAt,
        note: "Loaded from the live review queue.",
      },
    ],
  };
}

function mapBackendWorkspace(
  workspace: BackendReviewWorkspace,
  fileUrl?: { url: string; mimeType: string },
): DocumentRecord {
  const latestDecision = [...workspace.reviewHistory].sort((left, right) => Date.parse(right.decidedAtUtc) - Date.parse(left.decidedAtUtc))[0];
  const auditTrail: AuditTrailEntry[] = [
    ...workspace.versions.map((version) => ({
      id: `version-${version.id}`,
      status: `Version ${version.versionNumber} uploaded`,
      actor: "Portal user",
      timestamp: version.createdAtUtc,
      note: `${version.originalFileName} was stored as version ${version.versionNumber}.`,
    })),
    ...workspace.reviewHistory.map((decision) => ({
      id: `decision-${decision.id}`,
      status: decision.decision,
      actor: decision.reviewerRole === "accountant" ? "Accountant reviewer" : "Reviewer",
      timestamp: decision.decidedAtUtc,
      note: decision.reason || decision.internalNote || `Decision recorded: ${decision.decision}.`,
    })),
  ];

  return {
    id: workspace.item.documentId,
    versionNumber: workspace.item.currentVersionNumber,
    monthlyPackId: workspace.item.monthlyPackId,
    documentSlotId: workspace.item.documentSlotId ?? undefined,
    clientId: workspace.item.clientId,
    clientName: workspace.item.clientName,
    documentType: workspace.item.slotLabel || workspace.item.documentCategory,
    fileName: workspace.item.documentName,
    monthLabel: monthLabelFromParts(workspace.item.year, workspace.item.month),
    description: `${workspace.item.documentCategory} review workspace record.`,
    status: mapBackendStatus(workspace.item.documentStatus),
    uploadedBy: "Portal user",
    uploadedAt: workspace.item.uploadedAtUtc,
    reviewedBy: latestDecision ? "Accountant reviewer" : undefined,
    reviewedAt: latestDecision?.decidedAtUtc,
    sizeLabel: `${workspace.versions.length > 0 ? workspace.versions[workspace.versions.length - 1].sizeBytes : 0} B`,
    keywordTags: [workspace.item.documentCategory, workspace.item.documentName],
    rejectionReason: workspace.item.rejectionReason ?? undefined,
    comments: workspace.comments.map(mapBackendComment),
    auditTrail,
    fileDataUrl: fileUrl?.url,
    fileMimeType:
      fileUrl?.mimeType ??
      (workspace.versions.length > 0
        ? workspace.versions[workspace.versions.length - 1].fileType
        : undefined),
  };
}

function queuePriorityMeta(priority?: string) {
  if (priority === "high") return { label: "High", pill: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (priority === "medium") return { label: "Medium", pill: "bg-amber-50 text-amber-700 ring-amber-200" };
  return { label: "Normal", pill: "bg-slate-50 text-slate-700 ring-slate-200" };
}

function awaitingDecision(item: BackendReviewQueueItem) {
  if (["accepted", "approved", "filed", "rejected", "reupload_required", "deleted", "archived"].includes(item.documentStatus.toLowerCase())) return false;
  return ["submitted", "under_review"].includes((item.slotStatus || item.documentStatus).toLowerCase());
}

function reviewReason(item: BackendReviewQueueItem | undefined) {
  if (item?.currentVersionNumber && item.currentVersionNumber > 1) return "Updated document to review";
  if ((item?.slotStatus || item?.documentStatus) === "under_review") return "Review in progress";
  return "Awaiting your review";
}

function queueTypeClasses(documentType: string) {
  const normalized = documentType.toLowerCase();

  if (normalized.includes("invoice")) {
    return "bg-rose-50 text-rose-500 ring-rose-100";
  }

  if (normalized.includes("bank")) {
    return "bg-emerald-50 text-emerald-600 ring-emerald-100";
  }

  if (normalized.includes("payroll")) {
    return "bg-sky-50 text-sky-600 ring-sky-100";
  }

  if (normalized.includes("contract")) {
    return "bg-slate-50 text-slate-500 ring-slate-200";
  }

  if (normalized.includes("tax") || normalized.includes("vat")) {
    return "bg-brand-50 text-brand-600 ring-brand-100";
  }

  if (normalized.includes("signed")) {
    return "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100";
  }

  if (
    normalized.includes("statement") ||
    normalized.includes("credit") ||
    normalized.includes("purchase") ||
    normalized.includes("delivery") ||
    normalized.includes("receipt")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-slate-50 text-slate-500 ring-slate-200";
}

function documentStatusMeta(status: DocumentRecord["status"]) {
  switch (status) {
    case "uploaded":
      return {
        description: "Submitted by the client and waiting for an accountant decision.",
        panel: "border-brand-200 bg-brand-50/50",
        value: "text-brand-700",
      };
    case "under_review":
      return {
        description: "The client can see that the document is still actively being reviewed.",
        panel: "border-amber-200 bg-amber-50/60",
        value: "text-amber-700",
      };
    case "rejected":
      return {
        description: "The file was sent back and needs a corrected version in the structured upload slot.",
        panel: "border-rose-200 bg-rose-50/60",
        value: "text-rose-700",
      };
    case "accepted":
      return {
        description: "The record has been accepted and moved forward in the workflow.",
        panel: "border-emerald-200 bg-emerald-50/60",
        value: "text-emerald-700",
      };
    default:
      return {
        description: "The record has been archived in the workflow history.",
        panel: "border-slate-200 bg-slate-50",
        value: "text-slate-700",
      };
  }
}

function documentPreviewLines(document: DocumentRecord) {
  const fallback = [
    document.documentType,
    document.fileName,
    document.clientName,
    document.monthLabel,
    document.description,
    document.supplierName ? `Supplier: ${document.supplierName}` : "",
    document.amountLabel ? `Amount: ${document.amountLabel}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (document.extractedText ?? fallback)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 18);
}

function downloadPreview(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.replace(/\.[^.]+$/, "") + "-review.txt";
  link.click();
  window.URL.revokeObjectURL(url);
}

async function downloadDocumentFile(record: DocumentRecord, backendMode: boolean) {
  if (backendMode && !record.fileDataUrl) {
    const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(record.id)}/download`);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url; link.download = record.fileName; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (record.fileDataUrl) {
    const link = window.document.createElement("a");
    link.href = record.fileDataUrl;
    link.download = record.fileName;
    link.click();
    return;
  }

  downloadPreview(
    record.fileName,
    record.extractedText ?? `${record.documentType}\n${record.fileName}\n${record.description}`,
  );
}

function QueueFileIcon({ documentType, fileName }: { documentType: string; fileName: string }) {
// Render output: this is the visual state users interact with.
  return (
    <div
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] ring-1",
        queueTypeClasses(documentType),
      )}
    >
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M8 3.75h5.25L18.25 8.75V18A2.25 2.25 0 0 1 16 20.25H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M13 3.75V8.25H17.5"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M9 12.25h6M9 15.25h4.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
      <span className="absolute -bottom-1.5 rounded-full border border-white bg-white px-1.5 py-0.5 text-sm font-medium uppercase leading-none text-slate-500 shadow-sm">
        {fileExtensionLabel(fileName)}
      </span>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 16V5m0 0-4 4m4-4 4 4M5.5 16.5v1.25A2.75 2.75 0 0 0 8.25 20.5h7.5a2.75 2.75 0 0 0 2.75-2.75V16.5"
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

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m14 7-5 5 5 5"
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

function sortAuditEntriesDescending(entries: AuditTrailEntry[]) {
  return [...entries].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}

function chunkPreviewLines(lines: string[], size: number) {
  if (!lines.length) {
    return [["No extracted preview text is available for this file yet."]];
  }

  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += size) {
    pages.push(lines.slice(index, index + size));
  }
  return pages;
}

function buildVersionHistory(
  document: DocumentRecord,
  auditTrail: AuditTrailEntry[],
): ReviewVersionEntry[] {
  const ordered = [...auditTrail].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  const uploadEvents = ordered.filter((entry) => entry.status.toLowerCase().includes("uploaded"));
  const sourceUploads =
    uploadEvents.length > 0
      ? uploadEvents
      : [
          {
            id: `${document.id}-upload-fallback`,
            status: "Uploaded",
            actor: document.uploadedBy,
            timestamp: document.uploadedAt,
            note: "Initial upload created the first file version.",
          },
        ];

  return sourceUploads
    .map((upload, index) => {
      const uploadTime = new Date(upload.timestamp).getTime();
      const nextUploadTime =
        index < sourceUploads.length - 1
          ? new Date(sourceUploads[index + 1].timestamp).getTime()
          : Number.POSITIVE_INFINITY;
      const versionEvents = ordered.filter((entry) => {
        const eventTime = new Date(entry.timestamp).getTime();
        return eventTime >= uploadTime && eventTime < nextUploadTime;
      });

      const rejectionEvent = versionEvents.find(
        (entry) =>
          entry.status.toLowerCase().includes("rejected") ||
          entry.status.toLowerCase().includes("re-upload requested"),
      );
      const acceptedEvent = versionEvents.find((entry) =>
        entry.status.toLowerCase().includes("accepted"),
      );
      const reviewEvent = versionEvents.find((entry) =>
        entry.status.toLowerCase().includes("under review"),
      );

      let status: DocumentRecord["status"] = "uploaded";
      if (index === sourceUploads.length - 1) {
        status = document.status;
      } else if (rejectionEvent) {
        status = "rejected";
      } else if (acceptedEvent) {
        status = "accepted";
      } else if (reviewEvent) {
        status = "under_review";
      }

      return {
        id: `${document.id}-version-${index + 1}`,
        isLatest: index === sourceUploads.length - 1,
        rejectionReason:
          status === "rejected"
            ? index === sourceUploads.length - 1
              ? document.rejectionReason ?? rejectionEvent?.note
              : rejectionEvent?.note
            : undefined,
        status,
        uploadedAt: upload.timestamp,
        uploadedBy: upload.actor,
        versionNumber: index + 1,
      };
    })
    .reverse();
}

function PreviewCanvas({
  document,
  previewPage,
  previewPages,
  previewZoom,
}: {
  document: DocumentRecord;
  previewPage: number;
  previewPages: string[][];
  previewZoom: number;
}) {
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

  if (hasRealFile) {
    return <div className="review-file-canvas">
      {isImage ? <img alt={document.fileName} src={dataUrl} />
        : isPdf ? <iframe src={dataUrl} title={document.fileName} />
        : <p className="review-preview-unavailable">Preview is unavailable for this file format. Download the original to inspect this file format.</p>}
    </div>;
  }

  return (
    <div className="flex min-h-[32rem] items-start justify-center overflow-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6">
      <div
        className="w-full max-w-[620px] rounded-[1.35rem] border border-slate-200 bg-white p-6 shadow-[0_24px_48px_rgba(15,23,42,0.08)]"
        style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "top center" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <span
              className={cn(
                "inline-flex rounded-lg px-2.5 py-1 text-sm font-medium uppercase ring-1 ring-inset",
                queueTypeClasses(document.documentType),
              )}
            >
              {fileExtensionLabel(document.fileName)}
            </span>
            <div>
              <h3 className="text-base font-medium text-slate-950">{document.fileName}</h3>
              <p className="mt-1 text-base text-slate-500">
                {document.clientName} / {document.monthLabel}
              </p>
            </div>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400">
              File type
            </p>
            <p className="mt-2 text-base text-slate-700">{document.documentType}</p>
          </div>
        </div>
        {hasRealFile ? (
          <div className="mt-6">
            {isImage ? (
              <img
                alt={document.fileName}
                className="max-h-[70vh] w-full rounded-lg border border-slate-200 object-contain"
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
                This file type cannot be embedded here. Download the original to view it.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3 font-mono text-base leading-7 text-slate-600">
            {previewPages[previewPage - 1].map((line, index) => (
              <div className="flex gap-4" key={`${document.id}-preview-${previewPage}-${index}`}>
                <span className="w-7 shrink-0 text-right text-slate-300">
                  {(previewPage - 1) * previewPages[previewPage - 1].length + index + 1}
                </span>
                <p className="min-w-0 flex-1">{line}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountantReviewPage() {
  const { user } = useAuth();
  const canReviewDocuments = hasPermission(user, "review:documents");
  const portal = usePortal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedDocumentId = searchParams.get("documentId");
  const backendMode = hasApiBaseUrl();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const workspaceCache = useRef<Record<string, BackendReviewWorkspace>>({});
  const fileUrls = useRef(new Map<string, string>());
  useEffect(() => () => { for (const url of fileUrls.current.values()) URL.revokeObjectURL(url); fileUrls.current.clear(); }, []);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueRevision, setQueueRevision] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [assistantSummaries, setAssistantSummaries] = useState<Record<string, BackendReviewQueueItem>>({});
  const [liveQueueItems, setLiveQueueItems] = useState<ReviewQueueItem[] | null>(null);
  const [liveQueueRecordsByDocumentId, setLiveQueueRecordsByDocumentId] = useState<
    Record<string, DocumentRecord>
  >({});
  const [liveWorkspaceByDocumentId, setLiveWorkspaceByDocumentId] = useState<Record<string, BackendReviewWorkspace>>({});
  const [liveFileUrlsByDocumentId, setLiveFileUrlsByDocumentId] = useState<
    Record<string, { url: string; mimeType: string }>
  >({});
  const [workspaceCommentDraft, setWorkspaceCommentDraft] = useState("");
  const queue = useMemo(
    () =>
      backendMode ? liveQueueItems ?? [] : getScopedReviewQueue(user, portal.getReviewQueue(), portal.adminClients),
    [backendMode, liveQueueItems, portal, user],
  );

// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedRecordId, setSelectedRecordId] = useState(queue[0]?.id ?? "");
  const [viewerOpen, setViewerOpen] = useState(false);
  const openedReviewLink = useRef("");
  const [pdfPreviewReady, setPdfPreviewReady] = useState<{ id: string; ready: boolean } | null>(null);
  const onPdfPreviewReady = useCallback((id: string, ready: boolean) => setPdfPreviewReady({ id, ready }), []);
  const [reviewTab, setReviewTab] = useState<"decision" | "comments" | "details">("decision");
  const [decisionForm, setDecisionForm] = useState<"rejected" | "request_reupload" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);
  const decisionPending = useRef(false);
  useEffect(() => {
    setDecisionForm(null); setDecisionReason(""); setDecisionError(""); setReviewTab("decision");
  }, [selectedRecordId, viewerOpen]);
  const [invoiceReviewReady, setInvoiceReviewReady] = useState<InvoiceReviewReady | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [workspaceAuditEntries, setWorkspaceAuditEntries] = useState<
    Record<string, AuditTrailEntry[]>
  >({});

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isActive = true;

    async function loadQueue() {
      setQueueLoading(true);
      setReviewMessage("");
      try {
        const items = await apiGetJson("/api/review-queue");
        if (!isActive) {
          return;
        }

        if (!Array.isArray(items) || items.some(item => !item.documentId || !item.documentStatus || !Number.isFinite(Date.parse(item.submittedAtUtc || item.uploadedAtUtc)))) throw new Error("The review queue response is incomplete. Reload the queue or check the API error log.");
        setAssistantSummaries(Object.fromEntries(items.map(item => [item.documentId, item])));
        setLiveQueueItems(items.filter(awaitingDecision).map((item) => mapBackendQueueItem(item, user?.fullName)));
        setLiveQueueRecordsByDocumentId(
          Object.fromEntries(items.map((item) => [item.documentId, mapBackendQueueRecord(item)])),
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setReviewMessage(
          error instanceof Error ? error.message : "Could not load the live review queue.",
        );
      } finally { if (isActive) setQueueLoading(false); }
    }

    void loadQueue();

    return () => {
      isActive = false;
    };
  }, [backendMode, user?.fullName, queueRevision]);

  const queueRows = useMemo(
    () =>
      queue.map((item) => ({
        item,
        record:
          backendMode
            ? liveWorkspaceByDocumentId[item.id]
              ? mapBackendWorkspace(
                  liveWorkspaceByDocumentId[item.id],
                  liveFileUrlsByDocumentId[item.id],
                )
              : liveQueueRecordsByDocumentId[item.id]
            : portal.getReviewRecord(item.id),
        statusMeta: queueStatusMeta(item),
        dueMeta: queueDueMeta(item),
      })),
    [
      backendMode,
      liveFileUrlsByDocumentId,
      liveQueueRecordsByDocumentId,
      liveWorkspaceByDocumentId,
      portal,
      queue,
    ],
  );

  const clientOptions = useMemo(
    () => Array.from(new Set(queueRows.map((row) => row.item.clientName))).sort(),
    [queueRows],
  );
  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return queueRows.filter(row => (selectedClient === "all" || row.item.clientName === selectedClient) &&
      (!search || [row.item.clientName, row.item.documentType, row.item.monthLabel, row.record.fileName].join(" ").toLowerCase().includes(search)));
  }, [queueRows, selectedClient, searchQuery]);

  const orderedRows = useMemo(() => [...filteredRows].sort((left, right) => {
    const rank = (id: string) => ({ high: 3, medium: 2, normal: 1 }[assistantSummaries[id]?.reviewPriority ?? "normal"] ?? 1);
    return rank(right.item.id) - rank(left.item.id) || Date.parse(left.item.submittedAt) - Date.parse(right.item.submittedAt);
  }), [filteredRows, assistantSummaries]);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedClient !== "all";
  const emptyStateCopy = { title: "No matching documents", description: "Try another client or search term, or clear the filters." };

  const activeRow = useMemo(
    () => queueRows.find((row) => row.item.id === selectedRecordId) ?? null,
    [queueRows, selectedRecordId],
  );
  const activeDocument = activeRow?.record ?? null;
  const invoiceDocument = Boolean(activeDocument && (activeDocument.keywordTags[0] || activeDocument.documentType).toLowerCase().includes("invoice"));
  const inlinePdf = Boolean(backendMode && activeDocument && !invoiceDocument && /\.pdf$/i.test(activeDocument.fileName));
  const pdfPreviewBlocked = inlinePdf && (pdfPreviewReady?.id !== activeDocument?.id || !pdfPreviewReady?.ready);

  const activePriority = activeRow ? queuePriorityMeta(assistantSummaries[activeRow.item.id]?.reviewPriority) : null;
  const selectedRowIndex = useMemo(
    () => orderedRows.findIndex((row) => row.item.id === selectedRecordId),
    [orderedRows, selectedRecordId],
  );
  const previousRecordId =
    selectedRowIndex > 0 ? orderedRows[selectedRowIndex - 1]?.item.id ?? "" : "";
  const nextRecordId =
    selectedRowIndex >= 0 && selectedRowIndex < orderedRows.length - 1
      ? orderedRows[selectedRowIndex + 1]?.item.id ?? ""
      : "";

  const combinedAuditTrail = useMemo(() => {
    if (!activeDocument) {
      return [];
    }

    return sortAuditEntriesDescending([
      ...(workspaceAuditEntries[activeDocument.id] ?? []),
      ...activeDocument.auditTrail,
    ]);
  }, [activeDocument, workspaceAuditEntries]);

  const previewPages = useMemo(() => {
    if (!activeDocument) {
      return [["No preview available."]];
    }

    return chunkPreviewLines(documentPreviewLines(activeDocument), 8);
  }, [activeDocument]);

  const orderedComments = useMemo(
    () =>
      [...(activeDocument?.comments ?? [])].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    [activeDocument?.comments],
  );

  const versionHistory = useMemo(
    () => (activeDocument ? buildVersionHistory(activeDocument, combinedAuditTrail) : []),
    [activeDocument, combinedAuditTrail],
  );
// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedRecordId("");
      setViewerOpen(false);
      return;
    }

    if (!filteredRows.some((row) => row.item.id === selectedRecordId)) {
      setSelectedRecordId(filteredRows[0].item.id);
    }
  }, [filteredRows, selectedRecordId]);

  useEffect(() => {
    if (requestedDocumentId && openedReviewLink.current !== requestedDocumentId && filteredRows.some(row => row.item.id === requestedDocumentId)) {
      openedReviewLink.current = requestedDocumentId;
      setSelectedRecordId(requestedDocumentId);
      setViewerOpen(true);
    }
  }, [requestedDocumentId, filteredRows]);

  useEffect(() => {
    if (!activeDocument) {
      return;
    }

    setPreviewPage(1);
    setPreviewZoom(100);
  }, [activeDocument?.id, activeDocument]);

  useEffect(() => {
    if (!backendMode || !viewerOpen || !selectedRecordId || workspaceCache.current[selectedRecordId]) {
      return;
    }

    let isActive = true;

    async function loadWorkspace() {
      try {
        const workspace = await apiGetJson(
          `/api/review-queue/${encodeURIComponent(selectedRecordId)}`,
        );
        if (!isActive) {
          return;
        }
        if (!workspace?.item || !Array.isArray(workspace.versions) || !Array.isArray(workspace.comments) || !Array.isArray(workspace.reviewHistory))
          throw new Error("The review workspace response is incomplete. Refresh the queue and try again.");

        workspaceCache.current[selectedRecordId] = workspace;
        setLiveWorkspaceByDocumentId((current) => ({
          ...current,
          [selectedRecordId]: workspace,
        }));

        if (/\.pdf$/i.test(workspace.item.documentName) && !`${workspace.item.documentCategory} ${workspace.item.slotLabel}`.toLowerCase().includes("invoice")) return;

        try {
          const { blob, contentType } = await apiGetBlob(
            `/api/documents/${encodeURIComponent(selectedRecordId)}/download`,
          );
          if (!isActive) {
            return;
          }

          const url = URL.createObjectURL(blob);
          const previous = fileUrls.current.get(selectedRecordId);
          if (previous) URL.revokeObjectURL(previous);
          fileUrls.current.set(selectedRecordId, url);
          setLiveFileUrlsByDocumentId((current) => ({
            ...current,
            [selectedRecordId]: { url, mimeType: contentType },
          }));
        } catch {
          // Keep preview shell available when file download cannot be embedded.
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setReviewMessage(
          error instanceof Error ? error.message : "Could not load the review workspace.",
        );
      }
    }

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [backendMode, selectedRecordId, viewerOpen, queueRevision]);

  useEffect(() => {
    if (!viewerOpen || !activeDocument || !workspaceRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeDocument, selectedRecordId, viewerOpen]);

  function appendWorkspaceAudit(recordId: string, entry: AuditTrailEntry) {
    setWorkspaceAuditEntries((current) => ({
      ...current,
      [recordId]: [entry, ...(current[recordId] ?? [])],
    }));
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedClient("all");
  }

  function openInClientWorkspace(recordId: string) {
    const row = queueRows.find((item) => item.item.id === recordId);
    if (!row) {
      return;
    }
    const targetClientId = row.record?.clientId;
    if (!targetClientId) {
      setReviewMessage("Could not resolve client workspace for this record.");
      return;
    }
    const documentType = row.item.documentType.trim().toLowerCase();
    const tab =
      documentType === "bank statement"
        ? "bank_statement"
        : documentType === "invoices"
          ? "invoices"
          : documentType === "signed documents"
            ? "signed_documents"
            : documentType === "compliance record"
              ? "compliance_record"
              : "packs";
    navigate(
      `/firm/clients/${targetClientId}?tab=${tab}&documentId=${encodeURIComponent(row.record.id)}`,
    );
  }

  function openViewer(recordId: string) {
    if (viewerOpen && selectedRecordId === recordId) {
      workspaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    const viewedAt = new Date().toISOString();
    setSelectedRecordId(recordId);
    setViewerOpen(true);

    appendWorkspaceAudit(recordId, {
      id: `${recordId}-viewed-${viewedAt}`,
      status: "Viewed in review queue",
      actor: user?.fullName ?? "Firm reviewer",
      timestamp: viewedAt,
      note: "Opened the document review workspace.",
    });
  }

  async function refreshBackendWorkspace(documentId: string) {
    if (!backendMode) {
      return;
    }

    const [queueItems, workspace] = await Promise.all([
      apiGetJson("/api/review-queue"),
      apiGetJson(`/api/review-queue/${encodeURIComponent(documentId)}`),
    ]);

    if (!queueItems.filter(awaitingDecision).some(item => item.documentId === documentId)) {
      setViewerOpen(false);
      setInvoiceReviewReady(null);
    }
    setAssistantSummaries(Object.fromEntries(queueItems.map(item => [item.documentId, item])));
    setLiveQueueItems(queueItems.filter(awaitingDecision).map((item) => mapBackendQueueItem(item, user?.fullName)));
    setLiveQueueRecordsByDocumentId(
      Object.fromEntries(
        queueItems.map((item) => [item.documentId, mapBackendQueueRecord(item)]),
      ),
    );
    setLiveWorkspaceByDocumentId((current) => ({
      ...current,
      [documentId]: workspace,
    }));
  }

  function handleWorkspaceActionSuccess(message: string) {
    setReviewMessage(message);
    setWorkspaceCommentDraft("");
  }

  async function approveActiveDocument() {
    if (!canReviewDocuments) { setReviewMessage("Your account has read-only oversight. Accounting review permission is required for this action."); return; }
    if (!backendMode || !activeDocument) return;
    if (pdfPreviewBlocked) { setReviewMessage("View the document successfully before approving it."); return; }

    try {
      await reviewQueueApi.review(activeDocument.id, {
        decision: "accepted",
        reason: null,
        internalNote: null,
        invoiceReview: invoiceDocument && invoiceReviewReady?.documentId === activeDocument.id
          ? { expectedVersionNumber: invoiceReviewReady.versionNumber, expectedRevision: invoiceReviewReady.revision }
          : undefined,
      });
      await refreshBackendWorkspace(activeDocument.id);
      handleWorkspaceActionSuccess("Document approved and queue refreshed.");
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Approval failed.");
    }
  }

  function startDecision(decision: "rejected" | "request_reupload") {
    setDecisionForm(decision); setDecisionReason(""); setDecisionError("");
  }

  async function submitDecision() {
    if (!canReviewDocuments || !backendMode || !activeDocument || !decisionForm || decisionPending.current) return;
    if (!decisionReason.trim()) { setDecisionError("Enter a reason so the client knows what to correct."); return; }
    decisionPending.current = true; setDecisionSaving(true); setDecisionError("");
    try {
      await reviewQueueApi.review(activeDocument.id, {
        decision: decisionForm,
        reason: decisionReason.trim(),
        internalNote: null,
        invoiceReview: invoiceDocument ? { expectedVersionNumber: activeDocument.versionNumber ?? 1, expectedRevision: invoiceReviewReady?.revision ?? 0 } : undefined,
      });
      await refreshBackendWorkspace(activeDocument.id);
      setDecisionForm(null); setDecisionReason("");
      handleWorkspaceActionSuccess(decisionForm === "rejected" ? "Document rejected and queue refreshed." : "Re-upload request sent and queue refreshed.");
    } catch (error) {
      setDecisionError(error instanceof ApiError ? error.message : "Could not save your decision. Your reason has been kept; please try again.");
    } finally { decisionPending.current = false; setDecisionSaving(false); }
  }

  async function addWorkspaceComment() {
    if (!backendMode || !activeDocument) {
      return;
    }

    const message = workspaceCommentDraft.trim();
    if (!message) {
      setReviewMessage("Write a comment before sending it.");
      return;
    }

    try {
      await reviewQueueApi.comment(
        activeDocument.id,
        { message },
      );
      await refreshBackendWorkspace(activeDocument.id);
      handleWorkspaceActionSuccess("Comment added to the review workspace.");
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Comment failed.");
    }
  }

  function closeViewer() {
    if (decisionPending.current) return;
    setViewerOpen(false);
  }

  function openPreviousRecord() {
    if (!previousRecordId) {
      return;
    }
    openViewer(previousRecordId);
  }

  function openNextRecord() {
    if (!nextRecordId) {
      return;
    }
    openViewer(nextRecordId);
  }

  function renderSelectField(
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { label: string; value: string }[],
    icon?: ReactNode,
  ) {
    return (
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="relative">
          {icon ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          ) : null}
          <select
            className={cn(
              "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
              icon ? "pl-10 pr-10" : "px-3 pr-10",
            )}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
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


  useEffect(() => {
    if (!viewerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    workspaceRef.current?.querySelector<HTMLElement>('[role="dialog"] button')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;
    const dialog = workspaceRef.current?.querySelector<HTMLElement>('[role="dialog"]');

    function handleViewerShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;

      if (event.key === "Tab" && dialog) {
        const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), iframe, [tabindex="0"]')).filter(control => control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }

      if (isTextInput) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        openNextRecord();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        openPreviousRecord();
        return;
      }

    }

    window.addEventListener("keydown", handleViewerShortcuts);
    return () => window.removeEventListener("keydown", handleViewerShortcuts);
  }, [viewerOpen, previousRecordId, nextRecordId]);

  return (
    <div className="work-queue flex min-h-0 w-full flex-1 flex-col gap-5">
      <header className="portal-page-header work-queue-heading">
        <div><h1 className="workspace-duplicate-title ">Work Queue</h1><p>{canReviewDocuments ? "Documents waiting for an accounting decision." : "Monitor submitted documents and open their review history."}</p></div>
        <div className="work-queue-heading-actions">
          <Button variant="secondary" disabled={queueLoading} onClick={() => { workspaceCache.current = {}; setLiveWorkspaceByDocumentId({}); setQueueRevision(value => value + 1); }}><RefreshCw size={16} aria-hidden="true" />Refresh queue</Button>
          <Button disabled={queueLoading || !orderedRows.length} onClick={() => openViewer(orderedRows[0].item.id)}>{canReviewDocuments ? "Review next" : "View next"}</Button>
        </div>
      </header>

      {reviewMessage ? (
        <div role="status" className="rounded-[1.05rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {reviewMessage}
        </div>
      ) : null}

      {queueRows.length === 0 && !queueLoading ? (
        <section className="space-y-5 border-y border-slate-200 bg-white px-5 py-10">
          <EmptyState
            description={backendMode && liveQueueItems === null ? "The queue could not be loaded. Refresh to try again." :
              user?.role === "admin"
                ? "No documents are waiting for a decision. Completed records remain in Documents and Filing."
                : "No documents are waiting for your decision. Completed records remain in Documents and Filing."
            }
            title={backendMode && liveQueueItems === null ? "Review queue unavailable" : "No documents awaiting review"}
          />

        </section>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-6">
          <section className="work-queue-surface">
            <div className="work-queue-toolbar">
              <label className="work-queue-search"><span>Search documents</span><div><Search size={16} aria-hidden="true" /><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search client or document" /></div></label>
              {renderSelectField("Client", selectedClient, setSelectedClient, [{ label: "All clients", value: "all" }, ...clientOptions.map(client => ({ label: client, value: client }))])}
              <p className="work-queue-order-note">Priority first, oldest waiting first</p>
            </div>
            <div className="work-queue-results"><p aria-live="polite">{orderedRows.length} of {queueRows.length} {queueRows.length === 1 ? "document" : "documents"}</p>{hasActiveFilters ? <button type="button" onClick={clearFilters}>Clear filters</button> : null}</div>
            <div className="work-queue-column-headings" aria-hidden="true"><div>Client</div><div>Document</div><div>Month</div><div>Why it needs review</div><div>Action</div></div>

            {queueLoading && !queueRows.length ? <p className="px-5 py-8 text-sm text-slate-500" role="status">Loading review queue...</p> : orderedRows.length > 0 ? (
              <div className="work-queue-list" role="list" aria-label="Documents awaiting review">
                {orderedRows.map((row) => {
                  const selected = viewerOpen && row.item.id === selectedRecordId;
                  const source = assistantSummaries[row.item.id];

                  return (
                    <div
                      className={cn(
                        "work-queue-row", selected && "is-selected",
                      )}
                      key={row.item.id}
                      role="listitem"
                    >
                      <div className="work-queue-client"><p>{row.item.clientName}</p></div>
                      <div className="work-queue-document">
                        <QueueFileIcon
                          documentType={row.item.documentType}
                          fileName={row.record.fileName}
                        />
                        <div className="min-w-0">
                          <p className="text-base font-medium text-slate-950">
                            {row.record.fileName}
                          </p>
                          <p className="mt-1 text-base text-slate-500">
                            {row.item.documentType}
                          </p>
                        </div>
                      </div>

                      <div className="work-queue-received">
                        <span className="work-queue-mobile-label">Month</span>
                        <p className="text-base text-slate-950">
                          {row.item.monthLabel}
                        </p>
                      </div>

                      <div className="work-queue-reason"><p>{reviewReason(source)}</p><span>{source && source.reviewAgeDays > 0 ? `Waiting ${source.reviewAgeDays} ${source.reviewAgeDays === 1 ? "day" : "days"}` : `Received ${formatDateLabel(row.item.submittedAt)}`}</span></div>

                      <div
                        className="work-queue-actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button size="sm" variant="secondary" aria-label={`${canReviewDocuments ? "Review" : "View"} ${row.record.fileName} for ${row.item.clientName}`} onClick={() => openViewer(row.item.id)}>{canReviewDocuments ? "Review" : "View"}</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-10">
                <EmptyState
                  description={emptyStateCopy.description}
                  title={emptyStateCopy.title}
                />

              </div>
            )}
          </section>

          {viewerOpen && activeDocument && activeRow ? (
            <div
              className="review-overlay"
              onClick={closeViewer}
              ref={workspaceRef}
            >
              <div className="review-dialog" role="dialog" aria-modal="true" aria-label="Document review" onClick={(event) => event.stopPropagation()}>
              <SurfaceCard className="review-shell">
              <div className="review-topbar">
                <button
                  className="inline-flex items-center gap-2 text-base text-slate-600 transition hover:text-slate-900"
                  onClick={closeViewer}
                  type="button"
                >
                  <ChevronLeftIcon />
                  <span>Back to queue</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-9 rounded-lg px-3"
                    onClick={() => openInClientWorkspace(activeRow.item.id)}
                    size="sm"
                  >
                    Client history
                  </Button>
                  <button
                    aria-label="Close review workspace"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    onClick={closeViewer}
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>

              <div className="review-layout">
                <div className="review-document-pane">
                  <div className="review-document-content">
                    <header className="review-file-summary">
                      <div className="review-file-heading"><h2 className="review-file-name">{activeDocument.documentType}</h2><span className="review-status">{activeRow.statusMeta.label}</span></div>
                      <p className="review-file-context">{activeDocument.clientName} / {activeDocument.monthLabel}</p>
                      <div className="review-file-original"><span>{activeDocument.fileName}</span><Button size="sm" variant="ghost" onClick={() => void downloadDocumentFile(activeDocument, backendMode).catch(() => setReviewMessage("Could not download the original document. Please try again."))}><DownloadIcon />Download</Button></div>
                    </header>

                    <section className="review-preview">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="text-base font-medium text-slate-950">Document preview</h3>
                      </div>
                      {!activeDocument.fileDataUrl && !inlinePdf ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={previewPage === 1}
                              onClick={() => setPreviewPage((current) => Math.max(1, current - 1))}
                              type="button"
                            >
                              <ChevronLeftIcon />
                            </button>
                            <span className="min-w-[86px] text-center text-base text-slate-700">
                              Page {previewPage} / {previewPages.length}
                            </span>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={previewPage === previewPages.length}
                              onClick={() =>
                                setPreviewPage((current) =>
                                  Math.min(previewPages.length, current + 1),
                                )
                              }
                              type="button"
                            >
                              <ChevronRightIcon />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={previewZoom <= 80}
                              onClick={() =>
                                setPreviewZoom((current) => Math.max(80, current - 10))
                              }
                              type="button"
                            >
                              <ZoomOutIcon />
                            </button>
                            <span className="min-w-[62px] text-center text-base text-slate-700">
                              {previewZoom}%
                            </span>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={previewZoom >= 140}
                              onClick={() =>
                                setPreviewZoom((current) => Math.min(140, current + 10))
                              }
                              type="button"
                            >
                              <ZoomInIcon />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {inlinePdf ? <DocumentPdfPreview key={activeDocument.id} documentId={activeDocument.id} fileName={activeDocument.fileName} onReady={onPdfPreviewReady} /> : backendMode && invoiceDocument && canReviewDocuments ? <InvoiceReviewPanel
                        key={activeDocument.id}
                        documentId={activeDocument.id}
                        versionNumber={activeDocument.versionNumber ?? 1}
                        fileName={activeDocument.fileName}
                        fileUrl={activeDocument.fileDataUrl}
                        mimeType={activeDocument.fileMimeType}
                        onReady={setInvoiceReviewReady}
                      /> : <PreviewCanvas
                        document={activeDocument}
                        previewPage={previewPage}
                        previewPages={previewPages}
                        previewZoom={previewZoom}
                      />}
                    </section>

                  </div>
                </div>

                <aside className="review-sidebar" aria-label="Review actions and discussion">
                  <div className="review-tabs" role="tablist" aria-label="Review panels">{([['decision', 'Decision'], ['comments', 'Comments'], ['details', 'Details']] as const).map(([id, title]) => <button key={id} id={`review-tab-${id}`} role="tab" type="button" aria-selected={reviewTab === id} aria-controls={`review-panel-${id}`} onClick={() => setReviewTab(id)}>{title}</button>)}</div>
                  <div className="review-sidebar-content">
                  <section className="review-decision" role="tabpanel" id="review-panel-decision" aria-labelledby="review-tab-decision" hidden={reviewTab !== "decision"}>
                    <h3>Review decision</h3>
                    <p className="review-decision-hint">Review the original before approving.</p>
                    {reviewMessage ? <p className="review-action-message" role="status">{reviewMessage}</p> : null}
                    {activeDocument.rejectionReason ? <div className="review-return-reason"><strong>Previous return reason</strong><p>{activeDocument.rejectionReason}</p></div> : null}

                    <div className="mt-4 space-y-2">
                      {backendMode ? (
                        <div className="grid gap-2">
                          {!canReviewDocuments ? <p className="text-xs text-slate-600">Read-only oversight. An authorised accountant must review this document.</p> : null}
                          {pdfPreviewBlocked ? <p className="text-xs text-slate-500">Approval is available once the document preview loads.</p> : null}
                          <Button
                            className="h-10 rounded-xl px-3"
                            onClick={() => void approveActiveDocument()}
                            disabled={!canReviewDocuments || decisionSaving || Boolean(decisionForm) || pdfPreviewBlocked || (invoiceDocument && (invoiceReviewReady?.documentId !== activeDocument.id || !invoiceReviewReady.ready))}
                            size="sm"
                          >
                            Approve
                          </Button>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              className="h-10 rounded-xl px-3 text-rose-700"
                              disabled={!canReviewDocuments || decisionSaving}
                              onClick={() => startDecision("rejected")}
                              size="sm"
                              variant="secondary"
                            >
                              Reject
                            </Button>
                            <Button
                              className="h-10 rounded-xl px-3 text-amber-700"
                              disabled={!canReviewDocuments || decisionSaving}
                              onClick={() => startDecision("request_reupload")}
                              size="sm"
                              variant="secondary"
                            >
                              Request re-upload
                            </Button>
                          </div>
                          {decisionForm ? <form className="review-decision-form" noValidate onSubmit={event => { event.preventDefault(); void submitDecision(); }}>
                            <h4>{decisionForm === "rejected" ? "Reject document" : "Request a corrected upload"}</h4>
                            <p>This reason will be shared with the client.</p>
                            <label htmlFor="review-decision-reason">Reason for the client</label>
                            <textarea id="review-decision-reason" autoFocus rows={4} maxLength={2000} value={decisionReason} disabled={decisionSaving} aria-invalid={Boolean(decisionError)} aria-describedby={decisionError ? "review-decision-error" : undefined} onChange={event => { setDecisionReason(event.target.value); setDecisionError(""); }} />
                            {decisionError ? <p id="review-decision-error" role="alert">{decisionError}</p> : null}
                            <div><Button type="button" size="sm" variant="ghost" disabled={decisionSaving} onClick={() => { setDecisionForm(null); setDecisionReason(""); setDecisionError(""); }}>Cancel</Button>
                            <Button type="submit" size="sm" disabled={decisionSaving}>{decisionSaving ? "Saving..." : decisionForm === "rejected" ? "Confirm rejection" : "Send request"}</Button></div>
                          </form> : null}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="review-conversation" role="tabpanel" id="review-panel-comments" aria-labelledby="review-tab-comments" hidden={reviewTab !== "comments"}>
                    <div>
                      <h3 className="text-base font-medium text-slate-950">
                        Conversation
                      </h3>
                      <p className="mt-1 text-base text-slate-500">
                        Notes and questions about this document.
                      </p>
                    </div>

                    <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                      {orderedComments.length > 0 ? (
                        orderedComments.map((comment: DocumentComment) => (
                          <article
                            className={cn(
                              "rounded-[1.15rem] border px-4 py-4",
                              comment.role !== "client"
                                ? "ml-6 border-brand-100 bg-brand-50/50"
                                : "mr-6 border-slate-200 bg-white",
                            )}
                            key={comment.id}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white",
                                  comment.role !== "client"
                                    ? "bg-brand-700"
                                    : "bg-slate-500",
                                )}
                              >
                                {getInitials(comment.author)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-medium text-slate-950">
                                    {comment.author}
                                  </p>
                                  <span className="text-sm text-slate-400">
                                    {formatDateTimeLabel(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-3 text-base leading-7 text-slate-600">
                                  {comment.message}
                                </p>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <EmptyState
                          description="No one has commented on this record yet."
                          title="No comments yet"
                        />
                      )}
                    </div>
                    {backendMode ? (
                      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                        <textarea
                          className="min-h-[96px] w-full rounded-[1rem] border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                          onChange={(event) => setWorkspaceCommentDraft(event.target.value)}
                          placeholder="Add a comment to the live review workspace..."
                          value={workspaceCommentDraft}
                        />
                        <Button
                          className="h-10 rounded-xl px-4"
                          onClick={() => void addWorkspaceComment()}
                          size="sm"
                        >
                          Add comment
                        </Button>
                      </div>
                    ) : null}
                  </section>
                  <section className="review-details" role="tabpanel" id="review-panel-details" aria-labelledby="review-tab-details" hidden={reviewTab !== "details"}>
                    <h3>Document details</h3>
                    <dl className="review-metadata" aria-label="Document details">
                      <div><dt>Document type</dt><dd>{activeDocument.documentType}</dd></div>
                      <div><dt>Submitted</dt><dd>{formatDateTimeLabel(activeDocument.uploadedAt)}</dd></div>
                      <div><dt>Due date</dt><dd>{activeRow.dueMeta.label}</dd></div>
                      <div><dt>Priority</dt><dd>{activePriority?.label ?? "Normal"}</dd></div>
                    </dl>

                    {versionHistory.length > 1 ? (
                    <section className="border-t border-slate-200 pt-6">
                      <div>
                        <h3 className="text-base font-medium text-slate-950">
                          File version history
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Each uploaded version keeps its own outcome and timeline.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {versionHistory.map((version) => (
                          <div
                            className={cn(
                              "rounded-[1.15rem] border px-4 py-4",
                              version.isLatest
                                ? "border-brand-200 bg-brand-50/50"
                                : "border-slate-200 bg-white",
                            )}
                            key={version.id}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-medium text-slate-950">
                                    Version {version.versionNumber}
                                  </p>
                                  {version.isLatest ? (
                                    <span className="rounded-full bg-white px-2 py-0.5 text-sm font-medium text-brand-700 ring-1 ring-brand-200">
                                      Latest
                                    </span>
                                  ) : null}

                                </div>
                                <p className="text-sm text-slate-400">
                                  {formatDateTimeLabel(version.uploadedAt)}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-sm font-medium uppercase tracking-[0.04em] ring-1 ring-inset",
                                  documentStatusMeta(version.status).panel.includes("emerald")
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : version.status === "rejected"
                                      ? "bg-rose-50 text-rose-700 ring-rose-200"
                                      : version.status === "under_review"
                                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                                        : "bg-brand-50 text-brand-700 ring-brand-200",
                                )}
                              >
                                {formatStatusLabel(version.status)}
                              </span>
                            </div>

                            {version.rejectionReason ? (
                              <p className="mt-3 rounded-[0.95rem] border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                Rejection reason: {version.rejectionReason}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>
                    ) : null}
                  </section>
                  </div>
                </aside>
              </div>
              </SurfaceCard>
              </div>
            </div>
          ) : null}
          </div>
        </>
      )}
    </div>
  );
}
