# Security review — 16 November 2026

Assessment: resolve the authorization findings before treating Secure Client as ready for public use with real financial records. This is a source/configuration review with automated checks and isolated in-memory reproductions, not a penetration test or certification. No application fixes or live-account/data changes were made.

## Confirmed findings

### 1. High — configured permissions are not authoritative

[UserScopeExtensions.cs](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/src/SecureClientPortal.Infrastructure/Identity/Auth/UserScopeExtensions.cs:13) accepts an explicit permission when present but, when absent, falls back to the default permissions for the role scope. A principal whose explicit list is only `clients.read` and whose scope is `accountant` therefore still receives `clients.create`. The isolated reproduction printed `True` for this case. An administrator cannot rely on removing a permission from a role's configured list to restrict access.

Many sensitive endpoints also require only a broad role policy, for example [DocumentsController.cs](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/src/SecureClientPortal.Api/Modules/Documents/DocumentsController.cs:141) for review. The document lifecycle service checks client membership but does not enforce a separate review permission. Do not describe staff roles as granular read-only/reviewer controls until the backend enforces those distinctions.

Fix: make explicitly issued permissions authoritative, reserve fallback for a deliberate legacy path if necessary, define permissions for sensitive operations, and enforce them at API/service boundaries. Add negative tests proving that removal of a permission denies the operation even for an otherwise valid assigned accountant. This is an authorization restriction failure, not a demonstrated unauthenticated privilege escalation.

### 2. High — role-definition edits leave existing token permissions active

[RoleService.UpdateAsync](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/src/SecureClientPortal.Infrastructure/Modules/UsersRoles/Application/RoleService.cs:115) updates scope/permissions without revoking sessions or incrementing a security/permission version. [AuthService](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/src/SecureClientPortal.Infrastructure/Modules/Auth/Application/AuthService.cs:562) embeds permissions and scope into the token. [Program.cs](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/src/SecureClientPortal.Api/Program.cs:241) checks that the current role is active but does not replace or compare its scope/permission claims against the current definition.

Consequently, changing an active role definition does not immediately withdraw permissions already in issued tokens. Changing an individual user's role through AdminService does revoke sessions; editing the definition is the distinct missing path. Disabling the role is checked on each authenticated request.

Fix: revoke sessions for every affected user on role-definition edits or validate a role/security version per request and renew authoritative claims. Test an already-authenticated session before and after a role permission change.

### 3. High — dependency advisories require triage

The current `npm audit --json` reports **17 affected packages: 14 high and 3 moderate; no critical entries**. These counts are affected package entries, including propagated dependency effects, not 17 independent exploit paths. Every reported node is in the development dependency tree in package-lock.json; this audit did not identify a production runtime dependency advisory.

Reported affected tooling includes Vite, its React plugin, PostCSS and transitive build packages. Vite advisory entries include dev-server file exposure and editor-launch issues. Actual applicability depends on version, platform and how development services are exposed. The audit reports no automatic fix for these installed combinations. Do not run `npm audit fix --force` blindly or infer that a zero-production-tree result proves the bundle safe.

