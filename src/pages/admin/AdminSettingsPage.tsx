import { PageHeader } from "../../components/ui/PageHeader";
import { AdminFirmProfilePanel } from "./AdminFirmProfilePanel";
import { AdminSystemConfigurationPage } from "./AdminSystemConfigurationPage";

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage organisation identity, operational templates, reminders, deadlines, and escalation rules from one administration area."
        eyebrow="Administration"
        title="System settings"
      />
      <AdminFirmProfilePanel />
      <AdminSystemConfigurationPage embedded />
    </div>
  );
}
