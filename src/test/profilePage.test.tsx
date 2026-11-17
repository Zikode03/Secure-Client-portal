import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../app/auth";
import { ProfilePage } from "../pages/shared/ProfilePage";
import { apiGetJson, apiPutJson } from "./fixtures/apiTransportFixture";
vi.unmock("../app/auth");
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPutJson: vi.fn() }));
const account = { id: "accountant-1", fullName: "Test Staff", email: "staff@test.invalid", role: "accountant", title: "Accountant", phone: "", clientIds: [] };
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(apiGetJson).mockResolvedValue({ user: account });
  vi.mocked(apiPutJson).mockImplementation(async (_path, body) => ({ user: { ...account, ...body as object } }));
});
function renderProfile(entry = "/firm/profile") { return render(<MemoryRouter initialEntries={[entry]}><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter>); }
it("loads the authenticated server profile read-only before editing", async () => {
  renderProfile(); expect(await screen.findByRole("heading", { name: "My profile" })).toBeInTheDocument();
  expect(await screen.findByDisplayValue("Test Staff")).toHaveAttribute("readonly");
  expect(apiGetJson).toHaveBeenCalledWith("/api/auth/me");
});
it("saves profile edits through the backend rather than a local account simulation", async () => {
  renderProfile("/firm/profile?edit=true");
  const fullName = await screen.findByDisplayValue("Test Staff");
  fireEvent.change(fullName, { target: { value: "Updated Staff" } });
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Practice Lead" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+27 11 555 0100" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Your profile has been updated.");
  expect(apiPutJson).toHaveBeenCalledWith("/api/auth/profile", { fullName: "Updated Staff", title: "Practice Lead", phone: "+27 11 555 0100" });
  expect(screen.getByLabelText("Full name")).toHaveValue("Updated Staff");
});
