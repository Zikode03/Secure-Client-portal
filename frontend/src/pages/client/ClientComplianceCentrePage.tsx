import { useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { ComplianceDocumentRecord } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

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

function FriendlyComplianceCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <SurfaceCard className="rounded-[1.35rem] border-slate-200/90 p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </SurfaceCard>
  );
}

function ComplianceActionRow({
  item,
  actionLabel,
  onAction,
  supportingText,
}: {
  item: ComplianceDocumentRecord;
  actionLabel: string;
  onAction: (item: ComplianceDocumentRecord) => void;
  supportingText: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[1.05rem] font-semibold text-slate-950">{item.simpleLabel}</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.76rem] font-semibold text-slate-600 ring-1 ring-slate-200">
              {item.categoryName}
            </span>
          </div>
          <p className="text-[0.92rem] text-slate-500">{supportingText}</p>
          <p className="text-[0.86rem] text-slate-500">
            Why we need it: {item.description}
          </p>
        </div>

        <Button
          className="h-10 rounded-xl px-4"
          onClick={() => onAction(item)}
          size="sm"
          variant="secondary"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function ClientComplianceCentrePage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const data = portal.clientComplianceCentre;

  function handleDownloadReport() {
    if (!user) {
      return;
    }

    const result = portal.downloadComplianceReport(user.fullName);
    setFeedbackMessage(result.message);
  }

  function handleUploadPrompt(item: ComplianceDocumentRecord) {
    setFeedbackMessage(
      `${item.simpleLabel} is listed in your compliance workspace. Open the document centre to upload it into the correct controlled slot.`,
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-[2.4rem] font-semibold tracking-tight text-slate-950">
            Compliance Centre
          </h1>
          <p className="max-w-3xl text-[1rem] leading-7 text-slate-500">
            See what is missing, what is expiring, what has expired, and what you need to upload next.
          </p>
        </div>

        <Button
          className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-[0.95rem] text-slate-900 shadow-none hover:bg-slate-50"
          onClick={handleDownloadReport}
          variant="secondary"
        >
          <DownloadIcon />
          <span>Download report</span>
        </Button>
      </section>

      {feedbackMessage ? (
        <div className="rounded-[1.35rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FriendlyComplianceCard
          helper="Your overall structured compliance score."
          label="Compliance score"
          value={`${data.overallScore}%`}
        />
        <FriendlyComplianceCard
          helper="Required documents that still need an upload."
          label="Missing"
          value={String(data.missingRequiredCount)}
        />
        <FriendlyComplianceCard
          helper="Documents that expire within the next 30 days."
          label="Expiring soon"
          value={String(data.expiringCount)}
        />
        <FriendlyComplianceCard
          helper="Documents that already expired and need replacement."
          label="Expired"
          value={String(data.expiredCount)}
        />
      </section>

      <SurfaceCard className="space-y-4 rounded-[1.9rem] border-slate-200/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <h2 className="text-[1.18rem] font-semibold text-slate-950">Missing required</h2>
          <p className="mt-1 text-sm text-slate-500">
            These records are required before your compliance file can be considered complete.
          </p>
        </div>

        {data.missingRequiredDocuments.length > 0 ? (
          <div className="space-y-4">
            {data.missingRequiredDocuments.map((item) => (
              <ComplianceActionRow
                actionLabel="Upload this"
                item={item}
                key={item.id}
                onAction={handleUploadPrompt}
                supportingText={
                  item.monthlyPeriod
                    ? `Needed for ${item.monthlyPeriod}.`
                    : "This is a required business compliance record."
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Every required compliance item currently has an uploaded version."
            title="Nothing missing"
          />
        )}
      </SurfaceCard>

      <SurfaceCard className="space-y-4 rounded-[1.9rem] border-slate-200/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <h2 className="text-[1.18rem] font-semibold text-slate-950">Expiring soon</h2>
          <p className="mt-1 text-sm text-slate-500">
            Plan these renewals now so your records do not lapse unexpectedly.
          </p>
        </div>

        {data.expiringDocuments.length > 0 ? (
          <div className="space-y-4">
            {data.expiringDocuments.map((item) => (
              <ComplianceActionRow
                actionLabel="Review renewal"
                item={item}
                key={item.id}
                onAction={handleUploadPrompt}
                supportingText={`Expires ${item.expiryDate ? formatDateLabel(item.expiryDate) : "soon"}.`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="No compliance records are inside the 30-day renewal window."
            title="Nothing expiring soon"
          />
        )}
      </SurfaceCard>

      <SurfaceCard className="space-y-4 rounded-[1.9rem] border-slate-200/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <h2 className="text-[1.18rem] font-semibold text-slate-950">Expired</h2>
          <p className="mt-1 text-sm text-slate-500">
            These records already expired. The old version stays in history until you replace it.
          </p>
        </div>

        {data.expiredDocuments.length > 0 ? (
          <div className="space-y-4">
            {data.expiredDocuments.map((item) => (
              <ComplianceActionRow
                actionLabel="Replace this"
                item={item}
                key={item.id}
                onAction={handleUploadPrompt}
                supportingText={`Expired ${item.expiryDate ? formatDateLabel(item.expiryDate) : "recently"} and still visible in your record history.`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="There are no expired compliance records waiting for replacement."
            title="Nothing expired"
          />
        )}
      </SurfaceCard>
    </div>
  );
}
