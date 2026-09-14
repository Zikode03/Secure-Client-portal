# CIPC access request

Prepared 14 September 2026. Status: ready for the portal owner to complete and submit; **not sent**. No costs or subscription terms accepted.

## Official route and observed obstacle

The [CIPC developer homepage](https://developer.cipc.co.za/) describes an OAuth 2.0 Authorisation API subscription and a read-only Companies API. Confirm the actual product authentication and onboarding requirements with CIPC before implementation.

During this check, its Companies Subscribe link to `https://apim.cipc.co.za/api-details` returned HTTP 404. The [developer support page](https://developer.cipc.co.za/static/help) Contact Us link returned the same support page, without exposing a usable form to this research tool. This is an observation from this environment, not proof of a general outage.

Use the [CIPC enquiry system](https://enquiries.cipc.co.za/) to request routing to API Management / Data Services if developer onboarding does not work. CIPC identifies that enquiry system in its [official notices](https://www.cipc.co.za/?cat=5&paged=4). Submit using the business owner's account; do not place business identifiers or credentials in a public GitHub issue.

## Message to submit

Subject: Commercial Companies API access enquiry — private accounting portal

Hello CIPC API Management / Data Services team,

We are developing Secure Client Portal, a private portal for South African businesses and their assigned accountants. We would like authorised read-only access to company information so users can monitor relevant company statuses in one place.

Please confirm:

1. Eligibility and onboarding for your commercial Companies API, including the Authorisation API subscription and required business mandates.
2. Available fields for enterprise registration/status, annual-return standing and beneficial-ownership standing. Please distinguish what is available from what is not supported.
3. Sandbox access, approved test entities, endpoint documentation, authentication and sample response schemas.
4. Setup/subscription/per-check costs, quotas, refresh limits and expected source-data freshness.
5. Rights to store and display results to each business and its assigned accountant, required retention limits, and revocation requirements.

Your developer site's Companies Subscribe link returned a 404 during our check. Please provide the current onboarding route or direct this enquiry to the appropriate team.

We seek read-only verification, not filing, submission or company-maintenance access. Please provide terms and a quotation before activating any paid service.

Organisation: [complete privately before sending]
Contact name: [complete privately before sending]
Business email: [complete privately before sending]

Thank you.

## After submission

- Retain the ticket/reference and response privately. Share non-secret documentation, eligibility and pricing details for the integration review.
- Do not send API secrets, passwords, taxpayer PINs or client identifiers in chat or commit them to source control.
- Once access, terms and an authorised test entity are available, implement the proof in the backend repository, following the Phase 1 acceptance criteria. An enquiry submission alone does not complete Phase 1.
