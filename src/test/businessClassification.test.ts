import { describe, expect, it } from "vitest";
import { normaliseBusinessClassification, recommendTemplateFromIndustry } from "../services/businessClassification";

describe("business classification", () => {
  it("keeps entity type and industry separate", () => {
    expect(normaliseBusinessClassification({ entityType: "Pty Ltd", industry: "Transport & Logistics" })).toEqual({
      entityType: "Pty Ltd",
      industry: "Transport & Logistics",
    });
  });

  it("does not use entity type as a missing industry", () => {
    expect(normaliseBusinessClassification({ entityType: "Pty Ltd", industry: "" })).toEqual({
      entityType: "Pty Ltd",
      industry: "Not specified",
    });
  });

  it("recommends a transport template from industry", () => {
    const templates = [
      { id: "general", name: "Standard Business" },
      { id: "transport", name: "Transport & Logistics" },
    ];

    expect(recommendTemplateFromIndustry(templates, "Road freight and logistics")?.id).toBe("transport");
  });

  it("does not invent an industry recommendation when industry is missing", () => {
    const templates = [{ id: "transport", name: "Transport & Logistics" }];
    expect(recommendTemplateFromIndustry(templates, null)).toBeNull();
  });
});
