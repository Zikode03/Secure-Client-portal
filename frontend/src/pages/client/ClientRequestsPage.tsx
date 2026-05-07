import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type {
  DocumentRecord,
  MonthlyDocumentSlot,
  RequestPriority,
  RequestStatus,
  WorkflowRequest,
} from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

type RequestDetailTab = "overview" | "comments" | "audit" | "documents";
type RequestListFilter = "all" | "open" | "waiting" | "overdue" | "resolved";

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 3.75 3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
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

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.75 3.75V8h4.25"
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
        d="m9 6 6 6-6 6"
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
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
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

function UserIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 18.5c1.75-2.75 4.08-4.13 6.5-4.13 2.42 0 4.75 1.38 6.5 4.13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
      <path
        d="m7 17 10-10M9 7h8v8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SummaryIcon({ kind }: { kind: "open" | "waiting" | "overdue" | "resolved" }) {
  const classes =
    kind === "resolved"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
      : kind === "overdue"
        ? "bg-rose-50 text-rose-500 ring-rose-100"
        : kind === "waiting"
          ? "bg-amber-50 text-amber-500 ring-amber-100"
          : "bg-brand-50 text-brand-600 ring-brand-100";

  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${classes}`}>
      {kind === "resolved" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="m7.5 12.5 2.75 2.75L16.5 9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : kind === "overdue" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 8.5v4m0 3h.01M10.26 4.76 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25H18.8a1.5 1.5 0 0 0 1.3-2.25L12.74 4.76a1.5 1.5 0 0 0-2.48 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : kind === "waiting" ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 8v4l2.5 2.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
    </div>
  );
}

function RequestTypeIcon({ documentType }: { documentType: string }) {
  const classes =
    documentType === "Bank Statement"
      ? "bg-sky-50 text-sky-600 ring-sky-100"
      : documentType === "Invoices"
        ? "bg-rose-50 text-rose-500 ring-rose-100"
        : documentType === "Signed Documents"
          ? "bg-amber-50 text-amber-500 ring-amber-100"
          : "bg-brand-50 text-brand-600 ring-brand-100";

  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${classes}`}>
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
        <path
          d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M13.75 3.75V8h4.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function daysUntilDue(dateValue: string) {
  const today = new Date("2026-05-06T00:00:00.000Z");
  const dueDate = new Date(dateValue);
  const difference = dueDate.getTime() - today.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function dueLabel(dateValue: string) {
  const days = daysUntilDue(dateValue);

  if (days < 0) {
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "Due in 1 day";
  }

  return `Due in ${days} days`;
}

function requestStatusMeta(status: RequestStatus, dueDate: string) {
  const overdue = daysUntilDue(dueDate) < 0 && !["resolved", "closed"].includes(status);
  if (overdue) {
    return {
      filter: "overdue" as const,
      label: "Overdue",
      badge: "bg-rose-50 text-rose-700 ring-rose-200",
    };
  }

  switch (status) {
    case "awaiting_client":
      return {
        filter: "waiting" as const,
        label: "Waiting on me",
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
      };
    case "client_replied":
      return {
        filter: "open" as const,
        label: "Waiting on accountant",
        badge: "bg-brand-50 text-brand-700 ring-brand-200",
      };
    case "resolved":
      return {
        filter: "resolved" as const,
        label: "Resolved",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "closed":
      return {
        filter: "resolved" as const,
        label: "Resolved",
        badge: "bg-slate-100 text-slate-600 ring-slate-200",
      };
    default:
      return {
        filter: "open" as const,
        label: "Open",
        badge: "bg-rose-50 text-rose-700 ring-rose-200",
      };
  }
}

function priorityMeta(priority: RequestPriority) {
  switch (priority) {
    case "high":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "medium":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
}

function inferSlotFromRequest(
  request: WorkflowRequest,
  slots: MonthlyDocumentSlot[],
  documents: DocumentRecord[],
) {
  if (request.relatedDocumentId) {
    const relatedDocument = documents.find((document) => document.id === request.relatedDocumentId);
    if (relatedDocument) {
      return slots.find((slot) => slot.documentType === relatedDocument.documentType) ?? null;
    }
  }

  const searchText = `${request.title} ${request.description}`.toLowerCase();

  if (searchText.includes("bank statement")) {
    return slots.find((slot) => slot.documentType === "Bank Statement") ?? null;
  }

  if (searchText.includes("invoice") || searchText.includes("vat")) {
    return slots.find((slot) => slot.documentType === "Invoices") ?? null;
  }

  if (searchText.includes("signed")) {
    return slots.find((slot) => slot.documentType === "Signed Documents") ?? null;
  }

  if (
    searchText.includes("compliance") ||
    searchText.includes("certificate") ||
    searchText.includes("tax")
  ) {
    return slots.find((slot) => slot.documentType === "Compliance Record") ?? null;
  }

  return null;
}

function inferRelatedDocuments(
  request: WorkflowRequest,
  documents: DocumentRecord[],
  slots: MonthlyDocumentSlot[],
) {
  if (request.relatedDocumentId) {
    return documents.filter((document) => document.id === request.relatedDocumentId);
  }

  const relatedSlot = inferSlotFromRequest(request, slots, documents);
  if (!relatedSlot) {
    return [];
  }

  return documents.filter(
    (document) =>
      document.documentType === relatedSlot.documentType &&
      document.monthLabel === request.monthLabel,
  );
}

function relatedRecordLabel(
  request: WorkflowRequest,
  documents: DocumentRecord[],
  slots: MonthlyDocumentSlot[],
) {
  const relatedDocuments = inferRelatedDocuments(request, documents, slots);
  if (relatedDocuments[0]) {
    return `${relatedDocuments[0].documentType} - ${relatedDocuments[0].monthLabel}`;
  }

  const relatedSlot = inferSlotFromRequest(request, slots, documents);
  if (relatedSlot) {
    return `${relatedSlot.documentType} - ${request.monthLabel}`;
  }

  return request.monthLabel;
}

function primaryActionForRequest(
  request: WorkflowRequest,
  relatedSlot: MonthlyDocumentSlot | null,
) {
  if (["resolved", "closed"].includes(request.status)) {
    return {
      kind: "view" as const,
      label: "View resolved request",
      listLabel: "View resolved request",
      helper: "Review the completed task history and related records.",
    };
  }

  if (relatedSlot?.status === "rejected") {
    return {
      kind: "reupload" as const,
      label: `Re-upload ${relatedSlot.documentType}`,
      listLabel: "Re-upload corrected file",
      helper: "Upload the corrected version through the structured slot.",
    };
  }

  if (relatedSlot?.status === "missing") {
    return {
      kind: "upload" as const,
      label: `Upload ${relatedSlot.documentType}`,
      listLabel: "Upload required document",
      helper: "Provide the missing document through the correct workflow slot.",
    };
  }

  if (request.status === "awaiting_client") {
    return {
      kind: "reply" as const,
      label: "Reply to accountant",
      listLabel: "Reply",
      helper: "Add context or confirm progress for your accountant.",
    };
  }

  if (relatedSlot) {
    return {
      kind: "open-pack" as const,
      label: "Open Monthly Pack",
      listLabel: "Open monthly pack",
      helper: "Open the structured checklist item linked to this request.",
    };
  }

  return {
    kind: "reply" as const,
    label: "Reply to accountant",
    listLabel: "Reply",
    helper: "Respond inside this request thread with the relevant context.",
  };
}

function requestSearchText(
  request: WorkflowRequest,
  documents: DocumentRecord[],
  slots: MonthlyDocumentSlot[],
) {
  return [
    request.title,
    request.description,
    request.requestedBy,
    request.monthLabel,
    request.priority,
    request.status,
    relatedRecordLabel(request, documents, slots),
    requestStatusMeta(request.status, request.dueDate).label,
  ]
    .join(" ")
    .toLowerCase();
}

export function ClientRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uploadModal = useDisclosure(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
  const [activeTab, setActiveTab] = useState<RequestDetailTab>("overview");
  const [activeFilter, setActiveFilter] = useState<RequestListFilter>("all");
  const [searchValue, setSearchValue] = useState("");

  const {
    clientName,
    dismissFeedbackNotice,
    documents,
    feedbackNotice,
    monthPack,
    replyToRequest,
    requests,
    resolveRequest,
    showFeedbackNotice,
    uploadToSlot,
  } = useClientWorkflow({
    clientId: user?.clientIds[0],
    clientName: user?.company,
    uploadedBy: user?.fullName ?? user?.name,
  });

  const filteredRequests = useMemo(() => {
    const normalisedSearch = searchValue.trim().toLowerCase();

    return [...requests]
      .filter((request) => {
        const meta = requestStatusMeta(request.status, request.dueDate);
        const matchesFilter =
          activeFilter === "all" || meta.filter === activeFilter;
        const matchesSearch =
          !normalisedSearch ||
          requestSearchText(request, documents, monthPack.slots).includes(normalisedSearch);

        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => {
        const leftResolved = ["resolved", "closed"].includes(left.status);
        const rightResolved = ["resolved", "closed"].includes(right.status);

        if (leftResolved !== rightResolved) {
          return leftResolved ? 1 : -1;
        }

        return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      });
  }, [activeFilter, documents, monthPack.slots, requests, searchValue]);

  const selectedRequest = useMemo(
    () =>
      filteredRequests.find((request) => request.id === selectedRequestId) ??
      filteredRequests[0] ??
      null,
    [filteredRequests, selectedRequestId],
  );

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedRequestId("");
      return;
    }

    const hasSelection = filteredRequests.some((request) => request.id === selectedRequestId);
    if (!hasSelection) {
      setSelectedRequestId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedRequestId]);

  useEffect(() => {
    setActiveTab("overview");
  }, [selectedRequestId]);

  const selectedRequestRelatedSlot = useMemo(
    () =>
      selectedRequest
        ? inferSlotFromRequest(selectedRequest, monthPack.slots, documents)
        : null,
    [documents, monthPack.slots, selectedRequest],
  );

  const selectedRequestRelatedDocuments = useMemo(
    () =>
      selectedRequest
        ? inferRelatedDocuments(selectedRequest, documents, monthPack.slots)
        : [],
    [documents, monthPack.slots, selectedRequest],
  );

  const selectedRequestLabel = useMemo(
    () =>
      selectedRequest
        ? relatedRecordLabel(selectedRequest, documents, monthPack.slots)
        : "",
    [documents, monthPack.slots, selectedRequest],
  );

  const topUploadSlot = useMemo(() => {
    const referenceRequest = selectedRequest ?? filteredRequests[0] ?? null;
    return referenceRequest
      ? inferSlotFromRequest(referenceRequest, monthPack.slots, documents)
      : null;
  }, [documents, filteredRequests, monthPack.slots, selectedRequest]);

  const summaryMetrics = useMemo(() => {
    const unresolvedRequests = requests.filter(
      (request) => !["resolved", "closed"].includes(request.status),
    );
    const openCount = unresolvedRequests.filter(
      (request) => requestStatusMeta(request.status, request.dueDate).filter === "open",
    ).length;
    const waitingOnYouCount = unresolvedRequests.filter(
      (request) => requestStatusMeta(request.status, request.dueDate).filter === "waiting",
    ).length;
    const overdueCount = unresolvedRequests.filter(
      (request) => requestStatusMeta(request.status, request.dueDate).filter === "overdue",
    ).length;
    const resolvedCount = requests.filter((request) =>
      ["resolved", "closed"].includes(request.status),
    ).length;

    return [
      {
        id: "open",
        label: "Open requests",
        value: openCount,
        helper: "Still in progress",
        icon: "open" as const,
      },
      {
        id: "waiting",
        label: "Waiting on me",
        value: waitingOnYouCount,
        helper: "Needs your action",
        icon: "waiting" as const,
      },
      {
        id: "overdue",
        label: "Overdue",
        value: overdueCount,
        helper: "Past due date",
        icon: "overdue" as const,
      },
      {
        id: "resolved",
        label: "Resolved",
        value: resolvedCount,
        helper: "Completed tasks",
        icon: "resolved" as const,
      },
    ];
  }, [requests]);

  function handleOpenUpload(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      showFeedbackNotice(
        "warning",
        "No upload slot available",
        "This request does not map to a structured upload slot yet. Open Monthly Packs and choose the correct checklist item.",
      );
      return;
    }

    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handlePrimaryAction(request: WorkflowRequest) {
    const relatedSlot = inferSlotFromRequest(request, monthPack.slots, documents);
    const action = primaryActionForRequest(request, relatedSlot);

    if (action.kind === "upload" || action.kind === "reupload") {
      handleOpenUpload(relatedSlot);
      return;
    }

    if (action.kind === "open-pack") {
      navigate("/client/packs#pack-checklist");
      return;
    }

    if (action.kind === "view") {
      setActiveTab("audit");
      return;
    }

    setActiveTab("comments");
  }

  function handleSubmitComment(message: string) {
    if (!selectedRequest || !user) {
      return { ok: false, message: "Select a request before replying." };
    }

    return replyToRequest(selectedRequest.id, user.role, user.fullName, message);
  }

  function handleResolveCurrentRequest() {
    if (!selectedRequest) {
      return;
    }

    resolveRequest(selectedRequest.id);
  }

  const selectedStatusMeta = selectedRequest
    ? requestStatusMeta(selectedRequest.status, selectedRequest.dueDate)
    : null;
  const selectedPrimaryAction = selectedRequest
    ? primaryActionForRequest(selectedRequest, selectedRequestRelatedSlot)
    : null;
  const canResolveCurrent = Boolean(
    selectedRequest && !["resolved", "closed"].includes(selectedRequest.status),
  );

  return (
    <div className="mx-auto max-w-[1240px] space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">
            Client requests
          </div>
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
            My requests and tasks
          </h1>
          <p className="max-w-3xl text-[0.94rem] leading-7 text-slate-500">
            Requests show what your accountant needs from you, when it is due, and what action
            must be taken.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <Button
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => handleOpenUpload(topUploadSlot)}
            variant="secondary"
          >
            <UploadIcon />
            <span>Upload document</span>
          </Button>
          <Button
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-5 text-sm shadow-[0_14px_28px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            onClick={() => navigate("/client/documents")}
          >
            <DocumentIcon />
            <span>Open document workspace</span>
          </Button>
        </div>
      </div>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={dismissFeedbackNotice}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="grid lg:grid-cols-4">
          {summaryMetrics.map((metric, index) => (
            <div
              className={`flex items-center gap-4 px-5 py-4 ${
                index !== summaryMetrics.length - 1 ? "lg:border-r lg:border-slate-100" : ""
              }`}
              key={metric.id}
            >
              <SummaryIcon kind={metric.icon} />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <p className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                  {metric.value}
                </p>
                <p className="text-[0.82rem] text-slate-500">{metric.helper}</p>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] xl:items-start">
        <SurfaceCard className="rounded-[1.45rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
          <div className="space-y-4 border-b border-slate-100 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.04rem] font-semibold text-slate-950">Request list</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-500">
                {filteredRequests.length} shown
              </span>
            </div>

            <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-500">
              <SearchIcon />
              <input
                className="w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by title, document, accountant, month, or status..."
                value={searchValue}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all" as const, label: "All" },
                { id: "open" as const, label: "Open" },
                { id: "waiting" as const, label: "Waiting on me" },
                { id: "overdue" as const, label: "Overdue" },
                { id: "resolved" as const, label: "Resolved" },
              ].map((item) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    activeFilter === item.id
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  key={item.id}
                  onClick={() => setActiveFilter(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((request) => {
                const relatedSlot = inferSlotFromRequest(request, monthPack.slots, documents);
                const relatedType = relatedSlot?.documentType ?? "Compliance Record";
                const isSelected = selectedRequest?.id === request.id;
                const statusMeta = requestStatusMeta(request.status, request.dueDate);
                const actionMeta = primaryActionForRequest(request, relatedSlot);

                return (
                  <button
                    className={`w-full px-5 py-4 text-left transition ${
                      isSelected
                        ? "bg-brand-50/35 ring-1 ring-inset ring-brand-200"
                        : "hover:bg-slate-50"
                    }`}
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <RequestTypeIcon documentType={relatedType} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[0.98rem] font-medium leading-6 text-slate-950">
                              {request.title}
                            </p>
                            <p className="text-[0.84rem] text-slate-500">
                              Linked item: {relatedRecordLabel(request, documents, monthPack.slots)}
                            </p>
                          </div>
                          <ChevronRightIcon />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset ${statusMeta.badge}`}
                          >
                            {statusMeta.label}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset ${priorityMeta(
                              request.priority,
                            )}`}
                          >
                            {request.priority}
                          </span>
                        </div>

                        <div className="grid gap-2 text-[0.82rem] text-slate-500 sm:grid-cols-2">
                          <p>Due {formatDateLabel(request.dueDate)}</p>
                          <p>Requested by {request.requestedBy}</p>
                        </div>

                        <p className="text-[0.84rem] font-medium text-brand-600">
                          {actionMeta.listLabel}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-6">
              <EmptyState
                description="No open requests. You are up to date."
                title="No requests found"
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="rounded-[1.45rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
          {selectedRequest ? (
            <>
              <div className="space-y-5 border-b border-slate-100 px-5 pb-5 pt-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset ${selectedStatusMeta?.badge}`}
                      >
                        {selectedStatusMeta?.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold capitalize ring-1 ring-inset ${priorityMeta(
                          selectedRequest.priority,
                        )}`}
                      >
                        {selectedRequest.priority} priority
                      </span>
                    </div>
                    <h2 className="text-[1.5rem] font-semibold tracking-tight text-slate-950">
                      {selectedRequest.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      className="h-10 rounded-xl border border-brand-200 bg-white px-4 text-sm text-brand-600 hover:bg-brand-50"
                      onClick={() => handlePrimaryAction(selectedRequest)}
                      variant="secondary"
                    >
                      <UploadIcon />
                      <span>{selectedPrimaryAction?.label}</span>
                    </Button>
                    {canResolveCurrent ? (
                      <Button
                        className="h-10 rounded-xl px-4"
                        onClick={handleResolveCurrentRequest}
                        variant="ghost"
                      >
                        Mark as resolved
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <DocumentIcon />
                      <span>Linked record</span>
                    </div>
                    <p className="text-[0.95rem] font-semibold text-brand-700">{selectedRequestLabel}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <UserIcon />
                      <span>Requested by</span>
                    </div>
                    <p className="text-[0.95rem] font-semibold text-slate-950">
                      {selectedRequest.requestedBy}
                    </p>
                    <p className="text-[0.82rem] text-slate-500">Accountant</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <CalendarIcon />
                      <span>Due date</span>
                    </div>
                    <p className="text-[0.95rem] font-semibold text-slate-950">
                      {formatDateLabel(selectedRequest.dueDate)}
                    </p>
                    <p className="text-[0.82rem] text-slate-500">{dueLabel(selectedRequest.dueDate)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <PriorityIcon />
                      <span>Status owner</span>
                    </div>
                    <p className="text-[0.95rem] font-semibold text-slate-950">
                      {selectedStatusMeta?.label}
                    </p>
                    <p className="text-[0.82rem] text-slate-500">{selectedPrimaryAction?.helper}</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 px-5">
                <div className="flex flex-wrap items-center gap-6">
                  {[
                    { id: "overview" as const, label: "Overview", count: null },
                    {
                      id: "comments" as const,
                      label: "Comments",
                      count: selectedRequest.comments.length,
                    },
                    {
                      id: "audit" as const,
                      label: "Audit trail",
                      count: selectedRequest.auditTrail.length,
                    },
                    {
                      id: "documents" as const,
                      label: "Related documents",
                      count: selectedRequestRelatedDocuments.length,
                    },
                  ].map((item) => (
                    <button
                      className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition ${
                        activeTab === item.id
                          ? "border-brand-500 text-brand-600"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      type="button"
                    >
                      <span>{item.label}</span>
                      {item.count !== null ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-500">
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-5">
                {activeTab === "overview" ? (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
                    <div className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Request description</p>
                        <p className="mt-2 text-[0.92rem] leading-7 text-slate-600">
                          {selectedRequest.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">Why it matters</p>
                        <p className="mt-2 text-[0.92rem] leading-7 text-slate-600">
                          Your accountant needs this item to complete the {selectedRequest.monthLabel} review and keep the month pack audit-ready.
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">What you need to do</p>
                        <p className="mt-2 text-[0.92rem] leading-7 text-slate-600">
                          {selectedPrimaryAction?.helper}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">Task summary</p>
                      <div className="mt-4 space-y-4 text-sm">
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Linked item</span>
                          <span className="font-medium text-slate-900">{selectedRequestLabel}</span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Due date</span>
                          <span className="font-medium text-slate-900">
                            {formatDateLabel(selectedRequest.dueDate)}
                          </span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Status</span>
                          <span className="font-medium text-slate-900">{selectedStatusMeta?.label}</span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Priority</span>
                          <span className="font-medium capitalize text-slate-900">
                            {selectedRequest.priority}
                          </span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 pb-4">
                          <span className="text-slate-500">Requested by</span>
                          <span className="font-medium text-slate-900">
                            {selectedRequest.requestedBy}
                          </span>
                        </div>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4">
                          <span className="text-slate-500">Created</span>
                          <span className="font-medium text-slate-900">
                            {formatDateLabel(selectedRequest.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "comments" ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      Files must be uploaded through the structured document slot so they can be named, tracked, and reviewed properly.
                    </div>
                    <CommentThread
                      comments={selectedRequest.comments}
                      composerLabel="Reply to this request"
                      composerPlaceholder="Add context for your accountant about this exact task."
                      currentAuthor={user?.fullName ?? "Client user"}
                      currentRole="client"
                      emptyDescription="No comments yet. Add a message when you need to give context to your accountant."
                      emptyTitle="No comments yet"
                      helperText="Files must be uploaded through the structured document slot so they can be named, tracked, and reviewed properly."
                      onSubmitComment={handleSubmitComment}
                      submitLabel="Send reply"
                    />
                  </div>
                ) : null}

                {activeTab === "audit" ? (
                  <AuditTrail entries={selectedRequest.auditTrail} />
                ) : null}

                {activeTab === "documents" ? (
                  selectedRequestRelatedDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRequestRelatedDocuments.map((document) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4"
                          key={document.id}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-950">{document.fileName}</p>
                            <p className="text-[0.84rem] text-slate-500">
                              {document.documentType} / {document.monthLabel}
                            </p>
                            <p className="text-[0.84rem] text-slate-400">
                              Updated {formatDateLabel(document.reviewedAt ?? document.uploadedAt)} / {document.status}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="h-9 rounded-xl px-3"
                              onClick={() => navigate("/client/documents")}
                              size="sm"
                              variant="secondary"
                            >
                              View
                            </Button>
                            {document.status === "rejected" ? (
                              <Button
                                className="h-9 rounded-xl px-3"
                                onClick={() => handleOpenUpload(selectedRequestRelatedSlot)}
                                size="sm"
                                variant="secondary"
                              >
                                Re-upload
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedRequestRelatedSlot ? (
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {selectedRequestRelatedSlot.documentType}
                      </p>
                      <p className="mt-1 text-[0.84rem] text-slate-500">
                        {selectedRequest.monthLabel} / {selectedRequestRelatedSlot.status}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          className="h-9 rounded-xl px-3"
                          onClick={() => handleOpenUpload(selectedRequestRelatedSlot)}
                          size="sm"
                          variant="secondary"
                        >
                          Upload
                        </Button>
                        <Button
                          className="h-9 rounded-xl px-3"
                          onClick={() => navigate("/client/documents")}
                          size="sm"
                          variant="secondary"
                        >
                          Open document workspace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      description="No related documents linked to this request yet."
                      title="No related documents"
                    />
                  )
                ) : null}
              </div>
            </>
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                description="Select a request to view details, comments, and audit history."
                title="No request selected"
              />
            </div>
          )}
        </SurfaceCard>
      </section>

      <DocumentUploadModal
        clientName={clientName ?? user?.company ?? "Apex Trading Ltd"}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={uploadToSlot}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
