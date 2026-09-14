import { describe, expect, it } from "vitest";
import { normalizeClientBusinessData } from "../services/clientBusinessData";

describe("client business data", () => {
  it("keeps entity type and industry independent", () => {
    expect(normalizeClientBusinessData({ entityType: "Private Company", industry: "Transport & Logistics" })).toEqual({
      entityType: "Private Company",
      industry: "Transport & Logistics",
    });
  });

  it("does not substitute entity type when industry is missing", () => {
    expect(normalizeClientBusinessData({ entityType: "Private Company", industry: "" })).toEqual({
      entityType: "Private Company",
      industry: "",
    });
  });
});
