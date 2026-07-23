import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { Tone } from "../../types/portal";

interface RoleNotificationPreferences {
  emailReminders: boolean;
  escalationAlerts: boolean;
  quietHours: string;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const DEFAULT_PREFERENCES: RoleNotificationPreferences = {
  emailReminders: true,
  escalationAlerts: true,
  quietHours: "22:00-06:00",
};

function PreferenceToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

export function NotificationPreferencesPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  const isClient = user?.role === "client";
  const storageKey = useMemo(
    () =>
      user
        ? `accounting-document-control-notification-preferences-${user.role}-${user.id}`
        : "",
    [user],
  );

  const [emailReminders, setEmailReminders] = useState(DEFAULT_PREFERENCES.emailReminders);
  const [escalationAlerts, setEscalationAlerts] = useState(DEFAULT_PREFERENCES.escalationAlerts);
  const [quietHours, setQuietHours] = useState(DEFAULT_PREFERENCES.quietHours);
  const [rejectionAlerts, setRejectionAlerts] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [browserAlerts, setBrowserAlerts] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (isClient) {
      const preferences = portal.clientSettings.notificationPreferences;
      setEmailReminders(preferences.deadlineAlerts);
      setEscalationAlerts(preferences.complianceAlerts);
      setRejectionAlerts(preferences.rejectionAlerts);
      setWeeklySummary(preferences.weeklySummary);
      setBrowserAlerts(preferences.browserAlerts);
      setQuietHours(DEFAULT_PREFERENCES.quietHours);
      return;
    }

    if (!storageKey || typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setEmailReminders(DEFAULT_PREFERENCES.emailReminders);
      setEscalationAlerts(DEFAULT_PREFERENCES.escalationAlerts);
      setQuietHours(DEFAULT_PREFERENCES.quietHours);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<RoleNotificationPreferences>;
      setEmailReminders(parsed.emailReminders ?? DEFAULT_PREFERENCES.emailReminders);
      setEscalationAlerts(parsed.escalationAlerts ?? DEFAULT_PREFERENCES.escalationAlerts);
      setQuietHours(parsed.quietHours ?? DEFAULT_PREFERENCES.quietHours);
    } catch {
      setEmailReminders(DEFAULT_PREFERENCES.emailReminders);
      setEscalationAlerts(DEFAULT_PREFERENCES.escalationAlerts);
      setQuietHours(DEFAULT_PREFERENCES.quietHours);
    }
  }, [isClient, portal.clientSettings.notificationPreferences, storageKey, user]);

  function savePreferences() {
    setFeedbackNotice(null);

    if (isClient) {
      const result = portal.updateClientNotificationPreferences({
        ...portal.clientSettings.notificationPreferences,
        deadlineAlerts: emailReminders,
        complianceAlerts: escalationAlerts,
        rejectionAlerts,
        weeklySummary,
        browserAlerts,
      });

      setFeedbackNotice({
        tone: result.ok ? "success" : "danger",
        title: result.ok ? "Preferences saved" : "Save failed",
        message: result.message,
      });
      return;
    }

    if (!storageKey || typeof window === "undefined") {
      setFeedbackNotice({
        tone: "danger",
        title: "Save failed",
        message: "Unable to save preferences for this role.",
      });
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        emailReminders,
        escalationAlerts,
        quietHours,
      }),
    );

    setFeedbackNotice({
      tone: "success",
      title: "Preferences saved",
      message: "Notification preferences saved.",
    });
  }

  return (
    <div className="space-y-4">
      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h1 className="text-xl font-semibold text-slate-950">Notification Preferences</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure reminders, escalation channels, and quiet hours per role.
        </p>

        <div className="mt-4 space-y-3">
          <PreferenceToggle
            checked={emailReminders}
            description="Receive reminders before monthly pack deadlines arrive."
            label="Deadline reminders"
            onChange={setEmailReminders}
          />

          <PreferenceToggle
            checked={escalationAlerts}
            description="Receive alerts when compliance or workflow issues need escalation."
            label="Escalation alerts"
            onChange={setEscalationAlerts}
          />

          {isClient ? (
            <>
              <PreferenceToggle
                checked={rejectionAlerts}
                description="Be notified when a document is rejected and a corrected version is needed."
                label="Rejected document alerts"
                onChange={setRejectionAlerts}
              />
              <PreferenceToggle
                checked={weeklySummary}
                description="Receive a weekly summary of your open tasks, packs, and reviews."
                label="Weekly summary"
                onChange={setWeeklySummary}
              />
              <PreferenceToggle
                checked={browserAlerts}
                description="Allow browser notifications for high-priority workflow events."
                label="Browser alerts"
                onChange={setBrowserAlerts}
              />
            </>
          ) : (
            <label className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="block font-medium text-slate-900">Quiet hours</span>
              <span className="mt-1 block text-xs text-slate-500">
                Silence reminder noise during this time window.
              </span>
              <input
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => setQuietHours(event.target.value)}
                value={quietHours}
              />
            </label>
          )}
        </div>

        <div className="mt-4">
          <Button onClick={savePreferences}>Save preferences</Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
