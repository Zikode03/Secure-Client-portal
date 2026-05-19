// Friendly guide: this module (FirmFilingPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantFilingPage } from "../accountant/AccountantFilingPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmFilingPage() {
  return <AccountantFilingPage />;
}

