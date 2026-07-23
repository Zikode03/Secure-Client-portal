import type { DocumentRecord, MonthlyDocumentSlot, MonthlyPack, UploadSubmission } from "../types/portal";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthLabelFromParts(year: number, month: number) {
  return `${monthNames[Math.min(Math.max(month - 1, 0), 11)]} ${year}`;
}

export function buildDefaultDueDate(year: number, month: number) {
  const dueMonth = month === 12 ? 1 : month + 1;
  const dueYear = month === 12 ? year + 1 : year;
  return new Date(Date.UTC(dueYear, dueMonth - 1, 6)).toISOString();
}

export function normaliseDocumentType(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isInvoiceCategory(value: string) {
  return normaliseDocumentType(value).includes("invoice");
}

export function acceptedFilesForSlot(category: string, label: string) {
  const normalized = `${normaliseDocumentType(category)} ${normaliseDocumentType(label)}`;

  if (normalized.includes("bank statement")) {
    return ["PDF", "CSV", "XLSX"];
  }

  if (normalized.includes("invoice")) {
    return ["PDF", "ZIP", "CSV", "XLSX"];
  }

  if (normalized.includes("signed")) {
    return ["PDF"];
  }

  return ["PDF", "PNG", "JPG", "DOCX", "XLSX"];
}

export function supportsExpiryDate(category: string, label: string) {
  return /(tax|certificate|contract|id|address|coida|csd|insurance|lease|vat|paye|uif|sdl)/i.test(
    `${category} ${label}`,
  );
}

export function slotProgress(status: MonthlyDocumentSlot["status"]) {
  switch (status) {
    case "draft":
      return 65;
    case "uploaded":
      return 85;
    case "under_review":
      return 90;
    case "accepted":
    case "filed":
      return 100;
    case "rejected":
      return 35;
    case "partial":
      return 40;
    case "pending":
      return 25;
    default:
      return 0;
  }
}

export function mapBackendSlotStatus(
  status: string,
  isRequired: boolean,
): MonthlyDocumentSlot["status"] {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "draft":
      return "draft";
    case "submitted":
    case "uploaded":
      return "uploaded";
    case "under_review":
      return "under_review";
    case "accepted":
    case "approved":
      return "accepted";
    case "rejected":
    case "reupload_required":
      return "rejected";
    case "partial":
      return "partial";
    case "pending":
      return "pending";
    case "pending_signature":
      return "pending_signature";
    case "not_applicable":
      return isRequired ? "accepted" : "filed";
    default:
      return "missing";
  }
}

export function mapBackendPackSubmissionStatus(
  status: string,
): MonthlyPack["submissionStatus"] {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "submitted":
    case "under_review":
      return "under_accountant_review";
    case "approved":
    case "complete":
    case "closed":
      return "complete";
    default:
      return "open";
  }
}

export function mapBackendDocumentStatus(
  status: string,
): DocumentRecord["status"] {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "under_review":
      return "under_review";
    case "accepted":
    case "approved":
      return "accepted";
    case "rejected":
      return "rejected";
    case "filed":
      return "filed";
    default:
      return "uploaded";
  }
}

export function formatSizeLabel(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1_000) {
    return `${Math.max(1, Math.round(sizeBytes / 1_000))} KB`;
  }

  return `${sizeBytes} B`;
}

export interface SlotSubmissionMeta {
  currentDocumentId?: string;
  canCurrentlyBeSubmitted: boolean;
}

export function findNextSubmittableSlot(
  slots: MonthlyDocumentSlot[],
  slotMetaById: Record<string, SlotSubmissionMeta>,
) {
  return slots.find((slot) => slotMetaById[slot.id]?.canCurrentlyBeSubmitted) ?? null;
}

export function buildSlotUploadForm(args: {
  clientId: string;
  monthlyPackId: string;
  submission: UploadSubmission;
  currentDocumentId?: string;
}) {
  const form = new FormData();
  form.append("ClientId", args.clientId);
  form.append("MonthlyPackId", args.monthlyPackId);
  form.append("DocumentSlotId", args.submission.slotId);
  form.append("DocumentType", args.submission.documentType);
  if (args.currentDocumentId) {
    form.append("DocumentId", args.currentDocumentId);
  }
  if (args.submission.file) {
    form.append("File", args.submission.file, args.submission.fileName);
  }
  return form;
}
