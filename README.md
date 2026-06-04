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
- It falls back to local mock data from `src/services/portalData.ts` if backend is disabled or unavailable.

Build:

```bash
npm run build
```
