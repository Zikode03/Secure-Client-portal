// Friendly guide: this module (firmSharedPages.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { FirmClientsPage } from "../pages/firm/FirmClientsPage";
import { FirmComplianceCentrePage } from "../pages/firm/FirmComplianceCentrePage";
import { FirmDashboardPage } from "../pages/firm/FirmDashboardPage";
import { FirmDocumentsPage } from "../pages/firm/FirmDocumentsPage";
import { FirmRequestsPage } from "../pages/firm/FirmRequestsPage";
import { FirmSettingsPage } from "../pages/firm/FirmSettingsPage";
import type { SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

const adminUser: SessionUser = {
  id: "user-admin-1",
  name: "Priya",
  fullName: "Priya Naidoo",
  email: "admin@example.com",
  role: "admin",
  title: "Operations Lead",
  company: "Finwell Advisory",
  initials: "PN",
  clientIds: [],
  assignedClientIds: [],
};

const accountantUser: SessionUser = {
  id: "user-accountant-1",
  name: "Daniel",
  fullName: "Daniel Mokoena",
  email: "accountant@example.com",
  role: "accountant",
  title: "Senior Accountant",
  company: "Finwell Advisory",
  initials: "DM",
  clientIds: [],
  assignedClientIds: ["client-apex", "firm-client-1", "firm-client-3", "firm-client-4"],
};

// Component flow: gather data first, then render a focused UI state.
function renderWithProviders(page: JSX.Element, user: SessionUser) {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return render(
    <MemoryRouter>
      <PortalProvider>
        <AuthProvider>{page}</AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("shared firm pages", () => {
  it("uses one shared dashboard skeleton with role-specific actions", async () => {
    const adminView = renderWithProviders(<FirmDashboardPage />, adminUser);

    expect(await screen.findByRole("heading", { name: "Firm workspace" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Manage assignments" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Firm clients" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Firm work queue" })).toBeInTheDocument();

    adminView.unmount();

    renderWithProviders(<FirmDashboardPage />, accountantUser);

    expect(await screen.findByRole("heading", { name: "Accountant workspace" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "View all clients" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "My assigned clients" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My work queue" })).toBeInTheDocument();
  });

  it("shows all clients to admins and only assigned clients to accountants", async () => {
    const adminView = renderWithProviders(<FirmClientsPage />, adminUser);

    expect(await screen.findByText("Firm Clients")).toBeInTheDocument();
    expect(screen.getByText("Blue Peak Logistics")).toBeInTheDocument();
    expect(screen.getByText("Cloud Nine Retail")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Manage assignments" }).length).toBeGreaterThan(0);

    adminView.unmount();

    renderWithProviders(<FirmClientsPage />, accountantUser);

    expect(await screen.findByText("Assigned Clients")).toBeInTheDocument();
    expect(screen.getByText("Apex Trading Ltd")).toBeInTheDocument();
    expect(screen.queryByText("Blue Peak Logistics")).not.toBeInTheDocument();
    expect(screen.queryByText("Summit Consulting")).not.toBeInTheDocument();
  });

  it("renders different compliance actions for admin versus accountant", async () => {
    const adminView = renderWithProviders(<FirmComplianceCentrePage />, adminUser);

    expect(
      await screen.findByRole("heading", { name: "Firm Compliance Centre" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open system settings" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Assign accountant" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Request documents" })).not.toBeInTheDocument();

    adminView.unmount();

    renderWithProviders(<FirmComplianceCentrePage />, accountantUser);

    expect(
      await screen.findByRole("heading", { name: "My Compliance Workspace" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open system settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request documents" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download client compliance report" }),
    ).toBeInTheDocument();
  });

  it("scopes the shared documents page by role", async () => {
    const adminView = renderWithProviders(<FirmDocumentsPage />, adminUser);

    const adminClientSelect = (await screen.findAllByLabelText("Client"))[0];

    expect(
      within(adminClientSelect).getByRole("option", { name: "Blue Peak Logistics" }),
    ).toBeInTheDocument();

    adminView.unmount();

    renderWithProviders(<FirmDocumentsPage />, accountantUser);

    const accountantClientSelect = (await screen.findAllByLabelText("Client"))[0];

    expect(
      within(accountantClientSelect).queryByRole("option", { name: "Blue Peak Logistics" }),
    ).not.toBeInTheDocument();
    expect(
      within(accountantClientSelect).getByRole("option", { name: "Apex Trading Ltd" }),
    ).toBeInTheDocument();
  });

  it("uses one shared settings shell with role-specific controls", async () => {
    const adminView = renderWithProviders(<FirmSettingsPage />, adminUser);

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open system settings" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Firm operations/i }).length).toBeGreaterThan(0);

    adminView.unmount();

    renderWithProviders(<FirmSettingsPage />, accountantUser);

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open compliance centre" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Workflow defaults/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Open roles" })).not.toBeInTheDocument();
  });

  it("restores the richer follow-up request workspace with scoped data", async () => {
    const adminView = renderWithProviders(<FirmRequestsPage />, adminUser);

    expect(await screen.findByRole("heading", { name: "Request workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Firm request board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create follow-up request" })).toBeInTheDocument();

    adminView.unmount();

    renderWithProviders(<FirmRequestsPage />, accountantUser);

    expect(await screen.findByRole("heading", { name: "Follow-up requests" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open requests" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Selected request thread" })).toBeInTheDocument();
  });
});