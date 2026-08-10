// Friendly guide: this module (clientComplianceCentrePage.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { ClientComplianceCentrePage } from "../pages/client/ClientComplianceCentrePage";
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

function renderPage(page: ReactNode = <ClientComplianceCentrePage />) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clientUser));
  return render(
    <MemoryRouter>
      <PortalProvider>
        <AuthProvider>{page}</AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("ClientComplianceCentrePage", () => {
  it("renders the compliance centre workspace", () => {
    renderPage();

    expect(screen.getByText("Compliance Centre")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track compliance readiness, expiry risk, and audit activity across all regulated records.",
      ),
    ).toBeInTheDocument();
  });

  it("renders summary insight widgets", () => {
    renderPage();

    expect(screen.getAllByText("Compliance Score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Expiring Soon").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing Records")).toBeInTheDocument();
    expect(screen.getByText("Audit Activity")).toBeInTheDocument();
    expect(screen.getByText("Storage Health")).toBeInTheDocument();
  });

  it("shows expired documents as requiring a new version", () => {
    renderPage();

    expect(screen.getAllByText("Expired - new version required").length).toBeGreaterThan(0);
  });

  it("does not present past expiry dates as days remaining", () => {
    renderPage();

    expect(screen.queryAllByText((content) => /days remaining|expires in/i.test(content))).toHaveLength(0);
  });

  it("shows missing required documents as compliance blockers", () => {
    renderPage();

    expect(screen.getAllByText("Missing - required for compliance").length).toBeGreaterThan(0);
  });

  it("renders clean priority filters", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "All priorities" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expired" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expiring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Missing" })).toBeInTheDocument();
  });

  it("shows feedback when the compliance report is downloaded", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Download compliance report" }));

    expect(screen.getByText("Compliance report downloaded")).toBeInTheDocument();
    expect(screen.getByText(/current live compliance register was exported as CSV/i)).toBeInTheDocument();
  });

  it("lets the user dismiss feedback", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Secure storage" }));

    expect(screen.getByText("Secure storage active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Secure storage active")).not.toBeInTheDocument();
  });

  it("renders the compliance report preview", () => {
    renderPage();

    expect(screen.getByText("Compliance Report")).toBeInTheDocument();
    expect(screen.getByText("Compliance Health Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Report Coverage")).toBeInTheDocument();
  });
});
