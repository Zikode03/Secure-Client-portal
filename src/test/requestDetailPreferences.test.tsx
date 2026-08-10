// Friendly guide: this module (requestDetailPreferences.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { FirmRequestDetailPage } from "../pages/firm/FirmRequestDetailPage";
import { NotificationPreferencesPage } from "../pages/shared/NotificationPreferencesPage";
import type { SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

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

// Component flow: gather data first, then render a focused UI state.
function renderWithProviders(user: SessionUser, page: JSX.Element, initialPath = "/") {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <PortalProvider>
        <AuthProvider>{page}</AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

function renderRequestDetail(user: SessionUser, initialPath: string) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <PortalProvider>
        <AuthProvider>
          <Routes>
            <Route element={<FirmRequestDetailPage />} path="/firm/requests/:requestId" />
          </Routes>
        </AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("request detail actions and notification preferences", () => {
  it("allows posting comment and resolving a request from the detail page", async () => {
    window.localStorage.clear();
    renderRequestDetail(accountantUser, "/firm/requests/request-1");

    const commentField = await screen.findByLabelText("Add comment");
    fireEvent.change(commentField, {
      target: { value: "Following up: client confirmed upload by end of day." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Comment added to the request thread.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark resolved" }));
    expect(await screen.findByText("Request marked as resolved.")).toBeInTheDocument();
  });

  it("persists accountant notification preferences by role/user", async () => {
    window.localStorage.clear();
    const firstView = renderWithProviders(accountantUser, <NotificationPreferencesPage />);

    const toggles = await screen.findAllByRole("checkbox");
    fireEvent.click(toggles[0]);

    fireEvent.change(screen.getByDisplayValue("22:00-06:00"), {
      target: { value: "21:00-05:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();

    firstView.unmount();
    renderWithProviders(accountantUser, <NotificationPreferencesPage />);

    const refreshedToggles = await screen.findAllByRole("checkbox");
    expect(refreshedToggles[0]).not.toBeChecked();
    expect(screen.getByDisplayValue("21:00-05:00")).toBeInTheDocument();
  });

  it("persists client notification preferences in portal settings", async () => {
    window.localStorage.clear();
    renderWithProviders(clientUser, <NotificationPreferencesPage />);

    const toggles = await screen.findAllByRole("checkbox");
    fireEvent.click(toggles[1]);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(
      await screen.findByText("Notification preferences saved for this client workspace."),
    ).toBeInTheDocument();
  });
});
