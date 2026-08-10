import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { ClientDashboardPage } from "../pages/client/ClientDashboardPage";
import { ClientDocumentsPage } from "../pages/client/ClientDocumentsPage";
import { ClientNotificationsPage } from "../pages/client/ClientNotificationsPage";
import { ClientSettingsPage } from "../pages/client/ClientSettingsPage";
import type { SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

const clientUser: SessionUser = {
  id: "user-client-1",
  name: "Sarah",
  fullName: "Sarah Jacobs",
  email: "client@example.com",
  role: "client",
  title: "Finance Manager",
  company: "Apex Trading Ltd",
  initials: "SJ",
  clientIds: ["client-apex"],
  assignedClientIds: [],
};

function renderClientPage(page: ReactNode) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clientUser));
  return render(
    <MemoryRouter>
      <PortalProvider>
        <AuthProvider>{page}</AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("client page smoke coverage", () => {
  it("renders the client dashboard", () => {
    renderClientPage(<ClientDashboardPage />);
    expect(screen.getByRole("heading", { name: /Welcome back, Sarah/i })).toBeInTheDocument();
    expect(screen.getByText("Monthly Pack Status")).toBeInTheDocument();
  });

  it("renders the document workspace", () => {
    renderClientPage(<ClientDocumentsPage />);
    expect(screen.getByRole("heading", { name: "Document workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Search results" })).toBeInTheDocument();
  });

  it("renders the notification inbox", () => {
    renderClientPage(<ClientNotificationsPage />);
    expect(screen.getByRole("button", { name: /^All\s+\d+$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter notifications" })).toBeInTheDocument();
  });

  it("renders client settings", () => {
    renderClientPage(<ClientSettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Business profile" })).toBeInTheDocument();
  });
});
