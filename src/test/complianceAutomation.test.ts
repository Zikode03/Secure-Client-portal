import { describe, expect, it } from "vitest";
import { complianceStatusLabel, formatCompliancePeriod } from "../components/compliance/complianceAutomation";

describe("compliance automation presentation", () => {
  it("turns machine workflow states into readable labels", () => {
    expect(complianceStatusLabel("waiting_for_client")).toBe("Waiting For Client");
    expect(complianceStatusLabel("ready_to_file")).toBe("Ready To File");
    expect(complianceStatusLabel("payment_outstanding")).toBe("Payment Outstanding");
  });

  it("shows one month once and ranges across multiple months", () => {
    expect(formatCompliancePeriod("2026-09-01T00:00:00Z", "2026-09-30T23:59:59Z")).toBe("Sep 2026");
    expect(formatCompliancePeriod("2026-08-01T00:00:00Z", "2026-09-30T23:59:59Z")).toBe("Aug 2026 – Sep 2026");
  });
});
