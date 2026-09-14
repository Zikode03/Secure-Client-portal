import { describe, expect, it } from "vitest";
import { complianceStatusLabel } from "../components/compliance/complianceAutomation";

describe("CSD compliance presentation", () => {
  it("keeps standing CSD workflow labels readable", () => {
    expect(complianceStatusLabel("not_required")).toBe("Not Required");
    expect(complianceStatusLabel("waiting_for_client")).toBe("Waiting For Client");
    expect(complianceStatusLabel("complete")).toBe("Complete");
  });
});
