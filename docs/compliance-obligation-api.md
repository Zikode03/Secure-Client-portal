# Compliance obligation API and evidence linkage

Implemented in both repositories on 14 September 2026. This is local workflow tracking, not live authority verification or external filing.

## Enable the backend

1. Review and apply migration `20260914180809_ComplianceObligationApi` to the intended database, using the backend's normal migration procedure. It adds configuration and obligation tables; it does not move or delete existing documents.
2. Rebuild/restart the API from Visual Studio, then reload the frontend. The agent did not start Visual Studio, stop the running API, or apply this migration.
3. Confirm a client's compliance profile, configure verified rules under an unused version, and run automation.

From the backend repository, after confirming the target connection:
```powershell
dotnet ef database update --project src/SecureClientPortal.Infrastructure --startup-project src/SecureClientPortal.Api --configuration ComplianceCheck
```

## Contract

All current frontend workflow operations are served under `/api/compliance/automation`: rules, client profiles, obligations, run, preparation, review, submission, payment and not-applicable.

Rules are admin-only to edit. Profile/workflow commands are staff-only. Client reads and evidence access are scoped to accessible businesses, including accountants' assignments. Concurrent writes return a conflict rather than silently overwriting.

Each obligation has its own ID and an explicit, unique `ComplianceItemId` foreign key. Upload/list routes use the **obligation ID**:
`/api/compliance/automation/obligations/{id}/evidence`.

The backend resolves and checks the linked item/client before delegating to existing protected storage. Upload returns `{ obligation, evidence }`; the frontend refreshes that obligation and can list/download evidence versions. Downloads continue through the existing authorized evidence-version route. A failed storage/scan does not create an evidence version or increase readiness.

Monthly preparation categories are counted from accepted stored documents in the same client's relevant monthly-pack period. A filing receipt does not satisfy unrelated preparation categories. CSD evidence unlocks preparation/review, not automatic authority verification.

## Explicit limits

- Starter deadlines are unconfigured, not fabricated statutory dates.
- Only confirmed applicability generates work. Generation creates the latest closed configured period and refreshes existing work; it is not historical backfill.
- CSD is a standing record, not a recurring return.
- CIPC and COIDA generation remains withheld pending the missing incorporation/assessment-period configuration.
- Runs do not automatically send requests/notifications. Counts remain zero and the response explains this.
- Existing obligations retain their creation rule snapshot/version.
- Recorded filing/payment reflects staff-entered external results, not a government integration.

## Verification

Backend API build and focused in-memory tests cover routes, role/client isolation, idempotency, separate evidence identity, retrieval, failed storage, workflow/payment guards, and immutable rules. Frontend contract tests verify paths, multipart contents and upload failure propagation. These checks do not replace applying/testing the migration against the selected SQL Server database or a live antivirus/authority integration.

