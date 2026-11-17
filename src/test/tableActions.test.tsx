import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminAuditPage } from "../pages/admin/AdminAuditPage";
import { AdminRequestStateMachinePage } from "../pages/admin/AdminRequestStateMachinePage";
import { apiGetJson } from "./fixtures/apiTransportFixture";
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGetJson).mockImplementation(async path => String(path).startsWith("/api/audit-logs") ? [{ id: "event-1", actorUserId: "staff-1", actorRole: "admin", action: "users.updated", entityType: "user", entityId: "record-1", metadataJson: '{"change":"role"}', createdAtUtc: "2026-11-17T08:00:00Z" }] : [{ id: "staff-1", fullName: "Authorised administrator", email: "staff@test.invalid", role: "admin" }]);
});
it("opens audit details from the row without editing the audit event", async () => {
  render(<AdminAuditPage />);
  fireEvent.click(await screen.findByRole("button", { name: "View audit event users.updated" }));
  const dialog = screen.getByRole("dialog", { name: "Audit event details" });
  expect(within(dialog).getByText("Authorised administrator")).toBeInTheDocument();
  expect(within(dialog).getByText('user / record-1')).toBeInTheDocument();
  expect(within(dialog).getByText('{"change":"role"}')).toBeInTheDocument();
  expect(within(dialog).queryByRole("button", { name: /save|delete/i })).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close modal" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("opens the selected transition rule from its Actions column", () => {
  render(<MemoryRouter><AdminRequestStateMachinePage /></MemoryRouter>);
  expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: /^View .* rule$/ })[0]);
  const dialog = screen.getByRole("dialog", { name: "Transition details" });
  expect(within(dialog).getByText("Client responds or uploads the requested correction")).toBeInTheDocument();
  expect(within(dialog).getByText("48 hours")).toBeInTheDocument();
});
