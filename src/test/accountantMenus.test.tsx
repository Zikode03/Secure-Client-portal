import { apiGetJson } from "./fixtures/apiTransportFixture";
import { waitFor } from "@testing-library/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { PortalProvider } from "../app/portal";
import { AccountantDocumentsPage } from "../pages/accountant/AccountantDocumentsPage";
import { portalServiceApi } from "../services/portalApi";
const user = vi.hoisted(() => ({ id: "accountant-1", name: "Test", fullName: "Test Staff", email: "staff@test.invalid", role: "accountant", clientIds: [], assignedClientIds: ["client-1"] }));
vi.mock("../app/auth", () => ({ useAuth: () => ({ ready: true, user }), useOptionalAuth: () => ({ ready: true, user }) }));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(async path => path === "/api/documents" ? [{ id: "document-1", clientId: "client-1", monthlyPackId: "pack-1", name: "invoice.pdf", category: "sales_invoices", status: "under_review", uploadedAtUtc: "2026-11-11T08:00:00Z", fileType: "application/pdf", sizeBytes: 100, currentVersionNumber: 1 }] : []) }));
beforeEach(() => { vi.spyOn(portalServiceApi, "getAdminClients").mockResolvedValue([{ id: "client-1", clientName: "Test business", industry: "Services", assignedAccountant: user.fullName, assignedAccountantUserId: user.id, requiredPack: "Monthly", completionRate: 0, deadlinePolicy: "Configured", status: "on_track" }]); });
it("shows only document browsing actions for records returned by the backend", async () => {
  render(<MemoryRouter><PortalProvider><AccountantDocumentsPage /></PortalProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button",{name:/^Test business/}));
  fireEvent.click(screen.getByRole("button",{name:/^Period needs checking/}));
  const actions = await screen.findAllByRole("button", { name: /^Actions for / });
  expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
  expect(actions[0]).toBeInTheDocument();
  fireEvent.click(actions[0]);
  expect(screen.getByRole("menuitem", { name: "Open" })).toHaveFocus();
  expect(screen.getByRole("menuitem", { name: "Download" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Document register" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Request re-upload" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Mark under review" })).not.toBeInTheDocument();
});

it("files an accepted document through the real protected API transport", async () => {
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/documents" ? [{id:"document-1",clientId:"client-1",monthlyPackId:"pack-1",name:"invoice.pdf",category:"sales_invoices",status:"accepted",uploadedAtUtc:"2026-11-11T08:00:00Z",fileType:"application/pdf",sizeBytes:100,currentVersionNumber:1}] : []);
  const fetchMock=vi.fn(async (input:RequestInfo|URL)=>{
    const url=input instanceof Request?input.url:String(input);
    if(url.endsWith("/api/auth/csrf"))return new Response(JSON.stringify({requestToken:"test-token"}),{headers:{"Content-Type":"application/json"}});
    if(url.endsWith("/download"))return new Response("%PDF-1.4 isolated test",{headers:{"Content-Type":"application/pdf"}});
    return new Response(JSON.stringify({status:"filed"}),{headers:{"Content-Type":"application/json"}});
  });
  vi.stubGlobal("fetch",fetchMock);
  try {
    render(<MemoryRouter><PortalProvider><AccountantDocumentsPage /></PortalProvider></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button",{name:/^Test business/}));
    fireEvent.click(screen.getByRole("button",{name:/^Period needs checking/}));
    fireEvent.click((await screen.findAllByRole("button",{name:/^Actions for /}))[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    fireEvent.click(await screen.findByRole("button",{name:"File document"}));
    await screen.findByText("Document filed. It is available in the Filing Register.");
    await waitFor(()=>expect(fetchMock.mock.calls.some(([input])=>input instanceof Request&&input.method==="PUT"&&input.url.endsWith("/api/documents/document-1/status"))).toBe(true));
  } finally {vi.unstubAllGlobals();}
});
