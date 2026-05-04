import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { DocumentPreviewPane } from "../../components/workflow/DocumentPreviewPane";
import { UnifiedSearchTable } from "../../components/workflow/UnifiedSearchTable";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { buildUnifiedSearchResults } from "../../services/workflowEngine";
import type { DocumentRecord, UnifiedSearchFilters } from "../../types/portal";

const defaultFilters: UnifiedSearchFilters = {
  query: "",
  clientId: "",
  month: "",
  year: "",
  documentType: "",
  status: "",
  expiryStatus: "",
  requiredFlag: "all",
  uploadedBy: "",
  reviewedBy: "",
};

export function AccountantDocumentsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [filters, setFilters] = useState<UnifiedSearchFilters>(defaultFilters);
  const [selectedResultId, setSelectedResultId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const assignedClients = useMemo(
    () =>
      portal.adminClients.filter(
        (client) => client.assignedAccountant === user?.fullName || user?.role === "admin",
      ),
    [portal.adminClients, user?.fullName, user?.role],
  );

  const allResults = useMemo(
    () =>
      assignedClients.flatMap((client) => {
        const workspace = portal.getClientWorkspace(client.id);
        return buildUnifiedSearchResults({
          clientId: client.id,
          clientName: client.clientName,
          documents: workspace.documents,
          invoices: workspace.invoices,
          monthPack: workspace.monthPack,
          requests: workspace.requests,
          complianceDocuments:
            client.id === "firm-client-1"
              ? portal.accountantComplianceCentre.categoryGroups.flatMap(
                  (group) => group.documents,
                )
              : [],
        });
      }),
    [assignedClients, portal],
  );

  const filteredResults = useMemo(
    () => portal.filterSearchResults(allResults, filters),
    [allResults, filters, portal],
  );

  const selectedResult = useMemo(
    () =>
      filteredResults.find((result) => result.id === selectedResultId) ??
      filteredResults[0] ??
      null,
    [filteredResults, selectedResultId],
  );

  const selectedDocument = useMemo<DocumentRecord | null>(() => {
    if (!selectedResult) {
      return null;
    }

    if (selectedResult.clientId === "firm-client-1" || selectedResult.clientId === "client-apex") {
      return portal.getReviewRecord(selectedResult.id);
    }

    const workspace = portal.getClientWorkspace(selectedResult.clientId);
    const invoiceMatch = workspace.invoices.some(
      (invoice) => invoice.id === selectedResult.id,
    );
    return (
      workspace.documents.find((document) => document.id === selectedResult.id) ??
      (invoiceMatch ? portal.getReviewRecord(selectedResult.id) : null)
    );
  }, [portal, selectedResult]);

  function handleComment(message: string) {
    if (!selectedDocument || !user) {
      return { ok: false, message: "Select a live document record before commenting." };
    }

    if (
      selectedDocument.clientId !== "client-apex" &&
      selectedDocument.clientId !== "firm-client-1"
    ) {
      return {
        ok: false,
        message: "Only the live client workspace supports editable comments in this mock MVP.",
      };
    }

    const result = portal.addDocumentComment(
      selectedDocument.id,
      user.fullName,
      user.role,
      message,
    );
    setFeedbackMessage(result.message);
    return result;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => setFeedbackMessage("Mock CSV export will be generated here.")} variant="secondary">
            Export view
          </Button>
        }
        description="Search across assigned client documents, invoices, compliance records, suppliers, periods, statuses, and required monthly pack items from one accountant-facing document centre."
        eyebrow="Accountant document centre"
        title="Unified portfolio search"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <TextField
            label="Search"
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Apex VAT April INV-2038"
            value={filters.query}
          />
          <SelectField
            label="Client"
            onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value }))}
            options={[
              { label: "All assigned clients", value: "" },
              ...assignedClients.map((client) => ({ label: client.clientName, value: client.id })),
            ]}
            value={filters.clientId}
          />
          <TextField
            label="Month / period"
            onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
            placeholder="April 2026"
            value={filters.month}
          />
          <TextField
            label="Document type"
            onChange={(event) => setFilters((current) => ({ ...current, documentType: event.target.value }))}
            placeholder="Invoice, bank statement..."
            value={filters.documentType}
          />
          <TextField
            label="Status"
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            placeholder="Accepted, rejected..."
            value={filters.status}
          />
        </div>
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <UnifiedSearchTable
          description="Results clearly separate invoices, bank statements, compliance documents, signed documents, and monthly pack items."
          onCommentResult={(result) => setFeedbackMessage(`Open ${result.title} in the detail panel to comment.`)}
          onOpenResult={(result) => setSelectedResultId(result.id)}
          results={filteredResults}
          title="Portfolio search results"
        />

        <div className="space-y-6">
          {selectedDocument ? (
            <>
              <DocumentPreviewPane document={selectedDocument} />
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Comments</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Controlled messaging stays attached to the selected record.
                  </p>
                </div>
                <CommentThread
                  comments={selectedDocument.comments}
                  currentAuthor={user?.fullName ?? "Accountant"}
                  currentRole="accountant"
                  onSubmitComment={handleComment}
                />
              </SurfaceCard>
              <SurfaceCard className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Audit trail</h2>
                </div>
                <AuditTrail entries={selectedDocument.auditTrail} />
              </SurfaceCard>
            </>
          ) : (
            <SurfaceCard>
              <EmptyState
                description="Open a search result to inspect the document, comment thread, and audit trail."
                title="No record selected"
              />
            </SurfaceCard>
          )}
        </div>
      </section>
    </div>
  );
}
