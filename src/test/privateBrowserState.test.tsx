import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../app/auth";
import { useInboxDraft } from "../components/inbox/useInboxDraft";
import { clearPrivateBrowserState, privateStateKey } from "../utils/privateBrowserState";
import type { ReactNode } from "react";

vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => false }));
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

it("isolates drafts between users and removes private caches on sign-out", async () => {
  const view = renderHook(() => ({ auth: useAuth(), draft: useInboxDraft("firm", "shared-thread") }), { wrapper });
  await waitFor(() => expect(view.result.current.auth.ready).toBe(true));
  await act(async () => { await view.result.current.auth.login({ email: "admin@example.com", password: "Admin@2026", rememberMe: false }); });
  act(() => view.result.current.draft[1]("Private administrator draft"));
  const firstId = view.result.current.auth.user!.id;
  expect(window.sessionStorage.getItem(privateStateKey(firstId, "draft:firm:shared-thread")!)).toBe("Private administrator draft");
  await act(async () => { await view.result.current.auth.login({ email: "accountant@example.com", password: "Accountant@2026", rememberMe: false }); });
  expect(view.result.current.auth.user!.id).not.toBe(firstId);
  expect(view.result.current.draft[0]).toBe("");
  expect(window.sessionStorage.getItem(privateStateKey(firstId, "draft:firm:shared-thread")!)).toBeNull();
  act(() => view.result.current.draft[1]("Accountant draft"));
  await act(async () => { expect((await view.result.current.auth.logout()).ok).toBe(true); });
  expect(Object.keys(window.sessionStorage).filter(k => k.startsWith("portal-private:"))).toEqual([]);
});

it("clears legacy unscoped data while preserving display preferences", () => {
  window.localStorage.setItem("accounting-document-control-client-portal-v3", "private");
  window.localStorage.setItem("inbox-draft:firm:thread", "private");
  window.localStorage.setItem("theme", "dark");
  clearPrivateBrowserState();
  expect(window.localStorage.getItem("accounting-document-control-client-portal-v3")).toBeNull();
  expect(window.localStorage.getItem("inbox-draft:firm:thread")).toBeNull();
  expect(window.localStorage.getItem("theme")).toBe("dark");
});
