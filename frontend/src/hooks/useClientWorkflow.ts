import { useMemo, useState } from "react";
import { usePortal } from "../app/portal";
import type { Role, Tone, UploadSubmission } from "../types/portal";

interface ClientWorkflowOptions {
  clientId?: string;
  clientName?: string;
  uploadedBy?: string;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

export function useClientWorkflow(options: ClientWorkflowOptions = {}) {
  const portal = usePortal();
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  const workflowClientName = options.clientName?.trim() || portal.clientProfile.legalName;
  const workflowActorName = options.uploadedBy?.trim() || portal.clientProfile.primaryContact;

  const workflow = useMemo(
    () => ({
      ...portal.clientWorkflow,
      feedbackNotice,
    }),
    [feedbackNotice, portal.clientWorkflow],
  );

  function showFeedbackNotice(tone: Tone, title: string, message: string) {
    setFeedbackNotice({ tone, title, message });
  }

  function dismissFeedbackNotice() {
    setFeedbackNotice(null);
  }

  function uploadToSlot(submission: UploadSubmission) {
    const result = portal.uploadToSlot(submission, {
      fullName: workflowActorName,
      name: workflowActorName,
    });
    showFeedbackNotice(
      result.ok ? "success" : "danger",
      result.ok ? "Upload updated" : "Upload blocked",
      result.message,
    );
  }

  function submitMonth() {
    const result = portal.submitMonth(workflowActorName);
    showFeedbackNotice(
      result.ok ? "success" : "warning",
      result.ok ? "Monthly pack submitted" : "Submission blocked",
      result.message,
    );
  }

  function finaliseInvoice(invoiceId: string) {
    const result = portal.finaliseInvoice(invoiceId);
    showFeedbackNotice(
      result.ok ? "success" : "danger",
      result.ok ? "Invoice finalised" : "Invoice update failed",
      result.message,
    );
  }

  function replyToRequest(requestId: string, role: Role, author: string, message: string) {
    const result = portal.addRequestComment(requestId, author, role, message);
    showFeedbackNotice(
      result.ok ? "success" : "danger",
      result.ok ? "Reply added" : "Reply blocked",
      result.message,
    );
    return result;
  }

  function resolveRequest(requestId: string) {
    const result = portal.resolveRequest(requestId, workflowActorName);
    showFeedbackNotice(
      result.ok ? "success" : "danger",
      result.ok ? "Request resolved" : "Resolution failed",
      result.message,
    );
    return result;
  }

  function triggerView(recordName: string) {
    showFeedbackNotice("info", "Preview opened", `Preview opened for ${recordName}.`);
  }

  function triggerDownload(recordName: string) {
    showFeedbackNotice("info", "Download prepared", `Download prepared for ${recordName}.`);
  }

  return {
    ...workflow,
    clientName: workflowClientName,
    uploadToSlot,
    submitMonth,
    finaliseInvoice,
    replyToRequest,
    resolveRequest,
    triggerView,
    triggerDownload,
    showFeedbackNotice,
    dismissFeedbackNotice,
  };
}
