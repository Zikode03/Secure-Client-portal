import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
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
import { formatDateLabel, formatDateTimeLabel } from "../../utils/formatters";

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

function MessageIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.5 9.5h5M9.5 12.5h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
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

function DocumentMetaIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24">
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

function SummaryIcon({ kind }: { kind: "open" | "waiting" | "due" | "resolved" }) {
  const classes =
    kind === "resolved"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
      : kind === "due"
        ? "bg-rose-50 text-rose-500 ring-rose-100"
        : kind === "waiting"
          ? "bg-amber-50 text-amber-500 ring-amber-100"
          : "bg-brand-50 text-brand-600 ring-brand-100";

  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${classes}`}>
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
      ) : kind === "due" ? (
        <CalendarIcon />
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
        <MessageIcon />
      )}
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function daysUntilDue(dateValue: string) {
  const today = new Date("2026-05-06T00:00:00.000Z");
  const dueDate = new Date(dateValue);
  const difference = dueDate.getTime() - today.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function requestStatusMeta(status: RequestStatus) {
  switch (status) {
    case "awaiting_client":
      return {
        label: "Waiting on you",
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
      };
    case "client_replied":
      return {
        label: "Client replied",
        badge: "bg-brand-50 text-brand-700 ring-brand-200",
      };
    case "resolved":
      return {
        label: "Resolved",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "closed":
      return {
        label: "Closed",
        badge: "bg-slate-100 text-slate-600 ring-slate-200",
      };
    default:
      return {
        label: "Open",
        badge: "bg-rose-50 text-rose-700 ring-rose-200",
      };
  }
}

function priorityMeta(priority: RequestPriority) {
  switch (priority) {
    case "high":
      return "text-rose-600";
    case "medium":
      return "text-amber-600";
    default:
      return "text-emerald-600";
  }
}

function requestTypeMeta(documentType: string) {
  if (documentType === "Bank Statement") {
    return {
      iconClass: "bg-sky-50 text-sky-600 ring-sky-100",
      label: "Bank Statement",
    };
  }

  if (documentType === "Invoices") {
    return {
      iconClass: "bg-rose-50 text-rose-500 ring-rose-100",
      label: "Invoices",
    };
  }

  if (documentType === "Signed Documents") {
    return {
      iconClass: "bg-amber-50 text-amber-500 ring-amber-100",
      label: "Signed Documents",
    };
  }

  return {
    iconClass: "bg-brand-50 text-brand-600 ring-brand-100",
    label: "Compliance Record",
  };
}

function inferSlotFromRequest(request: WorkflowRequest, slots: MonthlyDocumentSlot[], documents: DocumentRecord[]) {
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

function RequestTypeIcon({ documentType }: { documentType: string }) {
  const meta = requestTypeMeta(documentType);

  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${meta.iconClass}`}>
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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

type RequestDetailTab = "comments" | "audit" | "documents";

