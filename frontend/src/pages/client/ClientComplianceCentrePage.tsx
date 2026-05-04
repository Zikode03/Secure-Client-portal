import { useState } from "react";
import { ComplianceAuditPanel } from "../../components/compliance/ComplianceAuditPanel";
import { ComplianceCategoryPanel } from "../../components/compliance/ComplianceCategoryPanel";
import { ComplianceExpiryQueuePanel } from "../../components/compliance/ComplianceExpiryQueuePanel";
import { ComplianceReportPanel } from "../../components/compliance/ComplianceReportPanel";
import { ComplianceRulesPanel } from "../../components/compliance/ComplianceRulesPanel";
import { MissingDocumentsPanel } from "../../components/workflow/MissingDocumentsPanel";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { portalService } from "../../services/portalData";

export function ClientComplianceCentrePage() {
  const data = portalService.getClientComplianceCentre();
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => setMessage("Compliance report prepared for download.")}>
              Download compliance report
            </Button>
            <Button variant="secondary">Secure file storage</Button>
          </>
        }
        description="Compliance tracking comes first in this MVP: expiry dates, renewal reminders, required document status, audit history, and secure storage controls without direct SARS integration."
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

      <section className="grid gap-6 xl:grid-cols-3">
        <ComplianceExpiryQueuePanel
          description="Expired records stay visible, are never deleted automatically, and require a new version upload."
          items={data.expiredDocuments}
          title="Expired Documents"
        />
        <ComplianceExpiryQueuePanel
          description="These records will trigger 30, 14, 7 day, and expiry reminders."
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
            onDownload={() => setMessage("Compliance report prepared for download.")}
          />
          <ComplianceRulesPanel
            description="The secure controls below are designed to keep personal and financial records protected and traceable."
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
