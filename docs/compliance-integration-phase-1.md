# Compliance integration — Phase 1: access and feasibility

Reviewed: 14 September 2026.

Status: public-source research and proof plan prepared. **The phase gate is not passed:** provider entitlement, commercial terms and one real end-to-end verification remain outstanding.

This is the compliance integration roadmap, separate from the deployment/security phase documents. This document does not enable an integration or change the application.

## Objective and existing system

Show businesses and assigned accountants the results of applicable authority checks in one portal, with a clear source and check time. Reduce repeated external logins without claiming checks that have not occurred.

The current Compliance Centre reads internal compliance items, categories and alerts. Its recorded statuses and date-based alerts are not evidence of live SARS, CIPC or CSD verification. Searches of the backend source found CIPC category definitions, not an implemented authority connector. Do not relabel existing records as authority-verified.

## Access findings

| Source | Confirmed public evidence | Still unconfirmed | Phase 1 decision |
| --- | --- | --- | --- |
| SARS | Taxpayers can authorise third-party TCS verification using a PIN. SARS documents eFiling and SOQS verification using the tax reference and PIN, with results current at verification time. [Official guide](https://www.sars.gov.za/individuals/manage-your-tax-compliance-status/how-to-verify-tax-compliance-status/) | Supported machine-to-machine access for this private portal; onboarding, delegated permission scope, fees, quotas and refresh rules. A TCS PIN does not itself establish API entitlement. | Accountant verification can be recorded explicitly as manual. Automated verification requires a supported, authorised access route first. |
| CIPC | The official catalogue lists a commercial REST offering for searching and retrieving public company data. [API catalogue](https://developer.cipc.co.za/apis) | Exact fields and operations, production eligibility, subscription approval, authentication, price, quotas, sandbox and data freshness. Registration information alone does not establish annual-return or beneficial-ownership compliance. | First candidate for an authorised technical proof, conditional on access and useful response fields. |
| CSD | Treasury describes supplier web services and bulk access for organs of state. [Official presentation](https://ocpo.treasury.gov.za/buyers_area/Supplier-Management/search%20tool.pdf) | Whether a private accounting portal qualifies, directly or through an authorised provider; permitted checks, supplier authorisation, fees, quotas and redistribution rights. The presentation is historical, not a current access grant. | Obtain written eligibility confirmation before building a connector. Supplier registration is not an API subscription. |

CIPC's [documentation landing page](https://developer.cipc.co.za/static/docs) describes account creation and product subscription but also contains placeholder sections. Its listing is evidence of an offering, not proof that this project can call it. The public product page did not expose sufficient pricing or quota detail during this review; do not assume either is free or unlimited.

CSD describes verification against other institutions and a supplier registration report in its [registration guidance](https://secure.csd.gov.za/Account/_RegistrationProcess). This does not establish a public third-party live status API. If an authorised CSD response includes a SARS result, retain that indirect provenance and any supplied verification timestamp.

No source credentials were used, no business records were queried, and no subscriptions, applications or purchases were submitted during this investigation. No authenticated API test has passed.

## Questions to resolve with each provider

Use the provider's verified official contact channel. The following is an unsent enquiry draft, not authorisation to submit an application:

> We are building a private South African accounting portal where businesses and their assigned accountants monitor their own compliance information. Do you offer authorised read-only API access for this use case? Please confirm eligibility, required business mandates, available fields and status definitions, sandbox/test access, authentication, production approval, pricing, quotas, permitted refresh frequency, storage/display restrictions, data timestamps, revocation requirements and support arrangements. We do not require submission or account-maintenance permissions.

Source-specific questions:

- SARS: Is a supported TCS verification interface available directly or through approved providers? How must taxpayer PIN authorisation and its revocation be handled? Which details may be displayed to the business and assigned accountant?
- CIPC: Can the commercial product return enterprise status, annual-return standing and beneficial-ownership standing separately? Which of these are actually available, and how fresh are they? Request endpoint documentation and sample response schemas.
- CSD: Is this private-portal use case eligible for supplier verification services? What mandate/identifiers are required? Which underlying checks and source timestamps can be returned? If direct access is unavailable, is an authorised intermediary route permitted?

Record the written answer, date, contact, agreed cost and limit for each source. No guessed prices, refresh schedules or integration delivery dates.

## First proof: CIPC, conditional on approved access

Why this candidate: its official commercial REST listing is the clearest public integration starting point found. This is a recommendation, not a claim that its fields cover all company obligations.

Prerequisites:

1. User-approved provider onboarding and any expenditure; product terms reviewed for this portal's use.
2. Issued credentials and official endpoint/response documentation. Configure secrets securely in the backend environment, never chat, frontend code or this repository.
3. A provider-approved test entity, or a business whose representative authorises the specific lookup and display. Keep identifiers out of committed test fixtures.
4. Confirm the narrow check being proved. If the API returns only registration status, prove and label only registration status.

Execution after those prerequisites:

1. Implement the read-only request in the **backend repository**, with tenant/client access checks, bounded timeout, documented rate limits and redacted logging. Do not call provider APIs from browser code.
2. Run one authorised lookup and match the returned entity to the intended business. Record source, check scope, provider reference, returned state, checked time and source timestamp when supplied.
3. Compare the response with the provider's status definitions and an authorised source view. Preserve only permitted evidence in protected storage.
4. Retrieve the result through the portal API and show it to the business and assigned accountant. Confirm an unrelated client/accountant cannot retrieve it.
5. Test revoked/invalid credentials, timeout, rate limit, no match and stale data. These are check failures or unknown states, never an automatic compliant/noncompliant result. Use local tests for failure scenarios where exercising the provider would be inappropriate.
6. Record sanitised test evidence and the actual result. A reachable website or mocked response does not pass this proof.

## Result rules for subsequent implementation

- Keep the authority's business outcome separate from connection/check health.
- Show source, exact scope, last successful check and freshness. Preserve a last-known result on outage but mark it stale or unable to refresh.
- Distinguish authority-verified, accountant-confirmed, not checked, stale, unavailable and not applicable. Manual evidence never silently becomes live verification.
- Do not derive an overall “100% compliant” label from registrations or a subset of checks. Prefer “Action needed”, “Checks incomplete” or “No issues found in current checks”.
- A document upload, a valid-looking certificate or an unexpired PIN is not by itself current authority confirmation.
- Store credentials server-side in protected secret storage; enforce client ownership and accountant assignment on every read/check. Record authorisation and revocation without logging secrets.
- Refresh only within agreed provider limits. No password sharing, CAPTCHA bypass or unsupported scraping.
- Manual verification remains a clearly labelled interim option for unsupported sources; it does not satisfy the automated-monitoring objective.

## Phase gate and next owner actions

- [x] Document official access evidence and distinguish it from assumptions.
- [x] Identify provisional manual-only/unconfirmed sources.
- [x] Specify a narrow first proof and safe success/failure criteria.
- [x] Portal owner approves pursuing CIPC access first (14 September 2026).
- [ ] Portal owner approves any quoted costs and subscription terms before purchase.
- [ ] Providers confirm eligibility, scopes, permissions, costs and refresh limits.
- [ ] Securely provision credentials and an authorised test business.
- [ ] Complete and record one real backend-to-portal verification.
- [ ] Mark each source: approved to integrate, awaiting approval, or manual-only, based on provider confirmation.

Next action: submit the prepared [CIPC access enquiry](cipc-access-request.md) through an official support channel. Approval to pursue access is recorded; no account, subscription or enquiry has been submitted. Until approved access is available, the live-proof portion cannot be completed. No application behaviour was changed as part of this research deliverable.
