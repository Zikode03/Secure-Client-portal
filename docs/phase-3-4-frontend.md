# Phase 3–4 frontend

Staff sign-in and invitation/reset completion now support backend MFA challenges.
No workspace session is loaded until authenticator verification succeeds. Setup
uses a manually entered authenticator key; recovery codes are shown once and the
user must acknowledge saving them before continuing. Passwords and MFA challenges
stay in component/provider memory, not browser storage.

Admin password reset sends an expiring email and never displays a temporary
password. Admin Settings includes an SMTP receipt verification panel. New password
forms require at least 15 characters; the API additionally checks breached passwords.
CSRF tokens are refreshed after MFA changes identity.

Document and inbox multipart requests send metadata before the file so the backend
can validate it before streaming. The backend owns storage encryption, antivirus,
quotas and download limits; no backend security logic was moved into this repository.

Deploy with the matching backend and account-security migration. Before go-live,
complete the backend docs/phase-3-accounts.md and docs/phase-4-storage.md gates.
The code does not provision SMTP, a shared mount, certificates, ClamAV or off-host
backups. Existing short-password accounts without MFA need a reset email first.
