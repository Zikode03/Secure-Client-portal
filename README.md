# Secure Client Portal Frontend

This repository contains the frontend application for the Secure Client Portal.
The ASP.NET Core backend and database scripts have been moved into a separate
backend repository.

## Repository structure

- `src/`: React + TypeScript + Vite application source
- `docs/`: project documentation
- `.github/`: CI and repository automation

Important folders:
- `src/app`: routing and lightweight auth/session wiring
- `src/components`: shared layout and UI building blocks
- `src/pages`: accountant and client workspace screens
- `src/services/portalData.ts`: empty loading-state shapes; domain records come from authenticated APIs

Run locally:

```bash
npm install
npm run dev
```

Connect the frontend to the backend:

1. Copy `.env.example` to `.env`.
2. Set `VITE_USE_BACKEND=true`.
3. Set `VITE_API_BASE_URL` to your backend API URL, for example `http://localhost:5127`.
4. Run `npm run dev`.

Notes:
- `src/services/portalApi.ts` is the backend-connected service wrapper.
- Backend failures are surfaced as errors. The application has no demo mode, built-in login credentials or sample business records. Test fixtures are isolated under `src/test/fixtures` and excluded from shipped bundles.

Build:

```bash
npm run build
```

Deployable builds (including custom staging modes) require `VITE_USE_BACKEND=true`
and an absolute non-local HTTPS `VITE_API_BASE_URL`. Missing configuration, HTTP,
localhost URLs, and demo mode fail the build. CI environment variables override
local `.env` values. Use `npm run dev` for the existing localhost setup.

See [Phase 1 production configuration](docs/phase-1-production.md) for the backend settings and startup checks.

API requests use a generated OpenAPI client, starting with Banking. See
[OpenAPI client workflow](docs/openapi-client.md) for synchronization and migration.
`npm run api:generate` generates types from the committed backend contract;
`npm run api:check` rejects stale generated types and runs before either build.

Client and document import setup, limits and confirmation workflow:
[Import Clients & Documents](docs/data-migration-centre.md).

Invoice-focused review assistant proposal and implementation requirements:
[Document Review Assistant V1 specification](docs/document-review-assistant-v1-spec.md).
