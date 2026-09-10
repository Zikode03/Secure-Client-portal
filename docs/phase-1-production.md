# Phase 1 production defaults

Every frontend build requires `VITE_USE_BACKEND=true` and
`VITE_API_BASE_URL=https://<your-api-host>`. The build rejects missing values,
HTTP, local URLs and demo mode. `npm run dev` and tests retain local/demo support.
Set these values in the deployment environment before building; Vite embeds them
in the assets. Vite's development proxy is not a production reverse proxy.

## Backend settings

Outside `Development` (including `Staging`), startup validates configuration before
opening a database connection or creating the encryption key directory:

| Environment variable | Required value |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` for production |
| `DB_CONNECTION_STRING` | Production SQL Server connection, or use `ConnectionStrings__DefaultConnection` |
| `JWT_SIGNING_KEY` | Random secret of at least 32 characters; no placeholder |
| `PortalLinks__FrontendBaseUrl` | Public HTTPS frontend URL |
| `Cors__AllowedOrigins__0` | Exact HTTPS frontend origin, no trailing slash or path |
| `AllowedHosts` | Explicit API hostname(s), separated by `;`, no wildcard or scheme |
| `AccessEmail__Enabled` | `true` |
| `AccessEmail__DeliveryMode` | `smtp` |
| `AccessEmail__SmtpHost` | Non-local SMTP hostname |
| `AccessEmail__SmtpPort` | Valid SMTP port, typically `587` |
| `AccessEmail__UseSsl` | `true` |
| `AccessEmail__FromEmail` | Valid sender address on your mail domain |
| `AccessEmail__SmtpUsername` / `AccessEmail__SmtpPassword` | Provider credentials when authenticated SMTP is used |

Store secrets in hosting configuration or a secret manager, never in this document
or a committed environment file. These checks validate configuration; they do not
prove DNS, SMTP delivery, database permissions or TLS availability.

## Seeding and existing databases

Reference initialization creates roles, permissions and templates without demo users,
clients or packs. Existing role definitions and activation state are preserved.
The separate demo initializer refuses to run outside Development. Existing demo
passwords and disabled status are no longer overwritten on development restarts.

Non-development startup refuses a database containing the known seeded account IDs,
account emails or demo client ID. It does not delete records. Use a clean production
database, or review and retire demo records through an explicit migration. Merely
changing a demo password does not satisfy this gate. Provision the first real admin
through a separately controlled account-bootstrap process before go-live; Phase 1
does not introduce another default administrator.

Database migrations still run at startup until Phase 5 moves them into deployment
commands. Public `/health/db` errors now return only a generic failure and HTTP 503.

Phase 1 does not replace the remaining transport, account, storage, operational
and release-validation phases. Choose frontend/API domains compatible with the
current `SameSite=Strict` cookies and verify this during Phase 2.
