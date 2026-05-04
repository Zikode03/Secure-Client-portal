import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { ExpiringDocumentsPanel } from "../../components/workflow/ExpiringDocumentsPanel";
import { MissingDocumentsPanel } from "../../components/workflow/MissingDocumentsPanel";
import { RejectedDocumentsPanel } from "../../components/workflow/RejectedDocumentsPanel";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AccountantComplianceExceptionsPage() {
  const portal = usePortal();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => navigate("/accountant/compliance")} variant="secondary">
            Open compliance centre
          </Button>
        }
        description="This page isolates expiring, expired, rejected, and missing records that can block submission, filing, or broader compliance readiness."
        eyebrow="Accountant compliance exceptions"
        title="Exception queue"
      />

      <section className="grid gap-6 xl:grid-cols-3">
        <MissingDocumentsPanel items={portal.accountantDashboard.missingDocuments} />
        <ExpiringDocumentsPanel items={portal.accountantDashboard.expiringDocuments} />
        <RejectedDocumentsPanel items={portal.accountantDashboard.rejectedDocuments} />
      </section>

      <SurfaceCard className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">How to work this queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Exceptions should end in an action, not just a warning badge.
          </p>
        </div>
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Open the client workspace when a required monthly pack item is missing.</li>
          <li>Send a follow-up request when the client still needs to act.</li>
          <li>Open the review desk when the record is already uploaded but not yet resolved.</li>
          <li>Keep expired documents visible and request a renewed version instead of deleting the old one.</li>
        </ul>
      </SurfaceCard>
    </div>
  );
}
