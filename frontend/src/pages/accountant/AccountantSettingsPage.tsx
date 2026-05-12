import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import type { Tone } from "../../types/portal";
import { cn } from "../../utils/cn";

type SettingsSection = "workflow" | "notifications" | "compliance" | "workspace";

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

function WorkflowIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.5 6.25h9A1.75 1.75 0 0 1 18.25 8v8A1.75 1.75 0 0 1 16.5 17.75h-9A1.75 1.75 0 0 1 5.75 16V8A1.75 1.75 0 0 1 7.5 6.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9 10.25 1.2 1.2 2.3-2.45M9 14h6"
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
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 7a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.75 10.25V8.5a4.25 4.25 0 0 1 8.5 0v1.75M7 10.25h10A1.75 1.75 0 0 1 18.75 12v6A1.75 1.75 0 0 1 17 19.75H7A1.75 1.75 0 0 1 5.25 18v-6A1.75 1.75 0 0 1 7 10.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.5 13.9 9l4.6 1.9-4.6 1.9L12 17.5l-1.9-4.7-4.6-1.9L10.1 9 12 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
      onClick={onChange}
      type="button"
    >
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-1 text-[0.84rem] leading-6 text-slate-500">{description}</p>
      </div>
      <span
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-brand-500" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

function sectionIcon(section: SettingsSection) {
  switch (section) {
    case "notifications":
      return <BellIcon />;
    case "compliance":
      return <ShieldIcon />;
    case "workspace":
      return <ProfileIcon />;
    default:
      return <WorkflowIcon />;
  }
}

