# Historical document importing

Administrators and assigned accountants use **Import Clients & Documents → Documents** (accountants: **Import documents**).

1. Select a ZIP, multiple files or a folder. Folder/multiple-file selections are bundled locally into store-only ZIP requests; no external AI service is involved.
2. Staging remains private. Folder/filename patterns suggest numeric year/month and document type; these suggestions are not verified accounting facts. Unknown periods remain unresolved. Content OCR is not performed by this archive importer.
3. Check the month summary. Choose the client once and apply bulk details, preserving suggestions unless a month/type override is explicitly selected. Individual corrections and exclusions remain available.
4. Choose **Needs accountant review** or **Previously reviewed and filed**. Historical filing requires current review permission, explicit confirmation, and either a previous reviewer or notes explaining unavailable details. The prior date is optional and never invented. Individual rows can carry different historical status.
5. Resolve validation errors and duplicate warnings, review the final summary and approve. Metadata skipped from staging is reported and included in the downloadable report.

Archive documents needing review enter the review queue; they are not accepted or filed. Historical filings are labelled separately and carry an immutable audit attestation with the confirming user, source, original reviewer/date where supplied, notes and confirmation time. They do not fabricate a review decision performed in Secure Client. Provenance is restored from the audit when records are loaded. No historical checklist or overdue reminder is created automatically.

Limits: 2,000 documents per import, 20 MB per document, ZIP up to 250 MB and extracted content up to 500 MB. Folder selections are split into requests below 240 MB; selections larger than 500 MB should be split by year. Nested archives, unsafe paths, unsupported executable files and unreadable/encrypted ZIP files are rejected. JSON manifests and macOS archive metadata are reported separately. Existing closed periods accept only explicitly confirmed historical filings, without reopening or changing their checklist.

Retry: staged archive request IDs are idempotent; a failed archive request cleans up newly staged storage. Completed staging remains in import history. Keep the page open while preparing/uploading; this version does not run resumable background uploads after closing the browser.

Verification: full frontend suite 460 tests; full backend suite 386 tests; frontend build and generated OpenAPI checks. A browser-created ZIP was independently read and CRC-checked with Python zipfile. The user's Ubuntu archive structure was inspected read-only; no archive was imported into the live database by the implementation work. No browser controls were used.

The financial archive update adds monthly, annual, permanent and uncertain-period sections to bulk and individual import corrections. Non-monthly records no longer require an invented month. See `financial-archive.md` for the database migration and updated navigation.
