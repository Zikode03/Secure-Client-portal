# Admin workflow corrections

- Assignment handovers send the reason and message to the backend. The assignment,
  audit record (including its server-generated effective timestamp), private
  accountant notification and notification outbox entry are saved together.
  Changes take effect immediately when saved. Future scheduling is not offered.
- Backup replacement uses one protected reassignment operation. It validates the
  current assignment and active target before saving, and leaves primary ownership
  unchanged. Failed saves retain the previous coverage.
- Invited, disabled and locked accountants cannot receive assignments or be promoted
  automatically when another owner is removed. Existing unavailable owners remain
  visible as disabled selection options so the editor does not misrepresent them.
- The accountant directory shows actual account access states and factual assignment
  and review counts. It does not infer available capacity from arbitrary thresholds.
- Client workspace deadlines come from persisted required-item dates in the latest
  open monthly pack. Missing or unavailable dates are stated explicitly.
- Destructive and text-entry actions use app dialogs. Cancel/Escape performs no
  mutation; permanent deletion still requires the exact DELETE confirmation.
- Roles remain readable, but edit/create/activation controls are shown only when
  `/api/roles/access` grants the corresponding owner capabilities. Both that endpoint
  and write authorization check current backend account permissions; the UI is not
  the security boundary.

Restart the API before exercising these changes against the local app. No database
schema migration is required: handovers use the existing audit and notification
storage. The OpenAPI snapshot and generated TypeScript describe the updated requests
and role capability endpoint.
