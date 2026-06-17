// Friendly guide: this module (ClientComplianceCentrePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type {
  ComplianceCentreData,
  ComplianceDocumentRecord,
  Tone,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import { getClientFacingComplianceLabel } from "../../utils/compliance";
import { formatDateLabel } from "../../utils/formatters";

const complianceSnapshotDate = new Date("2026-05-07T00:00:00.000Z");
const navyCardClass =
  "border-[#c8d4e6] bg-[#f7faff] shadow-[0_16px_34px_rgba(6,32,68,0.08)]";
const navyInnerCardClass =
  "border-[#d7e1ef] bg-white shadow-[0_10px_22px_rgba(6,32,68,0.06)]";
const navySoftPanelClass = "border-[#d7e1ef] bg-[#eef4fb]";

// Shared shape notes: these types keep UI and data contracts aligned.
type FeedbackNotice = {
  tone: Tone;
  title: string;
  message: string;
};

type PriorityKind = "expired" | "expiring" | "missing";
type ComplianceCalendarEventCategory =
  | "all"
  | "obligation"
  | "expiry"
  | "request"
  | "monthly-pack";
type ComplianceCalendarEventStatus =
  | "upcoming"
  | "due-soon"
  | "overdue"
  | "completed";
type ComplianceCalendarStatusFilter = "all" | "overdue" | "due-soon" | "upcoming";

type ComplianceCalendarEvent = {
  id: string;
  title: string;
  category: Exclude<ComplianceCalendarEventCategory, "all">;
  status: ComplianceCalendarEventStatus;
  date: string;
  description?: string;
  actionUrl?: string;
  priority?: "low" | "medium" | "high";
  requiredDocuments?: string[];
  requestedBy?: string;
  actionLabel: string;
  item?: ComplianceDocumentRecord;
  kind?: PriorityKind;
};
type HealthMapCategoryId =
  | "tax"
  | "company"
  | "statutory"
  | "financial"
  | "employment";

interface HealthCategoryMeta {
  id: HealthMapCategoryId;
  title: string;
}

interface PriorityBadge {
  label: string;
  className: string;
}

interface InsightCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "brand" | "amber" | "rose" | "emerald";
  sparkline: string;
}

const healthCategoryMeta: HealthCategoryMeta[] = [
  { id: "tax", title: "Tax Compliance" },
  { id: "company", title: "Company Compliance" },
  { id: "statutory", title: "Statutory & Regulatory" },
  { id: "financial", title: "Financial Records" },
  { id: "employment", title: "Employment Compliance" },
];

// Component flow: gather data first, then render a focused UI state.
function DownloadIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.75v9.5m0 0 3.75-3.75M12 14.25l-3.75-3.75M5.75 16.25v1.5A2.5 2.5 0 0 0 8.25 20.25h7.5a2.5 2.5 0 0 0 2.5-2.5v-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3 19 6v6c0 4.9-2.8 8.7-7 10-4.2-1.3-7-5.1-7-10V6l7-3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9.5 12 1.7 1.7L14.8 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 18.5h8m-9-2V11a5 5 0 1 1 10 0v5.5l1.5 2H5.5l1.5-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
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
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 8.5v4m0 3h.01M10.26 4.76 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25H18.8a1.5 1.5 0 0 0 1.3-2.25L12.74 4.76a1.5 1.5 0 0 0-2.48 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12.5h3.2l1.8-4 3.1 8 2.1-4H19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.75" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 6.5v5c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75v-5M5.5 11.5v5c0 1.52 2.91 2.75 6.5 2.75s6.5-1.23 6.5-2.75v-5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
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
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 12h13m-4.5-4.5 4.5 4.5-4.5 4.5"
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
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function daysFromSnapshot(dateValue: string) {
  const difference = new Date(dateValue).getTime() - complianceSnapshotDate.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function formatExpiryMessage(expiryDate: string) {
  const days = daysFromSnapshot(expiryDate);

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `Expired ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago`;
  }

  if (days === 0) {
    return "Expires today";
  }

  if (days === 1) {
    return "Expires in 1 day";
  }

  return `Expires in ${days} days`;
}

function getSafeExpiryDate(document: ComplianceDocumentRecord) {
  return document.expiryDate ?? complianceSnapshotDate.toISOString();
}

function mapDocumentToHealthCategory(document: ComplianceDocumentRecord): HealthMapCategoryId {
  const name = document.name.toLowerCase();

  if (name.includes("paye") || name.includes("uif") || name.includes("sdl") || name.includes("coida")) {
    return "employment";
  }

  if (name.includes("tax") || name.includes("vat")) {
    return "tax";
  }

  if (name.includes("b-bbee") || name.includes("csd")) {
    return "statutory";
  }

  if (name.includes("bank statement") || name.includes("invoice pack") || name.includes("compliance record")) {
    return "financial";
  }

  return "company";
}

function getCategoryLabelForDocument(document: ComplianceDocumentRecord) {
  return (
    healthCategoryMeta.find((category) => category.id === mapDocumentToHealthCategory(document))
      ?.title ?? "Company Compliance"
  );
}

