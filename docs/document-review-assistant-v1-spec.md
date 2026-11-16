# Secure Client Document Review Assistant V1 - implementation specification

Status: invoice-focused V1 implemented in the frontend and backend repositories. Operational verification and accuracy limits are recorded below.
Repository review date: 13 November 2026 (Africa/Johannesburg).

## Delivered implementation on 13 November 2026

- The accountant Work Queue now opens the invoice assistant with the original document, editable details, source highlights, server-generated findings, review explanations and correction history. An imported supporting invoice can enter this workspace through **Documents → Review invoice**.
- On-device JPG/PNG OCR reads supplier, number, date, invoice total, amount due, subtotal and VAT. Original suggestions and evidence are retained with the saved correction. PDFs and other uploaded formats support manual review. Automatic reading has English/ZAR scope with explicit handling of another stated currency.
- Backend checks cover recorded/missing fields, future dates, reporting months, possible same-client duplicates and qualified decimal totals. Missing or unconfirmed figures produce **Unable to verify**. Warnings require original-document confirmation and a saved explanation before acceptance.
- The delivered API consolidates extraction/correction/recheck and finding acknowledgement into `GET /api/documents/{documentId}/invoice-review` and `POST /api/documents/{documentId}/invoice-review/corrections`, followed by the existing document review endpoint with the expected file/review version. Acknowledgements preserve the original findings in versioned snapshots.
- `AppInvoiceReviewSnapshots`, document concurrency fields and version-bound `ReviewDecision` columns are provided by `20261113083446_InvoiceReviewAssistant`. Existing stored documents retain their legacy metadata and history. The migration was exercised on disposable SQL databases, without manually applying it to the project's live database in this task.
- Invoice metadata/status mutation paths are guarded. Review decisions, document/slot/pack transitions and audit writes share a transaction. Snapshot and decision inserts follow the document update to avoid a concurrent-save foreign-key lock deadlock. Two simultaneous saves retain one revision and report a conflict for the stale writer.
- Local OCR was exercised against an isolated generated invoice image, with all seven expected values and seven source-line regions found. This is a regression check on that example. Accuracy on a representative collection of real firm documents remains to be measured.
- Authenticated live-browser verification and real-firm accuracy evaluation remain outstanding. Automated component/rule tests and real SQL rollback, concurrency and filing checks cover the delivered code paths.

The detailed design below includes follow-up ideas beyond the delivered V1. Separate analysis-run/disposition endpoints, per-field reviewer identities, automated PDF/multipage/bulk reading, historical prior-review attestations and a real-document accuracy dashboard remain follow-up work. The delivered model stores append-only combined review snapshots with actor, original suggestions, evidence, findings and explanation.

## 1. Product decision

Build an invoice review assistant inside the existing document workflow. Use the existing locally hosted Tesseract.js engine and deterministic backend checks. No external AI/OCR provider, model training, bank integration or accounting-ledger posting is required.

The assistant supplies evidence and questions for an accountant. It does not certify authenticity, prove business ownership, establish prior review, determine tax deductibility, or approve/file a document automatically.

### Verified starting point

| Capability | Repository evidence | Implementation consequence |
| --- | --- | --- |
| On-device English JPG/PNG OCR; four editable fields | `src/services/invoiceScanner.ts`, `src/components/workflow/InvoicePhotoDetails.tsx` | Extend these; do not build a second scanner. Current returned result discards OCR source locations and confidence. |
| Invoice metadata confirmation and same-client duplicate warnings | Frontend scanner helpers; backend `InvoiceScanDetails.cs` and `DocumentCommandService.UploadAsync` | Reuse existing checks. Metadata matching and duplicate overrides already exist; structured persistent findings do not. |
| Current invoice metadata stored on `Document.InvoiceDetailsJson` | Backend `Document.cs`, `20261111075508_InvoiceScanDetails` | Keep backward compatibility. Add version-bound snapshots instead of expanding this legacy JSON indefinitely. |
| Review workspace with genuine file preview, decisions and comments | `AccountantReviewPage.tsx`, backend `ReviewQueueService.cs` | Add a panel in the existing workspace, not another navigation module. |
| Accept/reject/reupload lifecycle and ordinary audit history | Backend `DocumentLifecycleService.cs`, `DocumentReviewPolicy.cs` | Extend the existing decision flow. Structured field corrections and finding acknowledgements are new work. |
| Client packs, requirement submission and separate filing register | Monthly Pack APIs; `LiveFilingRegister.tsx` | Assistant completion must not submit a slot, satisfy a requirement, close a month or file a document. |
| Historical import staging | `AdminMigrationPage.tsx`, backend `DataMigrationService.cs` | Unconfirmed imports stay private. Imported files remain uploaded until explicitly submitted for review. |

