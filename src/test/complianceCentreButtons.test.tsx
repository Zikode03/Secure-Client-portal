import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import App from "../app/App";
import { PortalProvider } from "../app/portal";
import { ThemeProvider } from "../app/theme";
import type { SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

function renderCompliance(user: SessionUser) {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return render(
    <MemoryRouter initialEntries={["/firm/compliance"]}>
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

function adminUser(): SessionUser {
  return {
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
}

function accountantUser(): SessionUser {
  return {
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
}

describe("compliance centre buttons", () => {
  it("keeps removed admin shortcuts out of the compliance centre", async () => {
    renderCompliance(adminUser());

    expect(await screen.findByRole("heading", { name: "Compliance Workspace" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open system settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign accountant" })).not.toBeInTheDocument();
  });

  it("lets an admin create a compliance follow-up", async () => {
    renderCompliance(adminUser());

    fireEvent.click(await screen.findByRole("button", { name: /Add Compliance Item/ }));

    expect(await screen.findByText("Request created")).toBeInTheDocument();
  });

  it("creates a document request from accountant compliance centre", async () => {
    renderCompliance(accountantUser());

    fireEvent.click(await screen.findByRole("button", { name: "Request documents" }));

    expect(await screen.findByText("Request created")).toBeInTheDocument();
  });

  it("opens client workspace from compliance list view action", async () => {
    renderCompliance(accountantUser());

    fireEvent.click((await screen.findAllByRole("button", { name: "View" }))[0]);

    expect(
      await screen.findByText(
        "Keep this client's month pack, document review, compliance, requests, messages, and audit trail in one accountable workspace.",
      ),
    ).toBeInTheDocument();
  });
});
