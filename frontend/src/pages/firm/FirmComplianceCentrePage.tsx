// Friendly guide: this module (FirmComplianceCentrePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { AccountantComplianceCentrePage } from "../accountant/AccountantComplianceCentrePage";

// Component flow: gather data first, then render a focused UI state.
export function FirmComplianceCentrePage() {
  return <AccountantComplianceCentrePage />;
}