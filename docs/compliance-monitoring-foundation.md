# Compliance monitoring foundation

The client, accountant and admin Compliance Centre now opens **Authority checks**, separate from **Document records**.

- Select an accessible business; API scope remains enforced in the backend.
- Staff configure existing registration/tax identifiers, a CSD supplier number and applicability for five narrow checks. A reason is required for a check marked not applicable.
- Clients can read the setup and history, but cannot alter it or submit verification observations.
- Each check shows connection health separately from verification history. All providers remain **Not connected**. No record means **Not checked**, not compliant.
- Staff can append explicitly manual observations with evidence references and check/review dates. They must have performed an authorised check outside the portal. Uploads do not generate verification records.
- History includes who recorded the result, when it was checked, the reference and review date. Stale observations and changed business identifiers are labelled for rechecking.
- Saving setup does not call a provider. `Reload saved data` reloads the portal API; it is not a live authority refresh.

No credentials or identifiers are stored in browser localStorage. Backend errors render unavailable states, not mock monitoring data. The previous document register remains available, with an explicit scope warning; client document percentages are labelled document readiness rather than overall compliance.

## Required backend deployment

Deploy the matching backend and apply its `ComplianceMonitoringFoundation` migration before testing the UI against a running API. See the backend's `docs/compliance-monitoring-foundation.md`. The implementation run does not apply this migration, restart Visual Studio or activate providers. Until the matching API/migration is deployed, the new view will correctly report monitoring unavailable.

## Next gate

Obtain authorised CIPC access, agree actual fields/costs/limits and prove one real backend-to-portal check. This foundation is not completion of that gate. SARS and CSD machine-to-machine eligibility remain unconfirmed.
