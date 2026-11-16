// Friendly guide: this module (setup) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Route-level tests lazy-load large workspaces and can exceed the default timeout
// when Vitest runs multiple files in parallel on development machines.
configure({ asyncUtilTimeout: 10000 });

Object.defineProperty(URL, "createObjectURL", {
  configurable: true,
  value: vi.fn(() => "blob:test-download"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  configurable: true,
  value: vi.fn(),
});

afterEach(() => {
  if (typeof window !== "undefined") {
    cleanup();
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
// Explicit legacy unit tests may select isolated fixtures. The default test path
// uses backend mode and the production providers, just like the application.
vi.mock("../services/portalData", async original => {
  const actual = await original<typeof import("../services/portalData")>();
  const fixture = await import("./fixtures/portalDataFixture");
  const api = await import("../services/apiClient");
  return { ...actual, portalService: new Proxy(actual.portalService, { get(target, key) { return api.hasApiBaseUrl() ? Reflect.get(target, key) : Reflect.get(fixture.portalService, key); } }) };
});
vi.mock("../services/complianceData", async original => {
  const actual = await original<typeof import("../services/complianceData")>();
  const fixture = await import("./fixtures/complianceDataFixture");
  const api = await import("../services/apiClient");
  return Object.fromEntries(Object.keys(actual).map(key => [key, (...args: unknown[]) => {
    const source = (api.hasApiBaseUrl() ? actual : fixture) as unknown as Record<string, (...values: unknown[]) => unknown>;
    return source[key](...args);
  }]));
});
vi.mock("../app/auth", async original => {
  const actual = await original<typeof import("../app/auth")>();
  const fixture = await import("./fixtures/authFixture");
  const api = await import("../services/apiClient");
  const React = await import("react");
  return { ...actual,
    AuthProvider: (props: { children: import("react").ReactNode }) => React.createElement(api.hasApiBaseUrl() ? actual.AuthProvider : fixture.AuthProvider, props),
    useAuth: () => api.hasApiBaseUrl() ? actual.useAuth() : fixture.useAuth(),
    useOptionalAuth: () => api.hasApiBaseUrl() ? actual.useOptionalAuth() : fixture.useOptionalAuth(),
  };
});
vi.mock("../app/portal", async original => {
  const actual = await original<typeof import("../app/portal")>();
  const fixture = await import("./fixtures/portalStateFixture");
  const api = await import("../services/apiClient");
  const React = await import("react");
  return { ...actual,
    PortalProvider: (props: { children: import("react").ReactNode }) => React.createElement(api.hasApiBaseUrl() ? actual.PortalProvider : fixture.PortalProvider, props),
    usePortal: () => api.hasApiBaseUrl() ? actual.usePortal() : fixture.usePortal(),
  };
});
vi.mock("../services/portalApi", async original => {
  const actual = await original<typeof import("../services/portalApi")>();
  const fixture = await import("./fixtures/portalApiFixture");
  const api = await import("../services/apiClient");
  return { ...actual, portalServiceApi: new Proxy(actual.portalServiceApi, { get(target, key) { return api.hasApiBaseUrl() ? Reflect.get(target, key) : Reflect.get(fixture.portalServiceApi, key); } }) };
});
