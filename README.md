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
- `src/services/portalData.ts`: mock domain data behind the current workflow layer

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
- Backend failures are surfaced as errors. Mock data is available only in local development/test mode with the backend disabled.

Build:

```bash
npm run build
```

Deployable builds (including custom staging modes) require `VITE_USE_BACKEND=true`
and an absolute non-local HTTPS `VITE_API_BASE_URL`. Missing configuration, HTTP,
localhost URLs, and demo mode fail the build. CI environment variables override
local `.env` values. Use `npm run dev` for the existing localhost setup.

See [Phase 1 production configuration](docs/phase-1-production.md) for the backend settings and startup checks.
