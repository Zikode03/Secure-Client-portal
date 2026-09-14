// Friendly guide: this module (complianceLifecycle.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../app/auth";
import { PortalProvider, usePortal } from "../app/portal";
import { AccountantComplianceCentrePage } from "../pages/accountant/AccountantComplianceCentrePage";
import { ClientComplianceCentrePage } from "../pages/client/ClientComplianceCentrePage";
import { portalService } from "../services/portalData";
import type { SessionUser } from "../types/portal";
import {
  calculateComplianceScore,
  getClientFacingComplianceLabel,
  isComplianceItemExpired,
  isComplianceItemExpiring,
  isComplianceItemMissing,
} from "../utils/compliance";

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

const clientUser: SessionUser = {
  id: "user-client-1",
  name: "Sarah",
  fullName: "Sarah Jacobs",
  email: "client@example.com",
  role: "client",
  title: "Finance Manager",
  company: "Apex Trading Ltd",
  initials: "SJ",
  clientIds: ["client-apex"],
  assignedClientIds: [],
};

// Component flow: gather data first, then render a focused UI state.
function PortalWrapper({ children }: { children: ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}

function renderWithProviders(page: JSX.Element, user: SessionUser) {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  const result = render(
    <MemoryRouter>
      <PortalProvider>
        <AuthProvider>{page}</AuthProvider>
      </PortalProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Document records" }));
  return result;
}

describe("compliance lifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("expired compliance item is detected correctly", () => {
    const data = portalService.getClientComplianceCentre();
    const item = data.expiredDocuments.find((document) => document.name === "CIPC Annual Return");

    expect(item).toBeDefined();
    expect(isComplianceItemExpired(item!)).toBe(true);
  });

  it("expiring compliance item is detected correctly within 30 days", () => {
    const data = portalService.getClientComplianceCentre();
    const item = data.expiringDocuments.find(
      (document) => document.name === "Tax Compliance Status PIN",
    );

    expect(item).toBeDefined();
    expect(isComplianceItemExpiring(item!)).toBe(true);
  });

  it("missing required compliance item is detected correctly", () => {
    const data = portalService.getClientComplianceCentre();
    const item = data.missingRequiredDocuments.find(
      (document) => document.name === "Beneficial Ownership Declaration",
    );

    expect(item).toBeDefined();
    expect(isComplianceItemMissing(item!)).toBe(true);
  });

  it("compliance score is calculated correctly from the current client dataset", () => {
    const data = portalService.getClientComplianceCentre();
    const documents = data.categoryGroups.flatMap((group) => group.documents);

    expect(calculateComplianceScore(documents)).toBe(data.overallScore);
  });

  it("does not substitute demo clients when the compliance backend is unavailable", async () => {
    renderWithProviders(<AccountantComplianceCentrePage />, accountantUser);

    expect(screen.getByRole("heading", { name: "Compliance Centre" })).toBeInTheDocument();
    await screen.findByText("Compliance records unavailable");
    expect(screen.queryByText("Apex Trading Ltd")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tracked items/ })).toHaveTextContent("—");
  });

  it("explains how client requirements differ from pack completion", async () => {
    renderWithProviders(<AccountantComplianceCentrePage />, accountantUser);

    fireEvent.click(screen.getByText("How does Compliance Centre work?"));
    expect(screen.getByText("1. Record the requirement")).toBeVisible();
    expect(screen.getByText(/An uploaded file or a completed pack is not/)).toBeVisible();
    await screen.findByText("Compliance records unavailable");
  });

  it("compliance item can generate a request", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const compliance = result.current.getClientWorkspace("firm-client-1").compliance;
    const missingItem = compliance?.documents.find((document) => document.status === "missing");

    expect(missingItem).toBeDefined();

    act(() => {
      result.current.createComplianceRequest({
        clientId: "firm-client-1",
        complianceItemId: missingItem!.id,
        requestType: "missing_document_request",
        dueDate: "2026-05-18T00:00:00.000Z",
        actor: accountantUser,
        comments: "Please upload this required document.",
      });
    });

    const createdRequest = result.current
      .getClientWorkspace("firm-client-1")
      .requests.find((request) => request.complianceItemId === missingItem!.id);

    expect(createdRequest).toBeDefined();
    expect(createdRequest?.requestType).toBe("missing_document_request");
  });

  it("new upload creates a new compliance version and keeps previous versions visible", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const compliance = result.current.getClientWorkspace("firm-client-1").compliance;
    const target = compliance?.documents.find((document) => document.status === "expired");

    expect(target).toBeDefined();
    const previousFileNames = target!.versions.map((version) => version.fileName);

    act(() => {
      result.current.uploadComplianceVersion({
        clientId: "firm-client-1",
        complianceItemId: target!.id,
        fileName: "ApexTrading_CIPCAnnualReturn_Renewal.pdf",
        fileType: "pdf",
        uploadedBy: "Daniel Mokoena",
        note: "Renewal version uploaded for review.",
      });
    });

    const updated = result.current
      .getClientWorkspace("firm-client-1")
      .compliance?.documents.find((document) => document.id === target!.id);

    expect(updated?.versions).toHaveLength(target!.versions.length + 1);
    previousFileNames.forEach((fileName) => {
      expect(updated?.versions.some((version) => version.fileName === fileName)).toBe(true);
    });
    expect(updated?.versions.filter((version) => version.isCurrentVersion)).toHaveLength(1);
  });

  it("client sees simplified compliance labels", () => {
    renderWithProviders(<ClientComplianceCentrePage />, clientUser);

    expect(getClientFacingComplianceLabel("EMP201")).toBe("Monthly payroll submission (EMP201)");
    expect(screen.getByText("Tax compliance PIN")).toBeInTheDocument();
    expect(screen.getAllByText("Monthly payroll submission (EMP201)").length).toBeGreaterThan(0);
  });
});
