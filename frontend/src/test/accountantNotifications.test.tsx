import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../app/App";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import type { SessionUser } from "../types/portal";
import { navigationByRole } from "../utils/navigation";

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

function renderAccountantApp(initialEntries = ["/firm/dashboard"]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accountantUser));

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PortalProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("accountant notifications access", () => {
  it("opens dashboard notifications from the bell and routes view more to the full notifications page", async () => {
    renderAccountantApp();

    expect(await screen.findByText("Accountant workspace")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Notifications" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open accountant alerts" }));

    expect(await screen.findByRole("dialog", { name: "Accountant notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View more" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View more" }));

    expect(await screen.findByText("My notifications")).toBeInTheDocument();
  });

  it("keeps admin-only navigation items hidden from the accountant sidebar", () => {
    expect(navigationByRole.accountant.some((item) => item.to === "/firm/notifications")).toBe(false);
    expect(
      navigationByRole.accountant.some((item) => item.to === "/firm/admin/users"),
    ).toBe(false);
  });
});
