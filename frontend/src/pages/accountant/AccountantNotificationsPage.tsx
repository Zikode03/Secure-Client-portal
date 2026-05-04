import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { NotificationList } from "../../components/workflow/NotificationList";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AccountantNotificationsPage() {
  const navigate = useNavigate();
  const portal = usePortal();
  const notifications = portal.accountantDashboard.notifications;

  return (
    <div className="space-y-6">
      <PageHeader
        description="This stream is tuned for accountants: missing evidence, deadline risk, rejected files, and expiring compliance items that need action before the next close."
        eyebrow="Accountant alerts"
        title="Operational notifications"
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">How the queue behaves</h2>
            <p className="mt-1 text-sm text-slate-500">
              Notifications are part of the workflow, not a side channel.
            </p>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Missing slots rise to the top when they threaten month completion</li>
            <li>Rejected files link straight back to the review action</li>
            <li>Deadline reminders stay visible until risk is cleared</li>
            <li>Expiring records help the team act before compliance slips</li>
          </ul>
        </SurfaceCard>

        <NotificationList items={notifications} onAction={navigate} />
      </section>
    </div>
  );
}
