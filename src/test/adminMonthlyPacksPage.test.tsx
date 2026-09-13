import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMonthlyPacksPage } from "../pages/admin/AdminMonthlyPacksPage";
import { apiGetJson, apiPutJson, hasApiBaseUrl } from "../services/apiClient";
import { navigationByRole } from "../utils/navigation";

vi.mock("../services/apiClient", async (importOriginal) => ({
  ...await importOriginal<typeof import("../services/apiClient")>(),
  apiGetJson: vi.fn(), apiPutJson: vi.fn(), hasApiBaseUrl: vi.fn(),
}));
const endpoint = "/api/admin/firm-management/templates/monthly-pack";
const pack = { id: "pack-1", name: "Standard pack", description: "Monthly records", requiredDocumentTemplateIds: ["doc-1"], autoCreateDayOfMonth: 1 };
const renderPage = () => render(<MemoryRouter><AdminMonthlyPacksPage /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockImplementation(async (path) => path === endpoint ? [{ ...pack }] : [{ id: "doc-1", name: "Bank statement" }, { id: "doc-2", name: "Invoices" }]);
  vi.mocked(apiPutJson).mockReset().mockResolvedValue(undefined);
});

describe("admin monthly packs", () => {
  it("loads existing selections and saves their IDs through the original API", async () => {
    renderPage();
    expect(await screen.findByLabelText("Bank statement")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Invoices"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Monthly packs saved");
    expect(apiPutJson).toHaveBeenCalledWith(endpoint, [{ ...pack, requiredDocumentTemplateIds: ["doc-1", "doc-2"] }]);
  });

  it("blocks edits when requirements fail to load and supports retry", async () => {
    vi.mocked(apiGetJson).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    await screen.findByText("Could not load monthly packs");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add pack template" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByDisplayValue("Standard pack");
    expect(apiPutJson).not.toHaveBeenCalled();
  });

  it("retains edits when saving fails", async () => {
    vi.mocked(apiPutJson).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Standard pack"), { target: { value: "Retail pack" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Could not save monthly packs");
    expect(screen.getByDisplayValue("Retail pack")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("groups admin access modules together and monthly packs with documents", () => {
    for (const module of ["users", "roles", "audit"]) {
      expect(navigationByRole.admin.find((item) => item.to === `/firm/admin/${module}`)?.section).toBe("Access & Security");
    }
    expect(navigationByRole.admin.find((item) => item.to === "/firm/admin/monthly-packs")?.section).toBe("Documents");
    for (const role of ["client", "accountant"] as const) {
      expect(navigationByRole[role].some((item) => item.to.startsWith("/firm/admin/"))).toBe(false);
    }
  });
});