Important current gaps verified in code:

- `ReviewDecision` references a document, but does not record the document version or assistant snapshot reviewed.
- The review queue includes submitted/under-review slots and under-review supporting documents. An imported supporting document in uploaded state does not automatically appear there.
- The normal lifecycle writes document/decision changes before a separate audit write. Acceptance and its audit must become atomic for the assistant workflow.
- Legacy create/update/status routes exist. They must be checked for ways to bypass any new acceptance/filing guard; hiding a frontend button is insufficient.

## 2. V1 scope

Include:

- Invoice images in JPG/PNG, English text, ZAR amounts, one invoice per file.
- Original image beside editable fields and review findings.
- Optional manual entry for uploaded PDFs and other normally permitted files; show an explicit automatic-reading limitation.
- Missing/uncertain-field checks, same-client duplicate checks, reporting-month warnings, and qualified calculation checks.
- Accountant corrections, finding dispositions, manual-review fallback and version-specific decision history.
- Existing assigned-accountant/admin access, normal request-for-correction workflow and ordinary filing.

Do not silently apply invoice rules to receipts, statements or credit notes. Those file types remain uploadable through existing flows, with assistant coverage labelled unsupported until their own rule sets exist. Automated PDF reading, PDF-coordinate overlays, multipage invoice extraction, batch OCR and historical prior-review filing are separate follow-up work. File types accepted by upload and file types automatically readable are deliberately different capabilities, explained in plain language.

V1 is not a completeness detector: it cannot know which invoices were never supplied.

## 3. User experience and integration

### Client upload and Monthly Packs

1. The user uploads into the existing client/month/requirement context, or as a supporting document.
2. For supported invoice images, offer **Read invoice details** with progress and Cancel. OCR stays on-device and uses same-origin worker/WASM/language assets.
3. Show suggestions next to the original. Missing or uncertain values stay blank or clearly unconfirmed. Distinguish the invoice total from amount still due.
4. The uploader may confirm metadata, but that is not accountant approval. Existing explicit requirement submission remains unchanged.
5. A failed/cancelled/unsupported scan permits an ordinary upload. Do not invent findings or block the whole document collection workflow.

### Accountant review

Use the existing review workspace. On desktop: original on the left, **Invoice details** and **Checks** on the right. On small screens: document/details tabs with persistent access to the decision controls. Use the system's quiet white/neutral surfaces and small status indicators.

- Click a field or finding to highlight the associated original-image region. Preserve zoom and aspect-ratio alignment. If no evidence region is available, say **Location unavailable**; never fabricate a highlight.
- Fields show extracted value, current value, and whether an accountant has confirmed/corrected them.
- Show counts of checks performed, needing attention and unable to verify. Never use **Verified correct**, a global accuracy percentage or a green badge merely because the findings list is empty.
- Provide **Save corrections and recheck**, **Request a corrected document**, and the existing **Accept document** action. Saving details does not accept a document.
- Warnings need either a correction/recheck or an explicit acknowledgement with a reason. The warning itself remains in history; acknowledgement must not relabel a failing rule as passed.
- OCR unavailable/failed/not run permits **Complete manual review**, requiring confirmation against the original and a reason for unavailable checks. This is an accountant action, not a silent fallback to success.
- Concurrent changes produce a refresh/conflict message and preserve unsaved edits until the reviewer explicitly discards them.

### Imported records, queue and filing

After import ownership is approved, an authorised accountant can explicitly **Send for review** an uploaded supporting invoice. Reuse the under-review lifecycle with version validation and audit; do not automatically submit imported records. Add a suitable link/action from the client's Documents view so historical files do not become invisible to the review workflow.

Historical originals must remain available for ordinary manual review even if the assistant is unsupported. Previously reviewed records need a separate future prior-review attestation, not a scanner result. Do not add an automatic historical-filing switch as part of this feature.

Acceptance updates an existing requirement/pack only through the existing lifecycle. Supporting invoices without slots must not create or satisfy required slots. Accepted and filed remain separate states. The assistant itself never files; existing explicit/configured filing may operate only after an authorised decision for the current version and normal filing checks.

## 4. Data contract

Use typed DTOs in Application.Contracts. Persist append-only, server-assigned snapshots; avoid a single mutable verdict on `Document`.

