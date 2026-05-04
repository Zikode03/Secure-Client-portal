import { useState } from "react";
import { ComplianceAuditPanel } from "../../components/compliance/ComplianceAuditPanel";
import { ComplianceCategoryPanel } from "../../components/compliance/ComplianceCategoryPanel";
import { ComplianceClientStatusTable } from "../../components/compliance/ComplianceClientStatusTable";
import { ComplianceExpiryQueuePanel } from "../../components/compliance/ComplianceExpiryQueuePanel";
import { ComplianceReportPanel } from "../../components/compliance/ComplianceReportPanel";
import { ComplianceRulesPanel } from "../../components/compliance/ComplianceRulesPanel";
import { MissingDocumentsPanel } from "../../components/workflow/MissingDocumentsPanel";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { portalService } from "../../services/portalData";

export function AccountantComplianceCentrePage() {
  const data = portalService.getAccountantComplianceCentre();
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => setMessage("Firm compliance report prepared for download.")}>
              Download compliance report
            </Button>
            <Button variant="secondary">Export renewal queue</Button>
          </>
        }
        description="This page keeps compliance tracking front and center before any direct SARS integration: expiry dates, renewal reminders, required document gaps, client status, and controlled audit reporting."
        eyebrow="Compliance Centre"
        title="Compliance Centre"
      />

      {message ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      {data.clientStatuses ? <ComplianceClientStatusTable items={data.clientStatuses} /> : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <ComplianceExpiryQueuePanel
          description="Expired records remain visible and must be replaced through new versions."
          items={data.expiredDocuments}
          title="Expired Documents"
        />
        <ComplianceExpiryQueuePanel
          description="Expiring records already have reminder windows scheduled and should be actioned now."
          items={data.expiringDocuments}
          title="Expiring in 30 Days"
        />
        <MissingDocumentsPanel items={data.missingRequiredDocuments} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {data.categoryGroups.map((group) => (
          <ComplianceCategoryPanel group={group} key={group.id} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <ComplianceReportPanel
            generatedAt={data.reportGeneratedAt}
            onDownload={() => setMessage("Firm compliance report prepared for download.")}
          />
          <ComplianceRulesPanel
            description="These controls are designed to align with secure handling and POPIA-style safeguard expectations for personal and financial records."
            footer={data.retentionNote}
            items={data.secureRules}
            title="Security and Retention Rules"
          />
        </div>

        <ComplianceAuditPanel items={data.auditTrail} />
      </section>
    </div>
  );
}
