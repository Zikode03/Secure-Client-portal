// Friendly guide: this module (NotificationPreferencesPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface RoleNotificationPreferences {
  emailReminders: boolean;
  escalationAlerts: boolean;
  quietHours: string;
}

const DEFAULT_PREFERENCES: RoleNotificationPreferences = {
  emailReminders: true,
  escalationAlerts: true,
  quietHours: "22:00-06:00",
};

// Component flow: gather data first, then render a focused UI state.
export function NotificationPreferencesPage() {
  const { user } = useAuth();
  const portal = usePortal();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [flash, setFlash] = useState("");

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

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    if (!user) {
      return;
    }

    if (isClient) {
      setEmailReminders(portal.clientSettings.notificationPreferences.deadlineAlerts);
      setEscalationAlerts(portal.clientSettings.notificationPreferences.complianceAlerts);
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
    setFlash("");

    if (isClient) {
      const result = portal.updateClientNotificationPreferences({
        ...portal.clientSettings.notificationPreferences,
        deadlineAlerts: emailReminders,
        complianceAlerts: escalationAlerts,
      });
      setFlash(result.message);
      return;
    }

    if (!storageKey || typeof window === "undefined") {
      setFlash("Unable to save preferences for this role.");
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
    setFlash("Notification preferences saved.");
  }

// Render output: this is the visual state users interact with.
  return (
    <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
      <h1 className="text-xl font-semibold text-slate-950">Notification Preferences</h1>
      <p className="mt-1 text-sm text-slate-500">
        Configure reminders, escalation channels, and quiet hours per role.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
          <span>Email reminders</span>
          <input checked={emailReminders} onChange={(event) => setEmailReminders(event.target.checked)} type="checkbox" />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
          <span>Escalation alerts</span>
          <input checked={escalationAlerts} onChange={(event) => setEscalationAlerts(event.target.checked)} type="checkbox" />
        </label>

        <label className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
          <span className="block text-slate-700">Quiet hours</span>
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
            onChange={(event) => setQuietHours(event.target.value)}
            value={quietHours}
          />
        </label>
      </div>

      <div className="mt-4">
        <Button onClick={savePreferences}>Save preferences</Button>
      </div>
      {flash ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {flash}
        </p>
      ) : null}
    </SurfaceCard>
  );
}