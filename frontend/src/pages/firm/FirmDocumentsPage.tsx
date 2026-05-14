// Friendly guide: this module (FirmDocumentsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantDocumentsPage } from "../accountant/AccountantDocumentsPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmDocumentsPage() {
  return <AccountantDocumentsPage />;
}