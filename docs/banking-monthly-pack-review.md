# Banking and Monthly Pack Foundation Review

Date: 16 September 2026.

## Repository Baseline

Both repositories were checked out on `main` and pulled from `origin/main` before edits. Frontend advanced to `e12ccac`; backend advanced to `c1cf2af`. Both worktrees were clean and had no unresolved conflicts. No branch was created. Restore, full backend build, backend tests, frontend build and frontend tests were run before changing code.

## Issues Found and Fixed

- Banking used one injected provider for every connection. It now resolves an individually registered provider by the stored connection's provider name. An unavailable provider cannot silently use the sandbox. Duplicate active connections are still checked per provider, not per client.
- Mock data was registered in production. The API now registers the mock only in Development; the default module registration has no mock. Sandbox actions require both explicit configuration and a registered sandbox provider.
- Coverage declared the last day of the current month complete too early. Full-period completion now starts only after the month ends, using a testable UTC clock.
- Connections needing attention could still report `IsPeriodComplete = true`, and the finalisation guard trusted that flag alone. Connection health/expired consent now prevents completion; submit/close require the complete state.
- A bank with no coverage could borrow another bank's data-through date. Aggregate dates now require coverage from every active connection; an initial gap no longer reports a fictitious date before the pack starts.
- Banking verification errors allowed finalisation. Submit and close now fail closed with a safe, useful message. Reconciliation failures are no longer silently ignored.
- Only the newest open pack was reconciled after connection/disconnection. Every editable pack is now reconciled; reviewed/completed/closed evidence is left unchanged. Pack reads and creation also reconcile actual connection state.
- The manual `bankFeedConnected` preference could remove bank statement requirements. Recommendations/reconciliation now use real BankConnections, keep the bank slot visible, and preserve current and historical linked documents. The obsolete Banking checkbox was removed from the accountant editor; the DTO remains for compatibility and labels the field as legacy.
- A complete Banking-only pack required a dummy upload. Verified complete bank data can now supply readiness without bypassing other required document checks.
- Failed syncs could save partially applied tracked data. Failure handling now discards those changes before recording a failed run. Missing/reversed coverage cannot be recorded as a successful provider sync. Saved diagnostics are redacted in public overview DTOs.
- Frontend Banking used ES2021 `replaceAll` with an ES2020 target. It now uses an ES2020-compatible regular expression.
- The readiness panel omitted the full required period/accountant bank details and exposed raw errors. It now displays period, through-date, counts, aggregate coverage, gaps, safe messages, explicit submission/closure blockers, refresh and client Banking link. It refreshes on window focus and selected-period changes and rejects stale responses.
- The Banking page exposed raw request/sync errors and mistook a failed overview for no connection. Errors are generic and retryable; transaction rows are horizontally scrollable on narrow screens.

## Files Changed

Frontend:

- `src/components/banking/MonthlyPackBankingStatusPanel.tsx`
- `src/pages/accountant/AccountantClientPackWorkspacePage.tsx`
- `src/pages/client/ClientBankingPage.tsx`
- `src/test/monthlyPackBankingStatusPanel.test.tsx`
- `src/test/clientBankingPage.test.tsx`
- `docs/banking-monthly-pack-review.md`

Backend:

- `src/SecureClientPortal.Api/Program.cs`
- `src/SecureClientPortal.Application.Contracts/Modules/MonthlyPacks/ClientMonthlyPackProfileContracts.cs`
- `src/SecureClientPortal.Domain/Modules/MonthlyPacks/BankStatementSlotPolicy.cs`
- `src/SecureClientPortal.Infrastructure/DependencyInjection/BackendModuleServiceCollectionExtensions.cs`
- `src/SecureClientPortal.Infrastructure/Modules/Banking/BankingService.cs`
- `src/SecureClientPortal.Infrastructure/Modules/MonthlyPacks/BankAwareMonthlyPackService.cs`
- `src/SecureClientPortal.Infrastructure/Modules/MonthlyPacks/ClientMonthlyPackProfileService.cs`
- `src/SecureClientPortal.Infrastructure/Modules/MonthlyPacks/MonthlyPackService.cs`
- `test/SecureClientPortal.Tests/BankingMonthlyPackTests.cs`

