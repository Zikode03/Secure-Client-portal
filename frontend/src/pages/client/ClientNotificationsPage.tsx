import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { NotificationList } from "../../components/workflow/NotificationList";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function ClientNotificationsPage() {
  const navigate = useNavigate();
  const portal = usePortal();
  const notifications = portal.clientWorkflow.notifications;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Notification design follows the accounting workflow: missing slots, rejected files, deadline reminders, and expiring records all have clear next actions."
        eyebrow="Client alerts"
        title="Workflow notifications"
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">What shows up here</h2>
            <p className="mt-1 text-sm text-slate-500">
              Alerts are intentionally narrow so clients only see the next workflow action they need to take.
            </p>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Missing document reminders tied to required month slots</li>
            <li>Rejected files with accountant feedback attached</li>
            <li>Deadline warnings before the month pack closes</li>
            <li>Expiring compliance records that need refresh</li>
          </ul>
        </SurfaceCard>

        <NotificationList items={notifications} onAction={navigate} />
      </section>
    </div>
  );
}
