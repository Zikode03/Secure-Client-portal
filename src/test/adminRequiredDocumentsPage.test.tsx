import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredDocumentsPage } from "../pages/admin/AdminRequiredDocumentsPage";
import { apiGetJson, apiPutJson, hasApiBaseUrl } from "../services/apiClient";
import { requiredDocumentsEndpoint } from "../services/requiredDocuments";
import { navigationByRole } from "../utils/navigation";

vi.mock("../services/apiClient", async (importOriginal) => ({
  ...await importOriginal<typeof import("../services/apiClient")>(),
  apiGetJson: vi.fn(), apiPutJson: vi.fn(), hasApiBaseUrl: vi.fn(),
}));

const document = { id: "existing-id", name: "Bank statement", description: "All business accounts", documentCategory: "banking", isRequired: true, defaultDueDayOfMonth: 5 };
const renderPage = () => render(<MemoryRouter><AdminRequiredDocumentsPage /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(hasApiBaseUrl).mockReturnValue(true);
  vi.mocked(apiGetJson).mockReset().mockResolvedValue([{ ...document }]);
  vi.mocked(apiPutJson).mockReset().mockResolvedValue(undefined);
});

describe("admin required documents", () => {
  it("keeps edits when switching documents and searching the library", async () => {
    const second = { ...document, id: "second-id", name: "Payroll report", documentCategory: "payroll" };
    vi.mocked(apiGetJson).mockResolvedValue([document, second]);
    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Bank statement"), { target: { value: "Updated statement" } });
    fireEvent.click(screen.getByRole("button", { name: /Payroll report/ }));
    expect(screen.getByLabelText("Document name")).toHaveValue("Payroll report");
    fireEvent.change(screen.getByLabelText("Find a requirement"), { target: { value: "banking" } });
    expect(screen.queryByRole("button", { name: /^Payroll report/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Updated statement/ }));
    expect(screen.getByLabelText("Document name")).toHaveValue("Updated statement");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Required documents saved");
    expect(apiPutJson).toHaveBeenCalledWith(requiredDocumentsEndpoint, [{ ...document, name: "Updated statement" }, second]);
  });

  it("does not save an incomplete requirement hidden by selecting another", async () => {
    renderPage();
    await screen.findByDisplayValue("Bank statement");
    fireEvent.click(screen.getByRole("button", { name: "Add requirement" }));
    expect(screen.getByLabelText("Document name")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /Bank statement/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Check this requirement");
    expect(screen.getByLabelText("Document name")).toHaveValue("");
    expect(apiPutJson).not.toHaveBeenCalled();
  });

  it("keeps existing template IDs and saves through the existing backend endpoint", async () => {
    renderPage();
    const name = await screen.findByDisplayValue("Bank statement");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.change(name, { target: { value: "Business bank statement" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Required documents saved");
    expect(apiGetJson).toHaveBeenCalledWith(requiredDocumentsEndpoint);
    expect(apiPutJson).toHaveBeenCalledWith(requiredDocumentsEndpoint, [{ ...document, name: "Business bank statement" }]);
  });

  it("blocks editing after a failed load and allows retry", async () => {
    vi.mocked(apiGetJson).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    await screen.findByText("Could not load required documents");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add requirement" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByDisplayValue("Bank statement");
    expect(apiPutJson).not.toHaveBeenCalled();
  });

  it("retains edits when saving fails", async () => {
    vi.mocked(apiPutJson).mockRejectedValueOnce(new Error("Offline"));
    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Bank statement"), { target: { value: "Updated requirement" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Could not save required documents");
    expect(screen.getByDisplayValue("Updated requirement")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
  });

  it("only adds the navigation entry to admin Documents", () => {
    const path = "/firm/admin/required-documents";
    expect(navigationByRole.admin.find((item) => item.to === path)?.section).toBe("Document Setup");
    expect(navigationByRole.client.some((item) => item.to === path)).toBe(false);
    expect(navigationByRole.accountant.some((item) => item.to === path)).toBe(false);
  });
});
