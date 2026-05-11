import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import { PortalProvider } from "../app/portal";
import { AccountantComplianceCentrePage } from "../pages/accountant/AccountantComplianceCentrePage";
import { AccountantDocumentsPage } from "../pages/accountant/AccountantDocumentsPage";
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
};

function renderWithProviders(page: JSX.Element) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accountantUser));

  return render(
    <MemoryRouter>
      <PortalProvider>
        <AuthProvider>{page}</AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
}

describe("accountant overflow menus", () => {
  it("shows the compliance client actions in the row overflow menu", async () => {
    renderWithProviders(<AccountantComplianceCentrePage />);

    const actionButtons = await screen.findAllByRole("button", {
      name: "Open client actions",
    });
    fireEvent.click(actionButtons[0]);

    expect(screen.getByRole("button", { name: "View compliance history" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open document centre" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export client compliance report" }),
    ).toBeInTheDocument();
  });

  it("shows the document actions and opens the viewer comments tab from the overflow menu", async () => {
    renderWithProviders(<AccountantDocumentsPage />);

    const actionButtons = await screen.findAllByRole("button", {
      name: "Open result actions",
    });
    fireEvent.click(actionButtons[0]);

    expect(screen.getByRole("button", { name: "Preview file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View version history" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View comments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request re-upload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark under review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escalate issue" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View comments" }));

    expect(screen.getByRole("button", { name: /^Comments / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open in new tab" })).toBeInTheDocument();
  });
});
