# Phase 2 frontend integration

Every API mutation now obtains an identity-bound CSRF token from `/api/auth/csrf`
and sends it in `X-CSRF-Token`. This includes authentication, JSON requests,
deletes and multipart uploads. Tokens remain in memory, are refreshed after
authentication changes and are fetched once for concurrent requests. Only an
explicit CSRF rejection is retried, at most once. Absolute URLs targeting another
origin are rejected before sending credentials or security tokens.

Recommended production layout: one HTTPS origin for the frontend and `/api`.
Set `VITE_API_BASE_URL` to that origin, without `/api`. Keep the backend on its
private/internal endpoint and let the reverse proxy route `/api` to it. This
avoids cross-site cookie restrictions. The frontend and backend must be released
together because the backend now rejects mutations that lack the CSRF token.

## Headers at the frontend host

The production build contains:

- `_headers` for static hosts that support that format.
- `web.config` security headers for IIS. Merge into an existing host configuration
  if it also contains rewrite/proxy settings; do not overwrite those settings.
- `security-headers.nginx.conf` to include in the frontend Nginx server/location.

Apply the generated headers at the actual static host. API response headers alone
do not protect the frontend HTML. CSP is also embedded as a meta policy, but
framing protection requires HTTP headers. The policy allows only this application's
scripts, local fonts, the configured API origin, and local/blob document previews.
Inline styles remain enabled for existing React layout/progress controls; inline
scripts and eval are prohibited. Theme initialization is an external local script.

The headers include a 30-day HSTS policy, nosniff, deny-framing, no-referrer and
disabled camera/microphone/geolocation. The current CSP and Secure/Strict cookie
flow should be verified on the final staging domain before publishing. Proxy trust
and API HTTPS settings are documented in the backend repository's
`docs/phase-2-security.md`.
