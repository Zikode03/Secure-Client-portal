// Friendly guide: this module (FirmSettingsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { portalServiceApi } from "../../services/portalApi";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import type { Permission, Role, Tone } from "../../types/portal";
import { cn } from "../../utils/cn";
import { getPermissionsForRole } from "../../utils/permissions";

// Shared shape notes: these types keep UI and data contracts aligned.
type SettingsSection = "operations" | "notifications" | "compliance" | "profile" | "access";

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

interface FilingRuleRecord {
  id: string;
  category: string;
  isEnabled: boolean;
  description: string;
}

const permissionCatalogue: Permission[] = [
  "view:assigned_clients",
  "view:all_clients",
  "view:assigned_documents",
  "view:all_documents",
  "view:assigned_review_queue",
  "view:firm_review_queue",
  "view:assigned_compliance",
  "view:firm_compliance",
  "manage:users",
  "manage:roles",
  "manage:assignments",
  "manage:templates",
  "manage:deadline_rules",
  "manage:system_settings",
  "export:firm_reports",
  "export:client_reports",
  "request:documents",
  "review:documents",
  "comment:documents",
  "comment:requests",
];

// Component flow: gather data first, then render a focused UI state.
function formatPermissionLabel(permission: Permission) {
  return permission.replace(":", " / ").split("_").join(" ");
}

function OperationsIcon() {
// Render output: this is the visual state users interact with.
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

function AccessIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.5 11.5V8.75a4.5 4.5 0 1 1 9 0v2.75m-9 0h9a1.75 1.75 0 0 1 1.75 1.75v5A1.75 1.75 0 0 1 16.5 20h-9a1.75 1.75 0 0 1-1.75-1.75v-5A1.75 1.75 0 0 1 7.5 11.5Z"
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
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
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
  if (section === "access") {
    return <AccessIcon />;
  }

  if (section === "notifications") {
    return <BellIcon />;
  }

  if (section === "compliance") {
    return <ShieldIcon />;
  }

  if (section === "profile") {
    return <ProfileIcon />;
  }

  return <OperationsIcon />;
}

export function FirmSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();
  const isAdmin = user?.role === "admin";
  const [activeSection, setActiveSection] = useState<SettingsSection>("operations");
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

