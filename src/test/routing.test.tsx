// Friendly guide: this module (routing.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import App from "../app/App";
import { PortalProvider } from "../app/portal";
import { ThemeProvider } from "../app/theme";
import type { SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

// Component flow: gather data first, then render a focused UI state.
function renderAppAt(path: string, user: SessionUser) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <PortalProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PortalProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function createUser(role: SessionUser["role"]): SessionUser {
  if (role === "accountant") {
    return {
      id: "user-accountant-1",
      name: "Daniel",
      fullName: "Daniel Mokoena",
      email: "accountant@example.com",
      role,
      title: "Senior Accountant",
      company: "Finwell Advisory",
      initials: "DM",
      clientIds: [],
      assignedClientIds: ["client-apex", "firm-client-1", "firm-client-3", "firm-client-4"],
    };
  }

  if (role === "admin") {
    return {
      id: "user-admin-1",
      name: "Priya",
      fullName: "Priya Naidoo",
      email: "admin@example.com",
      role,
      title: "Operations Lead",
      company: "Finwell Advisory",
      initials: "PN",
      clientIds: [],
      assignedClientIds: [],
    };
  }

  return {
    id: "user-client-1",
    name: "Sarah",
    fullName: "Sarah Jacobs",
    email: "client@example.com",
    role,
    title: "Finance Manager",
    company: "Apex Trading Ltd",
    initials: "SJ",
    clientIds: ["client-apex"],
    assignedClientIds: [],
  };
}

describe("role-based route access", () => {
  it("client cannot access firm routes", async () => {
    renderAppAt("/firm/dashboard", createUser("client"));

    expect(
      await screen.findByText("You do not have permission to access this workspace."),
    ).toBeInTheDocument();
  });

  it("legacy admin users route redirects to user management", async () => {
    renderAppAt("/admin/users", createUser("admin"));

    expect(await screen.findByRole("heading", { name: "Users & access" })).toBeInTheDocument();
  });

  it("admin can access system settings", async () => {
    renderAppAt("/firm/admin/system-settings", createUser("admin"));

    expect(await screen.findByRole("heading", { name: "System configuration" })).toBeInTheDocument();
  });

  it("legacy admin system settings route redirects to the canonical page", async () => {
    renderAppAt("/admin/system-settings", createUser("admin"));

    expect(await screen.findByRole("heading", { name: "System configuration" })).toBeInTheDocument();
  });

  it("legacy request state machine route redirects to the canonical page", async () => {
    renderAppAt("/admin/request-state-machine", createUser("admin"));

    expect(await screen.findByRole("heading", { name: "Request SLA rules" })).toBeInTheDocument();
  });

  it("shows admin-only header badge only for admin role", async () => {
    const adminView = renderAppAt("/firm/dashboard", createUser("admin"));
    expect(await screen.findByText("Admin only")).toBeInTheDocument();

    adminView.unmount();
    window.localStorage.clear();
    renderAppAt("/firm/dashboard", createUser("accountant"));
    expect(screen.queryByText("Admin only")).not.toBeInTheDocument();
  });

  it("navigation hides admin-only items from accountants", async () => {
    renderAppAt("/firm/dashboard", createUser("accountant"));

    expect(await screen.findByText("Compliance Portal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compliance Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Work Queue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Exceptions Queue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Activity Feed" })).not.toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Notification Preferences" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Notifications" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "User Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Roles" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "System Settings" })).not.toBeInTheDocument();
  });

  it("keeps settings available from the account menu", async () => {
    renderAppAt("/firm/dashboard", createUser("accountant"));

    expect(await screen.findByText("Compliance Portal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("client navigation no longer shows standalone messages or invoices items", async () => {
    renderAppAt("/client/dashboard", createUser("client"));

    expect(await screen.findByRole("heading", { name: /Welcome back, Sarah/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documents" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invoices" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Messages" })).not.toBeInTheDocument();
  });

  it("legacy client messages route redirects users to contextual workspaces", async () => {
    renderAppAt("/client/messages", createUser("client"));

    expect(await screen.findByText("Client communications")).toBeInTheDocument();
  });

  it("legacy client invoices route redirects to the document workspace", async () => {
    renderAppAt("/client/invoices", createUser("client"));

    expect(await screen.findByText("Document workspace")).toBeInTheDocument();
  });

  it("legacy firm request detail route redirects to inbox detail view", async () => {
    renderAppAt("/firm/requests/request-1", createUser("accountant"));

    expect(await screen.findByRole("heading", { name: /Submit April invoice evidence bundle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark resolved" })).toBeInTheDocument();
  });

  it("legacy firm requests list route redirects to inbox list view", async () => {
    renderAppAt("/firm/requests", createUser("accountant"));

    expect(await screen.findByText("Request documents from Apex Trading Ltd")).toBeInTheDocument();
  });

  it("admin can open request SLA state machine page", async () => {
    renderAppAt("/firm/admin/request-state-machine", createUser("admin"));

    expect(await screen.findByRole("heading", { name: "Request SLA rules" })).toBeInTheDocument();
  });
});
