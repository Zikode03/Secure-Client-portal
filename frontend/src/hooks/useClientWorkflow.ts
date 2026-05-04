import { useMemo, useState } from "react";
import { usePortal } from "../app/portal";
import type { UploadSubmission } from "../types/portal";

interface ClientWorkflowOptions {
  clientId?: string;
  clientName?: string;
  uploadedBy?: string;
}

export function useClientWorkflow(options: ClientWorkflowOptions = {}) {
  const portal = usePortal();
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const workflowClientName = options.clientName?.trim() || portal.clientProfile.legalName;
  const workflowActorName = options.uploadedBy?.trim() || portal.clientProfile.primaryContact;

  const workflow = useMemo(
    () => ({
      ...portal.clientWorkflow,
      feedbackMessage,
    }),
    [feedbackMessage, portal.clientWorkflow],
  );

  function uploadToSlot(submission: UploadSubmission) {
    const result = portal.uploadToSlot(submission, {
      fullName: workflowActorName,
      name: workflowActorName,
    });
    setFeedbackMessage(result.message);
  }

  function submitMonth() {
    const result = portal.submitMonth(workflowActorName);
    setFeedbackMessage(result.message);
  }

  function finaliseInvoice(invoiceId: string) {
    const result = portal.finaliseInvoice(invoiceId);
    setFeedbackMessage(result.message);
  }

  function triggerView(recordName: string) {
    setFeedbackMessage(`Preview opened for ${recordName}.`);
  }

  function triggerDownload(recordName: string) {
    setFeedbackMessage(`Download prepared for ${recordName}.`);
  }

  return {
    ...workflow,
    clientName: workflowClientName,
    uploadToSlot,
    submitMonth,
    finaliseInvoice,
    triggerView,
    triggerDownload,
    setFeedbackMessage,
  };
}
