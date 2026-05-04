import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { DocumentUploadModal } from "../../components/workflow/DocumentUploadModal";
import { MissingDocumentsPanel } from "../../components/workflow/MissingDocumentsPanel";
import { MonthlyPackChecklist } from "../../components/workflow/MonthlyPackChecklist";
import { RequestBoard } from "../../components/workflow/RequestBoard";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useClientWorkflow } from "../../hooks/useClientWorkflow";
import type { MonthlyDocumentSlot } from "../../types/portal";

export function ClientMonthlyPacksPage() {
  const { user } = useAuth();
  const uploadModal = useDisclosure(false);
  const [selectedSlot, setSelectedSlot] = useState<MonthlyDocumentSlot | null>(null);
  const {
    feedbackMessage,
    missingRequiredDocuments,
    monthPack,
    requests,
    setFeedbackMessage,
    submitMonth,
    uploadToSlot,
  } = useClientWorkflow({
    clientId: user?.clientIds[0],
    clientName: user?.company,
    uploadedBy: user?.fullName ?? user?.name,
  });

  const highlightedSlot = useMemo(
    () =>
      monthPack.slots.find(
        (slot) =>
          slot.isRequired &&
          !["uploaded", "under_review", "accepted"].includes(slot.status),
      ) ?? monthPack.slots[0],
    [monthPack.slots],
  );

  function handleOpenUpload(slot: MonthlyDocumentSlot) {
    setSelectedSlot(slot);
    uploadModal.open();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => handleOpenUpload(highlightedSlot)}>Upload into slot</Button>
            <Button disabled={!monthPack.canComplete} onClick={submitMonth} variant="secondary">
              Submit month
            </Button>
          </>
        }
        description="This page is the controlled monthly pack. Required documents, due dates, owners, and review state all stay visible before the month can be submitted."
        eyebrow="Client monthly packs"
        title={monthPack.monthLabel}
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <MonthlyPackChecklist
          onSubmitMonth={submitMonth}
          onUpload={handleOpenUpload}
          pack={monthPack}
        />

        <div className="space-y-6">
          <MissingDocumentsPanel items={missingRequiredDocuments} onUpload={(slotId) => {
            const slot = monthPack.slots.find((item) => item.id === slotId);
            if (slot) {
              handleOpenUpload(slot);
            }
          }} />

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Month submission control</h2>
              <p className="mt-1 text-sm text-slate-500">
                A month only moves forward once required documents are uploaded and not rejected.
              </p>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li>Required items block submission when they are missing, partial, pending, or rejected.</li>
              <li>Accepted documents stay locked, but corrected versions can still be uploaded as a new workflow version.</li>
              <li>Expired compliance records stay visible and are never deleted automatically.</li>
            </ul>
          </SurfaceCard>
        </div>
      </section>

      <RequestBoard
        description="Open requests stay tied to the month pack so clients know exactly what is still blocking completion."
        onOpenRequest={(request) =>
          setFeedbackMessage(`Open request "${request.title}" from the Requests page to reply.`)
        }
        requests={requests}
        title="Pack follow-up requests"
      />

      <DocumentUploadModal
        clientName={user?.company ?? "Apex Trading Ltd"}
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUploaded={uploadToSlot}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
