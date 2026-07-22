// Friendly guide: this module (AccountantReviewPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetBlob, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
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
import { getScopedReviewQueue } from "../../utils/permissions";

const reviewSnapshotDate = new Date("2026-05-08T08:00:00.000Z");

// Shared shape notes: these types keep UI and data contracts aligned.
type QueueStatusFilter = "all" | "under_review" | "overdue" | "attention" | "on_track";
type DueWindowFilter = "all" | "overdue" | "soon" | "later";
type QueueOrder = "priority" | "recent";
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

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function dueInDays(value: string) {
  const difference = new Date(value).getTime() - reviewSnapshotDate.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function queueStatusMeta(item: ReviewQueueItem) {
  if (item.status === "under_review") {
    return {
      key: "under_review" as const,
      label: "Under review",
      pill: "bg-brand-50 text-brand-700 ring-brand-200",
      accent: "border-l-brand-500",
    };
  }

  const dueDate = addDays(item.submittedAt, 4);
  const remainingDays = dueInDays(dueDate);

  if (remainingDays < 0) {
    return {
      key: "overdue" as const,
      label: "Overdue",
      pill: "bg-rose-50 text-rose-700 ring-rose-200",
      accent: "border-l-rose-500",
    };
  }

  if (remainingDays <= 1) {
    return {
      key: "attention" as const,
      label: "Attention",
      pill: "bg-amber-50 text-amber-700 ring-amber-200",
      accent: "border-l-amber-500",
    };
  }

  return {
    key: "on_track" as const,
    label: "On track",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    accent: "border-l-emerald-500",
  };
}

function queueDueMeta(item: ReviewQueueItem) {
  const dueDate = addDays(item.submittedAt, 4);
  const remainingDays = dueInDays(dueDate);

  if (remainingDays < 0) {
    const lateDays = Math.abs(remainingDays);
    return {
      filterKey: "overdue" as const,
      label: formatDateLabel(dueDate),
      helper: `Overdue by ${lateDays} day${lateDays === 1 ? "" : "s"}`,
      helperClass: "text-rose-600",
    };
  }

  if (remainingDays <= 3) {
    return {
      filterKey: "soon" as const,
      label: formatDateLabel(dueDate),
      helper:
        remainingDays === 0
          ? "Due today"
          : `Due in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`,
      helperClass: "text-amber-600",
    };
  }

  return {
    filterKey: "later" as const,
    label: formatDateLabel(dueDate),
    helper: `Due in ${remainingDays} days`,
    helperClass: "text-slate-500",
  };
}

interface BackendReviewQueueItem {
  documentId: string;
  clientId: string;
  clientName: string;
  monthlyPackId: string;
  year: number;
  month: number;
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

function monthLabelFromParts(year: number, month: number) {
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, Math.max(0, month - 1), 1)),
  );
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
    submittedAt: item.submittedAtUtc || item.uploadedAtUtc,
    status: mapBackendStatus(item.documentStatus),
    assignedAccountant: currentUserName || "Assigned accountant",
  };
}

