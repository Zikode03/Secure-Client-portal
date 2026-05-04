import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PortalProvider, usePortal } from "../app/portal";
import { portalService } from "../services/portalData";
import {
  buildExpiringDocuments,
  buildUnifiedSearchResults,
  recalculatePack,
} from "../services/workflowEngine";

function PortalWrapper({ children }: { children: ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}

describe("workflow business rules", () => {
  it("client cannot submit month when required documents are missing", () => {
    const seed = portalService.getClientWorkflowSeed();
    const pack = recalculatePack(seed.monthPack);

    expect(pack.canComplete).toBe(false);
    expect(pack.completionMessage).toBe(
      "You cannot submit this month because required documents are still missing or rejected.",
    );
  });

  it("client cannot submit month when required documents are rejected", () => {
    const seed = portalService.getClientWorkflowSeed();
    const pack = recalculatePack({
      ...seed.monthPack,
      slots: seed.monthPack.slots.map((slot) =>
        slot.isRequired
          ? { ...slot, status: slot.documentType === "Bank Statement" ? "rejected" : "accepted" }
          : slot,
      ),
    });

    expect(pack.canComplete).toBe(false);
    expect(pack.completionMessage).toBe(
      "You cannot submit this month because required documents are still missing or rejected.",
    );
  });

  it("client can submit month when all required documents are uploaded or accepted", () => {
    const seed = portalService.getClientWorkflowSeed();
    const pack = recalculatePack({
      ...seed.monthPack,
      slots: seed.monthPack.slots.map((slot) =>
        slot.isRequired ? { ...slot, status: "accepted" } : slot,
      ),
    });

    expect(pack.canComplete).toBe(true);
    expect(pack.completionMessage).toBe(
      "Month is complete and ready to submit to your accountant.",
    );
  });

  it("expiring documents are identified when expiry date is within 30 days", () => {
    const documents = [
      {
        ...portalService.getDocumentById("doc-1005"),
        expiryDate: "2026-05-20T00:00:00.000Z",
      },
    ];

    const results = buildExpiringDocuments(
      documents,
      new Date("2026-05-04T08:00:00.000Z"),
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("expiring_soon");
  });

  it("expired documents are identified correctly", () => {
    const documents = [
      {
        ...portalService.getDocumentById("doc-1006"),
        expiryDate: "2026-04-30T00:00:00.000Z",
      },
    ];

    const results = buildExpiringDocuments(
      documents,
      new Date("2026-05-04T08:00:00.000Z"),
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("expired");
  });

  it("reject document requires a rejection reason", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const documentId = result.current.clientWorkflow.documents[0].id;

    const response = result.current.reviewRecord({
      recordId: documentId,
      action: "rejected",
      reviewer: "Daniel Mokoena",
      reason: "",
    });

    expect(response.ok).toBe(false);
    expect(response.message).toBe(
      "Add a clear rejection reason before sending the document back.",
    );
  });

  it("finalised invoice changes status and appears in latest and review views", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const invoice = result.current.clientWorkflow.invoices.find(
      (item) => item.status === "draft" || item.status === "uploaded" || item.status === "finalised",
    );

    expect(invoice).toBeDefined();

    act(() => {
      result.current.finaliseInvoice(invoice!.id);
    });

    const updatedInvoice = result.current.clientWorkflow.invoices.find(
      (item) => item.id === invoice!.id,
    );
    const latestInvoice = result.current.clientWorkflow.latestInvoices.find(
      (item) => item.id === invoice!.id,
    );
    const reviewQueueItem = result.current.getReviewQueue().find(
      (item) => item.id === invoice!.id,
    );

    expect(updatedInvoice?.status).toBe("sent_to_accountant");
    expect(latestInvoice?.status).toBe("sent_to_accountant");
    expect(reviewQueueItem).toBeDefined();
  });

  it("unified search returns mixed result types", () => {
    const seed = portalService.getClientWorkflowSeed();
    const complianceDocuments = portalService
      .getClientComplianceCentre()
      .categoryGroups.flatMap((group) => group.documents);

    const results = buildUnifiedSearchResults({
      clientId: "client-apex",
      clientName: "Apex Trading Ltd",
      documents: seed.documents,
      invoices: seed.invoices,
      monthPack: seed.monthPack,
      complianceDocuments,
    });
    const resultTypes = new Set(results.map((item) => item.resultType));

    expect(resultTypes.has("document")).toBe(true);
    expect(resultTypes.has("invoice")).toBe(true);
    expect(resultTypes.has("monthly_pack_item")).toBe(true);
    expect(resultTypes.has("compliance_document")).toBe(true);
  });
});