| Record | Required information |
| --- | --- |
| `InvoiceExtractionRevision` | ID, document ID, document-version ID, server revision, schema version, actor/time, origin (`uploader_suggestion`, `accountant_correction`, `legacy_metadata`), engine/version as reported, original suggestions, current field values and evidence references, previous revision ID. |
| `InvoiceAnalysisRun` | ID, document/version/revision IDs, rule-set version, evaluated reporting period, server start/completion time, run state, checks attempted, findings and same-client duplicate evidence references. |
| `InvoiceFindingDisposition` | Finding/run ID, actor/time, acknowledgement/manual-review reason, expected revision. Original findings remain immutable. Corrections create a new revision and run. |
| Review-decision extension | Reviewed document-version ID, analysis ID/revision if present, manual-review mode/reason, actor/time, link to existing `ReviewDecision` and audit. Backfill old rows as unspecified legacy provenance, not as assistant-reviewed. |

Proposed field set:

- `supplierName`, `invoiceNumber`, `invoiceDate` (ISO calendar date), `currency`.
- `invoiceTotal`, `amountDue`, `subtotal`, `vatAmount` as separate nullable decimal strings; never infer one from another.
- `calculationBasis`: `subtotal_plus_vat_and_adjustments` or `unsupported_or_unclear`.
- `adjustments`: labelled signed decimal amounts, with explicit confirmation they are not already included in the subtotal.
- `allAdjustmentsAccountedFor`: an explicit human confirmation, not an OCR inference or default true.
- Per-field provenance: suggested/corrected value, source kind, optional OCR score, accountant-confirmed flag, optional evidence regions and ambiguity reason.

Evidence region: `pageIndex`, original image dimensions, normalized `x/y/width/height` in [0,1], source text excerpt, coordinate-space/schema version. Validate bounds and excerpt lengths. Keep the original file authoritative. Scores are uncalibrated OCR indicators, not probabilities that a field is correct. Client-provided coordinates and engine metadata are labelled submitted evidence, not server-verified facts.

Processing states: `not_started`, `running`, `completed`, `unsupported`, `failed`, `cancelled`. Currentness is calculated separately: new file version, metadata revision, reporting context or rule set makes a previous run stale. A network interruption must not leave a run permanently running; client-local OCR status is not persisted as a durable server job.

Check-result states, always separate from processing/lifecycle states:

- `no_issue_detected`: this particular implemented check ran successfully on suitable inputs.
- `needs_attention`: a potential problem was identified.
- `unable_to_verify`: required inputs, evidence or supported scope are missing/uncertain.

Each finding includes a stable rule ID, result, plain-language message, relevant field/evidence IDs, evaluated inputs and optional expected/observed amounts. Only same-client, authorised duplicate IDs/details may be returned.

## 5. Rules and arithmetic

| Rule ID | Behaviour |
| --- | --- |
| `invoice.required_fields` | Assess supplier, invoice identifier, invoice date, currency and invoice total separately. A missing identifier on an invoice needs attention; absence must not become an authenticity/tax-compliance verdict. Partially readable/missing source evidence is unable to verify. |
| `invoice.date_validity` | Reject impossible dates. Treat conflicting/ambiguous dates as unable to verify until explicitly resolved. A future date is an advisory warning using the server's South Africa business date. |
| `invoice.reporting_period` | Compare the confirmed invoice date against the server-resolved pack month. A difference needs attention and may be acknowledged with a legitimate allocation explanation. It is not proof the accounting period is wrong. |
| `invoice.possible_duplicate` | Reuse same-client metadata comparisons and file fingerprints. Exact content match is strong repeated-file evidence; metadata matches remain possible duplicates. Exclude the current document/its historical versions as competing invoices. Name which fields match. Never auto-delete, auto-merge or disclose another client's records. |
| `invoice.total_consistency` | Run only with confirmed calculation basis, ZAR, suitable complete figures, all adjustments accounted for and invoice total clearly distinguished from amount due. Otherwise unable to verify. |
| `invoice.source_coverage` | Explicitly identify absent source regions, unsupported file/language/type, partial OCR or failure. These must not produce a passed calculation check. |

For the qualified total check:

```text
expected total = subtotal + VAT amount + sum(signed adjustments)
difference = observed invoice total - expected total
```

Use .NET decimal arithmetic on the server. Accept canonical invariant-culture decimal strings, at most two decimal places for V1 ZAR figures, with explicit bounds and checked arithmetic. No binary floating-point comparisons. Do not infer missing VAT as zero, apply a fixed VAT rate, assume absent adjustments are zero, or evaluate an amount-due figure as an invoice total. The document's subtotal/tax/adjustment basis must agree with the stated equation; otherwise mark unsupported.

