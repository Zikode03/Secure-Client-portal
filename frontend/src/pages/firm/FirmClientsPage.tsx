// Friendly guide: this module (FirmClientsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantPortfolioPage } from "../accountant/AccountantPortfolioPage";

// Component flow: gather data first, then render a focused UI state.
export function FirmClientsPage() {
  return <AccountantPortfolioPage />;
}