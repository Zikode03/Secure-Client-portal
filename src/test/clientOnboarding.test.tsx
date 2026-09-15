import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientOnboardingForm } from "../components/clients/ClientOnboardingForm";
import { AdminClientsPage } from "../pages/admin/AdminClientsPage";
import { apiGetJson, apiPostJson, hasApiBaseUrl } from "../services/apiClient";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async original => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate }));
vi.mock("../services/apiClient", async original => ({
  ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn(), apiPostJson: vi.fn(), hasApiBaseUrl: vi.fn(),
}));
const options = {
  accountants: [{ id: "accountant-1", fullName: "Alex Accountant", email: "alex@example.test" }],
  clientUsers: [{ id: "client-user-1", fullName: "Existing Client", email: "existing@example.test" }],
};
const result = { clientId: "business-1", clientName: "New Business", userId: "new-user", accountantUserId: "accountant-1",
  userCreated: true, invitationDelivery: "smtp", message: "Business created, client linked and invitation sent." };
const saved = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockImplementation(async path => path === "/api/clients/onboarding/options" ? options : []);
  vi.mocked(apiPostJson).mockResolvedValue(result);
});
function form() { return render(<ClientOnboardingForm onCancel={vi.fn()} onCreated={saved} />); }
async function fill() {
  await screen.findByRole("option", { name: /Alex Accountant/ });
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "New Business" } });
  fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Construction" } });
  fireEvent.change(screen.getByLabelText("Primary accountant"), { target: { value: "accountant-1" } });
  fireEvent.change(screen.getByLabelText("Contact full name"), { target: { value: "Client Contact" } });
  fireEvent.change(screen.getByLabelText("Contact email"), { target: { value: "client@example.test" } });
}

describe("client onboarding", () => {
  it("sends one linked onboarding request with separate entity type and industry", async () => {
    form(); await fill();
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith(result));
    expect(apiPostJson).toHaveBeenCalledWith("/api/clients/onboarding", expect.objectContaining({
      name: "New Business", entityType: "Pty Ltd", industry: "Construction", accountantUserId: "accountant-1",
      existingClientUserId: null, requestId: expect.any(String),
    }));
  });

  it("explicitly links an existing user instead of creating another login", async () => {
    form(); await fill();
    fireEvent.change(screen.getByLabelText("Portal access"), { target: { value: "existing" } });
    fireEvent.change(screen.getByLabelText("Existing client user"), { target: { value: "client-user-1" } });
    expect(screen.getByLabelText("Contact email")).toHaveValue("existing@example.test");
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    await waitFor(() => expect(apiPostJson).toHaveBeenCalledWith("/api/clients/onboarding", expect.objectContaining({ existingClientUserId: "client-user-1" })));
  });

  it("keeps entered data and the retry key after a network failure", async () => {
    vi.mocked(apiPostJson).mockRejectedValueOnce(new Error("Connection lost"));
    form(); await fill();
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    await screen.findByText("Connection lost");
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Business name")).toHaveValue("New Business");
    const first = vi.mocked(apiPostJson).mock.calls[0][1];
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(vi.mocked(apiPostJson).mock.calls[1][1]).toEqual(first);
  });

  it("does not send concurrent duplicate requests", async () => {
    let finish!: (value: typeof result) => void;
    vi.mocked(apiPostJson).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    form(); await fill();
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    expect(apiPostJson).toHaveBeenCalledTimes(1);
    finish(result);
    await waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it("offers a next step directly into the new business compliance profile", async () => {
    render(<MemoryRouter initialEntries={["/firm/clients?add=1"]}><AdminClientsPage /></MemoryRouter>);
    await fill();
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    fireEvent.click(await screen.findByRole("button", { name: "Set up compliance profile" }));
    expect(navigate).toHaveBeenCalledWith("/firm/compliance?clientId=business-1&setup=1");
  });

  it("reports email delivery failure without asking the user to recreate the business", async () => {
    vi.mocked(apiPostJson).mockResolvedValue({ ...result, invitationDelivery: "failed", message: "Business saved; check SMTP and use Users > Reset password." });
    render(<MemoryRouter initialEntries={["/firm/clients?add=1"]}><AdminClientsPage /></MemoryRouter>);
    await fill();
    fireEvent.submit(screen.getByRole("form", { name: "Add client" }));
    expect(await screen.findByText("Business saved; check SMTP and use Users > Reset password.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Add client" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up compliance profile" })).toBeInTheDocument();
  });
});

