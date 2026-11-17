import { beforeEach, expect, it, vi } from "vitest";
import { getClientDeadlineLabel } from "../services/clientDeadlines";
import { apiGetJson } from "./fixtures/apiTransportFixture";
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn() }));
beforeEach(() => { vi.mocked(apiGetJson).mockReset(); });
it("reads the latest open pack's configured required-item dates", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path.startsWith("/api/monthly-packs") ? [
    { id: "old", year: 2027, month: 2, status: "open" }, { id: "current", year: 2027, month: 3, status: "open" }, { id: "closed", year: 2027, month: 4, status: "closed" },
  ] : [
    { isRequired: true, status: "missing", dueDateUtc: "2027-03-21T12:00:00Z" },
    { isRequired: false, status: "missing", dueDateUtc: "2027-03-01T12:00:00Z" },
    { isRequired: true, status: "not_applicable", dueDateUtc: "2027-03-02T12:00:00Z" },
  ]);
  const label = await getClientDeadlineLabel("business");
  expect(label).toMatch(/Earliest required due date:.*21.*2027/);
  expect(apiGetJson).toHaveBeenCalledWith("/api/document-slots/current");
  expect(label).not.toContain("6th");
});
it("does not invent a deadline when no open pack or configured date exists", async () => {
  vi.mocked(apiGetJson).mockResolvedValue([]);
  expect(await getClientDeadlineLabel("business")).toBe("No open monthly pack");
  vi.mocked(apiGetJson).mockImplementation(async path => path.startsWith("/api/monthly-packs") ? [{ id: "current", year: 2027, month: 3, status: "open" }] : []);
  expect(await getClientDeadlineLabel("business")).toBe("No required document due date configured");
});
