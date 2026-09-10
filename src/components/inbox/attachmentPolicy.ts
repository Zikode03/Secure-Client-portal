const MAX_INBOX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const allowedExtensions = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
]);

export const inboxAttachmentAccept = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt";

export function validateInboxAttachment(file: File) {
  if (file.size > MAX_INBOX_ATTACHMENT_BYTES) {
    return "Attachments must be 25 MB or smaller.";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) {
    return "Use a PDF, image, Word, Excel, CSV or text file.";
  }

  return null;
}
