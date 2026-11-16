# Accountant page regression investigation - 11 November 2026

## Checks performed

Ran the complete frontend suite, backend regression suite and frontend build. Added `src/test/accountantBackendPages.test.tsx` to exercise backend mode rather than relying solely on demo fixtures.

The new tests render all 19 accountant page types with API failure responses: dashboard, client list, client workspace, monthly-pack workspace, documents, filing register, review queue, inbox, request detail, activity, exceptions, compliance centre, compliance calendar, notifications, notification preferences, settings, profile, help and client profile. These checks establish rendering/error handling, not completion of every button or live browser action.

Additional regressions verify that filing requests real records and displays only filed documents, the calendar requests real obligations/expiries, live records appear, and one failed monthly-pack checklist does not suppress the whole dashboard.

## Failures found and corrected

- Filing Register had no live filing API request and relied on provider/demo workspace data. Backend mode now uses `/api/documents/filing-register`, with search, filed dates/version, client-document navigation, downloads and an explicit retryable error state. Demo rendering is retained only for demo mode. The register does not claim government submission has happened.
- Compliance Calendar had no live deadline request. Backend mode now loads compliance obligations and document expiries, filters completed obligations and invalid dates, and reports loading/errors with retry. Failed requests are no longer presented as an empty calendar.
- Inbox hid the load error when there was no selected client, showing only 'No accessible clients'. Its failure state now keeps the heading, shows the actual error and provides retry.
- Dashboard used an all-or-nothing batch for pack checklists. Available checklists now remain usable if another fails; a warning states that totals may be incomplete. Stale results after unmount are ignored.

## Scope limits

Browser automation was stopped by its URL safety check in the preceding turn. No browser workaround, credential reset or permission weakening was attempted. The current checks use controlled API responses in component tests; a complete authenticated live-browser and per-button walkthrough remains outstanding. Passing tests do not prove that every live account has correct assignments, permissions or production data.
