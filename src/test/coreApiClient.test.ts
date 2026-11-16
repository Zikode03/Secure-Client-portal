import { vi as realTransportVi } from "vitest";
realTransportVi.unmock("../services/apiClient");
// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", { location: { origin: "http://localhost:5127" } });
  fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
it("uses generated monthly-pack and document-review paths", async () => {
  const requests: Request[] = [];
  fetchMock.mockImplementation(async (input: Request | string) => {
    if (typeof input === "string") return json({ requestToken: "csrf" });
    requests.push(input); return json(input.method === "GET" ? [] : { id: "saved" });
  });
  const { monthlyPacksApi, documentSlotsApi } = await import("../services/monthlyPacksApi");
  await monthlyPacksApi.list("business-a"); await monthlyPacksApi.submit("pack-a");
  await documentSlotsApi.approve("slot-a", "Reviewed against evidence");
  const { reviewQueueApi } = await import("../services/reviewQueueApi");
  await reviewQueueApi.review("document-a", { decision: "rejected", reason: "Missing invoice", internalNote: null });
  expect(new URL(requests[0].url).searchParams.get("clientId")).toBe("business-a");
  expect(new URL(requests[1].url).pathname).toBe("/api/monthly-packs/pack-a/submit");
  expect(new URL(requests[2].url).pathname).toBe("/api/document-slots/slot-a/approve");
  expect(await requests[2].json()).toEqual({ internalNote: "Reviewed against evidence" });
  expect(requests[2].headers.get("X-CSRF-Token")).toBe("csrf");
  expect(new URL(requests[3].url).pathname).toBe("/api/review-queue/document-a/review");
  expect(await requests[3].json()).toEqual({ decision: "rejected", reason: "Missing invoice", internalNote: null });
});
it("preserves multipart file bytes and writes metadata before the file", async () => {
  let uploaded: Request | undefined;
  fetchMock.mockImplementation(async (input: Request | string) => {
    if (typeof input === "string") return json({ requestToken: "csrf" });
    uploaded = input; return json({ id: "document-a" });
  });
  const { documentsApi } = await import("../services/documentsApi");
  await documentsApi.upload({ clientId: "business-a", monthlyPackId: "pack-a", documentType: "sales_invoices", file: new File(["actual file bytes"], "invoice.pdf", { type: "application/pdf" }) });
  expect(uploaded!.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
  expect(uploaded!.headers.get("X-CSRF-Token")).toBe("csrf");
  const form = await uploaded!.formData();
  expect([...form.keys()]).toEqual(["clientId", "monthlyPackId", "documentType", "file"]);
  expect(await (form.get("file") as File).text()).toBe("actual file bytes");
  expect((form.get("file") as File).name).toBe("invoice.pdf");
});