The backend API direct/transitive audit also reports **System.Security.Cryptography.Pkcs 8.0.1**, with one High and one Moderate advisory ([GHSA-846f-f764-76mx](https://github.com/advisories/GHSA-846f-f764-76mx), [GHSA-2fmv-rv2c-59x7](https://github.com/advisories/GHSA-2fmv-rv2c-59x7)). This package is in the backend dependency graph, unlike the frontend development-only findings. The audit does not demonstrate that a vulnerable PKCS operation is reachable through this application. Evidence: [backend audit output](../security-dotnet-audit.json).

Fix: review individual advisories, upgrade the affected backend package and choose compatible patched tool versions or mitigations, and keep development servers restricted to trusted local access. Preserve reproducible builds and retest after upgrades. Evidence: [npm audit output](../security-dependency-audit.json).

## Additional hardening and release verification

### 4. Medium, conditional — old client membership claims are trusted

[UserScopeExtensions.cs](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/src/SecureClientPortal.Infrastructure/Identity/Auth/UserScopeExtensions.cs:76) returns nonempty token `client_id` claims before loading the user's current ClientIdsJson. The isolated reproduction returned a claimed client even though current in-memory database membership was empty.

The known client-onboarding path revokes sessions when business access changes, which mitigates that path. This review did not reproduce a live endpoint that removes membership while leaving the session active. A future/direct administrative removal that misses revocation would retain access until token/session expiry. Fix by intersecting token scope with current membership, or make membership-version enforcement mandatory for all access changes. Signed tokens cannot simply be edited by an ordinary client; this finding concerns old, previously valid claims.

### 5. Medium — recoverability is not established by the supplied backup scripts

The supplied [backup script](C:/Users/ngceb/OneDrive/Desktop/Client-portal-backend/Secure-Client-portal-backend/database/scripts/backup-sqlserver.ps1:1) backs up SQL Server only; it does not coordinate document storage, the data-protection key ring, and key-protection certificates. Restoring the database alone is insufficient to recover encrypted uploaded documents. The scripts pass the SQL password via a command argument and print a success message without explicitly checking `$LASTEXITCODE`. This can expose credentials to process inspection and can misreport a failed backup/restore.

Fix: use a protected authentication mechanism, fail on native command errors, secure the backup destination, and document/test a complete isolated recovery of database + files + key ring + certificates. No destructive restore was executed during this review. External backup infrastructure, SQL TDE, retention, filesystem permissions and completed restoration evidence remain unverified.

### 6. MFA policy depends on literal role names

Login/setup/refresh checks in AuthService and the JWT session check use `user.Role is "admin" or "accountant"`, rather than effective staff scope. Current user assignment uses a fixed role enum, so this review did not demonstrate a custom-role assignment bypass. Nevertheless, role scope is editable, and the role-management surface advertises custom scopes. Enforce MFA based on effective privilege/scope before extending custom-role assignment or changing builtin scopes.

## Protections confirmed in source

- Salted PBKDF2-SHA512 password storage, constant-time verification and legacy rehash on successful login.
- HTTP-only authentication cookies, Secure outside development, SameSite Strict, CSRF tokens and origin checks for mutations.
- Login/recovery rate limits, per-account lockout, protected TOTP secrets, one-time recovery codes and session revocation on relevant account operations.
- Client/assignment checks on document queries, versions and downloads. Internal request comments are filtered for clients.
- Encrypted document storage, quarantined uploads, file-signature validation, storage quotas and download throttling.
- Production startup requires shared persistent storage, ClamAV and certificate-protected encryption keys; the development baseline scanner is explicitly prohibited outside Development.
- Production configuration checks enforce HTTPS frontend/CORS, explicit hostnames and non-placeholder JWT configuration. API response security headers and frontend hosting header configurations exist.

These are source-level controls; their presence does not establish that production hosting, antivirus health, key permissions or backup operations have been configured correctly.

## Checks performed

- **84 existing backend security/access/transport/production tests passed**, using the current Release test assembly with `--no-build`.
- **10 frontend API/CSRF/origin security tests passed**.
- Two isolated C# reproductions passed, using an in-memory database only: permission fallback and stale client claims. Reproduction: [tools/security-review/Program.cs](../tools/security-review/Program.cs).
- Frontend dependency audit completed. Backend API direct/transitive advisory lookup completed successfully after retry; reported advisories are recorded in security-dotnet-audit.json.
- No actual cross-client browser session penetration test, production network scan, email dispatch, malware upload to live storage, password rotation, configuration edits or restore operation was performed.

Priorities: (1) authoritative backend permissions and operation policies; (2) immediate invalidation after role-definition edits; (3) backend/build-tool advisory remediation; (4) current-membership checks and complete recovery verification. Then perform authenticated end-to-end negative tests against a controlled staging environment.
