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
  it("opens admin system settings from compliance centre", async () => {
    renderCompliance(adminUser());

    fireEvent.click(await screen.findByRole("button", { name: "Open system settings" }));

    expect(await screen.findByRole("heading", { name: "System settings" })).toBeInTheDocument();
  });

  it("opens admin assignments from assign accountant button", async () => {
    renderCompliance(adminUser());

    fireEvent.click((await screen.findAllByRole("button", { name: "Assign accountant" }))[0]);

    expect(await screen.findByRole("heading", { name: "Assign accountants" })).toBeInTheDocument();
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
        "This client workspace keeps the month pack, document review, compliance, requests, messages, and audit trail in one accountable place.",
      ),
    ).toBeInTheDocument();
  });
});