export function ClientRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uploadModal = useDisclosure(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
  const [activeTab, setActiveTab] = useState<RequestDetailTab>("comments");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);

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

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((left, right) => {
        const leftResolved = ["resolved", "closed"].includes(left.status);
        const rightResolved = ["resolved", "closed"].includes(right.status);

        if (leftResolved !== rightResolved) {
          return leftResolved ? 1 : -1;
        }

        return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      }),
    [requests],
  );

  const selectedRequest = useMemo(
    () =>
      sortedRequests.find((request) => request.id === selectedRequestId) ??
      sortedRequests[0] ??
      null,
    [selectedRequestId, sortedRequests],
  );

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

  const summaryMetrics = useMemo(() => {
    const unresolvedRequests = requests.filter(
      (request) => !["resolved", "closed"].includes(request.status),
    );
    const waitingOnYouCount = requests.filter(
      (request) => request.status === "awaiting_client",
    ).length;
    const openCount = requests.filter(
      (request) => request.status === "open" || request.status === "client_replied",
    ).length;
    const dueSoonCount = unresolvedRequests.filter((request) => {
      const remainingDays = daysUntilDue(request.dueDate);
      return remainingDays >= 0 && remainingDays <= 7;
    }).length;
    const resolvedCount = requests.filter((request) =>
      ["resolved", "closed"].includes(request.status),
    ).length;

    return [
      {
        id: "open",
        title: "Open",
        value: openCount,
        helper: "Workflow requests in progress",
        icon: "open" as const,
      },
      {
        id: "waiting",
        title: "Waiting on you",
        value: waitingOnYouCount,
        helper: "Awaiting your response",
        icon: "waiting" as const,
      },
      {
        id: "due",
        title: "Due soon",
        value: dueSoonCount,
        helper: "Due in next 7 days",
        icon: "due" as const,
      },
      {
        id: "resolved",
        title: "Resolved",
        value: resolvedCount,
        helper: "Completed requests",
        icon: "resolved" as const,
      },
    ];
  }, [requests]);

  const topUploadSlot = useMemo(
    () => selectedRequestRelatedSlot ?? inferSlotFromRequest(sortedRequests[0] ?? null as never, monthPack.slots, documents),
    [documents, monthPack.slots, selectedRequestRelatedSlot, sortedRequests],
  );

  function handleOpenUpload(slot: MonthlyDocumentSlot | null) {
    if (!slot) {
      showFeedbackNotice(
        "warning",
        "No upload slot available",
        "This request does not map to a structured upload slot yet. Open Monthly Packs and choose the right checklist item.",
      );
      return;
    }

    setSelectedSlot(slot);
    uploadModal.open();
  }

  function handleSubmitComment() {
    if (!selectedRequest || !user) {
      setCommentError("Select a request before sending a reply.");
      return;
    }

    const trimmed = commentDraft.trim();
    if (!trimmed) {
      setCommentError("Write a clear message before sending it.");
      return;
    }

    const result = replyToRequest(selectedRequest.id, user.role, user.fullName, trimmed);
    if (!result.ok) {
      setCommentError(result.message);
      return;
    }

    setCommentDraft("");
    setCommentError("");
  }

  function handleResolveCurrentRequest() {
    if (!selectedRequest || !user) {
      return;
    }

    resolveRequest(selectedRequest.id);
    setDetailMenuOpen(false);
  }

  const detailActionLabel = selectedRequestRelatedSlot
    ? `Upload ${selectedRequestRelatedSlot.documentType.toLowerCase()}`
    : "Open monthly pack";

  return (
    <div className="mx-auto max-w-[1260px] space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">
            Client requests
          </div>
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
            My requests and tasks
          </h1>
          <p className="max-w-3xl text-[0.94rem] leading-7 text-slate-500">
            Requests are task-based and document-based. They tell you exactly what your accountant needs and when it is due.
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
            onClick={() => navigate("/client/messages")}
          >
            <MessageIcon />
            <span>New message</span>
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

      <SurfaceCard className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="grid lg:grid-cols-4">
          {summaryMetrics.map((metric, index) => (
            <div
              className={`flex items-center gap-4 px-5 py-5 ${
                index !== summaryMetrics.length - 1 ? "lg:border-r lg:border-slate-100" : ""
              }`}
              key={metric.id}
            >
              <SummaryIcon kind={metric.icon} />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-500">{metric.title}</p>
                <p className="text-[1.6rem] font-semibold tracking-tight text-slate-950">{metric.value}</p>
                <p className="text-[0.84rem] text-slate-500">{metric.helper}</p>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.39fr)_minmax(0,0.61fr)] xl:items-start">
        <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
            <h2 className="text-[1.08rem] font-semibold text-slate-950">Open workflow requests</h2>
            <button className="text-sm font-medium text-slate-500" type="button">
              Sort: Due date
            </button>
          </div>

          {sortedRequests.length > 0 ? (
            <>
              <div className="divide-y divide-slate-100">
                {sortedRequests.map((request) => {
                  const meta = requestStatusMeta(request.status);
                  const relatedSlot = inferSlotFromRequest(request, monthPack.slots, documents);
                  const relatedType = relatedSlot?.documentType ?? "Compliance Record";
                  const isSelected = selectedRequest?.id === request.id;

                  return (
                    <button
                      className={`w-full px-4 py-4 text-left transition ${
                        isSelected
                          ? "bg-brand-50/40 ring-1 ring-inset ring-brand-200"
                          : "hover:bg-slate-50"
                      }`}
                      key={request.id}
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setActiveTab("comments");
                      }}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <RequestTypeIcon documentType={relatedType} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[1rem] font-medium leading-6 text-slate-950">
                                {request.title}
                              </p>
                              <p className="text-[0.86rem] text-slate-500">
                                Related to: {relatedRecordLabel(request, documents, monthPack.slots)}
                              </p>
                            </div>
                            <ChevronRightIcon />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                            <div className="flex items-center gap-2 text-[0.84rem] text-slate-500">
                              <CalendarIcon />
                              <span>Due {formatDateLabel(request.dueDate)}</span>
                            </div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-50/60"
                onClick={() => navigate("/client/requests")}
                type="button"
              >
                <span>View all requests</span>
                <ChevronRightIcon />
              </button>
            </>
          ) : (
            <div className="px-5 py-6">
              <EmptyState
                description="Requests will appear here when your accountant needs a correction, missing document, or clarification."
                title="No workflow requests"
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
          {selectedRequest ? (
            <>
              <div className="space-y-5 border-b border-slate-100 px-5 pb-5 pt-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${requestStatusMeta(selectedRequest.status).badge}`}
                    >
                      {requestStatusMeta(selectedRequest.status).label}
                    </span>
                    <h2 className="text-[1.55rem] font-semibold tracking-tight text-slate-950">
                      {selectedRequest.title}
                    </h2>
                  </div>

                  <div className="relative flex items-center gap-2.5">
                    <Button
                      className="h-10 rounded-xl border border-brand-200 bg-white px-4 text-sm text-brand-600 hover:bg-brand-50"
                      onClick={() =>
                        selectedRequestRelatedSlot
                          ? handleOpenUpload(selectedRequestRelatedSlot)
                          : navigate("/client/packs#pack-checklist")
                      }
                      variant="secondary"
                    >
                      <UploadIcon />
                      <span>{detailActionLabel}</span>
                    </Button>
                    <button
                      aria-label="Open request actions"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      onClick={() => setDetailMenuOpen((current) => !current)}
                      type="button"
                    >
                      <MoreIcon />
                    </button>

                    {detailMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
                        <button
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => {
                            navigate("/client/packs#pack-checklist");
                            setDetailMenuOpen(false);
                          }}
                          type="button"
                        >
                          Open monthly pack
                          <ChevronRightIcon />
                        </button>
                        <button
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => {
                            navigate("/client/documents");
                            setDetailMenuOpen(false);
                          }}
                          type="button"
                        >
                          Open documents
                          <ChevronRightIcon />
                        </button>
                        {selectedRequest.status !== "resolved" && selectedRequest.status !== "closed" ? (
                          <button
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={handleResolveCurrentRequest}
                            type="button"
                          >
                            Mark as resolved
                            <ChevronRightIcon />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <DocumentMetaIcon />
                      <span>Related to</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-brand-700">{selectedRequestLabel}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <UserIcon />
                      <span>Requested by</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-slate-950">{selectedRequest.requestedBy}</p>
                    <p className="text-[0.82rem] text-slate-500">
                      {selectedRequest.requestedByRole === "accountant" ? "Accountant" : "Client"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <CalendarIcon />
                      <span>Due date</span>
                    </div>
                    <p className="text-[0.98rem] font-semibold text-rose-600">{formatDateLabel(selectedRequest.dueDate)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[0.82rem] font-medium text-slate-500">
                      <PriorityIcon />
                      <span>Priority</span>
                    </div>
                    <p className={`text-[0.98rem] font-semibold capitalize ${priorityMeta(selectedRequest.priority)}`}>
                      {selectedRequest.priority}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">Request details</p>
                  <p className="mt-2 text-[0.92rem] leading-7 text-slate-600">{selectedRequest.description}</p>
                </div>
              </div>

              <div className="border-b border-slate-100 px-5">
                <div className="flex flex-wrap items-center gap-6">
                  {[
                    { id: "comments" as const, label: "Comments", count: selectedRequest.comments.length },
                    { id: "audit" as const, label: "Audit trail", count: selectedRequest.auditTrail.length },
                    { id: "documents" as const, label: "Related documents", count: selectedRequestRelatedDocuments.length },
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
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-500">
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-5">
                {activeTab === "comments" ? (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5442ff,#6f59ff)] text-sm font-semibold text-white">
                        {getInitials(user?.fullName ?? "Client user")}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <textarea
                            className="min-h-[54px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder="Write a comment..."
                            value={commentDraft}
                          />
                          {commentError ? (
                            <p className="mt-2 text-sm text-rose-600">{commentError}</p>
                          ) : null}
                        </div>
                        <Button
                          className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-4 shadow-[0_12px_24px_rgba(84,66,255,0.18)]"
                          onClick={handleSubmitComment}
                        >
                          <MessageIcon />
                          <span>Send</span>
                        </Button>
                      </div>
                    </div>

                    {selectedRequest.comments.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-[1.3rem] border border-slate-200 bg-white">
                        {[...selectedRequest.comments].reverse().map((comment) => (
                          <div className="flex items-start gap-3 px-4 py-4" key={comment.id}>
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                                comment.role === "accountant"
                                  ? "bg-emerald-500"
                                  : "bg-[linear-gradient(135deg,#5442ff,#6f59ff)]"
                              }`}
                            >
                              {getInitials(comment.author)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950">
                                  {comment.author}
                                  {comment.author === user?.fullName ? " (You)" : ""}
                                </p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-medium text-slate-500">
                                  {comment.role === "accountant" ? "Accountant" : "Client"}
                                </span>
                                <span className="text-[0.82rem] text-slate-400">
                                  {formatDateTimeLabel(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-[0.92rem] leading-7 text-slate-600">{comment.message}</p>
                            </div>
                            <button
                              aria-label="Comment options"
                              className="text-slate-300 transition hover:text-slate-500"
                              type="button"
                            >
                              <MoreIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        description="Reply here when you have corrected the request or need more context from your accountant."
                        title="No comments yet"
                      />
                    )}

                    <button
                      className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
                      onClick={() => navigate("/client/messages")}
                      type="button"
                    >
                      View all comments
                    </button>
                  </div>
                ) : null}

                {activeTab === "audit" ? (
                  <div className="space-y-4">
                    <AuditTrail entries={selectedRequest.auditTrail} />
                  </div>
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
                              {formatDateLabel(document.uploadedAt)} / {document.status}
                            </p>
                          </div>
                          <Button
                            className="h-9 rounded-xl px-3"
                            onClick={() => navigate("/client/documents")}
                            size="sm"
                            variant="secondary"
                          >
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      description="This request is currently attached to a missing or not-yet-uploaded record, so there is no related file to review here."
                      title="No related documents"
                    />
                  )
                ) : null}
              </div>
            </>
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                description="Choose a workflow request from the left to review the task, comments, audit trail, and related documents."
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