Proposed V1 comparison tolerance: R0.01 inclusive, recorded in the rule-set version and shown in findings. This is a rounding tolerance, not permission to accept material errors. Unclear line-level/tax-inclusive/discount structures stay unable to verify. A successful arithmetic check proves only that the specified extracted figures reconcile.

Example wording: **Possible total mismatch.** The confirmed subtotal and VAT add up to R1,150.00; the invoice total is R1,250.00. Check the original for additional adjustments or extraction errors. Examples belong only in tests/documentation, not runtime seeded invoices.

## 6. Frontend work

Extend or introduce these focused modules:

- `invoiceScanner.ts`: return structured extraction with evidence/ambiguity, preserve existing four-field adapters, distinguish total vs amount due, do not interpret progress as confidence.
- `InvoicePhotoDetails.tsx` / `DocumentUploadModal.tsx`: preserve existing optional scanning, cancellation and upload confirmation; add structured extraction attachment after versioned upload succeeds.
- `InvoiceReviewPanel.tsx`: typed current fields, checks, dispositions and accessible error/conflict states; independent from document acceptance state.
- `InvoiceEvidenceViewer.tsx`: same-origin authenticated image/blob preview with aligned region overlays and keyboard/text alternatives. Revoke object URLs on file change/unmount/logout; do not store files/OCR in browser persistence.
- `invoiceReviewApi.ts`: generated OpenAPI client only, using the existing trusted-origin/session/CSRF transport.
- `AccountantReviewPage.tsx`: load the selected analysis/details after workspace selection; display only summary counts in the queue. No file downloads/OCR for every queue row and no global `/api/documents` request for each keystroke.
- Monthly Pack/supporting-document actions and client document list: connect existing submission/review access. `LiveFilingRegister` shows current filed records; optionally expose a read-only review provenance link without embedding private findings in client responses.

Client-local scanning runs one file at a time by default, with cancellation, timeout and no status promises after the browser is closed. Bulk imports remain available without automatic bulk OCR. Upload success and analysis success are independent; failed evidence submission can be retried without uploading the original twice.

## 7. Backend and OpenAPI changes

Proposed endpoints, not currently implemented:

| Method and route | Purpose / permission |
| --- | --- |
| `GET /api/documents/{documentId}/invoice-review` | Current version/fields/checks/history summary; assigned accountant or authorised administrator only. Return a typed `not_started` envelope if no analysis exists. |
| `POST /api/documents/{documentId}/invoice-review/extractions` | Attach a bounded typed extraction snapshot to the server-verified current version. Uploader may submit suggestions only when authorised to that document and still in the permitted draft/upload phase; no client mutation of submitted/accepted/filed evidence. Staff may attach staff-generated suggestions. |
| `POST /api/documents/{documentId}/invoice-review/corrections` | Append accountant corrections and run deterministic checks in one operation; assigned accountant/admin only. |
| `POST /api/documents/{documentId}/invoice-review/checks` | Run/re-run server checks against the specified current revision and server-resolved context; assigned accountant/admin only. |
| `POST /api/documents/{documentId}/invoice-review/findings/{findingId}/acknowledgements` | Acknowledge a current finding with reason; assigned accountant/admin only. Cannot acknowledge another document/run/version's finding. |

All writes carry `requestId`, expected document-version ID and expected metadata revision; corrections/acknowledgements also identify the analysis run they are based on. Client supplies evidence/values, never authoritative findings, permissions or acceptance status. Scope document/version/finding lookups through authorised client IDs before returning anything. Review eligibility of admin roles follows the existing backend policy definitions, not a frontend role string alone.

Responses use explicit typed 200/201 DTOs. Include 400 field validation, 401/403 auth/scope, 404 absent/inaccessible according to the existing disclosure policy, 409 stale version/revision or conflicting idempotency payload, and 413 oversized input. Mutations retain cookie/CSRF protection. No-store responses; no raw OCR, financial values or access tokens in general logs.

Extend the existing review request with optional version/snapshot/manual-review context, then route all assistant-enabled acceptance paths through one application/domain guard. Cover `/api/documents/{id}/review`, `/status`, metadata update, review-queue aliases, slot approve endpoints and any create/file route that can set lifecycle state. Existing direct entity metadata updates must not bypass required review evidence.