export function AccountantSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();

  const [activeSection, setActiveSection] = useState<SettingsSection>("workflow");
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  const [signature, setSignature] = useState(user?.fullName ?? "Daniel Mokoena");
  const [clientFacingTitle, setClientFacingTitle] = useState(user?.title ?? "Senior Accountant");
  const [followUpWindow, setFollowUpWindow] = useState("2 business days");
  const [defaultEscalation, setDefaultEscalation] = useState("Open request");
  const [reviewSummaryStyle, setReviewSummaryStyle] = useState("Short and actionable");

  const [reviewQueueAlerts, setReviewQueueAlerts] = useState(true);
  const [clientActionAlerts, setClientActionAlerts] = useState(true);
  const [complianceExpiryAlerts, setComplianceExpiryAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  const [renewalLeadTime, setRenewalLeadTime] = useState("30 days");
  const [highRiskThreshold, setHighRiskThreshold] = useState("2 expired items");
  const [expiredEscalation, setExpiredEscalation] = useState("Notify admin after 3 days");
  const [reportCadence, setReportCadence] = useState("Weekly portfolio digest");

  const [workspaceName, setWorkspaceName] = useState(user?.fullName ?? "Daniel Mokoena");
  const [workspaceTitle, setWorkspaceTitle] = useState(user?.title ?? "Senior Accountant");
  const [emailSignature, setEmailSignature] = useState(
    "Kind regards,\nDaniel Mokoena\nSenior Accountant | Finwell Advisory",
  );
  const [internalNote, setInternalNote] = useState(
    "Escalate overdue compliance blockers after the second missed follow-up if month-end readiness is affected.",
  );

  const reviewQueueCount = portal.accountantDashboard.reviewQueue.length;
  const missingCount = portal.accountantDashboard.missingDocuments.length;
  const notificationCount = portal.accountantDashboard.notifications.length;
  const complianceCentre = portal.accountantComplianceCentre;

  const complianceInsights = useMemo(
    () => [
      {
        id: "expired",
        label: "Expired items",
        value: complianceCentre.expiredCount,
        helper: "Need renewal action",
        tone: "text-rose-600",
      },
      {
        id: "expiring",
        label: "Expiring soon",
        value: complianceCentre.expiringCount,
        helper: "Next 30 days",
        tone: "text-amber-600",
      },
      {
        id: "portfolio",
        label: "Portfolio compliance",
        value: `${complianceCentre.portfolioCompliancePercentage}%`,
        helper: "Across assigned clients",
        tone: "text-emerald-600",
      },
    ],
    [complianceCentre],
  );

  const sections: Array<{
    id: SettingsSection;
    title: string;
    description: string;
    tone: string;
  }> = [
    {
      id: "workflow",
      title: "Workflow defaults",
      description: "Review pace, signatures and escalation behaviour",
      tone: "bg-brand-50 text-brand-600 ring-brand-100",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Queue alerts and summary preferences",
      tone: "bg-amber-50 text-amber-500 ring-amber-100",
    },
    {
      id: "compliance",
      title: "Compliance controls",
      description: "Renewal windows and portfolio reporting",
      tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    },
    {
      id: "workspace",
      title: "Workspace profile",
      description: "Client-facing details and internal notes",
      tone: "bg-sky-50 text-sky-600 ring-sky-100",
    },
  ];

  function showSavedNotice(title: string, message: string) {
    setFeedbackNotice({
      tone: "success",
      title,
      message,
    });
  }

  function renderWorkflow() {
    return (
      <SurfaceCard className="overflow-hidden rounded-[1.55rem] border border-slate-200/80 bg-white p-0 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <WorkflowIcon />
            </div>
            <div className="space-y-1">
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                Workflow defaults
              </h2>
              <p className="text-[0.92rem] leading-7 text-slate-500">
                Keep review behaviour, client follow-ups, and escalation steps consistent across
                your workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Default review signature"
              onChange={(event) => setSignature(event.target.value)}
              value={signature}
            />
            <TextField
              label="Client-facing title"
              onChange={(event) => setClientFacingTitle(event.target.value)}
              value={clientFacingTitle}
            />
            <SelectField
              hint="Used when a client action request is created from review or compliance screens."
              label="Default follow-up window"
              onChange={(event) => setFollowUpWindow(event.target.value)}
              options={[
                { label: "1 business day", value: "1 business day" },
                { label: "2 business days", value: "2 business days" },
                { label: "3 business days", value: "3 business days" },
                { label: "5 business days", value: "5 business days" },
              ]}
              value={followUpWindow}
            />
            <SelectField
              hint="Choose what happens first when a blocker needs escalation."
              label="Escalation behaviour"
              onChange={(event) => setDefaultEscalation(event.target.value)}
              options={[
                { label: "Open request", value: "Open request" },
                { label: "Notify admin", value: "Notify admin" },
                { label: "Open request and notify admin", value: "Open request and notify admin" },
              ]}
              value={defaultEscalation}
            />
            <SelectField
              className="md:col-span-2"
              hint="Helps keep client updates consistent across your workspace."
              label="Review summary style"
              onChange={(event) => setReviewSummaryStyle(event.target.value)}
              options={[
                { label: "Short and actionable", value: "Short and actionable" },
                { label: "Detailed with context", value: "Detailed with context" },
                { label: "Formal compliance tone", value: "Formal compliance tone" },
              ]}
              value={reviewSummaryStyle}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Review queue</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-slate-950">
                {reviewQueueCount}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Active records currently waiting for accountant review.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Client blockers</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-rose-600">
                {missingCount}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Missing records that may trigger your follow-up workflow.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Open notifications</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-brand-600">
                {notificationCount}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Workflow alerts feeding the accountant notification centre.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setSignature(user?.fullName ?? "Daniel Mokoena");
              setClientFacingTitle(user?.title ?? "Senior Accountant");
              setFollowUpWindow("2 business days");
              setDefaultEscalation("Open request");
              setReviewSummaryStyle("Short and actionable");
              setFeedbackNotice({
                tone: "info",
                title: "Workflow defaults reset",
                message: "Workflow preferences were restored to the current workspace defaults.",
              });
            }}
            variant="secondary"
          >
            Reset defaults
          </Button>
          <Button
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-6 shadow-[0_16px_30px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            onClick={() =>
              showSavedNotice(
                "Workflow preferences saved",
                "Default review signature, follow-up timing, and escalation behaviour were updated for the accountant workspace.",
              )
            }
          >
            Save workflow settings
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  function renderNotifications() {
    return (
      <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
            <BellIcon />
          </div>
          <div className="space-y-1">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
              Notification preferences
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Choose which workflow updates should reach you immediately and which ones can wait for a summary.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Toggle
            checked={reviewQueueAlerts}
            description="Alert me when new items enter the review queue."
            label="Review queue alerts"
            onChange={() => setReviewQueueAlerts((current) => !current)}
          />
          <Toggle
            checked={clientActionAlerts}
            description="Alert me when clients still owe missing or corrected records."
            label="Client action alerts"
            onChange={() => setClientActionAlerts((current) => !current)}
          />
          <Toggle
            checked={complianceExpiryAlerts}
            description="Alert me when compliance records are expiring or already expired."
            label="Compliance expiry alerts"
            onChange={() => setComplianceExpiryAlerts((current) => !current)}
          />
          <Toggle
            checked={dailyDigest}
            description="Send a compact end-of-day summary of portfolio blockers and review workload."
            label="Daily digest"
            onChange={() => setDailyDigest((current) => !current)}
          />
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-950">Why this matters</p>
          <p className="mt-2 text-[0.86rem] leading-7 text-slate-600">
            Good alert rules help you stay ahead of reviews, client delays, and compliance expiries without creating unnecessary noise.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/firm/notifications")}
            variant="secondary"
          >
            Open notifications
          </Button>
          <Button
            className="h-10 rounded-xl"
            onClick={() =>
              showSavedNotice(
                "Notification preferences saved",
                "Your accountant alerts and digest preferences were updated.",
              )
            }
          >
            Save notification settings
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  function renderCompliance() {
    return (
      <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ShieldIcon />
          </div>
          <div className="space-y-1">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
              Compliance controls
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Fine-tune how the accountant workspace treats renewals, high-risk clients, and compliance reporting.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <SelectField
            hint="When reminder requests should start for expiring compliance records."
            label="Renewal lead time"
            onChange={(event) => setRenewalLeadTime(event.target.value)}
            options={[
              { label: "30 days", value: "30 days" },
              { label: "21 days", value: "21 days" },
              { label: "14 days", value: "14 days" },
              { label: "7 days", value: "7 days" },
            ]}
            value={renewalLeadTime}
          />
          <SelectField
            hint="Used to highlight risk in the compliance centre."
            label="High-risk threshold"
            onChange={(event) => setHighRiskThreshold(event.target.value)}
            options={[
              { label: "1 expired item", value: "1 expired item" },
              { label: "2 expired items", value: "2 expired items" },
              { label: "3 expired items", value: "3 expired items" },
            ]}
            value={highRiskThreshold}
          />
          <SelectField
            label="Expired item escalation"
            onChange={(event) => setExpiredEscalation(event.target.value)}
            options={[
              { label: "Notify admin after 3 days", value: "Notify admin after 3 days" },
              { label: "Open request immediately", value: "Open request immediately" },
              { label: "Request first, admin after 5 days", value: "Request first, admin after 5 days" },
            ]}
            value={expiredEscalation}
          />
          <SelectField
            label="Portfolio report cadence"
            onChange={(event) => setReportCadence(event.target.value)}
            options={[
              { label: "Weekly portfolio digest", value: "Weekly portfolio digest" },
              { label: "Daily operations snapshot", value: "Daily operations snapshot" },
              { label: "Monthly compliance summary", value: "Monthly compliance summary" },
            ]}
            value={reportCadence}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {complianceInsights.map((item) => (
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <p className="text-sm font-semibold text-slate-950">{item.label}</p>
              <p className={cn("mt-2 text-[1.8rem] font-semibold tracking-tight", item.tone)}>
                {item.value}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/firm/compliance")}
            variant="secondary"
          >
            Open compliance centre
          </Button>
          <Button
            className="h-10 rounded-xl"
            onClick={() =>
              showSavedNotice(
                "Compliance controls saved",
                "Renewal timing, risk thresholds, and compliance reporting preferences were updated.",
              )
            }
          >
            Save compliance settings
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  function renderWorkspace() {
    return (
      <SurfaceCard className="overflow-hidden rounded-[1.55rem] border border-slate-200/80 bg-white p-0 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <ProfileIcon />
            </div>
            <div className="space-y-1">
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                Workspace profile
              </h2>
              <p className="text-[0.92rem] leading-7 text-slate-500">
                Control the details clients see and the internal notes you keep for your operating style.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Display name"
              onChange={(event) => setWorkspaceName(event.target.value)}
              value={workspaceName}
            />
            <TextField
              label="Role title"
              onChange={(event) => setWorkspaceTitle(event.target.value)}
              value={workspaceTitle}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <TextAreaField
              hint="Used in client-facing communication and review notes."
              label="Email signature"
              onChange={(event) => setEmailSignature(event.target.value)}
              value={emailSignature}
            />
            <TextAreaField
              hint="Private workspace note for your follow-up and escalation style."
              label="Internal workspace note"
              onChange={(event) => setInternalNote(event.target.value)}
              value={internalNote}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="text-slate-600">
                  <LockIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Workspace security</p>
                  <p className="text-[0.84rem] text-slate-500">
                    Accountant access remains role-based and audit-tracked.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="text-slate-600">
                  <SparkIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Client-facing polish</p>
                  <p className="text-[0.84rem] text-slate-500">
                    Keep responses clear, consistent, and aligned with your firm style.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setWorkspaceName(user?.fullName ?? "Daniel Mokoena");
              setWorkspaceTitle(user?.title ?? "Senior Accountant");
              setEmailSignature(
                "Kind regards,\nDaniel Mokoena\nSenior Accountant | Finwell Advisory",
              );
              setInternalNote(
                "Escalate overdue compliance blockers after the second missed follow-up if month-end readiness is affected.",
              );
              setFeedbackNotice({
                tone: "info",
                title: "Workspace profile reset",
                message: "Workspace profile details were restored to the current defaults.",
              });
            }}
            variant="secondary"
          >
            Reset profile
          </Button>
          <Button
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-6 shadow-[0_16px_30px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            onClick={() =>
              showSavedNotice(
                "Workspace profile saved",
                "Your display details, email signature, and internal operating note were updated.",
              )
            }
          >
            Save workspace profile
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <h1 className="text-[2.3rem] font-semibold tracking-tight text-slate-950">Settings</h1>
          <p className="text-[0.98rem] text-slate-500">
            Manage your accountant workflow, alerts, and workspace preferences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-slate-800 hover:bg-slate-50"
            onClick={() =>
              setFeedbackNotice({
                tone: "success",
                title: "Compliance controls active",
                message: `Portfolio compliance is currently ${complianceCentre.portfolioCompliancePercentage}% across your assigned clients.`,
              })
            }
            variant="secondary"
          >
            <ShieldIcon />
            <span>Compliance controls</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.72rem] font-semibold text-emerald-700">
              {complianceCentre.portfolioCompliancePercentage}%
            </span>
          </Button>
          <button
            aria-label="Open notifications"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
            onClick={() => navigate("/firm/notifications")}
            type="button"
          >
            <BellIcon />
            {notificationCount > 0 ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
            ) : null}
          </button>
        </div>
      </div>

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-3 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="grid gap-2 md:grid-cols-4">
          {sections.map((section) => {
            const active = activeSection === section.id;

            return (
              <button
                className={cn(
                  "flex items-start gap-3 rounded-[1.05rem] border px-3.5 py-3.5 text-left transition",
                  active
                    ? "border-brand-100 bg-[linear-gradient(180deg,#f7f8ff_0%,#ffffff_100%)] shadow-[0_12px_26px_rgba(84,66,255,0.06)]"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1",
                    section.tone,
                  )}
                >
                  {sectionIcon(section.id)}
                </div>
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-[0.92rem] font-semibold",
                      active ? "text-brand-700" : "text-slate-950",
                    )}
                  >
                    {section.title}
                  </p>
                  <p className="line-clamp-2 text-[0.76rem] leading-5 text-slate-500">
                    {section.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {activeSection === "workflow"
        ? renderWorkflow()
        : activeSection === "notifications"
          ? renderNotifications()
          : activeSection === "compliance"
            ? renderCompliance()
            : renderWorkspace()}
    </div>
  );
}