// Local UI state: keeps track of what the user is seeing or editing right now.
  const [reviewSignature, setReviewSignature] = useState(user?.fullName ?? "Daniel Mokoena");
  const [clientFacingTitle, setClientFacingTitle] = useState(user?.title ?? "Senior Accountant");
  const [followUpWindow, setFollowUpWindow] = useState("2 business days");
  const [defaultEscalation, setDefaultEscalation] = useState("Open request");
  const [reviewSummaryStyle, setReviewSummaryStyle] = useState("Short and actionable");

  const [assignmentCadence, setAssignmentCadence] = useState("Daily");
  const [firmEscalationRule, setFirmEscalationRule] = useState(
    "Notify admin after 2 missed follow-ups",
  );
  const [retentionRule, setRetentionRule] = useState("5 years after return submission");
  const [mfaPolicy, setMfaPolicy] = useState("Required for admin only");

  const [reviewQueueAlerts, setReviewQueueAlerts] = useState(true);
  const [requestAlerts, setRequestAlerts] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(isAdmin);

  const [renewalLeadTime, setRenewalLeadTime] = useState("30 days");
  const [highRiskThreshold, setHighRiskThreshold] = useState("2 expired items");
  const [expiredEscalation, setExpiredEscalation] = useState("Notify admin after 3 days");
  const [reportCadence, setReportCadence] = useState("Weekly portfolio digest");

  const [workspaceName, setWorkspaceName] = useState(user?.fullName ?? "Priya Naidoo");
  const [workspaceTitle, setWorkspaceTitle] = useState(user?.title ?? "Operations Lead");
  const [emailSignature, setEmailSignature] = useState(
    isAdmin
      ? "Regards,\nPriya Naidoo\nOperations Lead | Finwell Advisory"
      : "Kind regards,\nDaniel Mokoena\nSenior Accountant | Finwell Advisory",
  );
  const [internalNote, setInternalNote] = useState(
    isAdmin
      ? "Review cross-firm blockers daily and keep assignment changes visible to the operations team."
      : "Escalate overdue compliance blockers after the second missed follow-up if month-end readiness is affected.",
  );
  const [selectedRoleForChecklist, setSelectedRoleForChecklist] = useState<Role>("accountant");
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<Role, Permission[]>>({
    admin: getPermissionsForRole("admin"),
    accountant: getPermissionsForRole("accountant"),
    client: getPermissionsForRole("client"),
  });
  // Filing rule state controls which accepted categories are auto-filed.
  const [filingRules, setFilingRules] = useState<FilingRuleRecord[]>([]);
  const [savedFilingRules, setSavedFilingRules] = useState<FilingRuleRecord[]>([]);
  const [filingRulesLoading, setFilingRulesLoading] = useState(true);
  const [filingRulesSaving, setFilingRulesSaving] = useState(false);

  const complianceCentre = portal.accountantComplianceCentre;
  const notificationCount = portal.accountantDashboard.notifications.filter(
    (item) => item.state !== "resolved" && item.state !== "reviewed",
  ).length;
  const reviewQueueCount = portal.getReviewQueue().length;
  const outstandingRequestCount = useMemo(() => {
    const allRequests = Array.from(
      new Map(
        portal.adminClients
          .flatMap((client) => portal.getClientWorkspace(client.id).requests)
          .map((request) => [request.id, request]),
      ).values(),
    );

    return allRequests.filter((request) => request.status !== "resolved" && request.status !== "closed")
      .length;
  }, [portal]);

  const complianceInsights = useMemo(
    () => [
      {
        id: "expired",
        label: "Expired items",
        value: complianceCentre.expiredCount,
        helper: isAdmin ? "Across the firm" : "Across your assigned clients",
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
        label: isAdmin ? "Firm compliance" : "Portfolio compliance",
        value: `${complianceCentre.portfolioCompliancePercentage}%`,
        helper: isAdmin ? "Firm-wide compliance view" : "Assigned compliance view",
        tone: "text-emerald-600",
      },
    ],
    [complianceCentre, isAdmin],
  );
  const filingRulesChanged = useMemo(
    () =>
      filingRules.length !== savedFilingRules.length ||
      filingRules.some((rule, index) => rule.isEnabled !== savedFilingRules[index]?.isEnabled),
    [filingRules, savedFilingRules],
  );

  useEffect(() => {
    let mounted = true;
    async function loadFilingRules() {
      setFilingRulesLoading(true);
      try {
        const response = await portalServiceApi.getFilingRules();
        if (!mounted) return;
        const normalized = ((response as FilingRuleRecord[]) ?? []).map((rule) => ({
          id: rule.id,
          category: rule.category,
          isEnabled: !!rule.isEnabled,
          description: rule.description,
        }));
        setFilingRules(normalized);
        setSavedFilingRules(normalized);
      } catch {
        if (!mounted) return;
        setFeedbackNotice({
          tone: "warning",
          title: "Filing rules unavailable",
          message: "Could not load filing rules right now. Please try again shortly.",
        });
      } finally {
        if (mounted) setFilingRulesLoading(false);
      }
    }

    void loadFilingRules();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleFilingRule(category: string) {
    setFilingRules((current) =>
      current.map((rule) =>
        rule.category === category ? { ...rule, isEnabled: !rule.isEnabled } : rule,
      ),
    );
  }

  async function saveFilingRules() {
    setFilingRulesSaving(true);
    try {
      const updates = filingRules.filter(
        (rule, index) => rule.isEnabled !== savedFilingRules[index]?.isEnabled,
      );
      for (const rule of updates) {
        // Save only changed toggles to keep updates targeted and auditable.
        const result = await portalServiceApi.updateFilingRule(rule.category, rule.isEnabled);
        if (!result.ok) {
          throw new Error("Failed to update filing rule.");
        }
      }
      setSavedFilingRules(filingRules);
      showSavedNotice(
        "Auto-filing rules saved",
        "Filed-document category rules were updated. New accepted records will follow these rules automatically.",
      );
    } catch {
      setFeedbackNotice({
        tone: "warning",
        title: "Save failed",
        message: "Could not save filing rules. Please retry.",
      });
    } finally {
      setFilingRulesSaving(false);
    }
  }

  const sections: Array<{
    id: SettingsSection;
    title: string;
    description: string;
    tone: string;
  }> = [
    {
      id: "operations",
      title: isAdmin ? "Firm operations" : "Workflow defaults",
      description: isAdmin
        ? "Routing, escalation, and internal operating rules"
        : "Review pace, follow-up timing, and escalation behaviour",
      tone: "bg-brand-50 text-brand-600 ring-brand-100",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: isAdmin
        ? "Firm-level alerts and admin digests"
        : "Queue alerts and summary preferences",
      tone: "bg-amber-50 text-amber-500 ring-amber-100",
    },
    {
      id: "compliance",
      title: "Compliance controls",
      description: isAdmin
        ? "Firm-wide rules, templates, and reporting"
        : "Renewal windows and portfolio reporting",
      tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    },
    {
      id: "profile",
      title: "Workspace profile",
      description: isAdmin
        ? "Admin workspace identity and control shortcuts"
        : "Client-facing details and internal notes",
      tone: "bg-sky-50 text-sky-600 ring-sky-100",
    },
    ...(isAdmin
      ? [
          {
            id: "access" as const,
            title: "Access control",
            description: "Manage users and tick role permissions",
            tone: "bg-violet-50 text-violet-600 ring-violet-100",
          },
        ]
      : []),
  ];

  function showSavedNotice(title: string, message: string) {
    setFeedbackNotice({
      tone: "success",
      title,
      message,
    });
  }

  function renderOperations() {
    if (isAdmin) {
      return (
        <SurfaceCard className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <OperationsIcon />
            </div>
            <div className="space-y-1">
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                Firm operations
              </h2>
              <p className="text-[0.92rem] leading-7 text-slate-500">
                Keep internal routing, escalation timing, and security guardrails consistent across the shared firm portal.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <SelectField
              label="Assignment review cadence"
              onChange={(event) => setAssignmentCadence(event.target.value)}
              options={[
                { label: "Daily", value: "Daily" },
                { label: "Twice weekly", value: "Twice weekly" },
                { label: "Weekly", value: "Weekly" },
              ]}
              value={assignmentCadence}
            />
            <SelectField
              label="Escalation rule"
              onChange={(event) => setFirmEscalationRule(event.target.value)}
              options={[
                {
                  label: "Notify admin after 2 missed follow-ups",
                  value: "Notify admin after 2 missed follow-ups",
                },
                {
                  label: "Open admin review immediately",
                  value: "Open admin review immediately",
                },
                {
                  label: "Request first, escalate after 5 days",
                  value: "Request first, escalate after 5 days",
                },
              ]}
              value={firmEscalationRule}
            />
            <SelectField
              label="Retention rule"
              onChange={(event) => setRetentionRule(event.target.value)}
              options={[
                {
                  label: "5 years after return submission",
                  value: "5 years after return submission",
                },
                {
                  label: "Longer where legal hold applies",
                  value: "Longer where legal hold applies",
                },
              ]}
              value={retentionRule}
            />
            <SelectField
              label="MFA policy"
              onChange={(event) => setMfaPolicy(event.target.value)}
              options={[
                { label: "Required for admin only", value: "Required for admin only" },
                { label: "Required for all internal roles", value: "Required for all internal roles" },
                { label: "Planned for next phase", value: "Planned for next phase" },
              ]}
              value={mfaPolicy}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Firm clients</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-slate-950">
                {portal.adminClients.length}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Total client accounts in the internal firm workspace.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Managed users</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-brand-600">
                {portal.userAccounts.length}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                User access remains controlled inside the same shared portal.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Open inbox items</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-amber-600">
                {outstandingRequestCount}
              </p>
              <p className="mt-1 text-[0.84rem] text-slate-500">
                Client and accountant follow-ups still in motion.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/firm/admin/assignments")} variant="secondary">
              Open assignments
            </Button>
            <Button onClick={() => setActiveSection("access")} variant="secondary">
              Open access control
            </Button>
            <Button
              onClick={() =>
                showSavedNotice(
                  "Firm operations saved",
                  "Routing cadence, escalation rules, and internal guardrails were updated for the firm workspace.",
                )
              }
            >
              Save firm operations
            </Button>
          </div>
        </SurfaceCard>
      );
    }

    return (
      <SurfaceCard className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <OperationsIcon />
          </div>
          <div className="space-y-1">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
              Workflow defaults
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Keep your review behaviour, client follow-up timing, and escalation steps consistent across the shared firm portal.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Default review signature"
            onChange={(event) => setReviewSignature(event.target.value)}
            value={reviewSignature}
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
              {
                label: "Open request and notify admin",
                value: "Open request and notify admin",
              },
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
              Active records currently waiting inside the review workspace.
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Open inbox items</p>
            <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-rose-600">
              {outstandingRequestCount}
            </p>
            <p className="mt-1 text-[0.84rem] text-slate-500">
              Client follow-ups and re-uploads still needing action.
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Open notifications</p>
            <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-brand-600">
              {notificationCount}
            </p>
            <p className="mt-1 text-[0.84rem] text-slate-500">
              Workflow alerts feeding your internal notification centre.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/firm/review")} variant="secondary">
            Open review queue
          </Button>
          <Button
            onClick={() =>
              showSavedNotice(
                "Workflow defaults saved",
                "Review signature, follow-up timing, and escalation behaviour were updated for your workspace.",
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
      <SurfaceCard className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
            <BellIcon />
          </div>
          <div className="space-y-1">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
              Notification preferences
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Choose which operational updates should reach you immediately and which ones can wait for a summary.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Toggle
            checked={reviewQueueAlerts}
            description={
              isAdmin
                ? "Alert me when review pressure shifts across the firm."
                : "Alert me when new items enter my review queue."
            }
            label={isAdmin ? "Review load alerts" : "Review queue alerts"}
            onChange={() => setReviewQueueAlerts((current) => !current)}
          />
          <Toggle
            checked={requestAlerts}
            description={
              isAdmin
                ? "Alert me when client or accountant requests are blocked."
                : "Alert me when clients still owe missing or corrected records."
            }
            label={isAdmin ? "Workflow blocker alerts" : "Client action alerts"}
            onChange={() => setRequestAlerts((current) => !current)}
          />
          <Toggle
            checked={complianceAlerts}
            description={
              isAdmin
                ? "Alert me when firm compliance exposure changes materially."
                : "Alert me when compliance records are expiring or already expired."
            }
            label={isAdmin ? "Compliance exposure alerts" : "Compliance expiry alerts"}
            onChange={() => setComplianceAlerts((current) => !current)}
          />
          <Toggle
            checked={dailyDigest}
            description={
              isAdmin
                ? "Send a compact admin digest covering assignment, request, and compliance changes."
                : "Send a compact end-of-day summary of reviews, blockers, and client follow-ups."
            }
            label="Daily digest"
            onChange={() => setDailyDigest((current) => !current)}
          />
        </div>

        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-950">Shared portal note</p>
          <p className="mt-2 text-[0.86rem] leading-7 text-slate-600">
            Notifications live in the same internal portal for admins and accountants. Only the scope of the records and the actions behind them should change.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/firm/notifications")} variant="secondary">
            Open notifications
          </Button>
          <Button
            onClick={() =>
              showSavedNotice(
                "Notification preferences saved",
                isAdmin
                  ? "Admin alert and digest preferences were updated."
                  : "Your accountant alerts and digest preferences were updated.",
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
      <SurfaceCard className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ShieldIcon />
          </div>
          <div className="space-y-1">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
              Compliance controls
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              {isAdmin
                ? "Keep firm-wide renewal timing, risk thresholds, and compliance controls aligned with the rest of the portal."
                : "Fine-tune how your workspace treats renewals, high-risk clients, and compliance reporting."}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
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
            label={isAdmin ? "Firm escalation rule" : "Expired item escalation"}
            onChange={(event) => setExpiredEscalation(event.target.value)}
            options={[
              { label: "Notify admin after 3 days", value: "Notify admin after 3 days" },
              { label: "Open request immediately", value: "Open request immediately" },
              {
                label: "Request first, admin after 5 days",
                value: "Request first, admin after 5 days",
              },
            ]}
            value={expiredEscalation}
          />
          <SelectField
            label="Report cadence"
            onChange={(event) => setReportCadence(event.target.value)}
            options={[
              { label: "Weekly portfolio digest", value: "Weekly portfolio digest" },
              { label: "Daily operations snapshot", value: "Daily operations snapshot" },
              { label: "Monthly compliance summary", value: "Monthly compliance summary" },
            ]}
            value={reportCadence}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
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

        <div className="space-y-3 rounded-[1.2rem] border border-slate-200 bg-white p-4">
          <div className="space-y-1">
            <h3 className="text-[1.08rem] font-semibold text-slate-950">Auto-filing rules</h3>
            <p className="text-[0.88rem] leading-6 text-slate-500">
              Only enabled categories are automatically moved into the filing register once accepted.
            </p>
          </div>
          {filingRulesLoading ? (
            <p className="text-sm text-slate-500">Loading filing rules...</p>
          ) : filingRules.length === 0 ? (
            <p className="text-sm text-slate-500">
              No filing rules configured yet. Add rules from backend configuration.
            </p>
          ) : (
            <div className="space-y-2">
              {filingRules.map((rule) => (
                <Toggle
                  checked={rule.isEnabled}
                  description={rule.description}
                  key={rule.id}
                  label={rule.category.replace(/_/g, " ")}
                  onChange={() => toggleFilingRule(rule.category)}
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!filingRulesChanged || filingRulesSaving || filingRulesLoading}
              onClick={() => void saveFilingRules()}
            >
              {filingRulesSaving ? "Saving..." : "Save filing rules"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/firm/compliance")} variant="secondary">
            Open compliance centre
          </Button>
          {isAdmin ? (
            <>
              <Button onClick={() => navigate("/firm/admin/assignments")} variant="secondary">
                Open assignments
              </Button>
            </>
          ) : null}
          <Button
            onClick={() =>
              showSavedNotice(
                "Compliance controls saved",
                isAdmin
                  ? "Firm-wide renewal timing and compliance control preferences were updated."
                  : "Renewal timing, risk thresholds, and compliance reporting preferences were updated.",
              )
            }
          >
            Save compliance settings
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  function renderProfile() {
    return (
      <SurfaceCard className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <ProfileIcon />
          </div>
          <div className="space-y-1">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
              Workspace profile
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              {isAdmin
                ? "Keep your admin workspace identity, internal notes, and control shortcuts in one place."
                : "Control the details clients see and the internal notes you keep for your operating style."}
            </p>
          </div>
        </div>

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
            hint={isAdmin ? "Used in internal admin communication." : "Used in client-facing communication and review notes."}
            label="Email signature"
            onChange={(event) => setEmailSignature(event.target.value)}
            value={emailSignature}
          />
          <TextAreaField
            hint={isAdmin ? "Private note for internal operating rules and escalation style." : "Private workspace note for your follow-up and escalation style."}
            label="Internal workspace note"
            onChange={(event) => setInternalNote(event.target.value)}
            value={internalNote}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              {isAdmin ? "Admin scope" : "Portfolio scope"}
            </p>
            <p className="mt-2 text-[0.84rem] leading-6 text-slate-500">
              {isAdmin
                ? "You can open deeper admin controls from here, but they still live inside the same firm portal shell."
                : "You are only changing your own workspace preferences for assigned clients, not firm-wide rules."}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Security note</p>
            <p className="mt-2 text-[0.84rem] leading-6 text-slate-500">
              Frontend visibility here improves UX only. Real authorization still has to be enforced by the backend and database once these settings are persisted.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {isAdmin ? (
            <>
              <Button onClick={() => navigate("/firm/admin/system-settings")} variant="secondary">
                Open system settings
              </Button>
              <Button onClick={() => setActiveSection("access")} variant="secondary">
                Open access control
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => navigate("/firm/notifications")} variant="secondary">
                Open notifications
              </Button>
              <Button onClick={() => navigate("/firm/compliance")} variant="secondary">
                Open compliance centre
              </Button>
            </>
          )}
          <Button
            onClick={() =>
              showSavedNotice(
                "Workspace profile saved",
                isAdmin
                  ? "Admin workspace details and notes were updated."
                  : "Your display details, email signature, and internal operating note were updated.",
              )
            }
          >
            Save workspace profile
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  function toggleRolePermission(role: Role, permission: Permission) {
    setRolePermissionMap((current) => {
      const currentPermissions = current[role];
      const hasPermission = currentPermissions.includes(permission);
      const nextPermissions = hasPermission
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions, permission];

      return {
        ...current,
        [role]: nextPermissions,
      };
    });
  }

  function renderAccessControl() {
    if (!isAdmin) {
      return null;
    }

    const selectedPermissions = rolePermissionMap[selectedRoleForChecklist];

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.55fr)]">
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-[1.25rem] font-semibold text-slate-950">User management</h2>
            <p className="mt-1 text-sm text-slate-500">
              See all internal users and their assigned roles from inside settings.
            </p>
          </div>

          <div className="space-y-3">
            {portal.userAccounts.map((account) => (
              <div
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3"
                key={account.id}
              >
                <p className="text-sm font-semibold text-slate-950">{account.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {account.email} / {account.role}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div>
            <h2 className="text-[1.25rem] font-semibold text-slate-950">Role permissions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tick permissions to control what each role can access.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(["admin", "accountant", "client"] as Role[]).map((role) => (
              <button
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition",
                  selectedRoleForChecklist === role
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                key={role}
                onClick={() => setSelectedRoleForChecklist(role)}
                type="button"
              >
                {role}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {permissionCatalogue.map((permission) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                key={`${selectedRoleForChecklist}-${permission}`}
              >
                <input
                  checked={selectedPermissions.includes(permission)}
                  onChange={() => toggleRolePermission(selectedRoleForChecklist, permission)}
                  type="checkbox"
                />
                <span className="capitalize">{formatPermissionLabel(permission)}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                showSavedNotice(
                  "Role permissions saved",
                  "Permission checklist updates were saved for the selected role.",
                )
              }
            >
              Save role permissions
            </Button>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => navigate("/firm/notifications")}
              size="sm"
              variant="secondary"
            >
              <span>Notifications</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-600">
                {notificationCount}
              </span>
            </Button>
            <Button
              onClick={() =>
                navigate(isAdmin ? "/firm/admin/system-settings" : "/firm/compliance")
              }
              size="sm"
              variant="secondary"
            >
              {isAdmin ? "Open system settings" : "Open compliance centre"}
            </Button>
          </>
        }
        description={
          isAdmin
            ? "The same internal settings shell, with administrator-only controls added where needed for firm-wide operations."
            : "The same internal settings shell, scoped to your own workflow preferences and assigned portfolio behaviour."
        }
        eyebrow={isAdmin ? "Firm workspace" : "Assigned workspace"}
        title="Settings"
      />

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

      {activeSection === "operations"
        ? renderOperations()
        : activeSection === "notifications"
          ? renderNotifications()
          : activeSection === "compliance"
            ? renderCompliance()
            : activeSection === "access"
              ? renderAccessControl()
              : renderProfile()}
    </div>
  );
}
