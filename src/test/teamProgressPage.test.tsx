import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminTeamProgressPage } from "../pages/admin/AdminTeamProgressPage";
import { getTeamProgress } from "../services/teamProgressApi";
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), hasApiBaseUrl: () => true }));
vi.mock("../services/teamProgressApi", () => ({ getTeamProgress: vi.fn() }));
const snapshot = {
  checkedAtUtc: "2026-11-16T10:00:00Z", unassignedClients: 1,
  accountants: [{ accountantId: "staff", name: "Assigned Accountant", accountStatus: "active", primaryClients: 1, backupClients: 0, awaitingReview: 2, inReview: 1, requiredItems: 4, approvedItems: 1, waitingOnClient: 1, decisionsToday: 2,
    latestActivity: { action: "review_queue.opened", atUtc: "2026-11-16T09:50:00Z", clientName: "Assigned business", documentName: "Invoice.pdf" },
    clients: [{ clientId: "business", clientName: "Assigned business", assignment: "primary", packs: [{ packId: "pack", year: 2026, month: 11, status: "under_review", requiredItems: 4, approvedItems: 1, awaitingReview: 2, inReview: 1, waitingOnClient: 1 }] }],
  }],
};
beforeEach(() => { vi.mocked(getTeamProgress).mockReset().mockResolvedValue(snapshot); });
it("shows recorded team activity and client progress without accounting decision actions", async () => {
  render(<MemoryRouter><AdminTeamProgressPage /></MemoryRouter>);
  await screen.findByText("Assigned Accountant");
  expect(screen.getByText("Invoice.pdf")).toBeInTheDocument();
  expect(screen.getByText(/not live presence/)).toBeInTheDocument();
  const progress = screen.getByRole("progressbar", { name: "Approved required items for Assigned Accountant" });
  expect(progress).toHaveAttribute("value", "1"); expect(progress).toHaveAttribute("max", "4");
  fireEvent.click(screen.getByRole("button", { name: "View assignments for Assigned Accountant" }));
  expect(screen.getByRole("region", { name: "Assigned work for Assigned Accountant" })).toHaveTextContent("Assigned business");
  expect(screen.getByText("Nov 2026")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  vi.mocked(getTeamProgress).mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Refresh progress" }));
  await screen.findByText(/Could not refresh/);
  expect(screen.getByText("Assigned Accountant")).toBeInTheDocument();
});
it("does not show invented empty totals when the first request fails", async () => {
  vi.mocked(getTeamProgress).mockRejectedValueOnce(new Error("offline"));
  render(<MemoryRouter><AdminTeamProgressPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/Team progress is unavailable/)).toBeInTheDocument());
  expect(screen.queryByText("Primary assignments")).not.toBeInTheDocument();
});

it("filters recorded review work and searches by assigned client", async () => {
  vi.mocked(getTeamProgress).mockResolvedValue({ ...snapshot, accountants: [...snapshot.accountants, {
    ...snapshot.accountants[0], accountantId: "other", name: "Other Accountant", primaryClients: 0, backupClients: 0,
    awaitingReview: 0, inReview: 0, waitingOnClient: 0, requiredItems: 0, approvedItems: 0, latestActivity: undefined, clients: [],
  }] });
  render(<MemoryRouter><AdminTeamProgressPage /></MemoryRouter>);
  await screen.findByText("Other Accountant");
  fireEvent.click(screen.getByRole("button", { name: "Review outstanding" }));
  expect(screen.queryByText("Other Accountant")).not.toBeInTheDocument();
  expect(screen.getByText("Assigned Accountant")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "All accountants" }));
  fireEvent.change(screen.getByLabelText("Find accountant or client"), { target: { value: "Assigned business" } });
  expect(screen.queryByText("Other Accountant")).not.toBeInTheDocument();
  expect(screen.getByText("Assigned Accountant")).toBeInTheDocument();
});
it("opens a linked accountant's work view and returns to the team register", async () => {
  render(<MemoryRouter initialEntries={["/firm/admin/team-progress?accountantId=staff"]}><AdminTeamProgressPage /></MemoryRouter>);
  const work=await screen.findByRole("region",{name:"Assigned work for Assigned Accountant"});
  expect(work).toHaveFocus();
  expect(screen.queryByRole("region",{name:"Accountant progress"})).not.toBeInTheDocument();
  expect(screen.getByText("Nov 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Back to team"}));
  expect(screen.getByRole("region",{name:"Accountant progress"})).toBeInTheDocument();
  expect(screen.getByLabelText("Find accountant or client")).toHaveFocus();
});
