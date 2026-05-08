import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { DocumentComment, DocumentRecord, ReviewQueueItem } from "../../types/portal";
import { cn } from "../../utils/cn";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatStatusLabel,
} from "../../utils/formatters";

const reviewSnapshotDate = new Date("2026-05-08T08:00:00.000Z");

type ActivityTab = "comments" | "audit";
type QueueStatusFilter = "all" | "under_review" | "overdue" | "attention" | "on_track";
type DueWindowFilter = "all" | "overdue" | "soon" | "later";

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
        description: "The client has been notified that the accountant is still reviewing this record.",
        panel: "border-amber-200 bg-amber-50/60",
        value: "text-amber-700",
      };
    case "rejected":
      return {
        description: "The record was sent back and still needs a corrected version from the client.",
        panel: "border-rose-200 bg-rose-50/60",
        value: "text-rose-700",
      };
    case "accepted":
      return {
        description: "The record has been approved and moved forward in the workflow.",
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

function ViewIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.75 12s3.75-6 9.25-6 9.25 6 9.25 6-3.75 6-9.25 6-9.25-6-9.25-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
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

function MoreHorizontalIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
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

export function AccountantReviewPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const queue = portal.getReviewQueue();

  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<QueueStatusFilter>("all");
  const [selectedDueWindow, setSelectedDueWindow] = useState<DueWindowFilter>("all");
  const [selectedRecordId, setSelectedRecordId] = useState(queue[0]?.id ?? "");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [activityTab, setActivityTab] = useState<ActivityTab>("comments");
  const [openMenuRecordId, setOpenMenuRecordId] = useState("");

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
  const typeOptions = useMemo(
    () => Array.from(new Set(queueRows.map((row) => row.item.documentType))).sort(),
    [queueRows],
  );

  const filteredRows = useMemo(
    () =>
      queueRows.filter((row) => {
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
    [queueRows, selectedClient, selectedDueWindow, selectedStatus, selectedType],
  );

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
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuRecordId("");
        setViewerOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const activeRow = useMemo(
    () => queueRows.find((row) => row.item.id === selectedRecordId) ?? null,
    [queueRows, selectedRecordId],
  );
  const activeDocument = activeRow?.record ?? null;
  const activeStatus = activeDocument ? documentStatusMeta(activeDocument.status) : null;
  const previewLines = useMemo(
    () => (activeDocument ? documentPreviewLines(activeDocument) : []),
    [activeDocument],
  );
  const orderedComments = useMemo(
    () => [...(activeDocument?.comments ?? [])].reverse(),
    [activeDocument?.comments],
  );

  useEffect(() => {
    if (!activeDocument) {
      setReviewReason("");
      return;
    }

    setReviewReason(activeDocument.rejectionReason ?? "");
    setCommentDraft("");
    setCommentError("");
    setShowComposer(false);
    setActivityTab("comments");
  }, [activeDocument?.id, activeDocument]);

  function clearFilters() {
    setSelectedClient("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedDueWindow("all");
  }

  function openViewer(recordId: string, tab: ActivityTab = "comments", openComposer = false) {
    setSelectedRecordId(recordId);
    setActivityTab(tab);
    setShowComposer(openComposer);
    setViewerOpen(true);
    setOpenMenuRecordId("");
  }

  function handleDownloadRecord(record: DocumentRecord) {
    downloadPreview(
      record.fileName,
      record.extractedText ?? `${record.documentType}\n${record.fileName}\n${record.description}`,
    );
    setOpenMenuRecordId("");
  }

  function handleReviewAction(action: "accepted" | "rejected" | "under_review") {
    if (!selectedRecordId) {
      return;
    }

    const result = portal.reviewRecord({
      recordId: selectedRecordId,
      action,
      reviewer: user?.fullName ?? "Accountant",
      reason: reviewReason,
    });

    setReviewMessage(result.message);
    if (result.ok) {
      setOpenMenuRecordId("");
      if (action !== "under_review") {
        setViewerOpen(false);
      }
    }
  }

  function handleMenuAction(recordId: string, action: "accepted" | "under_review") {
    const result = portal.reviewRecord({
      recordId,
      action,
      reviewer: user?.fullName ?? "Accountant",
    });

    setReviewMessage(result.message);
    setOpenMenuRecordId("");
    if (result.ok && selectedRecordId === recordId && action !== "under_review") {
      setViewerOpen(false);
    }
  }

  function handleCommentSubmit() {
    if (!activeDocument) {
      setCommentError("Open a record before posting a comment.");
      return;
    }

    const trimmed = commentDraft.trim();
    if (!trimmed) {
      setCommentError("Write a clear document-specific note before posting.");
      return;
    }

    const result = portal.addDocumentComment(
      activeDocument.id,
      user?.fullName ?? "Accountant",
      "accountant",
      trimmed,
    );

    if (!result.ok) {
      setCommentError(result.message);
      return;
    }

    setReviewMessage(result.message);
    setCommentDraft("");
    setCommentError("");
    setShowComposer(false);
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
            description="There are no records waiting for accountant review right now. Reload the demo records if you want to inspect the review queue layout again."
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
        <SurfaceCard className="overflow-hidden rounded-[1.55rem] border border-slate-200/90 bg-white p-0 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 px-5 pb-5 pt-5">
            <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
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

          {filteredRows.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const selected = row.item.id === selectedRecordId;

                return (
                  <div
                    className={cn(
                      "relative cursor-pointer border-l-[4px] px-5 py-4 transition lg:grid lg:grid-cols-[1.34fr_1fr_0.72fr_0.82fr_0.7fr_3.5rem] lg:items-center lg:gap-4",
                      selected
                        ? "border-l-brand-500 bg-brand-50/28 shadow-[inset_0_0_0_1px_rgba(84,66,255,0.14)]"
                        : "border-l-transparent hover:bg-slate-50",
                    )}
                    key={row.item.id}
                    onClick={() => setSelectedRecordId(row.item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedRecordId(row.item.id);
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
                      <p className="mt-1 text-[0.84rem] text-slate-500">by Client</p>
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
                      <button
                        aria-label="Open record actions"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        onClick={() =>
                          setOpenMenuRecordId((current) =>
                            current === row.item.id ? "" : row.item.id,
                          )
                        }
                        type="button"
                      >
                        <MoreHorizontalIcon />
                      </button>

                      {openMenuRecordId === row.item.id ? (
                        <div className="absolute right-0 top-[calc(100%+0.55rem)] z-10 min-w-[220px] rounded-[1rem] border border-slate-200 bg-white p-2 shadow-[0_20px_42px_rgba(15,23,42,0.14)]">
                          <button
                            className="flex w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => openViewer(row.item.id)}
                            type="button"
                          >
                            View record
                            <ViewIcon />
                          </button>
                          <button
                            className="flex w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => handleDownloadRecord(row.record)}
                            type="button"
                          >
                            Download
                            <DownloadIcon />
                          </button>
                          <button
                            className="flex w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => openViewer(row.item.id, "comments", true)}
                            type="button"
                          >
                            Open comments
                            <span>+</span>
                          </button>
                          <button
                            className="flex w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => handleMenuAction(row.item.id, "under_review")}
                            type="button"
                          >
                            Notify under review
                            <span>!</span>
                          </button>
                          <button
                            className="flex w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => openViewer(row.item.id)}
                            type="button"
                          >
                            Reject with reason
                            <span>x</span>
                          </button>
                          <button
                            className="flex w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50"
                            onClick={() => handleMenuAction(row.item.id, "accepted")}
                            type="button"
                          >
                            Mark done
                            <span>OK</span>
                          </button>
                        </div>
                      ) : null}
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
      )}

      {viewerOpen && activeDocument && activeRow ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setViewerOpen(false)} />
          <div className="relative z-10 mx-auto w-full max-w-[1360px]">
            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_60px_rgba(15,23,42,0.18)]">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1.08fr)_390px]">
                <div className="border-b border-slate-200 xl:border-b-0 xl:border-r xl:border-slate-200">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <QueueFileIcon
                        documentType={activeDocument.documentType}
                        fileName={activeDocument.fileName}
                      />
                      <div className="min-w-0">
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
                        <h2 className="mt-3 truncate text-[1.08rem] font-semibold text-slate-950">
                          {activeDocument.fileName}
                        </h2>
                        <p className="mt-1 text-[0.88rem] text-slate-500">
                          {activeDocument.clientName} / {activeDocument.monthLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Button
                        className="h-10 rounded-xl px-4 text-brand-600"
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
                      <button
                        aria-label="Close record viewer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        onClick={() => setViewerOpen(false)}
                        type="button"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_38%)] px-5 py-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4">
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Client
                        </p>
                        <p className="mt-2 text-[0.92rem] font-semibold text-slate-950">
                          {activeDocument.clientName}
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4">
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Period
                        </p>
                        <p className="mt-2 text-[0.92rem] font-semibold text-slate-950">
                          {activeDocument.monthLabel}
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4">
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Supplier / source
                        </p>
                        <p className="mt-2 text-[0.92rem] font-semibold text-slate-950">
                          {activeDocument.supplierName ?? activeDocument.clientName}
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4">
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Amount / size
                        </p>
                        <p className="mt-2 text-[0.92rem] font-semibold text-slate-950">
                          {activeDocument.amountLabel ?? activeDocument.sizeLabel}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Document preview
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Review the extracted snapshot before making a status decision.
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-500">
                          {previewLines.length} lines
                        </span>
                      </div>

                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5">
                        <div className="space-y-3 font-mono text-[0.82rem] leading-7 text-slate-600">
                          {previewLines.map((line, index) => (
                            <p key={`${activeDocument.id}-line-${index}`}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <SurfaceCard className="space-y-5 rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-none">
                    <div className="space-y-2">
                      <h2 className="text-[1.1rem] font-semibold text-slate-950">Review decision</h2>
                      <p className="text-[0.82rem] text-slate-500">
                        Complete one clear decision for this record and keep the client thread attached to the file.
                      </p>
                    </div>

                    {activeStatus ? (
                      <div className={cn("rounded-[1.15rem] border p-4", activeStatus.panel)}>
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[0.8rem] font-medium text-slate-500">Uploaded by</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {getInitials(activeDocument.uploadedBy)}
                          </div>
                          <div>
                            <p className="text-[0.9rem] font-semibold text-slate-950">
                              {activeDocument.uploadedBy}
                            </p>
                            <p className="text-[0.8rem] text-slate-500">Client user</p>
                          </div>
                        </div>
                        <p className="mt-4 text-[0.82rem] text-slate-500">
                          {formatDateTimeLabel(activeDocument.uploadedAt)}
                        </p>
                      </div>

                      <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[0.8rem] font-medium text-slate-500">Reviewed by</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                            {getInitials(activeDocument.reviewedBy ?? user?.fullName ?? "Accountant")}
                          </div>
                          <div>
                            <p className="text-[0.9rem] font-semibold text-slate-950">
                              {activeDocument.reviewedBy ?? "Unassigned"}
                            </p>
                            <p className="text-[0.8rem] text-slate-500">
                              {activeDocument.reviewedAt ? "Accountant" : "Waiting for review"}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-[0.82rem] text-slate-500">
                          {activeDocument.reviewedAt
                            ? formatDateTimeLabel(activeDocument.reviewedAt)
                            : "Waiting for review"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        className="text-[0.9rem] font-semibold text-slate-950"
                        htmlFor="review-reason"
                      >
                        Review reason
                      </label>
                      <textarea
                        className="min-h-[112px] w-full rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                        id="review-reason"
                        onChange={(event) => setReviewReason(event.target.value)}
                        placeholder="Explain what is missing or what should happen next."
                        value={reviewReason}
                      />
                      <p className="text-[0.8rem] text-slate-500">
                        Required when you reject the record and send it back to the client.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Button
                        className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => handleReviewAction("accepted")}
                      >
                        Done reviewing
                      </Button>
                      <Button
                        className="h-11 rounded-xl border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                        onClick={() => handleReviewAction("under_review")}
                        variant="secondary"
                      >
                        Notify under review
                      </Button>
                      <Button
                        className="h-11 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                        onClick={() => handleReviewAction("rejected")}
                        variant="secondary"
                      >
                        Reject record
                      </Button>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="space-y-4 rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[1.1rem] font-semibold text-slate-950">Record activity</h2>
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.72rem] font-semibold text-brand-700">
                          {activityTab === "comments"
                            ? orderedComments.length
                            : activeDocument.auditTrail.length}
                        </span>
                      </div>
                      <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                        {[
                          { id: "comments" as const, label: "Comments" },
                          { id: "audit" as const, label: "Audit trail" },
                        ].map((tab) => (
                          <button
                            className={cn(
                              "rounded-full px-3 py-1.5 text-[0.78rem] font-medium transition",
                              activityTab === tab.id
                                ? "bg-white text-brand-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700",
                            )}
                            key={tab.id}
                            onClick={() => setActivityTab(tab.id)}
                            type="button"
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activityTab === "comments" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[0.82rem] text-slate-500">
                            Keep comments specific to this record. The client will only see feedback attached to this file.
                          </p>
                          <Button
                            className="h-10 rounded-xl px-4 text-brand-600"
                            onClick={() => setShowComposer((current) => !current)}
                            size="sm"
                            variant="secondary"
                          >
                            {showComposer ? "Close" : "Add comment"}
                          </Button>
                        </div>

                        {showComposer ? (
                          <div className="space-y-3 rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                            <textarea
                              className="min-h-[96px] w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                              onChange={(event) => setCommentDraft(event.target.value)}
                              placeholder="Leave a file-specific review note for the client."
                              value={commentDraft}
                            />
                            {commentError ? (
                              <p className="text-sm text-rose-600">{commentError}</p>
                            ) : null}
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[0.82rem] text-slate-500">
                                Comments stay attached to the exact record under review.
                              </p>
                              <Button className="h-10 rounded-xl px-4" onClick={handleCommentSubmit} size="sm">
                                Post comment
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {orderedComments.length > 0 ? (
                          <div className="space-y-3">
                            {orderedComments.map((comment: DocumentComment) => (
                              <article
                                className="rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                                key={comment.id}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={cn(
                                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                                      comment.role === "accountant"
                                        ? "bg-[linear-gradient(135deg,#6d5efc,#7e67ff)]"
                                        : "bg-emerald-500",
                                    )}
                                  >
                                    {getInitials(comment.author)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-[0.9rem] font-semibold text-slate-950">
                                        {comment.author}
                                      </p>
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-medium text-slate-500">
                                        {comment.role === "accountant" ? "Accountant" : "Client User"}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-[0.9rem] leading-7 text-slate-600">
                                      {comment.message}
                                    </p>
                                    <p className="mt-3 text-[0.8rem] text-slate-400">
                                      {formatDateTimeLabel(comment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <EmptyState
                            description="No one has commented on this record yet. Add a note when you need to give the client precise review context."
                            title="No comments yet"
                          />
                        )}
                      </div>
                    ) : activeDocument.auditTrail.length > 0 ? (
                      <AuditTrail entries={activeDocument.auditTrail} />
                    ) : (
                      <EmptyState
                        description="Audit events will appear here as the review moves through the workflow."
                        title="No audit events yet"
                      />
                    )}
                  </SurfaceCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