function mapBackendWorkspace(
  workspace: BackendReviewWorkspace,
  fileUrl?: { url: string; mimeType: string },
): DocumentRecord {
  const latestDecision = workspace.reviewHistory[workspace.reviewHistory.length - 1];
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
    clientId: workspace.item.clientId,
    clientName: workspace.item.clientName,
    documentType: workspace.item.slotLabel || workspace.item.documentCategory,
    fileName: workspace.item.documentName,
    monthLabel: monthLabelFromParts(workspace.item.year, workspace.item.month),
    description: `${workspace.item.documentCategory} review workspace record.`,
    status: mapBackendStatus(workspace.item.documentStatus),
    uploadedBy: "Client user",
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

function queuePriorityMeta(item: ReviewQueueItem) {
  const statusMeta = queueStatusMeta(item);

  if (statusMeta.key === "overdue" || statusMeta.key === "under_review") {
    return {
      label: "High",
      pill: "bg-rose-50 text-rose-700 ring-rose-200",
    };
  }

  if (statusMeta.key === "attention") {
    return {
      label: "Medium",
      pill: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "Low",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
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

function openDocumentInNewTab(record: DocumentRecord) {
  if (record.fileDataUrl) {
    const fileWindow = window.open(record.fileDataUrl, "_blank", "noopener,noreferrer");
    return Boolean(fileWindow);
  }

  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) {
    return false;
  }

  const previewText =
    record.extractedText ??
    `${record.documentType}\n${record.fileName}\n${record.description}`;

  previewWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${record.fileName}</title>
    <style>
      body { margin: 0; padding: 24px; font-family: Calibri, system-ui, -apple-system, Segoe UI, sans-serif; background: #f8fafc; color: #0f172a; }
      pre { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
    </style>
  </head>
  <body>
    <h1 style="font-size:20px; margin:0 0 12px;">${record.fileName}</h1>
    <pre>${previewText}</pre>
  </body>
</html>`);
  previewWindow.document.close();
  return true;
}

function downloadDocumentFile(record: DocumentRecord) {
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
      <span className="absolute -bottom-1.5 rounded-full border border-white bg-white px-1.5 py-0.5 text-[0.56rem] font-medium uppercase leading-none text-slate-500 shadow-sm">
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

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <rect
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="6.5"
      />
      <path
        d="M8 4.5v4m8-4v4M4 10.5h16"
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

function MoreVerticalIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5.25a1.25 1.25 0 1 0 0 .001M12 12a1.25 1.25 0 1 0 0 .001M12 18.75a1.25 1.25 0 1 0 0 .001"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
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
                "inline-flex rounded-lg px-2.5 py-1 text-[0.72rem] font-medium uppercase ring-1 ring-inset",
                queueTypeClasses(document.documentType),
              )}
            >
              {fileExtensionLabel(document.fileName)}
            </span>
            <div>
              <h3 className="text-[1.04rem] font-medium text-slate-950">{document.fileName}</h3>
              <p className="mt-1 text-[0.92rem] text-slate-500">
                {document.clientName} / {document.monthLabel}
              </p>
            </div>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-400">
              File type
            </p>
            <p className="mt-2 text-[0.92rem] text-slate-700">{document.documentType}</p>
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
                This file type cannot be embedded here. Use Open in new tab to view it.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3 font-mono text-[0.88rem] leading-7 text-slate-600">
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
  const portal = usePortal();
  const navigate = useNavigate();
  const backendMode = hasApiBaseUrl();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [liveQueueItems, setLiveQueueItems] = useState<ReviewQueueItem[] | null>(null);
  const [liveWorkspaceByDocumentId, setLiveWorkspaceByDocumentId] = useState<Record<string, BackendReviewWorkspace>>({});
  const [liveFileUrlsByDocumentId, setLiveFileUrlsByDocumentId] = useState<
    Record<string, { url: string; mimeType: string }>
  >({});
  const [workspaceCommentDraft, setWorkspaceCommentDraft] = useState("");
  const queue = useMemo(
    () =>
      backendMode && liveQueueItems
        ? liveQueueItems
        : getScopedReviewQueue(user, portal.getReviewQueue(), portal.adminClients),
    [backendMode, liveQueueItems, portal, user],
  );

// Local UI state: keeps track of what the user is seeing or editing right now.
  const [selectedAccountant, setSelectedAccountant] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<QueueStatusFilter>("all");
  const [selectedDueWindow, setSelectedDueWindow] = useState<DueWindowFilter>("all");
  const [queueOrder, setQueueOrder] = useState<QueueOrder>("priority");
  const [selectedRecordId, setSelectedRecordId] = useState(queue[0]?.id ?? "");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [workspaceAuditEntries, setWorkspaceAuditEntries] = useState<
    Record<string, AuditTrailEntry[]>
  >({});
  const rowActionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isActive = true;

    async function loadQueue() {
      try {
        const items = await apiGetJson<BackendReviewQueueItem[]>("/api/review-queue");
        if (!isActive) {
          return;
        }

        setLiveQueueItems(items.map((item) => mapBackendQueueItem(item, user?.fullName)));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setReviewMessage(
          error instanceof ApiError ? error.message : "Could not load the live review queue.",
        );
      }
    }

    void loadQueue();

    return () => {
      isActive = false;
    };
  }, [backendMode, user?.fullName]);

  const queueRows = useMemo(
    () =>
      queue.map((item) => ({
        item,
        record:
          backendMode && liveWorkspaceByDocumentId[item.id]
            ? mapBackendWorkspace(
                liveWorkspaceByDocumentId[item.id],
                liveFileUrlsByDocumentId[item.id],
              )
            : portal.getReviewRecord(item.id),
        statusMeta: queueStatusMeta(item),
        dueMeta: queueDueMeta(item),
      })),
    [backendMode, liveFileUrlsByDocumentId, liveWorkspaceByDocumentId, portal, queue],
  );

  const clientOptions = useMemo(
    () => Array.from(new Set(queueRows.map((row) => row.item.clientName))).sort(),
    [queueRows],
  );
  const accountantOptions = useMemo(
    () => Array.from(new Set(queueRows.map((row) => row.item.assignedAccountant))).sort(),
    [queueRows],
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(queueRows.map((row) => row.item.documentType))).sort(),
    [queueRows],
  );

  const filteredRows = useMemo(
    () =>
      queueRows.filter((row) => {
        if (selectedAccountant !== "all" && row.item.assignedAccountant !== selectedAccountant) {
          return false;
        }

        if (selectedClient !== "all" && row.item.clientName !== selectedClient) {
          return false;
        }

        if (selectedType !== "all" && row.item.documentType !== selectedType) {
          return false;
        }

        if (selectedStatus !== "all" && row.statusMeta.key !== selectedStatus) {
          return false;
        }

        if (selectedDueWindow !== "all" && row.dueMeta.filterKey !== selectedDueWindow) {
          return false;
        }

        return true;
      }),
    [queueRows, selectedAccountant, selectedClient, selectedDueWindow, selectedStatus, selectedType],
  );

  const queueStatusCounts = useMemo(
    () => ({
      all: queueRows.length,
      under_review: queueRows.filter((row) => row.statusMeta.key === "under_review").length,
      overdue: queueRows.filter((row) => row.statusMeta.key === "overdue").length,
      attention: queueRows.filter((row) => row.statusMeta.key === "attention").length,
      on_track: queueRows.filter((row) => row.statusMeta.key === "on_track").length,
    }),
    [queueRows],
  );

  const orderedRows = useMemo(() => {
    const rows = [...filteredRows];

    if (queueOrder === "recent") {
      return rows.sort(
        (left, right) =>
          new Date(right.item.submittedAt).getTime() -
          new Date(left.item.submittedAt).getTime(),
      );
    }

    const priorityScore = (row: (typeof filteredRows)[number]) => {
      const statusRank =
        row.statusMeta.key === "overdue"
          ? 4
          : row.statusMeta.key === "attention"
            ? 3
            : row.statusMeta.key === "under_review"
              ? 2
              : 1;
      const dueRank =
        row.dueMeta.filterKey === "overdue"
          ? 3
          : row.dueMeta.filterKey === "soon"
            ? 2
            : 1;
      return statusRank * 100 + dueRank * 10;
    };

    return rows.sort((left, right) => priorityScore(right) - priorityScore(left));
  }, [filteredRows, queueOrder]);

  const hasActiveFilters =
    selectedAccountant !== "all" ||
    selectedClient !== "all" ||
    selectedType !== "all" ||
    selectedStatus !== "all" ||
    selectedDueWindow !== "all";

  const emptyStateCopy = useMemo(() => {
    if (selectedStatus === "overdue") {
      return {
        title: "No overdue records",
        description: "There are no overdue items in the current queue view.",
      };
    }

    if (selectedStatus === "under_review") {
      return {
        title: "No records under review",
        description: "There are no items currently marked as under review for these filters.",
      };
    }

    if (selectedStatus === "attention") {
      return {
        title: "No attention items",
        description: "No records currently need attention in this filtered queue view.",
      };
    }

    if (selectedClient !== "all") {
      return {
        title: "No records for this client",
        description: "Try another client or clear the current queue filters.",
      };
    }

    if (selectedType !== "all") {
      return {
        title: "No records for this type",
        description: "No queue records match the selected document type and filters.",
      };
    }

    return {
      title: "Nothing in this view",
      description: "No review records match the current filters.",
    };
  }, [selectedClient, selectedStatus, selectedType]);

  const activeRow = useMemo(
    () => queueRows.find((row) => row.item.id === selectedRecordId) ?? null,
    [queueRows, selectedRecordId],
  );
  const activeDocument = activeRow?.record ?? null;
  const activePriority = activeRow ? queuePriorityMeta(activeRow.item) : null;
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
  const hasUnsavedDraft = false;

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
    if (!activeDocument) {
      return;
    }

    setPreviewPage(1);
    setPreviewZoom(100);
  }, [activeDocument?.id, activeDocument]);

  useEffect(() => {
    if (!backendMode || !viewerOpen || !selectedRecordId || liveWorkspaceByDocumentId[selectedRecordId]) {
      return;
    }

    let isActive = true;

    async function loadWorkspace() {
      try {
        const workspace = await apiGetJson<BackendReviewWorkspace>(
          `/api/review-queue/${encodeURIComponent(selectedRecordId)}`,
        );
        if (!isActive) {
          return;
        }

        setLiveWorkspaceByDocumentId((current) => ({
          ...current,
          [selectedRecordId]: workspace,
        }));

        try {
          const { blob, contentType } = await apiGetBlob(
            `/api/documents/${encodeURIComponent(selectedRecordId)}/download`,
          );
          if (!isActive) {
            return;
          }

          const url = URL.createObjectURL(blob);
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
          error instanceof ApiError ? error.message : "Could not load the review workspace.",
        );
      }
    }

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [backendMode, liveWorkspaceByDocumentId, selectedRecordId, viewerOpen]);

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
    setSelectedClient("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedDueWindow("all");
    setSelectedAccountant("all");
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
      apiGetJson<BackendReviewQueueItem[]>("/api/review-queue"),
      apiGetJson<BackendReviewWorkspace>(`/api/review-queue/${encodeURIComponent(documentId)}`),
    ]);

    setLiveQueueItems(queueItems.map((item) => mapBackendQueueItem(item, user?.fullName)));
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
    if (!backendMode || !activeDocument) {
      return;
    }

    try {
      await apiPostJson(`/api/review-queue/${encodeURIComponent(activeDocument.id)}/review`, {
        decision: "accepted",
        reason: null,
        internalNote: null,
      });
      await refreshBackendWorkspace(activeDocument.id);
      handleWorkspaceActionSuccess("Document approved and queue refreshed.");
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Approval failed.");
    }
  }

  async function rejectActiveDocument() {
    if (!backendMode || !activeDocument) {
      return;
    }

    const reason = window.prompt("Enter the rejection reason for the client.");
    if (!reason?.trim()) {
      return;
    }

    try {
      await apiPostJson(`/api/review-queue/${encodeURIComponent(activeDocument.id)}/review`, {
        decision: "rejected",
        reason: reason.trim(),
        internalNote: null,
      });
      await refreshBackendWorkspace(activeDocument.id);
      handleWorkspaceActionSuccess("Document rejected and queue refreshed.");
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Rejection failed.");
    }
  }

  async function requestReuploadForActiveDocument() {
    if (!backendMode || !activeDocument) {
      return;
    }

    const reason = window.prompt("Enter the re-upload request reason.");
    if (!reason?.trim()) {
      return;
    }

    try {
      await apiPostJson(
        `/api/review-queue/${encodeURIComponent(activeDocument.id)}/request-reupload`,
        {
          reason: reason.trim(),
          internalNote: null,
        },
      );
      await refreshBackendWorkspace(activeDocument.id);
      handleWorkspaceActionSuccess("Re-upload request sent and queue refreshed.");
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Request re-upload failed.");
    }
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
      await apiPostJson(
        `/api/review-queue/${encodeURIComponent(activeDocument.id)}/comments`,
        { message },
      );
      await refreshBackendWorkspace(activeDocument.id);
      handleWorkspaceActionSuccess("Comment added to the review workspace.");
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Comment failed.");
    }
  }

  function closeViewer() {
    if (
      hasUnsavedDraft &&
      !window.confirm("You have unsaved notes or comments. Close the review anyway?")
    ) {
      return;
    }

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
        <span className="text-[0.82rem] font-medium text-slate-500">{label}</span>
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
    if (!openActionMenuId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rowActionMenuRef.current && !rowActionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId("");
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenActionMenuId("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionMenuId]);

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    function handleViewerShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;

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
  }, [viewerOpen, previousRecordId, nextRecordId, hasUnsavedDraft]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      {reviewMessage ? (
        <div className="rounded-[1.05rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {reviewMessage}
        </div>
      ) : null}

      {queueRows.length === 0 ? (
        <SurfaceCard className="space-y-5">
          <EmptyState
            description={
              user?.role === "admin"
                ? "There are no firm records waiting in the review queue right now. Reload the demo queue if you want to inspect this workspace again."
                : "There are no records waiting in your assigned review queue right now. Reload the demo queue if you want to inspect this workspace again."
            }
            title="No review queue items"
          />
          <div className="flex justify-center">
            <Button
              className="h-10 rounded-xl px-4"
              onClick={() => portal.resetClientPortalDemoState()}
              size="sm"
            >
              Reload demo queue
            </Button>
          </div>
        </SurfaceCard>
      ) : (
        <>
          <div className="grid gap-6">
          <SurfaceCard className="overflow-hidden rounded-[1.55rem] border border-slate-200/90 bg-white p-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <div className="space-y-4 border-b border-[#e6edf4] bg-[#fbfdff] px-5 pb-5 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h2 className="text-[1.18rem] font-medium text-[#091333]">My work queue</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3" />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {[
                  { id: "all" as const, label: "All", count: queueStatusCounts.all },
                  { id: "under_review" as const, label: "Under review", count: queueStatusCounts.under_review },
                  { id: "overdue" as const, label: "Overdue", count: queueStatusCounts.overdue },
                  { id: "attention" as const, label: "Attention", count: queueStatusCounts.attention },
                  { id: "on_track" as const, label: "On track", count: queueStatusCounts.on_track },
                ].map((item) => (
                  <button
                    className={cn(
                      "inline-flex items-center gap-2 border-b-2 px-0.5 pb-2 text-[0.96rem] transition",
                      selectedStatus === item.id
                        ? "border-[#203a72] text-[#203a72]"
                        : "border-transparent text-[#6b7894] hover:text-[#203a72]",
                    )}
                    key={item.id}
                    onClick={() => setSelectedStatus(item.id)}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full bg-[#eff3f8] px-2 py-0.5 text-[0.78rem] text-[#6b7894]">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  "grid gap-4 border-t border-[#edf2f7] pt-4 lg:items-end",
                  user?.role === "admin"
                    ? "lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
                    : "lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]",
                )}
              >
                {user?.role === "admin"
                  ? renderSelectField(
                      "Accountant",
                      selectedAccountant,
                      setSelectedAccountant,
                      [
                        { label: "All accountants", value: "all" },
                        ...accountantOptions.map((accountant) => ({
                          label: accountant,
                          value: accountant,
                        })),
                      ],
                    )
                  : null}

                {renderSelectField(
                  "Client",
                  selectedClient,
                  setSelectedClient,
                  [
                    { label: "All clients", value: "all" },
                    ...clientOptions.map((client) => ({ label: client, value: client })),
                  ],
                )}

                {renderSelectField(
                  "Record type",
                  selectedType,
                  setSelectedType,
                  [
                    { label: "All types", value: "all" },
                    ...typeOptions.map((type) => ({ label: type, value: type })),
                  ],
                )}

                {renderSelectField(
                  "Due date",
                  selectedDueWindow,
                  (value) => setSelectedDueWindow(value as DueWindowFilter),
                  [
                    { label: "Any time", value: "all" },
                    { label: "Overdue", value: "overdue" },
                    { label: "Due soon", value: "soon" },
                    { label: "Later", value: "later" },
                  ],
                  <CalendarIcon />,
                )}

                {renderSelectField(
                  "Queue order",
                  queueOrder,
                  (value) => setQueueOrder(value as QueueOrder),
                  [
                    { label: "Priority first", value: "priority" },
                    { label: "Most recent first", value: "recent" },
                  ],
                )}

              </div>
            </div>

            <div className="hidden border-b border-slate-100 px-5 py-4 text-[0.78rem] uppercase tracking-[0.12em] text-slate-400 lg:grid lg:grid-cols-[1.7fr_0.9fr_0.9fr_4.5rem] lg:gap-4">
              <div>Task</div>
              <div>Submitted</div>
              <div>Priority</div>
              <div className="text-right">Action</div>
            </div>

            {orderedRows.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {orderedRows.map((row) => {
                  const selected = viewerOpen && row.item.id === selectedRecordId;
                  const priority = queuePriorityMeta(row.item);

                  return (
                    <div
                      className={cn(
                        "relative border-l-[4px] px-5 py-4 transition lg:grid lg:grid-cols-[1.7fr_0.9fr_0.9fr_4.5rem] lg:items-center lg:gap-4",
                        selected
                          ? "border-l-brand-500 bg-brand-50/28 shadow-[inset_0_0_0_1px_rgba(84,66,255,0.14)]"
                          : "border-l-transparent hover:bg-slate-50",
                      )}
                      key={row.item.id}
                    >
                      <div className="flex items-start gap-3">
                        <QueueFileIcon
                          documentType={row.item.documentType}
                          fileName={row.record.fileName}
                        />
                        <div className="min-w-0">
                          <p className="text-[0.98rem] font-medium text-slate-950">
                            {row.item.documentType} review
                          </p>
                          <p className="mt-1 text-[0.88rem] text-slate-500">
                            {row.item.clientName} | {row.item.monthLabel}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 lg:mt-0">
                        <p className="text-[0.9rem] text-slate-950">
                          {formatDateLabel(row.item.submittedAt)}
                        </p>
                      </div>

                      <div className="mt-3 lg:mt-0">
                        <span
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.74rem] font-medium uppercase tracking-[0.04em] ring-1 ring-inset",
                            priority.pill,
                          )}
                        >
                          {priority.label}
                        </span>
                        <p className="mt-2 text-[0.78rem] text-slate-500">
                          {row.dueMeta.helper}
                        </p>
                      </div>

                      <div
                        className="relative mt-3 flex items-center lg:mt-0 lg:justify-end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div
                          className="relative"
                          ref={openActionMenuId === row.item.id ? rowActionMenuRef : undefined}
                        >
                          <button
                            aria-expanded={openActionMenuId === row.item.id}
                            aria-label={`Actions for ${row.item.documentType}`}
                            className={cn(
                              "inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50",
                              openActionMenuId === row.item.id ? "bg-brand-50" : "",
                            )}
                            onClick={() =>
                              setOpenActionMenuId((current) =>
                                current === row.item.id ? "" : row.item.id,
                              )
                            }
                            type="button"
                          >
                            <MoreVerticalIcon />
                          </button>

                          {openActionMenuId === row.item.id ? (
                            <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-left shadow-[0_18px_38px_rgba(15,23,42,0.16)]">
                              <button
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                                onClick={() => {
                                  setOpenActionMenuId("");
                                  openInClientWorkspace(row.item.id);
                                }}
                                type="button"
                              >
                                Open in workspace
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                                onClick={() => {
                                  setOpenActionMenuId("");
                                  openViewer(row.item.id);
                                }}
                                type="button"
                              >
                                Open review
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.84rem] text-slate-700 transition hover:bg-slate-50"
                                onClick={() => {
                                  setOpenActionMenuId("");
                                  void openDocumentInNewTab(row.record);
                                }}
                                type="button"
                              >
                                Open file
                              </button>
                            </div>
                          ) : null}
                        </div>
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
                {hasActiveFilters ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      className="h-10 rounded-xl px-4"
                      onClick={clearFilters}
                      size="sm"
                      variant="ghost"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </SurfaceCard>

          {viewerOpen && activeDocument && activeRow ? (
            <div
              className="fixed inset-0 z-40 bg-slate-950/45 px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
              onClick={closeViewer}
              ref={workspaceRef}
            >
              <div className="mx-auto h-full w-full max-w-[1320px] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
              <SurfaceCard className="overflow-hidden rounded-[1.65rem] border border-slate-200/90 bg-white p-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <button
                  className="inline-flex items-center gap-2 text-[0.96rem] text-slate-600 transition hover:text-slate-900"
                  onClick={closeViewer}
                  type="button"
                >
                  <ChevronLeftIcon />
                  <span>Back to queue</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    className="h-10 rounded-xl px-4"
                    onClick={() => openInClientWorkspace(activeRow.item.id)}
                    size="sm"
                  >
                    Open exact document context
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

              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="border-b border-slate-200 lg:border-b-0 lg:border-r lg:border-slate-200">
                  <div className="space-y-6 px-5 py-5">
                    <section className="rounded-[1.2rem] border border-slate-200 bg-white p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <QueueFileIcon
                            documentType={activeDocument.documentType}
                            fileName={activeDocument.fileName}
                          />
                          <div className="min-w-0">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.06em] ring-1 ring-inset",
                                activeRow.statusMeta.pill,
                              )}
                            >
                              {activeRow.statusMeta.label}
                            </span>
                            <h2 className="mt-3 text-[1.16rem] font-medium text-slate-950">
                              {activeDocument.fileName}
                            </h2>
                            <p className="mt-1 text-[0.9rem] text-slate-500">
                              {activeDocument.clientName}  •  {activeDocument.monthLabel}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          <Button
                            className="h-9 rounded-xl px-3 text-slate-700"
                            onClick={() => {
                              if (!openDocumentInNewTab(activeDocument)) {
                                setReviewMessage("Pop-up blocked. Please allow pop-ups to open the file.");
                              }
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            <span>Open in new tab</span>
                          </Button>
                          <Button
                            className="h-9 rounded-xl px-3 text-brand-700"
                            onClick={() => downloadDocumentFile(activeDocument)}
                            size="sm"
                            variant="secondary"
                          >
                            <DownloadIcon />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[1.2rem] border border-slate-200 bg-white p-5">
                      <h3 className="text-[1rem] font-medium text-slate-950">Key details</h3>
                      <div className="mt-4 grid gap-0 overflow-hidden rounded-[1rem] border border-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="border-b border-slate-200 px-4 py-3.5 sm:border-r xl:border-b-0">
                          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                            File type
                          </p>
                          <p className="mt-1.5 text-[0.92rem] text-slate-900">
                            {activeDocument.documentType}
                          </p>
                        </div>
                        <div className="border-b border-slate-200 px-4 py-3.5 xl:border-b-0 xl:border-r">
                          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                            Submitted
                          </p>
                          <p className="mt-1.5 text-[0.92rem] text-slate-900">
                            {formatDateTimeLabel(activeDocument.uploadedAt)}
                          </p>
                        </div>
                        <div className="border-b border-slate-200 px-4 py-3.5 sm:border-r sm:border-slate-200 xl:border-b-0">
                          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                            Due by
                          </p>
                          <p className="mt-1.5 text-[0.92rem] text-slate-900">
                            {activeRow.dueMeta.label}
                          </p>
                          <p className={cn("mt-1 text-[0.8rem]", activeRow.dueMeta.helperClass)}>
                            {activeRow.dueMeta.helper}
                          </p>
                        </div>
                        <div className="px-4 py-3.5">
                          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                            Priority
                          </p>
                          <span
                            className={cn(
                              "mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.04em] ring-1 ring-inset",
                              activePriority?.pill ?? "bg-slate-50 text-slate-600 ring-slate-200",
                            )}
                          >
                            {activePriority?.label ?? "Normal"}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="text-[1rem] font-medium text-slate-950">Document preview</h3>
                      </div>
                      {!activeDocument.fileDataUrl ? (
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
                            <span className="min-w-[86px] text-center text-[0.92rem] text-slate-700">
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
                            <span className="min-w-[62px] text-center text-[0.92rem] text-slate-700">
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

                      <PreviewCanvas
                        document={activeDocument}
                        previewPage={previewPage}
                        previewPages={previewPages}
                        previewZoom={previewZoom}
                      />
                    </section>

                    {versionHistory.length > 1 ? (
                    <section className="border-t border-slate-200 pt-6">
                      <div>
                        <h3 className="text-[1rem] font-medium text-slate-950">
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
                                  <p className="text-[0.92rem] font-medium text-slate-950">
                                    Version {version.versionNumber}
                                  </p>
                                  {version.isLatest ? (
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-medium text-brand-700 ring-1 ring-brand-200">
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
                                  "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.04em] ring-1 ring-inset",
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
                  </div>
                </div>

                <div className="space-y-6 px-5 py-5">
                  <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
                      <h3 className="text-[1rem] font-medium text-slate-950">
                        Decision
                      </h3>
                    </div>
                    <p className="mt-3 text-[0.92rem] leading-7 text-slate-500">
                      Use this page to inspect the file before moving to the monthly pack for the actual workflow action.
                    </p>
                    <span
                      className={cn(
                        "mt-4 inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.04em] ring-1 ring-inset",
                        activeRow.statusMeta.pill,
                      )}
                    >
                      {formatStatusLabel(activeDocument.status)}
                    </span>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                        <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                          Client
                        </p>
                        <p className="mt-1 text-[0.92rem] text-slate-900">
                          {activeDocument.clientName}
                        </p>
                      </div>
                      <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                        <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                          Period
                        </p>
                        <p className="mt-1 text-[0.92rem] text-slate-900">
                          {activeDocument.monthLabel}
                        </p>
                      </div>
                      {activeDocument.rejectionReason ? (
                        <div className="rounded-[0.95rem] border border-rose-100 bg-rose-50 px-3.5 py-3">
                          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-rose-500">
                            Previous return reason
                          </p>
                          <p className="mt-1 text-[0.9rem] leading-6 text-rose-700">
                            {activeDocument.rejectionReason}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Button
                        className="h-11 w-full rounded-xl px-4"
                        onClick={() => openInClientWorkspace(activeRow.item.id)}
                        size="sm"
                      >
                        Move to monthly pack
                      </Button>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          className="h-10 rounded-xl px-3 text-slate-700"
                          onClick={() => {
                            if (!openDocumentInNewTab(activeDocument)) {
                              setReviewMessage("Pop-up blocked. Please allow pop-ups to open the file.");
                            }
                          }}
                          size="sm"
                          variant="secondary"
                        >
                          Open in new tab
                        </Button>
                        <Button
                          className="h-10 rounded-xl px-3 text-brand-700"
                          onClick={() => downloadDocumentFile(activeDocument)}
                          size="sm"
                          variant="secondary"
                        >
                          <DownloadIcon />
                          <span>Download</span>
                        </Button>
                      </div>
                      {backendMode ? (
                        <div className="grid gap-2">
                          <Button
                            className="h-10 rounded-xl px-3"
                            onClick={() => void approveActiveDocument()}
                            size="sm"
                          >
                            Approve
                          </Button>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              className="h-10 rounded-xl px-3 text-rose-700"
                              onClick={() => void rejectActiveDocument()}
                              size="sm"
                              variant="secondary"
                            >
                              Reject
                            </Button>
                            <Button
                              className="h-10 rounded-xl px-3 text-amber-700"
                              onClick={() => void requestReuploadForActiveDocument()}
                              size="sm"
                              variant="secondary"
                            >
                              Request re-upload
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div>
                      <h3 className="text-[1rem] font-medium text-slate-950">
                        Conversation
                      </h3>
                      <p className="mt-1 text-[0.9rem] text-slate-500">
                        Conversation that may affect your decision on this file.
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
                                  <p className="text-[0.92rem] font-medium text-slate-950">
                                    {comment.author}
                                  </p>
                                  <span className="text-[0.8rem] text-slate-400">
                                    {formatDateTimeLabel(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-3 text-[0.9rem] leading-7 text-slate-600">
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
                </div>
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
