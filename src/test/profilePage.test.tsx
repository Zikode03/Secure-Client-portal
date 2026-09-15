import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../app/auth";
import { ProfilePage } from "../pages/shared/ProfilePage";
import type { SessionUser } from "../types/portal";

const STORAGE_KEY = "accounting-document-control-session";

const user: SessionUser = {
  id: "user-accountant-1",
  name: "Daniel",
  fullName: "Daniel Mokoena",
  email: "accountant@example.com",
  role: "accountant",
  title: "Senior Accountant",
  company: "Finwell Advisory",
  initials: "DM",
  clientIds: [],
  assignedClientIds: [],
};

function renderProfile(entry = "/firm/profile") {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return render(<MemoryRouter initialEntries={[entry]}><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter>);
}

describe("profile page", () => {
  it("shows a read-only personal profile before editing", async () => {
    renderProfile();
    expect(await screen.findByRole("heading", { name: "My profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument();
  });

  it("saves edited personal details in the local workspace", async () => {
    renderProfile("/firm/profile?edit=true");
    const fullName = await screen.findByLabelText("Full name");
    fireEvent.change(fullName, { target: { value: "Daniel N. Mokoena" } });
    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Practice Lead" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+27 11 555 0100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your profile has been updated.");
    expect(screen.getByLabelText("Full name")).toHaveValue("Daniel N. Mokoena");
  });
});