function getPriorityBadge(kind: PriorityKind, item: ComplianceDocumentRecord): PriorityBadge {
  if (kind === "expired") {
    return {
      label: "critical",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
    };
  }

  if (kind === "missing") {
    return {
      label: "high",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  const daysRemaining = daysFromSnapshot(getSafeExpiryDate(item));

  if (daysRemaining <= 14) {
    return {
      label: "high",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "medium",
    className: "bg-brand-50 text-brand-700 ring-brand-200",
  };
}

function getPriorityAccent(kind: PriorityKind, item: ComplianceDocumentRecord) {
  if (kind === "expired") {
    return "bg-rose-600";
  }

  if (kind === "missing") {
    return item.name.toLowerCase().includes("compliance")
      ? "bg-brand-700"
      : "bg-amber-500";
  }

  const daysRemaining = daysFromSnapshot(getSafeExpiryDate(item));
  return daysRemaining <= 14 ? "bg-amber-500" : "bg-brand-700";
}

function getPriorityActionLabel(kind: PriorityKind, item: ComplianceDocumentRecord) {
  if (kind === "expired") {
    return item.id === "comp-13" ? "Replace document" : "Upload renewal";
  }

  if (kind === "missing") {
    return "Open record";
  }

  return daysFromSnapshot(getSafeExpiryDate(item)) <= 14 ? "View" : "Open record";
}

function isObligationDocument(item: ComplianceDocumentRecord) {
  const name = item.name.toLowerCase();
  return (
    name.includes("vat") ||
    name.includes("paye") ||
    name.includes("uif") ||
    name.includes("annual return") ||
    name.includes("financial statements")
  );
}

function getEventStatusFromDocument(item: ComplianceDocumentRecord): ComplianceCalendarEventStatus {
  if (item.status === "expired") {
    return "overdue";
  }

  if (item.status === "valid" || item.status === "compliant") {
    return "completed";
  }

  const daysRemaining = daysFromSnapshot(getSafeExpiryDate(item));
  return daysRemaining <= 14 ? "due-soon" : "upcoming";
}

function getEventStatusClasses(status: ComplianceCalendarEventStatus) {
  if (status === "overdue") {
    return {
      dot: "bg-[#EF4444]",
      badge: "bg-red-50 text-red-600",
      border: "border-red-100",
    };
  }

  if (status === "due-soon") {
    return {
      dot: "bg-[#F59E0B]",
      badge: "bg-amber-50 text-amber-700",
      border: "border-amber-100",
    };
  }

  if (status === "completed") {
    return {
      dot: "bg-[#10B981]",
      badge: "bg-emerald-50 text-emerald-700",
      border: "border-emerald-100",
    };
  }

  return {
    dot: "bg-[#1E3A8A]",
    badge: "bg-blue-50 text-blue-700",
    border: "border-blue-100",
  };
}

function formatEventStatus(status: ComplianceCalendarEventStatus) {
  if (status === "due-soon") {
    return "Due Soon";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatEventCategory(category: ComplianceCalendarEventCategory) {
  if (category === "monthly-pack") {
    return "Monthly Packs";
  }

  if (category === "obligation") {
    return "Obligations";
  }

  if (category === "expiry") {
    return "Document Expiry";
  }

  if (category === "request") {
    return "Requests";
  }

  return "All Events";
}

function formatCalendarStatusFilter(filter: ComplianceCalendarStatusFilter) {
  if (filter === "due-soon") {
    return "Due Soon";
  }

  if (filter === "all") {
    return "All Events";
  }

  return filter.charAt(0).toUpperCase() + filter.slice(1);
}

function buildInsightCards(data: ComplianceCentreData) {
  const allDocuments = data.categoryGroups.flatMap((group) => group.documents);
  const lockedDocuments = allDocuments.filter((document) =>
    document.storageLabel.toLowerCase().includes("encrypted vault"),
  ).length;
  const storageHealth = Math.round((lockedDocuments / Math.max(allDocuments.length, 1)) * 100);

  return [
    {
      id: "score",
      value: `${data.overallScore}%`,
      label: "Compliance Score",
      helper: "+3%",
      tone: "emerald" as const,
      icon: <ShieldIcon />,
      sparkline: "M6 46 L20 40 L28 42 L44 30 L58 24 L74 14 L90 8",
    },
    {
      id: "expiring",
      value: String(data.expiringDocuments.length),
      label: "Expiring Soon",
      helper: "Next 30 days",
      tone: "amber" as const,
      icon: <ClockIcon />,
      sparkline: "M6 44 L24 20 L34 6 L48 34 L62 46 L78 18 L92 28",
    },
    {
      id: "missing",
      value: String(data.missingRequiredDocuments.length),
      label: "Missing Records",
      helper: `-${data.missingRequiredDocuments.length} this week`,
      tone: "rose" as const,
      icon: <AlertIcon />,
      sparkline: "M6 10 L24 18 L42 28 L58 38 L72 46 L92 46",
    },
    {
      id: "activity",
      value: String(data.auditTrail.length),
      label: "Audit Activity",
      helper: `+${data.auditTrail.length} actions`,
      tone: "brand" as const,
      icon: <ActivityIcon />,
      sparkline: "M6 42 L16 26 L26 36 L38 16 L48 24 L60 8 L76 18 L88 6 L102 12",
    },
    {
      id: "storage",
      value: `${storageHealth}%`,
      label: "Storage Health",
      helper: `${lockedDocuments} records secured`,
      tone: "emerald" as const,
      icon: <DatabaseIcon />,
      sparkline: "M6 40 L18 26 L28 26 L40 14 L54 14 L68 14 L82 6 L98 6",
    },
  ];
}

function buildHealthMap(data: ComplianceCentreData) {
  const allDocuments = data.categoryGroups.flatMap((group) => group.documents);

  return healthCategoryMeta.map((category) => {
    const documents = allDocuments.filter(
      (document) => mapDocumentToHealthCategory(document) === category.id,
    );
    const missingCount = data.missingRequiredDocuments.filter(
      (item) => mapDocumentToHealthCategory(item) === category.id,
    ).length;
    const expiringCount = documents.filter((document) => document.status === "expiring_soon").length;
    const expiredCount = documents.filter((document) => document.status === "expired").length;
    const compliantCount = documents.filter((document) => document.status === "valid").length;
    const total = Math.max(documents.length + missingCount, 1);
    const compliantPercent = Math.round((compliantCount / total) * 100);

    return {
      id: category.id,
      title: category.title,
      compliantCount,
      expiringCount,
      expiredCount,
      missingCount,
      compliantPercent,
      total,
    };
  });
}

function healthMapLabel() {
  return [
    { label: "Compliant", className: "bg-emerald-500" },
    { label: "Expiring", className: "bg-amber-500" },
    { label: "Missing", className: "bg-slate-400" },
    { label: "Overdue", className: "bg-rose-600" },
  ];
}

function InsightCard({ helper, icon, label, tone, value }: InsightCardProps) {
  const toneClasses =
    tone === "emerald"
      ? {
          icon: "bg-[#e6eef8] text-[#062044] ring-[#c8d4e6]",
          value: "text-[#062044]",
          helper: "text-[#53617f]",
        }
      : tone === "amber"
        ? {
            icon: "bg-[#e6eef8] text-[#062044] ring-[#c8d4e6]",
            value: "text-[#062044]",
            helper: "text-[#53617f]",
          }
        : tone === "rose"
          ? {
              icon: "bg-[#e6eef8] text-[#062044] ring-[#c8d4e6]",
              value: "text-[#062044]",
              helper: "text-[#53617f]",
            }
          : {
              icon: "bg-[#e6eef8] text-[#062044] ring-[#c8d4e6]",
              value: "text-[#062044]",
              helper: "text-[#53617f]",
            };
  const numericValue = Number.parseInt(value, 10);
  const progressWidth = value.endsWith("%")
    ? Math.min(Math.max(numericValue, 8), 100)
    : Math.min(Math.max(numericValue * 10, 24), 82);

  return (
    <SurfaceCard className="rounded-lg border-[#c8d4e6] bg-[#f7faff] px-5 py-4 shadow-[0_16px_34px_rgba(6,32,68,0.08)]">
      <div className="grid grid-cols-[2.75rem_1fr] gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full ring-1", toneClasses.icon)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[0.76rem] font-semibold text-[#062044]">{label}</p>
          <p className={cn("mt-1 text-[2rem] font-semibold leading-none tracking-tight", toneClasses.value)}>
            {value}
          </p>
          <p className={cn("mt-2 truncate text-[0.76rem] font-medium", toneClasses.helper)}>{helper}</p>
        </div>
        <div className="client-dashboard-progress-track col-span-2 mt-1 h-1.5 overflow-hidden rounded-full">
          <div
            className="client-dashboard-progress-fill h-1.5 rounded-full"
            style={{ width: `${Math.max(0, Math.min(progressWidth, 100))}%` }}
          />
        </div>
      </div>
    </SurfaceCard>
  );
}

function PrioritySection({
  title,
  count,
  icon,
  titleClassName,
  items,
  kind,
  onAction,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  titleClassName: string;
  items: ComplianceDocumentRecord[];
  kind: PriorityKind;
  onAction: (kind: PriorityKind, item: ComplianceDocumentRecord) => void;
}) {
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-2 text-[0.95rem] font-semibold", titleClassName)}>
        <span>{icon}</span>
        <span>{title}</span>
        <span className="text-slate-500">({count})</span>
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => {
            const badge = getPriorityBadge(kind, item);
            const category = getCategoryLabelForDocument(item);
            const accentClass = getPriorityAccent(kind, item);
            const titleText = getClientFacingComplianceLabel(item.name);
            const statusText =
              kind === "missing"
                ? "Required document"
                : formatExpiryMessage(getSafeExpiryDate(item));

            return (
              <div
                className={cn("relative overflow-hidden rounded-[1.4rem] px-5 py-5", navyInnerCardClass)}
                key={item.id}
              >
                <span className={cn("absolute left-0 top-6 h-[4.6rem] w-1.5 rounded-r-full", accentClass)} />
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2 pl-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-[1.05rem] font-semibold text-[#062044]">{titleText}</h3>
                      <span className={cn("rounded-full px-3 py-1 text-[0.76rem] font-semibold ring-1", badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[0.92rem] text-slate-500">
                      {category} <span className="px-2 text-slate-300">•</span> {statusText}
                    </p>
                    {kind === "expired" ? (
                      <p className="text-[0.84rem] font-medium text-rose-600">
                        Expired - new version required
                      </p>
                    ) : null}
                    {kind === "missing" ? (
                      <p className="text-[0.84rem] font-medium text-slate-600">
                        Missing - required for compliance
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pl-4 md:pl-0">
                    <Button
                      className="client-dashboard-action-button h-10 rounded-xl border-0 px-4 text-sm font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
                      onClick={() => onAction(kind, item)}
                      size="sm"
                    >
                      {getPriorityActionLabel(kind, item)}
                      <ArrowRightIcon />
                    </Button>
                    <button
                      aria-label={`Open ${titleText} actions`}
                      className="client-dashboard-action-button inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:-translate-y-0.5 active:translate-y-px"
                      type="button"
                    >
                      <MoreIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          description={
            kind === "expired"
              ? "No expired compliance files need replacement right now."
              : kind === "expiring"
                ? "No records are currently approaching their renewal window."
                : "No required compliance records are missing."
          }
          title={
            kind === "expired"
              ? "No expired documents"
              : kind === "expiring"
                ? "No expiring documents"
                : "No missing required documents"
          }
        />
      )}
    </div>
  );
}

export function ClientComplianceCentrePage() {
  const { clientComplianceCentre: data, clientWorkflow } = usePortal();
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | PriorityKind>("all");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(7);
  const [calendarFilter, setCalendarFilter] = useState<ComplianceCalendarStatusFilter>("all");

  const insightCards = useMemo(() => buildInsightCards(data), [data]);
  const healthMap = useMemo(() => buildHealthMap(data), [data]);
  const latestAuditDate = useMemo(() => {
    if (!data.auditTrail[0]) {
      return "No audit history";
    }

    const latest = [...data.auditTrail].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    )[0];
    return formatDateLabel(latest.timestamp);
  }, [data.auditTrail]);
  const prioritySections = useMemo(
    () => [
      {
        id: "expired" as const,
        count: data.expiredDocuments.length,
        icon: <AlertIcon />,
        items: data.expiredDocuments,
        kind: "expired" as const,
        title: "Expired Documents",
        titleClassName: "text-rose-600",
      },
      {
        id: "expiring" as const,
        count: data.expiringDocuments.length,
        icon: <ClockIcon />,
        items: [...data.expiringDocuments].sort(
          (left, right) => daysFromSnapshot(getSafeExpiryDate(left)) - daysFromSnapshot(getSafeExpiryDate(right)),
        ),
        kind: "expiring" as const,
        title: "Expiring Soon",
        titleClassName: "text-amber-600",
      },
      {
        id: "missing" as const,
        count: data.missingRequiredDocuments.length,
        icon: <DocumentIcon />,
        items: data.missingRequiredDocuments,
        kind: "missing" as const,
        title: "Missing Required",
        titleClassName: "text-slate-600",
      },
    ],
    [data],
  );
  const visiblePrioritySections = useMemo(
    () =>
      priorityFilter === "all"
        ? prioritySections
        : prioritySections.filter((section) => section.id === priorityFilter),
    [priorityFilter, prioritySections],
  );
  const allComplianceDocuments = useMemo(
    () => data.categoryGroups.flatMap((group) => group.documents),
    [data.categoryGroups],
  );
  const calendarEvents = useMemo(() => {
    const events: ComplianceCalendarEvent[] = [];

    allComplianceDocuments.filter(isObligationDocument).forEach((item) => {
      events.push({
        id: `obligation-${item.id}`,
        title: `${getClientFacingComplianceLabel(item.name)} Due`,
        category: "obligation",
        status: getEventStatusFromDocument(item),
        date: getSafeExpiryDate(item),
        description: item.notes,
        priority: item.status === "expired" ? "high" : "medium",
        requiredDocuments: [item.simpleLabel || getClientFacingComplianceLabel(item.name), "Supporting documents"],
        actionLabel: "View Obligation",
        item,
        kind: item.status === "expired" ? "expired" : "expiring",
      });
    });

    [...data.expiredDocuments, ...data.expiringDocuments].forEach((item) => {
      events.push({
        id: `expiry-${item.id}`,
        title: `${getClientFacingComplianceLabel(item.name)} Expiry`,
        category: "expiry",
        status: getEventStatusFromDocument(item),
        date: getSafeExpiryDate(item),
        description: item.notes,
        priority: item.status === "expired" ? "high" : "medium",
        requiredDocuments: [item.simpleLabel || getClientFacingComplianceLabel(item.name)],
        actionLabel: item.status === "expired" ? "Upload Document" : "View Compliance Category",
        item,
        kind: item.status === "expired" ? "expired" : "expiring",
      });
    });

    data.missingRequiredDocuments.forEach((item) => {
      events.push({
        id: `request-${item.id}`,
        title: `Upload ${getClientFacingComplianceLabel(item.name)}`,
        category: "request",
        status: "due-soon",
        date: data.snapshotDate,
        description: item.notes,
        requestedBy: "Accountant",
        priority: "high",
        requiredDocuments: [item.simpleLabel || getClientFacingComplianceLabel(item.name)],
        actionLabel: "Upload Document",
        item,
        kind: "missing",
      });
    });

    events.push(
      {
        id: "monthly-pack-opened",
        title: "Monthly Pack Opened",
        category: "monthly-pack",
        status: "completed",
        date: "2026-05-01T08:00:00.000Z",
        description: `${clientWorkflow.monthPack.monthLabel} pack is available for document collection.`,
        actionLabel: "Open Monthly Pack",
      },
      {
        id: "monthly-pack-due",
        title: "Monthly Pack Review",
        category: "monthly-pack",
        status: clientWorkflow.monthPack.submissionStatus === "complete" ? "completed" : "upcoming",
        date: clientWorkflow.monthPack.dueDate,
        description: clientWorkflow.monthPack.completionMessage,
        priority: clientWorkflow.monthPack.canComplete ? "medium" : "high",
        actionLabel: "Open Monthly Pack",
      },
    );

    if (clientWorkflow.monthPack.submittedAt) {
      events.push({
        id: "monthly-pack-submitted",
        title: "Pack Submitted",
        category: "monthly-pack",
        status: "completed",
        date: clientWorkflow.monthPack.submittedAt,
        description: `${clientWorkflow.monthPack.monthLabel} pack was submitted for accountant review.`,
        actionLabel: "Open Monthly Pack",
      });
    }

    return events.filter((event) => {
      const date = new Date(event.date);
      return date.getUTCFullYear() === 2026 && date.getUTCMonth() === 4;
    });
  }, [allComplianceDocuments, clientWorkflow.monthPack, data]);
  const visibleCalendarEvents = useMemo(
    () =>
      calendarFilter === "all"
        ? calendarEvents.filter((event) => event.status !== "completed")
        : calendarEvents.filter((event) => event.status === calendarFilter),
    [calendarEvents, calendarFilter],
  );
  const selectedCalendarEvents = useMemo(
    () =>
      visibleCalendarEvents.filter((event) => new Date(event.date).getUTCDate() === selectedCalendarDay),
    [selectedCalendarDay, visibleCalendarEvents],
  );
  function showNotice(tone: Tone, title: string, message: string) {
    setFeedbackNotice({ tone, title, message });
  }

  function handlePriorityAction(kind: PriorityKind, item: ComplianceDocumentRecord) {
    const itemLabel = getClientFacingComplianceLabel(item.name);

    if (kind === "expired") {
      showNotice(
        "danger",
        "Renewal required",
        `${itemLabel} has expired and now requires a new uploaded version. The previous accepted copy is still retained for audit history.`,
      );
      return;
    }

    if (kind === "missing") {
      showNotice(
        "warning",
        "Required compliance record missing",
        `${itemLabel} is still missing from the controlled compliance set. Open the record flow and upload it through the structured slot.`,
      );
      return;
    }

    showNotice(
      "info",
      "Renewal window open",
      `${itemLabel} is inside its renewal window. Review it before ${formatDateLabel(getSafeExpiryDate(item))}.`,
    );
  }

  function handleCalendarAction(event: ComplianceCalendarEvent) {
    if (event.item && event.kind) {
      handlePriorityAction(event.kind, event.item);
      return;
    }

    if (event.category === "monthly-pack") {
      showNotice(
        "info",
        event.title,
        event.description ?? "Open the monthly pack workspace to review the current milestone.",
      );
      return;
    }

    showNotice(
      event.status === "overdue" ? "danger" : event.status === "due-soon" ? "warning" : "info",
      event.title,
      event.description ?? "Review this compliance calendar event with your accountant.",
    );
  }

  return (
    <div className="client-compliance-centre mx-auto max-w-[1280px] space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">
            Compliance Centre
          </h1>
          <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">
            Track compliance readiness, expiry risk, and audit activity across all regulated records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button
            aria-label="Download compliance report"
            className="client-dashboard-action-button h-12 rounded-2xl border-0 px-5 text-[0.95rem] font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
            onClick={() =>
              showNotice(
                "success",
                "Compliance report ready",
                "The latest report includes expiry queues, missing records, audit activity, and the current readiness summary.",
              )
            }
          >
            <DownloadIcon />
            <span>Download Report</span>
          </Button>
          <Button
            aria-label="Secure storage"
            className="h-12 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-[0.95rem] text-emerald-700 shadow-none hover:bg-emerald-100"
            onClick={() =>
              showNotice(
                "info",
                "Secure storage active",
                "Compliance records remain encrypted, role-controlled, and retained without automatic deletion of expired versions.",
              )
            }
            variant="secondary"
          >
            <ShieldIcon />
            <span>Secure</span>
          </Button>
          <button
            aria-label="Open compliance alerts"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent text-slate-700 transition hover:bg-white"
            onClick={() =>
              showNotice(
                "warning",
                "Compliance alerts queued",
                `${data.expiredDocuments.length + data.missingRequiredDocuments.length} urgent compliance item${data.expiredDocuments.length + data.missingRequiredDocuments.length === 1 ? "" : "s"} currently need action.`,
              )
            }
            type="button"
          >
            <BellIcon />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
          </button>
        </div>
      </section>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <section className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-5">
        {insightCards.map((card) => (
          <InsightCard
            helper={card.helper}
            icon={card.icon}
            key={card.id}
            label={card.label}
            sparkline={card.sparkline}
            tone={card.tone}
            value={card.value}
          />
        ))}
      </section>

      <section>
        <SurfaceCard className={cn("rounded-[1.5rem] p-5", navyCardClass)}>
          <div>
            <div>
              <h2 className="text-[1.08rem] font-semibold text-[#062044]">Compliance Calendar</h2>
              <p className="mt-1 max-w-2xl text-[0.86rem] leading-6 text-[#53617f]">
                Track obligations, document expiries, accountant requests, and monthly pack milestones in one compliance view.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { id: "all" as const, label: "All Events" },
              { id: "overdue" as const, label: "Overdue" },
              { id: "due-soon" as const, label: "Due Soon" },
              { id: "upcoming" as const, label: "Upcoming" },
            ].map((filter) => (
              <button
                aria-pressed={calendarFilter === filter.id}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-full px-4 text-[0.82rem] font-semibold transition hover:-translate-y-0.5 active:translate-y-px",
                  calendarFilter === filter.id
                    ? "client-dashboard-action-button"
                    : "client-dashboard-action-button",
                )}
                key={filter.id}
                onClick={() => setCalendarFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className={cn("rounded-2xl p-4", navySoftPanelClass)}>
              <div className="flex items-center justify-between gap-3">
                <button
                  aria-label="Previous month"
                  className="client-dashboard-action-button inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:-translate-y-0.5 active:translate-y-px"
                  type="button"
                >
                  <span aria-hidden="true">&lt;</span>
                </button>
                <p className="text-[1rem] font-semibold text-[#0F2B5B]">May 2026</p>
                <button
                  aria-label="Next month"
                  className="client-dashboard-action-button inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:-translate-y-0.5 active:translate-y-px"
                  type="button"
                >
                  <span aria-hidden="true">&gt;</span>
                </button>
              </div>
          <div className="hidden">
            <div className="flex items-center gap-2 text-brand-700">
              <button
                aria-label="Previous month"
                className="client-dashboard-action-button inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:-translate-y-0.5 active:translate-y-px"
                type="button"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <p className="min-w-[7rem] text-center text-[0.92rem] font-semibold">May 2026</p>
              <button
                aria-label="Next month"
                className="client-dashboard-action-button inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:-translate-y-0.5 active:translate-y-px"
                type="button"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 text-center text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-brand-800">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-y-2 text-center text-[0.78rem] font-semibold">
            {[26, 27, 28, 29, 30].map((day) => (
              <span className="flex h-8 items-center justify-center text-slate-300" key={`apr-${day}`}>
                {day}
              </span>
            ))}
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
              const dayEvents = visibleCalendarEvents.filter((event) => new Date(event.date).getUTCDate() === day);
              const hasOverdue = dayEvents.some((event) => event.status === "overdue");
              const hasDueSoon = dayEvents.some((event) => event.status === "due-soon");
              const hasUpcoming = dayEvents.length > 0;

              return (
                <button
                  aria-label={hasUpcoming ? `Show compliance documents for May ${day}` : `May ${day}`}
                  className={cn(
                    "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-brand-800 transition",
                    selectedCalendarDay === day && "bg-brand-800 text-white shadow-sm",
                    hasUpcoming && selectedCalendarDay !== day && "hover:bg-brand-50",
                    !hasUpcoming && "cursor-default",
                  )}
                  disabled={!hasUpcoming}
                  key={day}
                  onClick={() => setSelectedCalendarDay(day)}
                  type="button"
                >
                  {day}
                  {hasUpcoming ? (
                    <span
                      className={cn(
                        "absolute bottom-0 h-1.5 w-1.5 rounded-full",
                        hasOverdue ? "bg-[#EF4444]" : hasDueSoon ? "bg-[#F59E0B]" : "bg-[#1E3A8A]",
                        selectedCalendarDay === day && "ring-1 ring-white",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
            {[1, 2, 3, 4, 5, 6].map((day) => (
              <span className="flex h-8 items-center justify-center text-slate-300" key={`jun-${day}`}>
                {day}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-[0.76rem] font-medium text-slate-500">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-600" />Overdue</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Due soon</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-500" />Upcoming</span>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[0.82rem] font-semibold text-slate-950">
              {selectedCalendarEvents.length > 0
                ? `Documents on May ${selectedCalendarDay}`
                : "Select a dotted day"}
            </p>
            <div className="mt-3 space-y-2">
              {selectedCalendarEvents.length > 0 ? (
                selectedCalendarEvents.map((event) => (
                  <button
                    className="client-dashboard-link flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left font-semibold transition"
                    key={event.id}
                    onClick={() => handleCalendarAction(event)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.82rem] font-semibold">
                        {event.title}
                      </span>
                      <span className="block truncate text-[0.72rem] opacity-75">
                        {formatEventCategory(event.category)} | {formatEventStatus(event.status)}
                      </span>
                    </span>
                    <ArrowRightIcon />
                  </button>
                ))
              ) : (
                <p className="text-[0.78rem] leading-5 text-slate-500">
                  Dots mark compliance documents with expiry dates in the current month.
                </p>
              )}
            </div>
          </div>
            </div>

            <aside className={cn("rounded-2xl p-4", navyInnerCardClass)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Event Details</p>
                  <h3 className="mt-1 text-[1.05rem] font-semibold text-[#0F2B5B]">May {selectedCalendarDay}, 2026</h3>
                </div>
                <span className="rounded-full bg-[#e6eef8] px-3 py-1 text-[0.76rem] font-semibold text-[#062044]">
                  {formatCalendarStatusFilter(calendarFilter)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {selectedCalendarEvents.length > 0 ? (
                  selectedCalendarEvents.map((event) => {
                    const classes = getEventStatusClasses(event.status);

                    return (
                      <div className={cn("rounded-xl p-4", navyInnerCardClass, classes.border)} key={event.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[0.94rem] font-semibold text-[#062044]">{event.title}</p>
                            <p className="mt-1 text-[0.78rem] text-[#64748B]">{formatEventCategory(event.category)}</p>
                          </div>
                          <span className={cn("rounded-full px-2.5 py-1 text-[0.72rem] font-semibold", classes.badge)}>
                            {formatEventStatus(event.status)}
                          </span>
                        </div>

                        {event.description ? (
                          <p className="mt-3 text-[0.8rem] leading-5 text-[#64748B]">{event.description}</p>
                        ) : null}

                        {event.requiredDocuments?.length ? (
                          <div className="mt-3">
                            <p className="text-[0.76rem] font-semibold text-[#0F172A]">Required Documents</p>
                            <ul className="mt-1 space-y-1 text-[0.78rem] text-[#64748B]">
                              {event.requiredDocuments.map((document) => (
                                <li className="flex gap-2" key={document}>
                                  <span className="mt-1.5 h-1 w-1 rounded-full bg-[#64748B]" />
                                  <span>{document}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {event.requestedBy || event.priority ? (
                          <div className="mt-3 grid gap-2 text-[0.78rem] text-[#64748B] sm:grid-cols-2">
                            {event.requestedBy ? <p>Requested By: {event.requestedBy}</p> : null}
                            {event.priority ? <p>Priority: {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}</p> : null}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#0F2B5B] px-3 text-[0.8rem] font-semibold text-white transition hover:bg-[#1E3A8A]"
                            onClick={() => handleCalendarAction(event)}
                            type="button"
                          >
                            {event.actionLabel}
                          </button>
                          <button
                            className="client-dashboard-action-button inline-flex h-9 items-center justify-center rounded-lg px-3 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 active:translate-y-px"
                            onClick={() =>
                              showNotice(
                                "info",
                                "Accountant contact ready",
                                `Your accountant can help with ${event.title}.`,
                              )
                            }
                            type="button"
                          >
                            Contact Accountant
                          </button>
                          {event.status !== "completed" ? (
                            <button
                              className="client-dashboard-action-button inline-flex h-9 items-center justify-center rounded-lg px-3 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 active:translate-y-px"
                              onClick={() =>
                                showNotice(
                                  "success",
                                  "Completion noted",
                                  `${event.title} can be marked complete once the required review or upload is accepted.`,
                                )
                              }
                              type="button"
                            >
                              Mark Complete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={cn("rounded-xl p-4", navySoftPanelClass)}>
                    <p className="text-[0.9rem] font-semibold text-[#062044]">No events for this day</p>
                    <p className="mt-1 text-[0.8rem] leading-5 text-[#53617f]">
                      Select a date with an event indicator to review compliance obligations, expiring documents, requests, and monthly pack milestones.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </SurfaceCard>

        <SurfaceCard className="hidden rounded-[1.35rem] border-slate-200/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1rem] font-semibold text-slate-950">Priority Items</h2>
            <button
              className="client-dashboard-link text-[0.78rem] font-semibold transition"
              onClick={() => setPriorityFilter("all")}
              type="button"
            >
              View All
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {prioritySections.map((section) => {
              const accent =
                section.kind === "expired"
                  ? {
                      icon: "bg-rose-50 text-rose-600 ring-rose-100",
                      count: "bg-rose-50 text-rose-600",
                      helper: `${section.count} document${section.count === 1 ? "" : "s"} have expired`,
                    }
                  : section.kind === "expiring"
                    ? {
                        icon: "bg-amber-50 text-amber-600 ring-amber-100",
                        count: "bg-amber-50 text-amber-600",
                        helper: `${section.count} document${section.count === 1 ? "" : "s"} expire in the next 60 days`,
                      }
                    : {
                        icon: "bg-brand-50 text-brand-700 ring-brand-100",
                        count: "bg-indigo-50 text-indigo-600",
                        helper: `${section.count} document${section.count === 1 ? "" : "s"} are missing`,
                      };

              return (
                <button
                  aria-pressed={priorityFilter === section.kind}
                className={cn(
                    "flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition",
                    priorityFilter === section.kind
                      ? "client-dashboard-action-button"
                      : "client-dashboard-action-button",
                  )}
                  key={section.id}
                  onClick={() => setPriorityFilter(section.kind)}
                  type="button"
                >
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1", accent.icon)}>
                    {section.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.92rem] font-semibold">{section.title}</span>
                    <span className="mt-1 block truncate text-[0.78rem] opacity-75">{accent.helper}</span>
                  </span>
                  <span className="inline-flex min-w-8 justify-center rounded-lg bg-white/15 px-2.5 py-1 text-[0.78rem] font-semibold">
                    {section.count}
                  </span>
                  <ArrowRightIcon />
                </button>
              );
            })}
          </div>
        </SurfaceCard>
      </section>

      <section>
        <SurfaceCard className={cn("overflow-hidden rounded-[1.9rem] p-0", navyCardClass)}>
          <div className="border-b border-[#d7e1ef] px-6 py-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-[1.12rem] font-semibold text-[#062044]">Compliance Priorities</h2>
                <p className="mt-1 text-[0.86rem] text-[#53617f]">Documents requiring immediate attention</p>
              </div>
              <Button
                className="client-dashboard-action-button h-10 rounded-2xl border-0 px-4 text-[0.9rem] font-semibold ring-0 hover:-translate-y-0.5 active:translate-y-px"
                onClick={() =>
                  showNotice(
                    "info",
                    "Priority view ready",
                    "Open the document workspace to inspect every expiring, expired, and missing compliance record in one place.",
                  )
                }
              >
                View All
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { id: "all" as const, label: "All priorities" },
                { id: "expired" as const, label: "Expired" },
                { id: "expiring" as const, label: "Expiring" },
                { id: "missing" as const, label: "Missing" },
              ].map((filterOption) => (
                <button
                  aria-pressed={priorityFilter === filterOption.id}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-full px-4 text-[0.82rem] font-semibold transition hover:-translate-y-0.5 active:translate-y-px",
                    priorityFilter === filterOption.id
                      ? "client-dashboard-action-button"
                      : "client-dashboard-action-button",
                  )}
                  key={filterOption.id}
                  onClick={() => setPriorityFilter(filterOption.id)}
                  type="button"
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-7 px-6 py-6 lg:px-8">
            {visiblePrioritySections.map((section) => (
              <PrioritySection
                count={section.count}
                icon={section.icon}
                items={section.items}
                key={section.id}
                kind={section.kind}
                onAction={handlePriorityAction}
                title={section.title}
                titleClassName={section.titleClassName}
              />
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className={cn("overflow-hidden rounded-[1.9rem] p-0", navyCardClass)}>
        <div className="border-b border-[#d7e1ef] px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[1.12rem] font-semibold text-[#062044]">Compliance Health Map</h2>
              <p className="mt-1 text-[0.86rem] text-[#53617f]">Stacked category graph by compliance state</p>
            </div>
            <div className="flex flex-wrap gap-4 text-[0.82rem] font-medium text-[#53617f]">
              {healthMapLabel().map((item) => (
                <div className="flex items-center gap-2" key={item.label}>
                  <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 lg:px-8">
          <div className={cn("rounded-2xl p-5", navySoftPanelClass)}>
            <div className="mb-5 grid grid-cols-[minmax(150px,0.8fr)_minmax(0,2fr)_86px] gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#53617f]">
              <span>Category</span>
              <span>Compliance Distribution</span>
              <span className="text-right">Score</span>
            </div>

            <div className="space-y-5">
              {healthMap.map((category) => {
                const compliantWidth = (category.compliantCount / category.total) * 100;
                const expiringWidth = (category.expiringCount / category.total) * 100;
                const missingWidth = (category.missingCount / category.total) * 100;
                const overdueWidth = (category.expiredCount / category.total) * 100;

                return (
                  <div
                    className={cn("grid gap-3 rounded-xl p-4 lg:grid-cols-[minmax(150px,0.8fr)_minmax(0,2fr)_86px] lg:items-center", navyInnerCardClass)}
                    key={category.id}
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-[0.95rem] font-semibold text-[#062044]">{category.title}</h3>
                      <p className="mt-1 text-[0.76rem] text-[#53617f]">{category.total} tracked items</p>
                    </div>

                    <div>
                      <div className="relative h-8 overflow-hidden rounded-lg bg-slate-100">
                        <div className="flex h-full">
                          <div
                            aria-label={`${category.compliantCount} compliant`}
                            className="bg-emerald-500"
                            style={{ width: `${compliantWidth}%` }}
                            title={`${category.compliantCount} compliant`}
                          />
                          <div
                            aria-label={`${category.expiringCount} expiring`}
                            className="bg-amber-500"
                            style={{ width: `${expiringWidth}%` }}
                            title={`${category.expiringCount} expiring`}
                          />
                          <div
                            aria-label={`${category.missingCount} missing`}
                            className="bg-slate-400"
                            style={{ width: `${missingWidth}%` }}
                            title={`${category.missingCount} missing`}
                          />
                          <div
                            aria-label={`${category.expiredCount} overdue`}
                            className="bg-rose-600"
                            style={{ width: `${overdueWidth}%` }}
                            title={`${category.expiredCount} overdue`}
                          />
                        </div>
                        <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
                          <span className="border-r border-white/55" />
                          <span className="border-r border-white/55" />
                          <span className="border-r border-white/55" />
                          <span />
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[0.74rem] text-slate-500">
                        <span>{category.compliantCount} ready</span>
                        <span>{category.expiringCount} expiring</span>
                        <span>{category.missingCount} missing</span>
                        <span>{category.expiredCount} overdue</span>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-[1.35rem] font-semibold text-brand-800">{category.compliantPercent}%</p>
                      <p className="text-[0.72rem] font-medium text-slate-500">compliant</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2 text-center text-[0.72rem] font-medium text-slate-400">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className={cn("overflow-hidden rounded-[1.5rem] p-0", navyCardClass)}>
        <div className="px-6 py-6 lg:px-8">
          <h2 className="text-[2rem] font-semibold tracking-tight text-brand-800">Compliance Report</h2>
          <p className="mt-2 text-[1rem] text-[#53617f]">
            One export that summarises readiness, expiries, missing records, and controlled history.
          </p>
          <div className="mt-5 h-px bg-[#d7e1ef]" />

          <div className="mt-6 rounded-[1.15rem] bg-[linear-gradient(135deg,#06235a_0%,#0a2f66_52%,#06245a_100%)] px-6 py-6 text-white shadow-[0_16px_32px_rgba(10,47,102,0.22)]">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_0.82fr] lg:items-center">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
                  <ShieldIcon />
                </div>
                <div>
                  <p className="text-[1.12rem] font-semibold">Compliance Health Snapshot</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <p className="text-[3.2rem] font-semibold leading-none tracking-tight">{data.overallScore}%</p>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/16 px-4 py-2 text-[0.9rem] font-semibold text-emerald-100 ring-1 ring-emerald-300/15">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      Excellent Standing
                    </span>
                  </div>
                  <p className="mt-3 text-[0.9rem] text-white/86">Your compliance posture is strong. Keep your documents up to date.</p>
                </div>
              </div>

              <div className="hidden h-28 w-px bg-white/35 lg:block" />

              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
                  <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
                    <path d="M7 3.75v3M17 3.75v3M4.75 9.25h14.5M6.5 5.25h11A2.25 2.25 0 0 1 19.75 7.5v10A2.25 2.25 0 0 1 17.5 19.75h-11A2.25 2.25 0 0 1 4.25 17.5v-10A2.25 2.25 0 0 1 6.5 5.25Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  </svg>
                </div>
                <div>
                  <p className="text-[0.95rem] text-white/72">Last Checked</p>
                  <p className="mt-2 text-[1.5rem] font-semibold">{latestAuditDate}</p>
                  <p className="mt-2 text-[0.86rem] text-white/86">By John Abraham, Accountant</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className={cn("rounded-[1.15rem] p-5", navyInnerCardClass)}>
                <p className="text-[1rem] font-semibold text-brand-800">Report Coverage</p>
                <div className="mt-3 divide-y divide-[#d7e1ef]">
                  {[
                    { label: "Compliance Areas", value: String(healthMap.length) },
                    { label: "Document Types", value: String(data.categoryGroups.reduce((sum, group) => sum + group.documents.length, 0)) },
                    { label: "Time Period Covered", value: "May 2025 - May 2026" },
                  ].map((item) => (
                    <div className="flex items-center justify-between gap-4 py-3 text-[0.9rem]" key={item.label}>
                      <span className="text-[#53617f]">{item.label}</span>
                      <span className="font-semibold text-brand-800">{item.value}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <button
              className="flex min-h-24 items-center justify-between rounded-xl bg-brand-800 px-6 py-4 text-left text-white shadow-[0_14px_28px_rgba(10,47,102,0.18)] transition hover:bg-brand-700"
              onClick={() =>
                showNotice(
                  "success",
                  "Compliance report ready",
                  "The PDF export includes expiry queues, missing records, audit history, and the readiness summary.",
                )
              }
              type="button"
            >
              <span className="flex items-center gap-4">
                <DownloadIcon />
                <span>
                  <span className="block text-[1.05rem] font-semibold">Download PDF Report</span>
                  <span className="mt-1 block text-[0.86rem] text-white/78">Export the latest compliance report</span>
                </span>
              </span>
              <ArrowRightIcon />
            </button>

            <button
              className="client-dashboard-action-button flex min-h-24 items-center justify-between rounded-xl px-6 py-4 text-left transition hover:-translate-y-0.5 active:translate-y-px"
              onClick={() =>
                showNotice(
                  "info",
                  "Report scheduling queued",
                  "Scheduled compliance reporting can be introduced after backend delivery. The monthly summary is ready for controlled export.",
                )
              }
              type="button"
            >
              <span className="flex items-center gap-4">
                <BellIcon />
                <span>
                  <span className="block text-[1.05rem] font-semibold">Schedule Automatic Reports</span>
                  <span className="mt-1 block text-[0.86rem] opacity-75">Receive reports on a regular schedule</span>
                </span>
              </span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
