# Import Clients & Documents

Administrators open **Management → Import Clients & Documents** (`/firm/admin/migration`). This uses the real authenticated backend and durable SQL staging. It contains no sample imports.

## Workflow

1. Choose **Import a client list** or **Import client documents**. Each follows **Upload → Check details → Confirm**. Imports are named automatically unless an optional name is provided.
2. For clients, download the empty template and choose an Excel `.xlsx` or UTF-8 CSV file. The upload opens a compact preview. Only 20 records are shown at a time; open **View details** to correct an item or leave it out. Confirm the client import before adding documents for those new clients.
3. For documents, select an optional client, month covered and document type, then choose multiple files. Continue to check details. Defaults are suggestions: inspect each file and confirm its client and month before saving its details.
4. Resolve items marked **Needs attention**, including duplicate warnings. Unknown-owner documents cannot be included in the final import. Unsaved edits block navigation until saved or explicitly discarded.
5. Continue to confirmation, check the summary and acknowledge ownership, then choose **Confirm and import**. A separate completion screen explains the result. **Previous imports** provides resume access for unfinished work and history for completed imports; check reports remain available.

## Privacy and lifecycle

- All migration endpoints require the existing `AdminOnly` policy; the service independently checks the actor and scope. Accountants and clients cannot list, download, edit or approve staged files.
- Staging uses a separate `AppDataMigrationBatches` table. Files use existing encrypted storage and scanning. Storage keys and content hashes never appear in the public migration response.
- Staging never creates normal documents. A file becomes visible through ordinary scoped document access only after an administrator confirms ownership and approves the batch.
- Approval creates business profiles and accountant assignments, without creating login accounts, tokens or sending invitations. Use Users & Access for explicit account invitations later.
- Historical files become **uploaded** documents, with a version and confirmed historical pack. They have no requirement slot, review decision, acceptance, filing, submission or automatic notification created by import. Existing closed months must be reopened through the normal workflow first.
- Approval, imported records, assignments and audit records share one SQL transaction. Stable batch/file identifiers and approved status protect retries; optimistic concurrency rejects stale changes.
- Unsaved row edits block approval and navigation to another batch. Use the explicit discard-and-refresh action to reload after a conflict.

## Spreadsheet format and limits

Required headers, in any order:

```csv
name,entityType,industry,contactName,contactEmail,registrationNumber,accountantEmail
```

Use exactly seven columns. Registration number may be blank. Accountant email must identify an active accountant. An existing matching registration number or matching client name/contact email blocks creation; skip that row and retain the existing profile. Imports never overwrite a client silently.

- Client spreadsheets: 2 MB, 500 rows, one worksheet for `.xlsx`. Formulas, external worksheet targets, damaged XML/ZIPs and oversized expanded workbooks are rejected. Older `.xls` workbooks need exporting to `.xlsx` or CSV.
- Documents: 100 per batch, 20 MB per file, also subject to configured scanner/storage restrictions. Sequential uploads preserve earlier successes if a later file fails. Refresh after an interrupted/lost response before reselecting files.
- Duplicate warnings use SHA-256 content matches and matching name/size for the selected client, including within the batch. Ordinary new uploads also receive hashes. Older documents without hashes can only match by name and size; this is a possible-duplicate warning, not an exhaustive forensic check.
- Latest 100 batches appear in history. Skipped files remain private in their batch. V1 does not include ZIP/folder extraction, automated ownership inference, public client access to staging, bulk rollback after approval or paper scanning hardware integration.
- Downloaded row reports quote cells and neutralise spreadsheet formula prefixes.

## Activation

Backend migration: `DataMigrationCentre` adds the staging table and nullable document fingerprint. The generated migration has been tested on a disposable SQL Server database; it has not been applied manually to the project database. Rebuild/restart the API using its configured migration startup procedure, and restart/reload the frontend. No bank connection is needed.

## Verification

- Backend migration tests cover private staging, validation/corrections, profile-only creation, closed months, duplicates, stale edits, retry safety, historical uploaded state, XLSX/CSV parsing and endpoint policy.
- `tools/verify-migration` creates and drops only its own `portal_migration_verify_<guid>` SQL database. It applies the real migration chain and tests atomic rollback by forcing approval-audit failure, then verifies successful approval, retry safety and duplicate detection. Its document storage is an isolated test adapter; production still uses the existing scanned encrypted storage.
- Frontend tests exercise live-service response handling, empty/error states, access denial, uncertain ownership, unsaved changes, multiple upload revisions and safe row reports.
- Browser interaction has not been verified in this session.
