import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { apiGetJson, apiPostJson } from "./fixtures/apiTransportFixture";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async original => ({...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate}));
vi.mock("../app/auth", () => ({useAuth: () => ({user: {id: "recipient-1", role: "client"}})}));
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(),hasApiBaseUrl: () => true, apiGetJson: vi.fn(), apiPostJson: vi.fn()}));
const alert = {id: "alert-1", title: "Document reviewed", message: "Your accountant has reviewed a document.", isRead: false, createdAtUtc: "2026-11-16T10:00:00Z", linkUrl: "/client/documents"};
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiGetJson).mockResolvedValue([alert]); vi.mocked(apiPostJson).mockResolvedValue({}); });
function show() { render(<MemoryRouter><NotificationBell /></MemoryRouter>); }
it("shows the unread count and opens real recent alerts", async () => {
  show(); fireEvent.click(await screen.findByRole("button", {name: "Notifications, 1 unread"}));
  expect(screen.getByText("Document reviewed")).toBeInTheDocument();
  expect(screen.getByRole("link", {name:"View all notifications"})).toHaveAttribute("href", "/client/notifications");
  fireEvent.keyDown(document, {key:"Escape"}); expect(screen.queryByRole("region", {name:"Recent notifications"})).not.toBeInTheDocument();
});
it("marks read on the server before opening the linked work", async () => {
  show(); fireEvent.click(await screen.findByRole("button", {name:"Notifications, 1 unread"}));
  fireEvent.click(screen.getByRole("button", {name:/Document reviewed/}));
  await waitFor(() => expect(apiPostJson).toHaveBeenCalledWith("/api/notifications/alert-1/mark-read", {}));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/client/documents"));
});
it("keeps unread state when marking read fails", async () => {
  vi.mocked(apiPostJson).mockRejectedValue(new Error("Unavailable"));
  show(); fireEvent.click(await screen.findByRole("button", {name:"Notifications, 1 unread"}));
  fireEvent.click(screen.getByRole("button", {name:"Mark all as read"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not mark notifications");
  expect(screen.getByRole("button", {name:"Notifications, 1 unread"})).toBeInTheDocument();
});
it("shows load failures instead of claiming the inbox is empty", async () => {
  vi.mocked(apiGetJson).mockRejectedValue(new Error("Unavailable")); show();
  fireEvent.click(screen.getByRole("button", {name:"Notifications"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  expect(screen.queryByText(/all caught up/)).not.toBeInTheDocument();
});
it("never follows an external URL supplied by a notification", async () => {
  vi.mocked(apiGetJson).mockResolvedValue([{...alert, linkUrl:"//external.invalid/private"}]); show();
  fireEvent.click(await screen.findByRole("button", {name:"Notifications, 1 unread"})); fireEvent.click(screen.getByRole("button", {name:/Document reviewed/}));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/client/notifications"));
});

it("maps backend request links to the client inbox", async () => {
  vi.mocked(apiGetJson).mockResolvedValue([{...alert, linkUrl:"/requests/request-42"}]); show();
  fireEvent.click(await screen.findByRole("button", {name:"Notifications, 1 unread"})); fireEvent.click(screen.getByRole("button", {name:/Document reviewed/}));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/client/inbox"));
});

it("keeps the preview to three recent alerts and distinguishes read state", async () => {
  vi.mocked(apiGetJson).mockResolvedValue(Array.from({length:5}, (_,index) => ({...alert, id:`item-${index}`, title:`Update ${index}`, isRead:index !== 4, createdAtUtc:`2026-11-16T10:0${index}:00Z`})));
  show(); fireEvent.click(await screen.findByRole("button", {name:"Notifications, 1 unread"}));
  const panel = screen.getByRole("region", {name:"Recent notifications"});
  expect(within(panel).getByText("Update 4")).toBeInTheDocument();
  expect(within(panel).queryByText("Update 1")).not.toBeInTheDocument();
  expect(within(panel).getAllByText(/^Read$/)).toHaveLength(2);
  expect(within(panel).getByText(/^Unread$/)).toBeInTheDocument();
  expect(within(panel).queryByRole("link", {name:"Notification preferences"})).not.toBeInTheDocument();
});
it("uses the document name and readable due date for missing-document reminders", async () => {
  vi.mocked(apiGetJson).mockResolvedValue([{...alert, title:"Overdue document", message:"Purchase Invoices is still missing (due 2026-11-05)."}]);
  show(); fireEvent.click(await screen.findByRole("button", {name:"Notifications, 1 unread"}));
  expect(screen.getByText("Purchase Invoices missing")).toBeInTheDocument();
  expect(screen.getByText("Due 5 Nov 2026")).toBeInTheDocument();
  expect(screen.queryByText("Overdue document")).not.toBeInTheDocument();
});

it("does not restore unread counts from a refresh started before marking all read", async () => {
  show();
  fireEvent.click(await screen.findByRole("button", {name: "Notifications, 1 unread"}));
  let finishRefresh!: (value: typeof alert[]) => void;
  vi.mocked(apiGetJson).mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
  fireEvent(window, new Event("focus"));
  fireEvent.click(screen.getByRole("button", {name: "Mark all as read"}));
  await waitFor(() => expect(screen.getByRole("button", {name: "Notifications"})).toBeInTheDocument());
  await act(async () => { finishRefresh([alert]); });
  expect(screen.queryByRole("button", {name: "Notifications, 1 unread"})).not.toBeInTheDocument();
  expect(screen.getByText(/^Read$/)).toBeInTheDocument();
});
