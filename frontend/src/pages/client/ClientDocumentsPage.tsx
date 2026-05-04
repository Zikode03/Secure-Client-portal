import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AuditTrail } from "../../components/workflow/AuditTrail";
import { CommentThread } from "../../components/workflow/CommentThread";
import { DocumentPreviewPane } from "../../components/workflow/DocumentPreviewPane";
import { ExpiringDocumentsPanel } from "../../components/workflow/ExpiringDocumentsPanel";
import { PreviousMonthComparisonCard } from "../../components/workflow/PreviousMonthComparisonCard";
import { RejectedDocumentsPanel } from "../../components/workflow/RejectedDocumentsPanel";
import { UnifiedSearchTable } from "../../components/workflow/UnifiedSearchTable";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import type { DocumentRecord, UnifiedSearchFilters } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";

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

export function ClientDocumentsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const [filters, setFilters] = useState<UnifiedSearchFilters>(defaultFilters);
  const [selectedResultId, setSelectedResultId] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const results = useMemo(
    () => portal.filterSearchResults(portal.clientWorkflow.unifiedSearchResults, filters),
    [filters, portal],
  );

  const selectedResult = useMemo(
    () => results.find((result) => result.id === selectedResultId) ?? results[0] ?? null,
    [results, selectedResultId],
  );

  const selectedDocument = useMemo<DocumentRecord | null>(() => {
    if (!selectedResult) {
      return null;
    }

    if (selectedResult.resultType === "invoice") {
      return portal.getReviewRecord(selectedResult.id);
    }

    return (
      portal.clientWorkflow.documents.find((document) => document.id === selectedResult.id) ??
      null
    );
  }, [portal, selectedResult]);

  function handleComment(message: string) {
    if (!selectedDocument || !user) {
      return { ok: false, message: "Select a document before posting a comment." };
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
          <Button onClick={() => setFeedbackMessage("Exporting search results is ready for backend wiring.")} variant="secondary">
            Export results
          </Button>
        }
        description="Search across documents, invoices, monthly pack items, compliance records, suppliers, amounts, periods, and statuses from one controlled document centre."
        eyebrow="Client document centre"
        title="Unified search and retrieval"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <TextField
            hint="Try: R12500 Makro March"
            label="Smart search"
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="R12500 Makro March"
            value={filters.query}
          />
          <TextField
            label="Month"
            onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
            placeholder="April 2026"
            value={filters.month}
          />
          <TextField
            label="Year"
            onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
            placeholder="2026"
            value={filters.year}
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
          <TextField
            label="Uploaded by"
            onChange={(event) => setFilters((current) => ({ ...current, uploadedBy: event.target.value }))}
            placeholder="Sarah Jacobs"
            value={filters.uploadedBy}
          />
          <TextField
            label="Reviewed by"
            onChange={(event) => setFilters((current) => ({ ...current, reviewedBy: event.target.value }))}
            placeholder="Daniel Mokoena"
            value={filters.reviewedBy}
          />
          <SelectField
            label="Required / optional"
            onChange={(event) => setFilters((current) => ({ ...current, requiredFlag: event.target.value }))}
            options={[
              { label: "All items", value: "all" },
              { label: "Required only", value: "required" },
              { label: "Optional only", value: "optional" },
            ]}
            value={filters.requiredFlag}
          />
          <SelectField
            label="Expiry status"
            onChange={(event) => setFilters((current) => ({ ...current, expiryStatus: event.target.value }))}
            options={[
              { label: "Any expiry state", value: "" },
              { label: "Expiring soon", value: "expiring_soon" },
              { label: "Expired", value: "expired" },
            ]}
            value={filters.expiryStatus}
          />
          <div className="flex items-end">
            <Button onClick={() => setFilters(defaultFilters)} variant="ghost">
              Clear filters
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <UnifiedSearchTable
          description="Mixed results clearly label invoices, bank statements, compliance records, signed documents, and monthly pack items."
          onCommentResult={(result) =>
            setFeedbackMessage(`Open ${result.title} in the detail panel to comment on it.`)
          }
          onOpenResult={(result) => {
            setSelectedResultId(result.id);
            setFeedbackMessage(`Opened ${result.title}.`);
          }}
          results={results}
          title="Search results"
        />

        <div className="space-y-6">
          <PreviousMonthComparisonCard comparison={portal.clientWorkflow.previousMonthComparison} />
          <ExpiringDocumentsPanel items={portal.clientWorkflow.expiringDocuments} />
          <RejectedDocumentsPanel items={portal.clientWorkflow.rejectedDocuments} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {selectedDocument ? (
          <DocumentPreviewPane document={selectedDocument} />
        ) : (
          <SurfaceCard>
            <EmptyState
              description="Open a document, invoice, or monthly pack item from the search results to inspect it here."
              title="Nothing selected yet"
            />
          </SurfaceCard>
        )}

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Selected record detail</h2>
              <p className="mt-1 text-sm text-slate-500">
                Documents stay searchable by workflow metadata, not by guessing filenames.
              </p>
            </div>
            {selectedResult ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{selectedResult.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedResult.clientName} / {selectedResult.typeLabel}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Period: {selectedResult.monthLabel}
                  {selectedResult.expiryDate
                    ? ` / Expires ${formatDateLabel(selectedResult.expiryDate)}`
                    : ""}
                </p>
              </div>
            ) : (
              <EmptyState
                description="Search results will populate this panel once a record is opened."
                title="No record selected"
              />
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Document comments</h2>
              <p className="mt-1 text-sm text-slate-500">
                Comments stay attached to the document or invoice context, not a general chat stream.
              </p>
            </div>
            {selectedDocument ? (
              <CommentThread
                comments={selectedDocument.comments}
                currentAuthor={user?.fullName ?? "Client user"}
                currentRole="client"
                onSubmitComment={handleComment}
              />
            ) : (
              <EmptyState
                description="Open a document result to review the related comment thread."
                title="No comment thread selected"
              />
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Audit trail</h2>
              <p className="mt-1 text-sm text-slate-500">
                Uploaded by, reviewed by, accepted, rejected, and renewed versions all stay visible.
              </p>
            </div>
            {selectedDocument ? (
              <AuditTrail entries={selectedDocument.auditTrail} />
            ) : (
              <EmptyState
                description="Open a document result to see the lifecycle history."
                title="No audit trail selected"
              />
            )}
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
