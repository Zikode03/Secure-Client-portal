import { AdminFirmProfilePanel } from "./AdminFirmProfilePanel";
import { AdminSystemConfigurationPage } from "./AdminSystemConfigurationPage";

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminSystemConfigurationPage />
      <AdminFirmProfilePanel />
    </div>
  );
}
