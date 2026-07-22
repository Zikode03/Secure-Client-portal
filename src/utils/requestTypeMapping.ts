import type { ComplianceRequestType } from "../types/portal";

export type BackendRequestType =
  | "missing_document"
  | "reupload_required"
  | "clarification_needed"
  | "signature_required"
  | "compliance_renewal";

export function toFrontendRequestType(requestType?: string | null): ComplianceRequestType {
  switch (requestType?.trim().toLowerCase()) {
    case "missing_document":
      return "missing_document_request";
    case "reupload_required":
      return "re_upload_request";
    case "compliance_renewal":
      return "renewal_request";
    case "signature_required":
    case "clarification_needed":
    default:
      return "clarification_request";
  }
}

export function toBackendRequestType(
  requestType?: ComplianceRequestType | string | null,
): BackendRequestType {
  switch (requestType?.trim().toLowerCase()) {
    case "missing_document_request":
    case "missing_document":
      return "missing_document";
    case "re_upload_request":
    case "reupload_required":
      return "reupload_required";
    case "renewal_request":
    case "compliance_renewal":
      return "compliance_renewal";
    case "clarification_request":
    case "signature_required":
    case "clarification_needed":
    default:
      return "clarification_needed";
  }
}