An acceptance operation must atomically validate the current document version, save corrections/findings/dispositions as applicable, record `ReviewDecision`, update document/slot/pack state, and write audit. Notification/reupload effects follow successful persistence with the existing delivery mechanisms and explicit retry/idempotency semantics; do not send success notifications before commit. Strengthen concurrency on relevant document/slot rows rather than relying solely on the new sidecar tables.

Add a shared review-evidence guard used by acceptance and filing. Unresolved findings require resolution or a recorded authorised manual review/acknowledgement; unsupported scanning must never deadlock legitimate manual review. Merely omitting an analysis ID must not bypass this guard for an assistant-enabled invoice. Non-invoice workflows remain available under their existing rules.

Introduce additive EF migrations for the new snapshot/run/disposition tables and version-aware decision links. Existing documents/review history remain usable; missing old metadata is explicitly legacy/not checked. Never fabricate prior reviewer identities, dates, successful checks or missing scan history during migration.

After DTO/controller changes, regenerate source response metadata, backend/frontend OpenAPI snapshots and frontend TypeScript. Check generation and contract tests; use no invented schema casts. Keep new routes in the existing documents module. No new bank provider or external AI dependency.

## 8. Accuracy evaluation and release gates

Keep two test tracks separate:

1. Engineering tests with isolated fixtures verify code, permissions, arithmetic, concurrency and lifecycle behaviour. These are not evidence of real-world OCR accuracy and must not create product demo data.
2. An appropriately authorised, accountant-labelled invoice evaluation collection measures performance. Include clear/poor images, different suppliers/layouts, zero-rated/exempt-looking presentations without asserting tax status, discounts/charges, ambiguous dates, duplicate photos and unfamiliar layouts. Labels require checked values and expected findings. Keep a holdout collection separate from parser/rule tuning.

Measure field exact-match rates, abstention/unable-to-verify coverage, false warnings, missed labelled problems and correction time. Report results per field/layout/image quality, not one blanket accuracy percentage. Do not invent sample-size guarantees or promise an accuracy target before a baseline exists. Agree critical-field/error budgets with the firm after the baseline; version the collection, engine and rules and rerun on upgrades. Reviewer corrections do not automatically train anything or grant reuse permission.

Required automated acceptance cases:

- Uploader confirmation cannot accept/file a document; another client's analysis/duplicate/evidence cannot be read or altered.
- Supported and unsupported file states, failed/cancelled scan, leading-zero invoice numbers, ambiguous dates and separator/currency ambiguity behave explicitly.
- R1,000 + R150 vs R1,250 produces a conditional mismatch only with qualified inputs; discount/charge cases reconcile; unknown figures/basis produce unable to verify; cent tolerance/overflow are tested.
- Highlight positions remain aligned under zoom/rotation/display resizing; unavailable coordinates render a truthful fallback.
- Correction appends history and rechecks; stale file/version/period/revision invalidates prior findings and acknowledgements; a new upload cannot inherit an old approval.
- Two reviewers editing/accepting concurrently cannot silently overwrite each other; retrying a request does not duplicate findings, decisions, audit or request notifications.
- Forced audit/storage/save failure rolls back decision and document/slot/pack updates in a disposable real SQL database.
- Slot and review-queue aliases cannot bypass the acceptance guard; supporting imported invoices can enter review explicitly without satisfying monthly requirements.
- Filing is limited to a valid current-version accepted decision or separately authorised future historical attestation. No auto-accept from a passed assistant check.
- Old files, null `InvoiceDetailsJson`, ordinary uploads, manual review and current filing-register access still work.

Browser verification must exercise actual authenticated upload -> stored version -> extraction/check API -> accountant correction -> decision -> filing-register result, including a real failure/conflict path. Passing mocked component tests alone does not establish the full flow or OCR accuracy.

## 9. Delivery sequence

1. Add typed models/contracts, pure checking rules and rule tests. Establish a version-specific review guard and atomic audit/decision persistence before exposing assistant-driven acceptance.
2. Add evidence extraction and image highlighting, preserving the optional scanner/manual upload path.
3. Add the existing-workspace review panel, corrections/acknowledgements, manual fallback and explicit imported-document review entry.
4. Regenerate OpenAPI; verify database migration, all lifecycle entry points, frontend/backend regressions and authenticated end-to-end paths.
5. Evaluate accountant-labelled holdout invoices, publish scoped metrics and agree a pilot release gate. Release the invoice feature gradually; do not label it proven accurate before this evidence exists.

Acceptance of this specification does not imply implementation, deployment, production migration or an accuracy claim. Future PDF automation, bulk OCR and prior-review historical filing each need their own scoped implementation and validation.
