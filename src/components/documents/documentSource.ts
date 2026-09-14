export type DocumentSource = "monthly_pack" | "request" | "direct_upload";

export interface DocumentSourceInput {
  documentSlotId?: string | null;
  documentId?: string | null;
}

/**
 * Source is derived from workflow relationships rather than filename text.
 * A monthly-pack slot takes precedence because it owns the collection workflow.
 */
export function getDocumentSource(
  input: DocumentSourceInput,
  requestDocumentIds: ReadonlySet<string> = new Set<string>(),
): DocumentSource {
  if (input.documentSlotId) return "monthly_pack";
  if (input.documentId && requestDocumentIds.has(input.documentId)) return "request";
  return "direct_upload";
}

export function formatDocumentSource(source: DocumentSource): string {
  switch (source) {
    case "monthly_pack":
      return "Monthly Pack";
    case "request":
      return "Request";
    default:
      return "Direct Upload";
  }
}