## Verification

- Backend restore: passed.
- Baseline backend full Release build: passed; baseline tests: 193 passed, 0 failed.
- Final backend full Release build: passed, 0 errors; existing xUnit analyzer warnings remain.
- Final backend tests: 221 passed, 0 failed, including 28 new Banking regressions. Tests cover all 13 requested scenarios plus boundary-day, empty coverage, health, provider dispatch, failure handling, locked history, legacy flag and production DI resolution.
- Baseline frontend build: failed on Banking `replaceAll`/inferred argument types; fixed.
- Final `npm run build`: TypeScript passes; deployable Vite build is blocked by the existing security validation because no valid non-local HTTPS `VITE_API_BASE_URL` is configured. No URL was invented and validation was not weakened.
- `npm run build:check`: passed, including TypeScript and the Vite bundle.
- Banking frontend tests: 13 passed, 0 failed.
- Full frontend tests: 222 passed, 10 failed. The same 10 failures existed before edits in `clientComplianceCentrePage.test.tsx` (2), `complianceCentreButtons.test.tsx` (6), `complianceLifecycle.test.tsx` (1), and `firmSharedPages.test.tsx` (1). Those unrelated modules/tests were not altered or removed to obtain green results.
- `git diff --check`: passed in both repositories.
- No enabled browser was available for desktop/mobile screenshots. Component tests do not replace visual browser verification or a live SQL-backed end-to-end run. The existing Debug API was not stopped, restarted or overwritten.

## Final Workflow

No active bank means a required manual Bank Statement slot. Banking itself does not block that document workflow. Connecting supplies an initial completed coverage run and keeps the empty slot visible as not applicable. Uploaded evidence remains visible and optional while connected. Removing the last bank restores a required manual slot without deleting history. Every active bank must independently have successful provider-range coverage; overlapping/adjacent ranges merge, regardless of zero-transaction days. Current months can be current through today but cannot be finalised yet. Historical months become complete only with full healthy coverage for every bank. Submit and close enforce those checks alongside existing document readiness. Client and accountant panels expose readiness and blocking reasons for the pack.

Dependency direction remains acyclic: BankAwareMonthlyPackService -> MonthlyPackService/BankingService; MonthlyPackService -> profile/BankingService; profile and Banking services -> DbContexts; BankingService -> individually registered providers. BankingService does not resolve any Monthly Pack service. Production-mode graph resolution is regression-tested without the mock provider.

## Remaining Risks Before FNB

- Supply the real production HTTPS API URL and resolve the pre-existing Compliance test failures before claiming the entire application/release is green.
- Run SQL Server migration/back-up/rollback checks in a disposable environment and verify both DbContexts' migration histories. The foundation migration is attributed to BankingDbContext, but no Banking model snapshot is present on the pulled baseline; establish that snapshot before generating the next Banking migration. No live database migration was applied during this task.
- Connection persistence and Portal slot reconciliation span two DbContexts. Reads/reconciliation repair drift, but connector rollout should add a durable retry/outbox or atomic coordination strategy and verify concurrency against SQL Server.
- The per-provider duplicate-active guard is a service query, not a concurrency-proof filtered unique constraint. Decide legitimate multi-connection/account semantics, idempotency, payload deduplication and provider identifier casing before production callbacks.
- Coverage currently aggregates per connection, as requested. Real connectors must document whether their coverage ranges guarantee all linked accounts, and must request historical periods rather than simply sync the current month.
- Obtain legitimate FNB API access and implement consent/token storage with encryption, secret management, revocation, callback validation, least privilege, retries and rate limits. No bank credentials, scraping, fake live responses, aggregator, or FNB endpoints were added.
- Complete desktop/mobile visual checks and client/accountant live upload, connect, sync, disconnect, submit and close checks using the new binaries before rollout; the existing local Debug server still serves its previously running build.

FNB integration has not begun. The focused Banking foundation checks pass; full deployable frontend verification and live connector/database validation remain explicitly outstanding.
