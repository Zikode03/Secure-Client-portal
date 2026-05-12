import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { portalService } from "../../services/portalData";
import type {
  ComplianceCentreData,
  ComplianceDocumentRecord,
  Tone,
} from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel } from "../../utils/formatters";

const complianceSnapshotDate = new Date("2026-05-07T00:00:00.000Z");

type FeedbackNotice = {
  tone: Tone;
  title: string;
  message: string;
};

type PriorityKind = "expired" | "expiring" | "missing";
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

function DownloadIcon() {
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

function InsightCard({ helper, icon, label, sparkline, tone, value }: InsightCardProps) {
  const toneClasses =
    tone === "emerald"
      ? {
          icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
          line: "stroke-emerald-400",
          helper: "text-emerald-600",
        }
      : tone === "amber"
        ? {
            icon: "bg-amber-50 text-amber-600 ring-amber-100",
            line: "stroke-amber-400",
            helper: "text-slate-500",
          }
        : tone === "rose"
          ? {
              icon: "bg-rose-50 text-rose-600 ring-rose-100",
              line: "stroke-rose-400",
              helper: "text-emerald-600",
            }
          : {
              icon: "bg-brand-50 text-brand-700 ring-brand-100",
              line: "stroke-brand-400",
              helper: "text-emerald-600",
            };

  return (
    <SurfaceCard className="rounded-[1.35rem] border-slate-200/90 p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1", toneClasses.icon)}>
          {icon}
        </div>
        <svg aria-hidden="true" className="h-[34px] w-[92px]" fill="none" viewBox="0 0 110 52">
          <path
            className={toneClasses.line}
            d={sparkline}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.6"
          />
        </svg>
      </div>
      <div className="mt-3.5 space-y-0.5">
        <p className="text-[1.72rem] font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="text-[0.84rem] text-slate-500">{label}</p>
        <p className={cn("pt-1 text-[0.76rem] font-medium", toneClasses.helper)}>{helper}</p>
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
            const titleText = item.name;
            const statusText =
              kind === "missing"
                ? "Required document"
                : formatExpiryMessage(getSafeExpiryDate(item));

            return (
              <div
                className="relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                key={item.id}
              >
                <span className={cn("absolute left-0 top-6 h-[4.6rem] w-1.5 rounded-r-full", accentClass)} />
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2 pl-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-[1.05rem] font-semibold text-slate-950">{titleText}</h3>
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
                      className="h-10 rounded-xl border border-slate-200 bg-transparent px-4 text-slate-800 shadow-none hover:bg-slate-50"
                      onClick={() => onAction(kind, item)}
                      size="sm"
                      variant="secondary"
                    >
                      {getPriorityActionLabel(kind, item)}
                      <ArrowRightIcon />
                    </Button>
                    <button
                      aria-label={`Open ${titleText} actions`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
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
  const data = useMemo(() => portalService.getClientComplianceCentre(), []);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | PriorityKind>("all");

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

  function showNotice(tone: Tone, title: string, message: string) {
    setFeedbackNotice({ tone, title, message });
  }

  function handlePriorityAction(kind: PriorityKind, item: ComplianceDocumentRecord) {
    const itemLabel = item.name;

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

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-[2.65rem] font-semibold tracking-tight text-slate-950">
            Compliance Centre
          </h1>
          <p className="max-w-3xl text-[1.02rem] leading-7 text-slate-500">
            Track compliance readiness, expiry risk, and audit activity across all regulated records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button
            aria-label="Download compliance report"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-[0.95rem] text-slate-900 shadow-none hover:bg-slate-50"
            onClick={() =>
              showNotice(
                "success",
                "Compliance report ready",
                "The latest report includes expiry queues, missing records, audit activity, and the current readiness summary.",
              )
            }
            variant="secondary"
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
        <SurfaceCard className="overflow-hidden rounded-[1.9rem] border-slate-200/90 p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 px-6 py-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-[1.12rem] font-semibold text-slate-950">Compliance Priorities</h2>
                <p className="mt-1 text-[0.86rem] text-slate-500">Documents requiring immediate attention</p>
              </div>
              <Button
                className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-[0.9rem] text-slate-900 shadow-none hover:bg-slate-50"
                onClick={() =>
                  showNotice(
                    "info",
                    "Priority view ready",
                    "Open the document workspace to inspect every expiring, expired, and missing compliance record in one place.",
                  )
                }
                variant="secondary"
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
                    "inline-flex h-9 items-center rounded-full border px-4 text-[0.82rem] font-medium transition",
                    priorityFilter === filterOption.id
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700",
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

      <SurfaceCard className="overflow-hidden rounded-[1.9rem] border-slate-200/90 p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-6 py-6 lg:px-8">
          <h2 className="text-[1.12rem] font-semibold text-slate-950">Compliance Health Map</h2>
          <p className="mt-1 text-[0.86rem] text-slate-500">Visual breakdown by category</p>
        </div>

        <div className="space-y-8 px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-6 text-[0.92rem] text-slate-600">
            {healthMapLabel().map((item) => (
              <div className="flex items-center gap-2" key={item.label}>
                <span className={cn("h-4 w-4 rounded-full", item.className)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {healthMap.map((category) => {
            const compliantWidth = (category.compliantCount / category.total) * 100;
            const expiringWidth = (category.expiringCount / category.total) * 100;
            const missingWidth = (category.missingCount / category.total) * 100;
            const overdueWidth = (category.expiredCount / category.total) * 100;

            return (
              <div className="space-y-3" key={category.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[1rem] font-medium text-slate-950">{category.title}</h3>
                  <p className="text-[0.95rem] text-slate-500">
                    {category.compliantPercent}% compliant
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="flex h-full">
                    <div className="bg-emerald-500" style={{ width: `${compliantWidth}%` }} />
                    <div className="bg-amber-500" style={{ width: `${expiringWidth}%` }} />
                    <div className="bg-slate-400" style={{ width: `${missingWidth}%` }} />
                    <div className="bg-rose-600" style={{ width: `${overdueWidth}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center text-[0.82rem] text-slate-500">
                  <span>{category.compliantCount} ready</span>
                  <span>{category.expiringCount} expiring</span>
                  <span>{category.missingCount} missing</span>
                  <span>{category.expiredCount} overdue</span>
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden rounded-[1.9rem] border-slate-200/90 p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-6 py-6 lg:px-8">
          <h2 className="text-[1.12rem] font-semibold text-slate-950">Compliance Report</h2>
          <p className="mt-1 text-[0.86rem] text-slate-500">
            One export that summarises readiness, expiries, missing records, and controlled history.
          </p>
        </div>

        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-8">
          <div className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,#f8faff_0%,#ffffff_100%)] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <DocumentIcon />
              </div>
              <div className="space-y-1">
                <p className="text-[1rem] font-semibold text-slate-950">Monthly Compliance Summary</p>
                <p className="text-[0.86rem] text-slate-500">
                  Generated {formatDateLabel(data.reportGeneratedAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Compliance Score
                </p>
                <p className="mt-2 text-[1.45rem] font-semibold text-slate-950">{data.overallScore}%</p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Last Audit
                </p>
                <p className="mt-2 text-[1rem] font-semibold text-slate-950">{latestAuditDate}</p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Records Included
                </p>
                <p className="mt-2 text-[1.45rem] font-semibold text-slate-950">
                  {data.categoryGroups.reduce((sum, group) => sum + group.documents.length, 0)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
              <p className="text-[0.84rem] font-medium text-slate-500">
                Includes expiry queues, missing required records, audit activity, and readiness summary.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/70 px-5 py-4">
              <p className="text-[0.86rem] text-slate-500">Audit Readiness</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-[2rem] font-semibold text-emerald-600">{data.overallScore}%</p>
                <p className="text-right text-[0.84rem] text-slate-500">
                  Last checked
                  <span className="mt-1 block font-medium text-slate-900">{latestAuditDate}</span>
                </p>
              </div>
            </div>

            <button
              className="flex w-full items-center justify-between rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4 text-left text-[0.95rem] font-medium text-slate-900 transition hover:bg-slate-50"
              onClick={() =>
                showNotice(
                  "success",
                  "Compliance report ready",
                  "The PDF export includes expiry queues, missing records, audit history, and the readiness summary.",
                )
              }
              type="button"
            >
              <span className="flex items-center gap-3">
                <DownloadIcon />
                Export PDF Report
              </span>
              <ArrowRightIcon />
            </button>

            <button
              className="flex w-full items-center justify-between rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4 text-left text-[0.95rem] font-medium text-slate-900 transition hover:bg-slate-50"
              onClick={() =>
                showNotice(
                  "info",
                  "Report scheduling queued",
                  "Scheduled compliance reporting can be introduced after backend delivery. The monthly summary is ready for controlled export.",
                )
              }
              type="button"
            >
              <span className="flex items-center gap-3">
                <BellIcon />
                Schedule Report
              </span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
