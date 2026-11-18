/** Shared definitions for client collection readiness and accountant approval. */
export function checklistSummary(slots: ReadonlyArray<{isRequired: boolean; status: string}>) {
  const required=slots.filter(slot=>slot.isRequired&&slot.status!=="not_applicable");
  const received=new Set(["draft","uploaded","submitted","under_review","accepted","approved","filed"]);
  const approved=new Set(["accepted","approved","filed"]);
  const approvedCount=required.filter(slot=>approved.has(slot.status)).length;
  return {totalCount:required.length,approvedCount,receivedCount:required.filter(slot=>received.has(slot.status)).length,
    missingCount:required.filter(slot=>["missing","not_started"].includes(slot.status)).length,
    correctionCount:required.filter(slot=>["rejected","reupload_required"].includes(slot.status)).length,
    submissionReady:required.length>0&&required.every(slot=>received.has(slot.status)),
    progressPercent:required.length?Math.round(approvedCount/required.length*100):0};
}
