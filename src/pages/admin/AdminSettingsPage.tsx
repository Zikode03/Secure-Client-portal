import { AdminFirmProfilePanel } from "./AdminFirmProfilePanel";
import { AdminSystemConfigurationPage } from "./AdminSystemConfigurationPage";

import { SmtpVerificationPanel } from "../../components/auth/SmtpVerificationPanel";

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminSystemConfigurationPage />
      <AdminFirmProfilePanel />
      <SmtpVerificationPanel />
    </div>
  );
}
