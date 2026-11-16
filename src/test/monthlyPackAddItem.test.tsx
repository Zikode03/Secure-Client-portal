import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ClientMonthlyPackWorkspacePage } from "../pages/client/ClientMonthlyPackWorkspacePage";
import { monthlyPacksApi } from "../services/monthlyPacksApi";

vi.mock("../app/auth", () => ({ useAuth: () => ({ user: {id: "client-account", role: "client", clientIds: ["business"], company: "Business"} }) }));
vi.mock("../services/apiClient", async original => ({...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true, apiGetJson: vi.fn(async () => ({id: "business", name: "Business", entityType: "Company"}))}));
vi.mock("../services/documentsApi", () => ({documentsApi: {list: vi.fn(async () => [])}}));
vi.mock("../services/monthlyPacksApi", () => ({monthlyPacksApi: {list: vi.fn(), profile: vi.fn(), addItem: vi.fn()}}));
vi.mock("../components/banking/MonthlyPackBankingStatusPanel", () => ({MonthlyPackBankingStatusPanel: () => null}));
vi.mock("../pages/client/ClientMonthlyPacksPage", async () => {
  const {useMonthlyPackCustomization} = await import("../components/workflow/MonthlyPackCustomizationContext");
  return {ClientMonthlyPacksPage: () => {
    const context = useMonthlyPackCustomization();
    return <button disabled={context?.disabled} onClick={context?.onAddItem}>Open add item</button>;
  }};
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(monthlyPacksApi.list).mockResolvedValue([{id:"pack",clientId:"business",year:2026,month:11,status:"in_progress"}] as never);
  vi.mocked(monthlyPacksApi.profile).mockResolvedValue({clientId:"business",recurringItems:[],pendingRecurringItems:[],currentPackItems:[]} as never);
  vi.mocked(monthlyPacksApi.addItem).mockResolvedValue({slotId:"slot",monthlyPackId:"pack",recurringRequestId:null} as never);
});
async function open() {
  render(<ClientMonthlyPackWorkspacePage />);
  const button = screen.getByRole("button", {name:"Open add item"});
  await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);
  return within(screen.getByRole("dialog", {name:"Add to Monthly Pack"}));
}
it("shows missing-name validation inside the dialog and removes redundant category fields", async () => {
  const dialog=await open();
  expect(dialog.queryByRole("combobox")).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", {name:"Add item"}));
  expect(dialog.getByRole("alert")).toHaveTextContent("Enter the name");
  expect(monthlyPacksApi.addItem).not.toHaveBeenCalled();
});
it.each(["this_month","every_month"])("adds a named item with recurrence %s without asking for a category", async recurrence => {
  const dialog=await open();
  fireEvent.change(dialog.getByLabelText("Item name (required)"),{target:{value:"Fuel card statement"}});
  if(recurrence==="every_month") fireEvent.click(dialog.getByRole("button",{name:/Every month/}));
  fireEvent.click(dialog.getByRole("button",{name:"Add item"}));
  await waitFor(()=>expect(monthlyPacksApi.addItem).toHaveBeenCalledWith("business",expect.objectContaining({category:null,label:"Fuel card statement",recurrence})));
  await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("keeps entered details and displays server failures within the open dialog", async () => {
  vi.mocked(monthlyPacksApi.addItem).mockRejectedValue(new Error("This pack is locked."));
  const dialog=await open();
  fireEvent.change(dialog.getByLabelText("Item name (required)"),{target:{value:"Fuel card statement"}});
  fireEvent.click(dialog.getByRole("button",{name:"Add item"}));
  expect(await dialog.findByRole("alert")).toHaveTextContent("This pack is locked.");
  expect(dialog.getByLabelText("Item name (required)")).toHaveValue("Fuel card statement");
});
