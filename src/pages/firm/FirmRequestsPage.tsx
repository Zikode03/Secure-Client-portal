// Friendly guide: this module (FirmRequestsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantFollowUpsPage } from "../accountant/AccountantFollowUpsPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmRequestsPage() {
  return <AccountantFollowUpsPage />;
}
