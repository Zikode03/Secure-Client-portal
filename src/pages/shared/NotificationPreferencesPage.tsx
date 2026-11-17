import { PageHeader } from "../../components/ui/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageSection } from "../../components/ui/PageSection";
import type { Tone } from "../../types/portal";
import { apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";

interface ServerPreferences extends RoleNotificationPreferences {
  deadlineAlerts: boolean; rejectionAlerts: boolean; complianceAlerts: boolean; weeklySummary: boolean; browserAlerts: boolean;
}

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

export function NotificationPreferencesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const portal = usePortal();
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  const isClient = user?.role === "client";
  const demoPreferences = hasApiBaseUrl() ? null : portal.clientSettings.notificationPreferences;
  const storageKey = useMemo(
    () =>
      user
        ? `accounting-document-control-notification-preferences-${user.role}-${user.id}`
        : "",
    [user],
  );

  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [emailReminders, setEmailReminders] = useState(DEFAULT_PREFERENCES.emailReminders);
  const [escalationAlerts, setEscalationAlerts] = useState(DEFAULT_PREFERENCES.escalationAlerts);
  const [quietHours, setQuietHours] = useState(DEFAULT_PREFERENCES.quietHours);
  const [rejectionAlerts, setRejectionAlerts] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [browserAlerts, setBrowserAlerts] = useState(false);
  const [loading, setLoading] = useState(hasApiBaseUrl());
  const [saving, setSaving] = useState(false);
  const [serverPreferences, setServerPreferences] = useState<ServerPreferences | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);

  useEffect(() => {
    if (hasApiBaseUrl()) {
      let active = true;
      setLoading(true); setServerPreferences(null);
      apiGetJson("/api/notifications/preferences").then((value) => {
        if (!active) return;
        setServerPreferences(value); setEmailReminders(value.emailReminders); setEscalationAlerts(value.escalationAlerts);
        setDeadlineAlerts(value.deadlineAlerts); setQuietHours(value.quietHours); setRejectionAlerts(value.rejectionAlerts); setWeeklySummary(value.weeklySummary); setBrowserAlerts(value.browserAlerts);
      }).catch(() => { if (active) setFeedbackNotice({ tone: "danger", title: "Preferences unavailable", message: "Could not load saved preferences. Reload before editing." }); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
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
  }, [isClient, demoPreferences, storageKey, user?.id, loadRevision]);

  async function savePreferences() {
    setFeedbackNotice(null);
    if (hasApiBaseUrl()) {
      if (!serverPreferences) return;
      setSaving(true);
      try {
        const saved = await apiPutJson("/api/notifications/preferences", {
          ...serverPreferences, deadlineAlerts, emailReminders, escalationAlerts, quietHours, rejectionAlerts, weeklySummary, browserAlerts,
        });
        setServerPreferences(saved);
        setFeedbackNotice({ tone: "success", title: "Preferences saved", message: "Notification preferences saved to your account." });
      } catch { setFeedbackNotice({ tone: "danger", title: "Save failed", message: "Preferences were not saved. Retry when the connection is available." }); }
      finally { setSaving(false); }
      return;
    }

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
      {hasApiBaseUrl() && !loading && !serverPreferences && <Button variant="secondary" onClick={() => setLoadRevision(n => n + 1)}>Retry loading preferences</Button>}
      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <PageSection className="">
        {!embedded ? <PageHeader title="Notification Preferences" description="Configure reminders, escalation channels, and quiet hours per role." /> : null}

        <p className="mt-3 text-sm text-slate-500">In-app alerts appear under the bell. Email updates also require your firm’s email delivery to be configured and enabled.</p>
        <div className="mt-4 space-y-3">
          <PreferenceToggle checked={emailReminders} label="Email notifications" description="Also receive workflow updates by email. Document contents stay in the portal." onChange={setEmailReminders} />
          <PreferenceToggle
            checked={deadlineAlerts}
            description="Receive reminders before monthly pack deadlines arrive."
            label="Deadline reminders"
            onChange={setDeadlineAlerts}
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
              <p className="text-xs text-slate-500">Weekly summaries and browser push notifications are not available yet.</p>
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
          <Button disabled={loading || saving || (hasApiBaseUrl() && !serverPreferences)} onClick={() => void savePreferences()}>{saving ? "Saving…" : "Save preferences"}</Button>
        </div>
      </PageSection>
    </div>
  );
}
