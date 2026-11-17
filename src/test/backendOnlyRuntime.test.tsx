import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.unmock("../services/apiClient");
vi.unmock("../services/portalData");
vi.unmock("../services/complianceData");
vi.unmock("../app/auth");
import { hasApiBaseUrl } from "./fixtures/apiTransportFixture";
import { portalService } from "../services/portalData";
import { AuthProvider, useAuth } from "../app/auth";
afterEach(() => vi.unstubAllGlobals());
it("requires the backend and initializes with no sample clients, documents or compliance records", () => {
  expect(hasApiBaseUrl()).toBe(true);
  expect(portalService.getAdminClients()).toEqual([]);
  expect(portalService.getClientWorkflowSeed().documents).toEqual([]);
  expect(portalService.getClientWorkflowSeed().monthPack.slots).toEqual([]);
  expect(portalService.getAccountantDashboard().portfolio).toEqual([]);
  expect(portalService.getAccountantComplianceCentre().categoryGroups).toEqual([]);
  expect(portalService.getAccountantComplianceCentre().clientStatuses).toEqual([]);
});
it("does not trust a browser-stored user or built-in credentials when the server refuses authentication", async () => {
  window.localStorage.setItem("accounting-document-control-session", JSON.stringify({ id: "forged-admin", role: "admin", email: "admin@example.com" }));
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: "INVALID_CREDENTIALS", message: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
  const view = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  expect(view.result.current.user).toBeNull();
  await act(async () => { expect((await view.result.current.login({ email: "admin@example.com", password: "Admin@2026", rememberMe: false })).ok).toBe(false); });
  expect(view.result.current.user).toBeNull();
});

it("hydrates the business name from the authenticated profile", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({user: {id: "client-account", fullName: "Client contact", email: "contact@example.invalid", role: "client", company: "Registered business", clientIds: ["linked-business"]}}), {headers: {"Content-Type": "application/json"}}));
  vi.stubGlobal("fetch", fetchMock);
  const wrapper = ({children}: {children: ReactNode}) => <AuthProvider>{children}</AuthProvider>;
  const view = renderHook(() => useAuth(), {wrapper});
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  expect(view.result.current.user?.company).toBe("Registered business");
  expect(view.result.current.user?.clientIds).toEqual(["linked-business"]);
});
