// Friendly guide: this module (cn) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

// Component flow: gather data first, then render a focused UI state.
export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}