import type { ComplianceRequestType } from "../../types/portal";

export type InboxRequestKind = "general" | "document" | "monthly_pack" | "compliance";

export const inboxRequestKindOptions = [
  { label: "General message", value: "general" },
  { label: "Document request", value: "document" },
  { label: "Monthly pack query", value: "monthly_pack" },
  { label: "Compliance query", value: "compliance" },
];

export function requestTypeForKind(kind: InboxRequestKind): ComplianceRequestType {
  if (kind === "document") return "missing_document_request";
  if (kind === "compliance") return "renewal_request";
  return "clarification_request";
}

export function requestTitleForKind(kind: InboxRequestKind, title: string) {
  const prefix = kind === "document"
    ? "Document request"
    : kind === "monthly_pack"
      ? "Monthly pack"
      : kind === "compliance"
        ? "Compliance"
        : "Message";
  return `${prefix}: ${title}`;
}
