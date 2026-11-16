# Workflow notifications

The header bell reads the authenticated `/api/notifications` feed for clients and accountants. It refreshes once a minute while the page is visible, on window focus, and after read-state changes. A bell click previews the latest three alerts. Opening an alert persists its read state before navigating; failed requests retain the unread state. Existing notification pages and preferences remain available.

## Email delivery

New in-app notifications queue one durable `AppNotificationEmailDeliveries` job in the same database save. The additive `NotificationEmailQueue` migration does not backfill historical notifications. The worker runs every 30 seconds in batches of 20. Optimistic concurrency claims each job with a 15-minute lease. It retries SMTP failures with exponential delays, stops after five attempts, and records `sent`, `skipped`, or `failed` and a non-sensitive failure code. Jobs older than seven days and already-read alerts are skipped. Quiet hours use South Africa time and defer email. Current email/category preferences, active account status and current client access are checked before sending.

Email contains the notification title and a link to the authenticated notifications page. Document bodies, attachments and message text are not included. No external AI service is involved.

## Activation

1. Apply the additive portal migration (the development API applies pending portal migrations on startup).
2. Configure the existing `AccessEmail` SMTP settings through environment variables/secrets, including sender and credentials.
3. Set `PortalLinks:FrontendBaseUrl` to the real HTTPS portal origin (HTTP is allowed only on loopback).
4. Sign in as an active administrator and complete the existing SMTP receipt verification. Changing the SMTP configuration invalidates that verification.
5. Set `NotificationEmail:Enabled=true` (environment variable `NotificationEmail__Enabled=true`) and restart the API. This is deliberately false in checked-in settings; tests must not email clients.

SMTP acceptance is not proof of inbox receipt. Live delivery must be confirmed with a controlled recipient before enabling it for clients. Delivery is at least once: if SMTP accepts a message but the process stops before recording success, retry may produce a duplicate. The notification reference identifies the same alert.

This worker delivers individual workflow alerts already emitted by the system. It does not implement a weekly digest or operating-system/browser push notifications. Those preference controls are not evidence that those separate delivery channels exist.

## Verification

Backend regression tests cover queue creation without duplicate jobs, no resending completed jobs, email opt-out, quiet-hour deferral, bounded retries, read-alert suppression and removed client access. Bell tests cover real API data, server-backed read state, failure states and rejecting external notification links. No real-recipient email was sent during these checks.

Local verification on 16 November 2026: the additive queue migration applied successfully to SQL Server, and the restarted API returned HTTP 200 for its OpenAPI document. All 297 backend tests passed. Frontend coverage includes 379 passing cases across the suite and targeted reruns; an existing duplicate mock in the compliance UI tests was consolidated after it caused six setup failures. TypeScript, Vite build and the 197-operation OpenAPI contract check passed. The browser layout and real SMTP inbox receipt have not been verified.

The compact bell preview is 340px wide on desktop, adapts to narrow screens, distinguishes read/unread rows, and formats known missing-document reminders using the document name and a readable due date. Notification preferences are linked from the full notification pages.
