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

function QueueFileIcon({ documentType, fileName }: { documentType: string; fileName: string }) {
// Render output: this is the visual state users interact with.
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] ring-1",
        queueTypeClasses(documentType),
      )}
    >
      <span className="text-[0.68rem] font-semibold">{fileExtensionLabel(fileName)}</span>
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

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M18.5 7.5V4.5m0 3h-3m3 0-2.5-2.5A7 7 0 1 0 19 11"
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

function OfficeIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-400" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 19h16M6.5 19V7.5A1.5 1.5 0 0 1 8 6h8a1.5 1.5 0 0 1 1.5 1.5V19M9 6V4.75A1.25 1.25 0 0 1 10.25 3.5h3.5A1.25 1.25 0 0 1 15 4.75V6"
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
                "inline-flex rounded-lg px-2.5 py-1 text-[0.72rem] font-semibold uppercase ring-1 ring-inset",
                queueTypeClasses(document.documentType),
              )}
            >
              {fileExtensionLabel(document.fileName)}
            </span>
            <div>
              <h3 className="text-[1.15rem] font-semibold text-slate-950">{document.fileName}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {document.clientName} / {document.monthLabel}
              </p>
            </div>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
              File type
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">{document.documentType}</p>
          </div>
        </div>

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
      </div>
    </div>
  );
}

