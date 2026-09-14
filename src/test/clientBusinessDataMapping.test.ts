import { describe, expect, it } from "vitest";
import { normaliseBusinessClassification } from "../services/businessClassification";

/** Regression coverage for the Phase 2 data-flow rule used by client API mappings. */
describe("client business classification mapping", () => {
  it("preserves legal entity type independently from operating industry", () => {
    const result = normaliseBusinessClassification({
      entityType: "Private Company",
      industry: "Construction",
    });

    expect(result.entityType).toBe("Private Company");
    expect(result.industry).toBe("Construction");
  });
});
