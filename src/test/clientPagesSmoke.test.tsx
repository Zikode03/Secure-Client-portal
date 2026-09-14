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

  it("renders the document register with search and upload", () => {
    renderClientPage(<ClientDocumentsPage />);
    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document register" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search documents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload document" })).toBeInTheDocument();
  });

  it("opens and closes the document details drawer", async () => {
    const { container } = renderClientPage(<ClientDocumentsPage />);

    const resultButton = await waitFor(() => {
      const firstResult = container.querySelector<HTMLButtonElement>("div.divide-y.divide-slate-100 > button");
      expect(firstResult).toBeDefined();
      return firstResult!;
    });

    fireEvent.click(resultButton);
    expect(screen.getByRole("button", { name: "Close document workspace" })).toBeInTheDocument();
    expect(screen.getByText("Version history")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close document workspace" }));
    expect(screen.queryByRole("button", { name: "Close document workspace" })).not.toBeInTheDocument();
  });

  it("opens the upload flow from the document register header", () => {
    renderClientPage(<ClientDocumentsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
    expect(screen.getByRole("heading", { name: "Smart document upload" })).toBeInTheDocument();
  });

  it("links outstanding monthly-pack work back to Monthly Packs", () => {
    renderClientPage(<ClientDocumentsPage />);
    expect(screen.getByRole("link", { name: /Open monthly pack/i })).toHaveAttribute("href", "/client/packs");
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