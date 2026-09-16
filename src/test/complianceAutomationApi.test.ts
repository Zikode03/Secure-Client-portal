import { beforeEach, describe, expect, it, vi } from "vitest";
import { complianceAutomationApi } from "../components/compliance/complianceAutomation";
import { apiGetJson, apiPostForm, apiPostJson, apiPutJson } from "../services/apiClient";

vi.mock("../services/apiClient", () => ({
  apiGetJson: vi.fn(), apiPostForm: vi.fn(), apiPostJson: vi.fn(), apiPutJson: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());

describe("compliance automation API contract", () => {
  it("uploads to the obligation route, preserving the file and returning the linked evidence", async () => {
    const file = new File(["receipt"], "receipt.pdf", { type: "application/pdf" });
    const response = { obligation: { id: "obligation-1", evidenceFound: 1 }, evidence: { id: "version-1", complianceItemId: "different-item-id" } };
    vi.mocked(apiPostForm).mockResolvedValue(response);
    expect(await complianceAutomationApi.uploadEvidence("obligation-1", file, " CSD receipt ")).toBe(response);
    const [path, body] = vi.mocked(apiPostForm).mock.calls[0];
    expect(path).toBe("/api/compliance/automation/obligations/obligation-1/evidence");
    expect(body.get("File")).toBe(file);
    expect(body.get("Note")).toBe("CSD receipt");
  });

  it("reads evidence by obligation identity, not the legacy item identity", async () => {
    await complianceAutomationApi.getEvidence("id/with space");
    expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/automation/obligations/id%2Fwith%20space/evidence");
  });

  it("reads client-scoped activity from the backend history endpoint", async () => {
    const entries = [{ id: "event-1", action: "compliance.automation.obligation_created", actor: "System", timestamp: "2026-09-14T12:00:00Z", detail: "Obligation created" }];
    vi.mocked(apiGetJson).mockResolvedValueOnce(entries);
    expect(await complianceAutomationApi.getHistory()).toBe(entries);
    expect(apiGetJson).toHaveBeenCalledWith("/api/compliance/history");
  });

  it("does not report failed storage as a successful upload", async () => {
    vi.mocked(apiPostForm).mockRejectedValue(new Error("Scanner unavailable"));
    await expect(complianceAutomationApi.uploadEvidence("obligation-1", new File(["x"], "x.pdf"), "")).rejects.toThrow("Scanner unavailable");
  });

  it("uses the backend routes for the complete workflow", async () => {
    await complianceAutomationApi.getRules();
    await complianceAutomationApi.getProfile("client-1");
    await complianceAutomationApi.getObligations("client-1");
    await complianceAutomationApi.run("client-1");
    await complianceAutomationApi.preparation("id", { complete: true });
    await complianceAutomationApi.review("id", { approved: true });
    await complianceAutomationApi.submission("id", { submittedAtUtc: "2026-09-14T00:00:00Z", submissionReference: "SARS-1", amountPayable: 0, amountRefundable: 0, paymentRequired: false });
    await complianceAutomationApi.payment("id", { paidAtUtc: "2026-09-14T00:00:00Z", paymentReference: "BANK-1", amountPaid: 100 });
    await complianceAutomationApi.notApplicable("id", "Not registered");
    expect(vi.mocked(apiGetJson).mock.calls.map(([path]) => path)).toEqual([
      "/api/compliance/automation/rules", "/api/compliance/automation/profiles/client-1",
      "/api/compliance/automation/obligations?clientId=client-1",
    ]);
    expect(vi.mocked(apiPostJson).mock.calls.map(([path]) => path)).toEqual([
      "/api/compliance/automation/run?clientId=client-1",
      ...["preparation", "review", "submission", "payment", "not-applicable"].map(action => "/api/compliance/automation/obligations/id/" + action),
    ]);
    await complianceAutomationApi.updateRules({ version: "v2", rules: [] });
    expect(apiPutJson).toHaveBeenCalledWith("/api/compliance/automation/rules", { version: "v2", rules: [] });
  });
});

