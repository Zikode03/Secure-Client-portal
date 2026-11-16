import { act, render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PortalProvider } from "../app/portal";
import { portalServiceApi } from "../services/portalApi";
const auth = vi.hoisted(() => ({ role: null as "admin" | "accountant" | "client" | null }));
vi.mock("../app/auth", () => ({ useOptionalAuth: () => ({ user: auth.role ? { id: "test-user", role: auth.role, clientIds: [], assignedClientIds: [] } : null }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true }));
vi.mock("../services/portalApi", async original => ({ ...await original<typeof import("../services/portalApi")>(), portalServiceApi: { getAdminClients: vi.fn(async () => []), getAdminUsers: vi.fn(async () => []) } }));
beforeEach(() => vi.clearAllMocks());
it.each([null, "client", "accountant", "admin"] as const)("only loads shared records permitted for role %s", async role => {
  auth.role = role;
  await act(async () => { render(<PortalProvider><div>Workspace</div></PortalProvider>); });
  expect(portalServiceApi.getAdminClients).toHaveBeenCalledTimes(role === "admin" || role === "accountant" ? 1 : 0);
  expect(portalServiceApi.getAdminUsers).toHaveBeenCalledTimes(role === "admin" ? 1 : 0);
});