export function AccountantReviewPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const queue = useMemo(
    () => getScopedReviewQueue(user, portal.getReviewQueue(), portal.adminClients),
    [portal, user],
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
  const [showReviewGuidance, setShowReviewGuidance] = useState(false);
  const [workspaceAuditEntries, setWorkspaceAuditEntries] = useState<
    Record<string, AuditTrailEntry[]>
  >({});

  const queueRows = useMemo(
    () =>
      queue.map((item) => ({
        item,
        record: portal.getReviewRecord(item.id),
        statusMeta: queueStatusMeta(item),
        dueMeta: queueDueMeta(item),
      })),
    [portal, queue],
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

  const activeRow = useMemo(
    () => queueRows.find((row) => row.item.id === selectedRecordId) ?? null,
    [queueRows, selectedRecordId],
  );
  const activeDocument = activeRow?.record ?? null;
  const activeStatus = activeDocument ? documentStatusMeta(activeDocument.status) : null;
  const requiresReason =
    activeDocument?.status === "rejected" || activeDocument?.status === "under_review";
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
  const confidenceChecks = useMemo(() => {
    if (!activeDocument) {
      return [];
    }

    const uploadedAtTime = new Date(activeDocument.uploadedAt).getTime();
    const reviewedAtTime = activeDocument.reviewedAt
      ? new Date(activeDocument.reviewedAt).getTime()
      : 0;
    const commentsUnread = orderedComments.length > 0;

    return [
      {
        id: "doc-present",
        label: "Document loaded in preview",
        passed: true,
      },
      {
        id: "history-checked",
        label: "Version history available",
        passed: versionHistory.length > 0,
      },
      {
        id: "comments-seen",
        label: commentsUnread ? "Comments exist and should be reviewed" : "No pending comments",
        passed: !commentsUnread,
      },
      {
        id: "recent-review",
        label: "Reviewed timestamp is after upload",
        passed: reviewedAtTime === 0 || reviewedAtTime >= uploadedAtTime,
      },
    ];
  }, [activeDocument, orderedComments.length, versionHistory.length]);

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
    setShowReviewGuidance(false);
  }, [activeDocument?.id, activeDocument]);

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
            <div className="border-b border-slate-100 px-5 pb-5 pt-5">
              <div
                className={cn(
                  "grid gap-4 lg:items-end",
                  user?.role === "admin"
                    ? "lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]"
                    : "lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]",
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
                  "Status",
                  selectedStatus,
                  (value) => setSelectedStatus(value as QueueStatusFilter),
                  [
                    { label: "All statuses", value: "all" },
                    { label: "Under review", value: "under_review" },
                    { label: "Overdue", value: "overdue" },
                    { label: "Attention", value: "attention" },
                    { label: "On track", value: "on_track" },
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

                <button
                  className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-2 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                  onClick={clearFilters}
                  type="button"
                >
                  <RefreshIcon />
                  Clear filters
                </button>
              </div>
            </div>

            <div className="hidden border-b border-slate-100 px-5 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid lg:grid-cols-[1.34fr_1fr_0.72fr_0.82fr_0.7fr_3.5rem] lg:gap-4">
              <div>Record</div>
              <div>Client & period</div>
              <div>Submitted</div>
              <div>Due date</div>
              <div>Status</div>
              <div aria-hidden="true" />
            </div>

            {orderedRows.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {orderedRows.map((row) => {
                  const selected = viewerOpen && row.item.id === selectedRecordId;

                  return (
                    <div
                      className={cn(
                        "relative cursor-pointer border-l-[4px] px-5 py-4 transition lg:grid lg:grid-cols-[1.34fr_1fr_0.72fr_0.82fr_0.7fr_3.5rem] lg:items-center lg:gap-4",
                        selected
                          ? "border-l-brand-500 bg-brand-50/28 shadow-[inset_0_0_0_1px_rgba(84,66,255,0.14)]"
                          : "border-l-transparent hover:bg-slate-50",
                      )}
                      key={row.item.id}
                      onClick={() => openViewer(row.item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openViewer(row.item.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-3">
                        <QueueFileIcon
                          documentType={row.item.documentType}
                          fileName={row.record.fileName}
                        />
                        <div className="min-w-0">
                          <p className="text-[0.98rem] font-semibold text-slate-950">
                            {row.item.documentType}
                          </p>
                          <p className="mt-1 text-[0.88rem] text-slate-500">
                            {row.item.monthLabel}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-start gap-3 lg:mt-0">
                        <div className="hidden h-10 w-10 items-center justify-center rounded-[0.95rem] bg-slate-50 ring-1 ring-slate-200 lg:flex">
                          <OfficeIcon />
                        </div>
                        <div>
                          <p className="text-[0.94rem] font-semibold text-slate-950">
                            {row.item.clientName}
                          </p>
                          <p className="mt-1 text-[0.86rem] text-slate-500">
                            {row.item.monthLabel} Pack
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 lg:mt-0">
                        <p className="text-[0.92rem] font-semibold text-slate-950">
                          {formatDateLabel(row.item.submittedAt)}
                        </p>
                        <p className="mt-1 text-[0.84rem] text-slate-500">
                          by {row.record.uploadedBy}
                        </p>
                      </div>

                      <div className="mt-3 lg:mt-0">
                        <p className="text-[0.92rem] font-semibold text-slate-950">
                          {row.dueMeta.label}
                        </p>
                        <p className={cn("mt-1 text-[0.84rem]", row.dueMeta.helperClass)}>
                          {row.dueMeta.helper}
                        </p>
                      </div>

                      <div className="mt-3 lg:mt-0">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset",
                            row.statusMeta.pill,
                          )}
                        >
                          {row.statusMeta.label}
                        </span>
                      </div>

                      <div
                        className="relative mt-3 flex items-center lg:mt-0 lg:justify-end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => openViewer(row.item.id)}
                          type="button"
                          variant="ghost"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-10">
                <EmptyState
                  description="No review records match the current filters."
                  title="Nothing in this view"
                />
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
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
                <div className="flex min-w-0 items-start gap-4">
                  <QueueFileIcon
                    documentType={activeDocument.documentType}
                    fileName={activeDocument.fileName}
                  />
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Work Queue
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset",
                          activeRow.statusMeta.pill,
                        )}
                      >
                        {activeRow.statusMeta.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        {activeDocument.documentType}
                      </span>
                    </div>
                    <h2 className="mt-3 text-[1.22rem] font-semibold text-slate-950">
                      {activeDocument.fileName}
                    </h2>
                    <p className="mt-1 text-[0.9rem] text-slate-500">
                      {activeDocument.clientName} / {activeDocument.monthLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    className="h-10 rounded-xl px-4"
                    onClick={() => openInClientWorkspace(activeRow.item.id)}
                    size="sm"
                  >
                    Open Monthly Pack
                  </Button>
                  <Button
                    className="h-10 rounded-xl px-4 text-slate-700"
                    onClick={closeViewer}
                    size="sm"
                    variant="secondary"
                  >
                    <ChevronLeftIcon />
                    <span>Back to Work Queue</span>
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

              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_420px]">
                <div className="border-b border-slate-200 lg:border-b-0 lg:border-r lg:border-slate-200">
                  <div className="space-y-6 px-5 py-5">
                    <section className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Document details
                        </p>
                        <h3 className="mt-1 text-[1rem] font-semibold text-slate-950">
                          {activeDocument.fileName}
                        </h3>
                      </div>
                      <dl className="grid gap-0 sm:grid-cols-2">
                        <div className="border-b border-slate-200 px-4 py-3 sm:border-r">
                          <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.11em] text-slate-400">
                            File type
                          </dt>
                          <dd className="mt-1.5 text-sm font-medium text-slate-900">
                            {fileExtensionLabel(activeDocument.fileName)} / {activeDocument.documentType}
                          </dd>
                        </div>
                        <div className="border-b border-slate-200 px-4 py-3">
                          <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.11em] text-slate-400">
                            Uploaded date
                          </dt>
                          <dd className="mt-1.5 text-sm font-medium text-slate-900">
                            {formatDateTimeLabel(activeDocument.uploadedAt)}
                          </dd>
                        </div>
                        <div className="px-4 py-3 sm:border-r sm:border-slate-200">
                          <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.11em] text-slate-400">
                            Uploaded by
                          </dt>
                          <dd className="mt-1.5 text-sm font-medium text-slate-900">
                            {activeDocument.uploadedBy}
                          </dd>
                        </div>
                        <div className="px-4 py-3">
                          <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.11em] text-slate-400">
                            Client period
                          </dt>
                          <dd className="mt-1.5 text-sm font-medium text-slate-900">
                            {activeDocument.clientName} / {activeDocument.monthLabel}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <Button
                        className="h-9 rounded-xl px-3 text-brand-700"
                        onClick={() =>
                          downloadPreview(
                            activeDocument.fileName,
                            activeDocument.extractedText ??
                              `${activeDocument.documentType}\n${activeDocument.fileName}\n${activeDocument.description}`,
                          )
                        }
                        size="sm"
                        variant="secondary"
                      >
                        <DownloadIcon />
                        <span>Download</span>
                      </Button>
                      <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="h-9 rounded-xl px-3 text-slate-700"
                        disabled={!previousRecordId}
                        onClick={openPreviousRecord}
                        size="sm"
                        variant="secondary"
                      >
                        <ChevronLeftIcon />
                        <span>Previous</span>
                      </Button>
                      <Button
                        className="h-9 rounded-xl px-3 text-slate-700"
                        disabled={!nextRecordId}
                        onClick={openNextRecord}
                        size="sm"
                        variant="secondary"
                      >
                        <span>Next</span>
                        <ChevronRightIcon />
                      </Button>
                      </div>
                    </div>

                    <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
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
                          <span className="min-w-[86px] text-center text-sm font-medium text-slate-700">
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
                          <span className="min-w-[62px] text-center text-sm font-medium text-slate-700">
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

                      <PreviewCanvas
                        document={activeDocument}
                        previewPage={previewPage}
                        previewPages={previewPages}
                        previewZoom={previewZoom}
                      />
                    </section>

                    <section className="border-t border-slate-200 pt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-[1.02rem] font-semibold text-slate-950">
                            File version history
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Each uploaded version keeps its own outcome and timeline.
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.75rem] font-semibold text-slate-500">
                          {versionHistory.length} version{versionHistory.length === 1 ? "" : "s"}
                        </span>
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
                                  <p className="text-sm font-semibold text-slate-950">
                                    Version {version.versionNumber}
                                  </p>
                                  {version.isLatest ? (
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-brand-700 ring-1 ring-brand-200">
                                      Latest
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-slate-500">
                                  Uploaded by {version.uploadedBy}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {formatDateTimeLabel(version.uploadedAt)}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset",
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
                  </div>
                </div>

                <div className="space-y-6 px-5 py-5">
                  <section className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[1.02rem] font-semibold text-slate-950">
                          Decision assistant
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Confirm file quality, then set the decision and reason if needed.
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset",
                          activeDocument?.status === "accepted"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : activeDocument?.status === "rejected"
                              ? "bg-rose-50 text-rose-700 ring-rose-200"
                              : activeDocument?.status === "under_review"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-brand-50 text-brand-700 ring-brand-200",
                        )}
                      >
                        {formatStatusLabel(activeDocument.status)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-3">
                        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Last updated
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDateTimeLabel(
                            activeDocument.reviewedAt ?? activeDocument.uploadedAt,
                          )}
                        </p>
                      </div>
                      <div className="rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-3">
                        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Reason required
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-sm font-medium",
                            requiresReason ? "text-rose-700" : "text-emerald-700",
                          )}
                        >
                          {requiresReason ? "Yes for rejection/correction" : "No"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        aria-expanded={showReviewGuidance}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => setShowReviewGuidance((current) => !current)}
                        type="button"
                      >
                        <span>{showReviewGuidance ? "Hide review guidance" : "Show review guidance"}</span>
                        <span
                          className={cn(
                            "transition-transform duration-200",
                            showReviewGuidance ? "rotate-180" : "rotate-0",
                          )}
                        >
                          <ChevronDownIcon />
                        </span>
                      </button>
                    </div>
                    {showReviewGuidance ? (
                      <>
                        <div className="mt-3 rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-600">
                          Quick flow: review preview and comments, choose outcome, add reason when requesting correction or rejection.
                        </div>
                        <div className="mt-3 rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-3">
                          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Confidence checks
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {confidenceChecks.map((item) => (
                              <div className="flex items-center gap-2 text-sm" key={item.id}>
                                <span
                                  className={cn(
                                    "h-2.5 w-2.5 rounded-full",
                                    item.passed ? "bg-emerald-500" : "bg-amber-500",
                                  )}
                                />
                                <span className={item.passed ? "text-slate-700" : "text-amber-700"}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </section>

                  <section className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-6 pt-5 backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[1.02rem] font-semibold text-slate-950">
                          Document comments
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Client and accountant messages stay attached to this document.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.75rem] font-semibold text-slate-500">
                        {orderedComments.length} comment{orderedComments.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                      Documents must be uploaded through the structured upload slot, not through comments.
                    </div>

                    <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                      {orderedComments.length > 0 ? (
                        orderedComments.map((comment: DocumentComment) => (
                          <article
                            className={cn(
                              "rounded-[1.15rem] border px-4 py-4",
                              comment.role !== "client"
                                ? "ml-6 border-brand-100 bg-brand-50/75"
                                : "mr-6 border-emerald-100 bg-emerald-50/60",
                            )}
                            key={comment.id}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                                  comment.role !== "client"
                                    ? "bg-[linear-gradient(135deg,#4f46e5,#4338ca)]"
                                    : "bg-emerald-500",
                                )}
                              >
                                {getInitials(comment.author)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[0.92rem] font-semibold text-slate-950">
                                    {comment.author}
                                  </p>
                                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-500 ring-1 ring-slate-200">
                                    {comment.role === "client"
                                      ? "Client"
                                      : comment.role === "admin"
                                        ? "Admin"
                                        : "Accountant"}
                                  </span>
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
                          description="No one has commented on this record yet. Add a note when the client needs precise feedback."
                          title="No comments yet"
                        />
                      )}
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Commenting is disabled in Work Queue view. Open Monthly Pack to add comments.
                    </div>
                  </section>

                  <section className="border-b border-slate-200 pb-6">
                    <div className="space-y-2">
                      <h3 className="text-[1.02rem] font-semibold text-slate-950">
                        Review decision
                      </h3>
                      <p className="text-sm text-slate-500">
                        Choose the outcome that best matches the file quality and completion status.
                      </p>
                    </div>

                    {activeStatus ? (
                      <div className={cn("mt-4 rounded-[1.15rem] border px-4 py-4", activeStatus.panel)}>
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Current status
                        </p>
                        <p className={cn("mt-2 text-[0.96rem] font-semibold", activeStatus.value)}>
                          {formatStatusLabel(activeDocument.status)}
                        </p>
                        <p className="mt-2 text-[0.82rem] leading-6 text-slate-600">
                          {activeStatus.description}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      This is a view-only preview. Use <span className="font-semibold text-slate-900">Open Monthly Pack</span> to mark the document as under review, return, reject, or accept.
                    </div>
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
