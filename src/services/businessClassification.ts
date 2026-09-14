export interface BusinessClassificationInput {
  entityType?: string | null;
  industry?: string | null;
}

export interface BusinessClassification {
  entityType: string;
  industry: string;
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

/**
 * Entity type and industry represent different business facts.
 * Never substitute one for the other; doing so can produce the wrong monthly-pack recommendation.
 */
export function normaliseBusinessClassification(input: BusinessClassificationInput): BusinessClassification {
  return {
    entityType: clean(input.entityType) || "Not specified",
    industry: clean(input.industry) || "Not specified",
  };
}

export interface MonthlyPackTemplateOption {
  id: string;
  name: string;
  description?: string;
}

const industryTemplateKeywords: Array<{ keywords: string[]; templateTerms: string[] }> = [
  { keywords: ["transport", "logistics", "fleet", "courier", "freight", "taxi"], templateTerms: ["transport", "logistics", "fleet"] },
  { keywords: ["retail", "shop", "store", "wholesale", "ecommerce", "trading"], templateTerms: ["retail", "trading"] },
  { keywords: ["construction", "building", "engineering", "contractor"], templateTerms: ["construction", "contracting"] },
  { keywords: ["manufacturing", "factory", "production"], templateTerms: ["manufacturing", "production"] },
  { keywords: ["hospitality", "hotel", "restaurant", "catering", "food"], templateTerms: ["hospitality", "food service"] },
  { keywords: ["property", "real estate", "rental"], templateTerms: ["property", "real estate"] },
  { keywords: ["health", "medical", "clinic", "pharma"], templateTerms: ["health", "medical"] },
  { keywords: ["agriculture", "farm", "farming"], templateTerms: ["agriculture", "farm"] },
  { keywords: ["consulting", "professional", "legal", "accounting", "technology", "software", "services"], templateTerms: ["professional services", "services"] },
];

/**
 * Provides an advisory fallback only when the backend has not supplied a recommendation.
 * Industry drives the recommendation; entityType is intentionally not used as a substitute.
 */
export function recommendTemplateFromIndustry(
  templates: MonthlyPackTemplateOption[],
  industry?: string | null,
): MonthlyPackTemplateOption | null {
  const normalizedIndustry = clean(industry).toLowerCase();
  if (!normalizedIndustry) return null;

  const match = industryTemplateKeywords.find(({ keywords }) =>
    keywords.some((keyword) => normalizedIndustry.includes(keyword)),
  );
  if (!match) return null;

  return templates.find((template) => {
    const haystack = `${template.name} ${template.description ?? ""}`.toLowerCase();
    return match.templateTerms.some((term) => haystack.includes(term));
  }) ?? null;
}
