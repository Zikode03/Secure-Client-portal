import { vi as realTransportVi } from "vitest";
realTransportVi.unmock("../services/apiClient");
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
let fetchMock: ReturnType<typeof vi.fn>;
let banking: typeof import("../services/bankingApi").bankingApi;
let generated: typeof import("../services/portalApiClient").portalApiClient;

beforeEach(async () => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  banking = (await import("../services/bankingApi")).bankingApi;
  generated = (await import("../services/portalApiClient")).portalApiClient;
});
afterEach(() => vi.unstubAllGlobals());

describe("OpenAPI client transport", () => {
  it("serializes typed queries and sends session cookies without bootstrapping CSRF for reads", async () => {
    fetchMock.mockResolvedValueOnce(json({ clientId: "client-a" }));
    await banking.getOverview("client a&b");
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(request.url).searchParams.get("clientId")).toBe("client a&b");
    expect(request.credentials).toBe("include");
    expect(request.headers.get("Accept")).toBe("application/json");
    expect(request.headers.has("X-CSRF-Token")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("protects generated mutations with the shared CSRF token and cookie transport", async () => {
    fetchMock.mockResolvedValueOnce(json({ requestToken: "token" })).mockResolvedValueOnce(json({ imported: 1 }));
    const body = { accountId: "account-a", sourceName: "statement.csv", rows: [{ date: "2026-11-01", description: "Rent", reference: "R1", amount: -100, balance: null }], preview: true };
    expect(await banking.importManualTransactions(body)).toEqual({ imported: 1 });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/csrf$/);
    const request = fetchMock.mock.calls[1][0] as Request;
    expect(request.method).toBe("POST");
    expect(request.credentials).toBe("include");
    expect(request.headers.get("X-CSRF-Token")).toBe("token");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(await request.json()).toEqual(body);
  });

  it("replays a consumed Request body only after an explicit stale-CSRF rejection", async () => {
    let mutations = 0;
    const bodies: unknown[] = [];
    fetchMock.mockImplementation(async (input: Request | string) => {
      if (typeof input === "string") return json({ requestToken: mutations === 0 ? "old" : "new" });
      bodies.push(await input.json());
      mutations++;
      return mutations === 1 ? json({ code: "CSRF_INVALID" }, 403) : json({ clientId: "ok" });
    });
    const body = { bankName: "Bank", accountName: "Operating", lastFourDigits: "1234", registrationId: "registration-1" };
    await banking.addManualAccount(body);
    expect(bodies).toEqual([body, body]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((fetchMock.mock.calls[3][0] as Request).headers.get("X-CSRF-Token")).toBe("new");
  });

  it.each([403, 500])("preserves ApiError and never replays an ordinary %s failure", async (status) => {
    fetchMock.mockResolvedValueOnce(json({ requestToken: "token" })).mockResolvedValueOnce(json({ error: "Import refused" }, status));
    await expect(banking.addManualAccount({ bankName: "Bank", accountName: "Operating", lastFourDigits: "1234", registrationId: "registration-1" }))
      .rejects.toMatchObject({ name: "ApiError", status, message: "Import refused" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects cross-origin overrides before sending credentials or obtaining CSRF", async () => {
    await expect(generated.GET("/api/banking/overview", { baseUrl: "https://attacker.example" }))
      .rejects.toMatchObject({ code: "UNTRUSTED_API_URL" });
    await expect(generated.POST("/api/banking/manual/accounts", { baseUrl: "https://attacker.example",
      body: { bankName: "Bank", accountName: "Operating", lastFourDigits: "1234", registrationId: "registration-1" } }))
      .rejects.toMatchObject({ code: "UNTRUSTED_API_URL" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty success payloads for banking JSON endpoints", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(banking.getOverview()).rejects.toMatchObject({ code: "EMPTY_API_RESPONSE" });
  });
});
