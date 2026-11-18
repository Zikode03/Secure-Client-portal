# Workflow consistency audit — 18 November 2026

Scope: current local frontend and backend working trees, including unpushed fixes. This is a focused workflow audit, not certification that every page or security boundary has been tested. No production logic or application database records were changed during this audit.

## Confirmed remaining findings

| Priority | Finding | Evidence and consequence |
| --- | --- | --- |
| High | Closing a month checks requirement status without checking every file linked to that requirement. | Isolated domain reproduction: two receipts linked to one required slot; accept the second; `CloseIfReady` succeeds while the first remains `uploaded`. The API close service supplies only slots to this policy. |
| High | Backup accountants are filtered out of frontend client scope. | Backend `UserScopeExtensions.GetAccessibleClientIdsAsync` includes all saved assignment rows. Frontend `getAssignedClientIds` examines the primary assignment and display name but ignores `backupAccountantUserId`. Reproduced with a backup assignment. |
| High | Accountant document centre reports upload dates as document periods. | `AccountantDocumentsPage.tsx:548` maps `monthLabel` from `uploadedAtUtc`, whereas client Documents and the recently corrected client workspace use the linked monthly pack. A historical file uploaded today can appear in the wrong period in the accountant document centre. |
| Medium | The same progress/completion wording has different meanings across roles. | `workflowEngine.ts:25,72` counts drafts as complete. A one-item draft pack returns 100% and “Month is complete”. Backend TeamProgress counts accepted applicable required slots. Reproduced client result versus approval-based backend rule. Collection readiness and accountant approval require separate labels/counts. |
| Medium | Optional requirements distort client progress. | `recalculatePack` divides by all slots; ClientMonthlyPacksPage counts ready required slots but divides by the all-slot total. Reproduced a pack with its required item accepted and an optional missing item: submission is allowed but progress is 50%. |
| Medium | Not applicable becomes approved-looking state. | `clientMonthlyPackBackend.ts:108` maps required `not_applicable` to `accepted` and optional to `filed`; backend excludes these requirements. Reproduced the conversion. No actual review or filing occurred. |
| Medium | “Missing” differs between client Dashboard and Monthly Packs. | Dashboard now counts only `missing`; Monthly Packs still counts other blocking states except rejected, including partial/pending/signature items. The pages can show different missing counts for identical requirements. |
| Medium | Notifications without a recognised type become missing-document notifications. | `ClientNotificationsPage.tsx:311–318` recognises imported documents, compliance, rejected and deadline types; all other events fall through to `missing_documents`. Successful review or ordinary request updates can acquire inaccurate missing-document explanations/actions. |
| Medium | Frontend scope compares accountant display names even when IDs disagree. | `permissions.ts:138–143` accepts matching `fullName` despite a different primary accountant ID. Reproduced with two accounts sharing a name. Backend DB scoping remains the security boundary; this is an identity/UI-consistency defect, not a demonstrated backend access bypass. |

## Verification performed

- Five disposable frontend audit probes reproduced draft completion, optional-item progress, not-applicable conversion, omitted backup visibility and same-name identity matching. These tests assert the observed defects; their passing result does not mean the defects are fixed.
- A disposable backend domain program reproduced `packStatus=closed`, `firstDocumentStatus=uploaded`, `secondDocumentStatus=accepted`, `slotStatus=accepted`. It did not connect to or modify the application database.
- Inspected the real API query/close policies, frontend mappers, client missing-item formulas, and team progress aggregation.
- Excluded a suspected cross-account provider hydration issue after confirming PortalProvider remounts state using the authenticated account's scope key.
- Monthly-pack API ordering is correctly year/month descending; importing an older year does not by itself make it the newest period. However, current client pages and open-pack deadline summaries select periods differently; active-period policy should be explicit during remediation.

## Previously corrected locally — not the same as remaining findings

Existing-client import linking, scoped accountant document importing, import-received notifications, client document refresh, client-workspace historical visibility, PDF resize-loop prevention, exact category/month upload-to-checklist matching and an explicit checklist correction action have been implemented locally. Some require restarting the backend; these changes have not been pushed. Other pages can still contain the remaining mappers/counts listed above.

## Remediation order and acceptance criteria

1. Define and enforce close readiness for multiple files in a required item; close must fail if a required linked file still needs review, while intentionally optional/excluded evidence remains explicit.
2. Use database-backed assignment IDs for primary and backup visibility; remove name-based ownership matching.
3. Use monthly pack IDs/year/month as document periods everywhere; keep upload time as a separate field.
4. Separate received, awaiting submission, awaiting review, accepted and filed counts. Preserve not applicable as its own state and exclude it from applicable denominators.
5. Share missing and progress calculations across roles, and document which metric is collection readiness versus approved completion.
6. Map notification event types explicitly; general updates must not imply missing evidence.
7. Verify full registration → assignment → import/upload → receipt → submission → review → filing/close scenarios across all roles, including multiple invoices, optional items, exemptions, backup assignment and old periods.

## Remediation completed locally

All nine findings above have now been addressed in source code:

- Reviewing one file no longer accepts its entire requirement while sibling files still need review. Month-close validation also checks every linked document, including legacy slots already marked accepted. Accepted siblings are excluded from the pending review queue.
- Primary and backup accountant visibility uses account IDs; matching display names cannot grant frontend scope.
- The accountant document centre derives historical periods and year filters from the linked monthly pack, retaining upload time as a separate field. Unknown periods remain unspecified.
- A shared checklist summary separates received documents from approved requirements, excludes optional and not-applicable items from required progress, and standardises missing/correction counts.
- Not-applicable requirements remain visibly excluded, with no upload action or accepted/filed interpretation.
- Notification event types are mapped explicitly; successful and unrecognised updates use neutral account-update wording.

Validation: the complete frontend suite passed 456 tests in 80 files; an additional exempt-state UI regression passed separately. The complete backend suite passed 380 tests. The frontend production build and OpenAPI consistency checks passed (204 operations; 235 typed HTTP calls and 26 generated-client operations). TypeScript was rechecked after the additional regression test.

These are local changes. No commit or push was performed. The running backend must be restarted to load the updated server policies. No browser/computer controls were used; interactive verification of the running application remains separate from these automated checks. The original audit findings above are retained as the pre-fix record, not a list of remaining defects.
