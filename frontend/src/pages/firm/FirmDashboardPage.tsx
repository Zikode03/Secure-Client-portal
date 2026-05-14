// Friendly guide: this module (FirmDashboardPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantDashboardPage } from "../accountant/AccountantDashboardPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmDashboardPage() {
  return <AccountantDashboardPage />;
}