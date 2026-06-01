// Friendly guide: this module (FirmReviewQueuePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantReviewPage } from "../accountant/AccountantReviewPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmReviewQueuePage() {
  return <AccountantReviewPage />;
}
