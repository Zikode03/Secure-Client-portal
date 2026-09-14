export interface ClientBusinessData {
  entityType: string;
  industry: string;
}

/**
 * Keeps legal entity classification separate from operating industry.
 * A Pty Ltd can be transport, retail, construction, healthcare, etc.;
 * entity type must never be reused as the industry value.
 */
export function normalizeClientBusinessData(input: {
  entityType?: string | null;
  industry?: string | null;
}): ClientBusinessData {
  return {
    entityType: input.entityType?.trim() ?? "",
    industry: input.industry?.trim() ?? "",
  };
}
