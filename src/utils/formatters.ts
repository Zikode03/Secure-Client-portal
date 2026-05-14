// Friendly guide: this module (formatters) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type {
  Tone,
  WorkflowStatus,
} from "../types/portal";

// Component flow: gather data first, then render a focused UI state.
export function formatStatusLabel(value: WorkflowStatus) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character: string) => character.toUpperCase());
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toneToAccentClass(tone: Tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "danger":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "info":
      return "bg-brand-50 text-brand-700 ring-brand-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function statusToTone(value: WorkflowStatus): Tone {
  switch (value) {
    case "draft":
      return "neutral";
    case "accepted":
    case "filed":
    case "finalised":
    case "on_track":
    case "sent_to_accountant":
    case "uploaded":
    case "compliant":
    case "valid":
      return "success";
    case "pending":
    case "pending_signature":
    case "expiring":
    case "expiring_soon":
    case "under_review":
    case "attention":
    case "at_risk":
    case "due":
    case "partial":
      return "warning";
    case "late":
    case "rejected":
    case "missing":
    case "overdue":
    case "high_risk":
    case "expired":
      return "danger";
    default:
      return "info";
  }
}