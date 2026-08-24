// Friendly guide: this module (formatters) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type {
  Tone,
  WorkflowStatus,
} from "../types/portal";

const workflowStatusLabels: Record<string, string> = {
  draft: "Draft",
  missing: "Missing",
  uploaded: "Uploaded",
  submitted: "Submitted",
  sent_to_accountant: "With accountant",
  under_accountant_review: "With accountant",
  under_review: "Under review",
  pending: "Pending",
  pending_signature: "Signature required",
  partial: "Partially complete",
  accepted: "Accepted",
  rejected: "Changes required",
  reupload_required: "Changes required",
  filed: "Filed",
  finalised: "Finalised",
  complete: "Complete",
  closed: "Closed",
  open: "Open",
  awaiting_client: "Waiting for client",
  waiting_on_client: "Waiting for client",
  client_replied: "Client responded",
  awaiting_accountant: "Waiting for accountant",
  waiting_on_accountant: "Waiting for accountant",
  resolved: "Resolved",
  on_track: "On track",
  attention: "Needs attention",
  overdue: "Overdue",
  due: "Due",
  late: "Late",
  compliant: "Compliant",
  valid: "Valid",
  expiring: "Expiring soon",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  at_risk: "At risk",
  high_risk: "High risk",
  not_started: "Not started",
  in_progress: "In progress",
};

/** Converts internal workflow states into consistent business language. */
export function formatStatusLabel(value: WorkflowStatus | string) {
  const normalized = value.trim().toLowerCase();
  return workflowStatusLabels[normalized] ?? normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character: string) => character.toUpperCase());
}

export function formatMonthlyPackStatus(value?: string | null) {
  if (!value) return "Not started";
  return formatStatusLabel(value);
}

export function formatRequestStatus(value?: string | null) {
  if (!value) return "Open";
  return formatStatusLabel(value);
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

export function statusToTone(value: WorkflowStatus | string): Tone {
  switch (value) {
    case "draft":
    case "not_started":
      return "neutral";
    case "accepted":
    case "filed":
    case "finalised":
    case "complete":
    case "closed":
    case "on_track":
    case "sent_to_accountant":
    case "uploaded":
    case "compliant":
    case "valid":
    case "resolved":
      return "success";
    case "pending":
    case "pending_signature":
    case "expiring":
    case "expiring_soon":
    case "under_review":
    case "under_accountant_review":
    case "awaiting_client":
    case "awaiting_accountant":
    case "client_replied":
    case "attention":
    case "at_risk":
    case "due":
    case "partial":
    case "in_progress":
      return "warning";
    case "late":
    case "rejected":
    case "reupload_required":
    case "missing":
    case "overdue":
    case "high_risk":
    case "expired":
      return "danger";
    default:
      return "info";
  }
}
