# Document Review Assistant V2

## Delivered

- **Local multipage PDF reading:** embedded text first; local Tesseract OCR for pages with little readable text. PDF.js, its compatible worker and OCR assets are served by the application. No external AI service receives documents.
- **Bulk reading in Work Queue:** scan up to 50 invoices in the current filters, with per-file progress, cancellation, failure reporting and retry. A failed file does not stop the batch. The process runs sequentially to bound browser memory. Leaving the page cancels active reading. A save already sent may finish.
- **Review protection:** bulk reading skips any document with an existing saved review. Saves use the current file version and review revision. A prepared request stays in memory for idempotent retry if its response is lost. Nothing is automatically confirmed, accepted or filed.
- **Saved-findings filters:** not read, needs attention, unable to verify, no issue detected and recheck needed. Queue summaries use one scoped database query for saved snapshots, without downloading or scanning files. Opening a document recomputes current checks and duplicates. Saved summaries are prioritisation aids, not approval decisions.
- **PDF source highlighting:** source regions carry a zero-based page index. Selecting a supported field opens the original page with its highlight, page navigation and zoom. Unsupported locations and unusual text rotations remain manual; rendering failure falls back to the original PDF without an invented highlight.
- **Line-item checks:** editable quantity, unit price, discount amount and net total, with immutable review history. Strictly labelled net-column tables can supply suggestions. Percentage discounts, tax-inclusive or ambiguous layouts remain manual. The accountant must confirm every row and its before-VAT basis before calculations run.

## Calculation and compatibility rules

The server uses decimal arithmetic, quantities and unit prices with up to four decimal places, two-decimal currency amounts, explicit zero discounts, line-total rounding away from zero and R0.01 reconciliation tolerance. It checks quantity × unit price − discount against each net total, then reconciles recorded net totals against subtotal. Existing invoice-level checks cover VAT and signed adjustments.

Missing data yields **Unable to verify**. A mismatch yields **Needs attention**. These findings do not independently establish that an invoice is incorrect. Unsupported cases require the existing accountant explanation and approval process.

The rule version is `invoice-v2.0`; older saved analyses require rechecking. Existing JSON snapshots remain readable, with old source regions defaulting to page zero. Legacy requests without line-item data remain compatible. No additional database migration is needed beyond the V1 assistant migration.

Automatic PDF reading supports one invoice per file, up to 20 pages and 25 MB. Distinct detected invoice numbers in one PDF cause a manual-review/split-file prompt. Repeated identical continuation totals are deduplicated; conflicting totals stay unresolved. Invoice line editing supports up to 100 rows.

## Verification

- Full frontend suite: 355 tests passed, followed by two additional batch UI tests and a 37-test targeted V2 regression run.
- Full backend suite: 280 tests passed.
- TypeScript, production build and OpenAPI consistency/generation guard passed; 197 operations remain aligned.
- Actual generated two-page PDF passed extraction of seven invoice fields and page-aware source coordinates using the application scanner and real PDF.js implementation. This exposed a compatibility issue in the modern PDF build; the compatible build and matching worker are now used.
- Disposable SQL verification passed migrations, snapshot/audit rollback, V2 line-item and source-page persistence, version-bound acceptance, filing and simultaneous-review conflict protection. The project database was preserved.

## Release validation still needed

Live authenticated browser verification and measured accuracy against authorised accountant-reviewed invoices remain outstanding. Automated tests and generated fixtures do not establish real-firm OCR accuracy. Record field accuracy, false warnings and missed issues on a representative set before treating the assistant as a dependable review aid.

Rebuild/restart the API and reload the frontend to use the updated contracts and screens.
