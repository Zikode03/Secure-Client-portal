import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("keeps the document workspace open when a client selects a different result", async () => {
    const { container } = renderClientPage(<ClientDocumentsPage />);

    const resultButton = await waitFor(() => {
      const unselectedResult = Array.from(
        container.querySelectorAll<HTMLButtonElement>("div.divide-y.divide-slate-100 > button"),
      ).find((button) => !button.className.includes("ring-1"));
      expect(unselectedResult).toBeDefined();
      return unselectedResult!;
    });

    fireEvent.click(resultButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close document workspace" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("opens a real upload action from the monthly checklist", () => {
    renderClientPage(<ClientDocumentsPage />);

    const uploadButton = screen
      .getAllByRole("button")
      .find((button) => /^(Upload|Re-upload|Upload new version)$/.test(button.textContent ?? ""));

    expect(uploadButton).toBeDefined();
    fireEvent.click(uploadButton!);
    expect(screen.getByRole("heading", { name: "Smart document upload" })).toBeInTheDocument();
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
