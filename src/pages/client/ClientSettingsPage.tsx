import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { BusinessProfile, Tone } from "../../types/portal";
import { cn } from "../../utils/cn";

// Shared shape notes: these types keep UI and data contracts aligned.
type SettingsSection = "business" | "security" | "notifications" | "documents";

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

interface BackendClientProfile {
  id: string;
  name: string;
  entityType: string;
  primaryContact: string;
  email: string;
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 19.5V5.75A1.75 1.75 0 0 1 8.25 4h7.5A1.75 1.75 0 0 1 17.5 5.75V19.5M4 19.5h16M9 8h1.5M13.5 8H15M9 11.5h1.5M13.5 11.5H15M9 15h1.5M13.5 15H15"
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

function InfoIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 10.25v5m0-8v.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SessionIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <rect
        height="11.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="17"
        x="3.5"
        y="5.25"
      />
      <path
        d="M8.5 19.5h7"
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
    case "security":
      return <ShieldIcon />;
    case "notifications":
      return <BellIcon />;
    case "documents":
      return <DocumentIcon />;
    default:
      return <BuildingIcon />;
  }
}

function formatDateValue(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ClientSettingsPage() {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();

  const notificationPreferences = portal.clientSettings.notificationPreferences;
  const securitySettings = portal.clientSettings.security;
  const initialProfile = useMemo(() => portal.clientProfile, [portal.clientProfile]);

  const [activeSection, setActiveSection] = useState<SettingsSection>("business");
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);
  const [industry, setIndustry] = useState("Accounting & Financial Services");
  const [jobTitle, setJobTitle] = useState(user?.title ?? "Finance Manager");
  const [deadlineAlerts, setDeadlineAlerts] = useState(notificationPreferences.deadlineAlerts);
  const [rejectionAlerts, setRejectionAlerts] = useState(notificationPreferences.rejectionAlerts);
  const [complianceAlerts, setComplianceAlerts] = useState(notificationPreferences.complianceAlerts);
  const [weeklySummary, setWeeklySummary] = useState(notificationPreferences.weeklySummary);
  const [browserAlerts, setBrowserAlerts] = useState(notificationPreferences.browserAlerts);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
    setJobTitle(user?.title ?? "Finance Manager");
  }, [initialProfile, user]);

  useEffect(() => {
    setDeadlineAlerts(notificationPreferences.deadlineAlerts);
    setRejectionAlerts(notificationPreferences.rejectionAlerts);
    setComplianceAlerts(notificationPreferences.complianceAlerts);
    setWeeklySummary(notificationPreferences.weeklySummary);
    setBrowserAlerts(notificationPreferences.browserAlerts);
  }, [notificationPreferences]);

  useEffect(() => {
    const clientId = user?.clientIds[0];
    if (!backendMode || !clientId) {
      return;
    }

    void apiGetJson<BackendClientProfile>(`/api/clients/${encodeURIComponent(clientId)}`)
      .then((client) => {
        setProfile((current) => ({
          ...current,
          legalName: client.name,
          primaryContact: client.primaryContact,
          financeEmail: client.email,
          registrationNumber: "",
          vatNumber: "",
          phone: "",
        }));
        setIndustry(client.entityType || "Client entity");
      })
      .catch((error: unknown) => {
        setFeedbackNotice({
          tone: "danger",
          title: "Profile unavailable",
          message: error instanceof ApiError ? error.message : "The live client profile could not be loaded.",
        });
      });
  }, [backendMode, user?.clientIds]);

  const sections: Array<{
    id: SettingsSection;
    title: string;
    description: string;
    tone: string;
  }> = [
    {
      id: "business",
      title: "Business profile",
      description: "Company details and contact information",
      tone: "bg-brand-50 text-brand-600 ring-brand-100",
    },
    {
      id: "security",
      title: "Security",
      description: "Password and session security",
      tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Email alerts and reminder preferences",
      tone: "bg-amber-50 text-amber-500 ring-amber-100",
    },
    {
      id: "documents",
      title: "Document preferences",
      description: "Upload rules, formats and retention settings",
      tone: "bg-sky-50 text-sky-600 ring-sky-100",
    },
  ];

  function handleSaveProfile() {
    if (backendMode) {
      setFeedbackNotice({
        tone: "info",
        title: "Profile managed by your firm",
        message: "Contact your accountant to change registered business or primary-contact details.",
      });
      return;
    }
    const result = portal.updateBusinessProfile(profile);
    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Settings saved" : "Save failed",
      message: result.message,
    });
  }

  function handleResetProfile() {
    setProfile(initialProfile);
    setIndustry("Accounting & Financial Services");
    setJobTitle(user?.title ?? "Finance Manager");
    setFeedbackNotice({
      tone: "info",
      title: "Changes reset",
      message: "Profile fields were reset to the current workspace values.",
    });
  }

  async function handlePasswordChange() {
    if (!currentPassword.trim()) {
      setFeedbackNotice({
        tone: "danger",
        title: "Current password required",
        message: "Enter your current password before choosing a new one.",
      });
      return;
    }

    if (nextPassword.trim().length < 8) {
      setFeedbackNotice({
        tone: "danger",
        title: "Password too short",
        message: "Use a new password with at least 8 characters.",
      });
      return;
    }

    if (nextPassword !== confirmPassword) {
      setFeedbackNotice({
        tone: "danger",
        title: "Passwords do not match",
        message: "Confirm the new password exactly before saving.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    const result = await changePassword(currentPassword, nextPassword);
    setIsUpdatingPassword(false);

    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Password updated" : "Password update failed",
      message:
        result.message ??
        (result.ok
          ? "Your password was updated successfully."
          : "The password could not be updated."),
    });

    if (result.ok) {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    }
  }

  function handleSaveNotifications() {
    if (backendMode) {
      return;
    }
    const result = portal.updateClientNotificationPreferences({
      ...notificationPreferences,
      deadlineAlerts,
      rejectionAlerts,
      complianceAlerts,
      weeklySummary,
      browserAlerts,
    });

    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Preferences saved" : "Save failed",
      message: result.message,
    });
  }

  function renderBusinessProfile() {
    return (
      <SurfaceCard className="overflow-hidden rounded-[1.55rem] border border-slate-200/80 bg-white p-0 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <BuildingIcon />
            </div>
            <div className="space-y-1">
              <h2 className="portal-section-title text-slate-950">
                Business profile
              </h2>
              <p className="text-[0.92rem] leading-7 text-slate-500">
                Update your business details and primary contact information.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6">
          {backendMode ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
              Registered business details are read-only in the client portal. Contact your accountant to request a change.
            </div>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Company name"
              onChange={(event) =>
                setProfile((current) => ({ ...current, legalName: event.target.value }))
              }
              readOnly={backendMode}
              value={profile.legalName}
            />
            <TextField
              label="Registration number"
              onChange={(event) =>
                setProfile((current) => ({ ...current, registrationNumber: event.target.value }))
              }
              readOnly={backendMode}
              value={profile.registrationNumber}
            />
            <TextField
              label="VAT number"
              onChange={(event) =>
                setProfile((current) => ({ ...current, vatNumber: event.target.value }))
              }
              readOnly={backendMode}
              value={profile.vatNumber}
            />
            <SelectField
              label="Industry"
              disabled={backendMode}
              onChange={(event) => setIndustry(event.target.value)}
              options={[
                { label: "Accounting & Financial Services", value: "Accounting & Financial Services" },
                { label: "Wholesale & Distribution", value: "Wholesale & Distribution" },
                { label: "Professional Services", value: "Professional Services" },
                { label: "Manufacturing", value: "Manufacturing" },
              ]}
              value={industry}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-[1.02rem] font-semibold text-slate-950">Primary contact</h3>
            <p className="text-[0.88rem] text-slate-500">
              This is the main contact for compliance communication.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Full name"
              onChange={(event) =>
                setProfile((current) => ({ ...current, primaryContact: event.target.value }))
              }
              readOnly={backendMode}
              value={profile.primaryContact}
            />
            <TextField
              label="Email address"
              onChange={(event) =>
                setProfile((current) => ({ ...current, financeEmail: event.target.value }))
              }
              readOnly={backendMode}
              value={profile.financeEmail}
            />
            <TextField
              label="Phone number"
              onChange={(event) =>
                setProfile((current) => ({ ...current, phone: event.target.value }))
              }
              readOnly={backendMode}
              value={profile.phone}
            />
            <TextField
              label="Job title"
              onChange={(event) => setJobTitle(event.target.value)}
              readOnly={backendMode}
              value={jobTitle}
            />
          </div>

          <div className="rounded-[1.3rem] border border-brand-100 bg-[linear-gradient(180deg,#f7f8ff_0%,#ffffff_100%)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-brand-600">
                <InfoIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Why we need this information</p>
                <p className="mt-1 text-[0.88rem] leading-7 text-slate-600">
                  Your details help us ensure accurate compliance records, structured uploads, communication, and audit readiness.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!backendMode ? <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
            onClick={handleResetProfile}
            variant="secondary"
          >
            Reset changes
          </Button>
          <Button
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-6 shadow-[0_16px_30px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            onClick={handleSaveProfile}
          >
            Save changes
          </Button>
        </div> : null}
      </SurfaceCard>
    );
  }

  function renderSecurity() {
    const activeSessions = securitySettings.activeSessions ?? [];

    return (
      <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ShieldIcon />
          </div>
          <div className="space-y-1">
            <h2 className="portal-section-title text-slate-950">Security</h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Manage account access, authentication controls, and current session trust.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="text-slate-600">
                <LockIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Password protection</p>
                <p className="text-[0.84rem] text-slate-500">
                  Last changed {formatDateValue(securitySettings.passwordLastChangedAt)}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <TextField
                autoComplete="current-password"
                id="client-current-password"
                label="Current password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
                type="password"
                value={currentPassword}
              />
              <TextField
                autoComplete="new-password"
                hint="Use at least 8 characters."
                id="client-next-password"
                label="New password"
                onChange={(event) => setNextPassword(event.target.value)}
                placeholder="Enter new password"
                type="password"
                value={nextPassword}
              />
              <TextField
                autoComplete="new-password"
                id="client-confirm-password"
                label="Confirm new password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                type="password"
                value={confirmPassword}
              />
              <Button
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
                disabled={isUpdatingPassword}
                onClick={() => void handlePasswordChange()}
                variant="secondary"
              >
                {isUpdatingPassword ? "Updating password..." : "Update password"}
              </Button>
            </div>
          </div>

          {backendMode ? (
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="text-slate-600"><SessionIcon /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Session security</p>
                  <p className="text-[0.84rem] text-slate-500">Password changes revoke your other active sessions automatically.</p>
                </div>
              </div>
              <p className="mt-4 text-[0.86rem] leading-6 text-slate-600">
                Detailed session management is not exposed by the current API, so this portal does not display synthetic devices or locations.
              </p>
            </div>
          ) : (
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="text-slate-600">
                <SessionIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Active sessions</p>
                <p className="text-[0.84rem] text-slate-500">
                  {activeSessions.length} trusted session{activeSessions.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {activeSessions.map((session) => (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2" key={session.id}>
                  <p className="text-sm font-medium text-slate-900">{session.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {session.location} | Last active {formatDateValue(session.lastActiveAt)}
                    {session.isCurrent ? " | Current session" : ""}
                  </p>
                </div>
              ))}
              <Button
                className="mt-2 h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
                onClick={() =>
                  setFeedbackNotice({
                    tone: "success",
                    title: "Session review complete",
                    message: `You currently have ${activeSessions.length} trusted session${activeSessions.length === 1 ? "" : "s"} in this workspace.`,
                  })
                }
                variant="secondary"
              >
                Review sessions
              </Button>
            </div>
          </div>
          )}
        </div>
      </SurfaceCard>
    );
  }

  function renderNotifications() {
    if (backendMode) {
      return (
        <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
              <BellIcon />
            </div>
            <div>
              <h2 className="portal-section-title text-slate-950">Notification preferences</h2>
              <p className="mt-2 max-w-2xl text-[0.92rem] leading-7 text-slate-500">
                The current API delivers workflow notifications but does not yet expose preference storage. No local-only settings are shown or saved in live mode.
              </p>
              <Button className="mt-5" onClick={() => navigate("/client/notifications")} variant="secondary">
                Open notification inbox
              </Button>
            </div>
          </div>
        </SurfaceCard>
      );
    }

    return (
      <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
            <BellIcon />
          </div>
          <div className="space-y-1">
            <h2 className="portal-section-title text-slate-950">
              Notification preferences
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Choose which workflow updates should come through as reminders and alerts.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Toggle
            checked={deadlineAlerts}
            description="Notify me when a monthly pack deadline is approaching."
            label="Deadline reminders"
            onChange={() => setDeadlineAlerts((current) => !current)}
          />
          <Toggle
            checked={rejectionAlerts}
            description="Notify me when an accountant rejects a file and needs a corrected upload."
            label="Rejected document alerts"
            onChange={() => setRejectionAlerts((current) => !current)}
          />
          <Toggle
            checked={complianceAlerts}
            description="Notify me when compliance records are expiring or have expired."
            label="Compliance expiry alerts"
            onChange={() => setComplianceAlerts((current) => !current)}
          />
          <Toggle
            checked={weeklySummary}
            description="Receive a weekly summary of workflow progress and blockers."
            label="Weekly summary email"
            onChange={() => setWeeklySummary((current) => !current)}
          />
          <Toggle
            checked={browserAlerts}
            description="Show browser alerts for urgent workflow changes while you are signed in."
            label="Browser alerts"
            onChange={() => setBrowserAlerts((current) => !current)}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#5442ff,#6f59ff)] px-6 shadow-[0_16px_30px_rgba(84,66,255,0.18)] hover:bg-[linear-gradient(135deg,#4a38ef,#6650ff)]"
            onClick={handleSaveNotifications}
          >
            Save preferences
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  function renderDocuments() {
    return (
      <SurfaceCard className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <DocumentIcon />
          </div>
          <div className="space-y-1">
            <h2 className="portal-section-title text-slate-950">
              Document preferences
            </h2>
            <p className="text-[0.92rem] leading-7 text-slate-500">
              Structured uploads, record retention, and file governance stay controlled here.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Structured uploads</p>
            <p className="mt-2 text-[0.86rem] leading-7 text-slate-600">
              Documents must still be uploaded through the correct monthly slot so they can be named, tracked, and reviewed properly.
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Retention</p>
            <p className="mt-2 text-[0.86rem] leading-7 text-slate-600">
              {portal.clientComplianceCentre.retentionNote}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/client/packs")}
            variant="secondary"
          >
            Open monthly packs
          </Button>
          <Button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/client/compliance")}
            variant="secondary"
          >
            Open compliance centre
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="portal-page mx-auto max-w-[1280px] space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1.5">
          <h1 className="portal-page-title text-slate-950">Settings</h1>
          <p className="text-[0.98rem] text-slate-500">
            Manage your account, preferences and security.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-slate-800 hover:bg-slate-50"
            onClick={() =>
              setFeedbackNotice({
                tone: "success",
                title: "Secure storage active",
                message: "Your documents stay encrypted, access-controlled, and retained for audit readiness.",
              })
            }
            variant="secondary"
          >
            <LockIcon />
            <span>Secure storage</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.72rem] font-semibold text-emerald-700">
              Secure
            </span>
          </Button>
          <button
            aria-label="Open notifications"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
            onClick={() => navigate("/client/notifications")}
            type="button"
          >
            <BellIcon />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
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

      {activeSection === "business"
        ? renderBusinessProfile()
        : activeSection === "security"
          ? renderSecurity()
          : activeSection === "notifications"
            ? renderNotifications()
            : renderDocuments()}
    </div>
  );
}
