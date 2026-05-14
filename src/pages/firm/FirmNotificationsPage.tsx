// Friendly guide: this module (FirmNotificationsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantNotificationsPage } from "../accountant/AccountantNotificationsPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmNotificationsPage() {
  return <AccountantNotificationsPage />;
}