# Client financial archive

Documents now opens by client for staff, and directly in the signed-in business for clients. The same archive navigation is used in the accountant's client workspace.

Navigation: client → financial year → month → documents. Annual financial records have their own section inside a year; permanent records and records needing period confirmation sit outside monthly folders. Client and document search remain scoped to the chosen business.

The existing compliance profile supplies the client's financial year-end. Staff can explicitly save it from Documents without changing the other profile fields. February, June and December year-ends are supported; exact month ranges are shown. If no setting is confirmed or settings cannot be loaded, the page explicitly shows calendar years instead of assuming February. This uses the client's current saved year-end; changes in historic year-end policy require separately verified period configuration before treating those older ranges as authoritative.

Monthly readiness reuses persisted Monthly Pack slots. It distinguishes required items approved, missing and needing correction. An empty archive month is not automatically a missing requirement. Needs attention brings together rejected records and uncertain periods; this is not an automatic assurance that all accounting exceptions have been found.

Staff use the document action menu → Organise to place an unlinked record in a month, financial year, permanent records or period-needs-checking. The backend rechecks client membership and review permission, records an audit event, preserves document status, and rejects stale file versions. A document attached to a checklist cannot be moved through this action. Archive organisation does not approve a file, complete a requirement or close a month.

Bulk import and individual import corrections now accept the same four record sections. Annual records require an ending financial year; permanent and uncertain-period records do not require a fabricated month. Such records have no monthly pack association and remain visible to reviewers. Historical filing attestation remains separate from reviews performed in Secure Client.

Database change: `20261118174928_DocumentArchivePeriods` makes `AppDocuments.MonthlyPackId` nullable. Existing document values are preserved. Rollback refuses to replace null archive periods with invented GUIDs. The backend applies pending portal migrations at startup; restart the backend before using new non-monthly imports. The running Visual Studio process was not stopped by this work.

OpenAPI is synchronised: 206 operations, 241 typed HTTP calls and 26 generated-client operations. Verification: frontend build, 464 frontend tests and 396 backend tests passed, including financial-year boundaries, client isolation, non-monthly imports, review queue visibility, persistent archive placement and migration/model consistency. No browser controls were used and no changes were pushed.
