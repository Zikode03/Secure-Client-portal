# Accounting Document Control & Compliance Portal

This repository contains the React + TypeScript frontend for the accounting workflow portal.

## What is here

- `src/app`: routing and lightweight auth/session wiring
- `src/components`: shared layout and UI building blocks
- `src/pages`: accountant and client workspace screens
- `src/services/portalData.ts`: mock domain data behind the current workflow layer

## Why the mock workflow data exists

The frontend is being rebuilt first, so the pages currently read from a mock
workflow service instead of the existing backend directly. That keeps the UI work
real, but still lets us swap to live API calls later without rewriting the
pages.

## Run locally

```bash
npm install
npm run dev
```

## Connect to backend

1. Copy `.env.example` to `.env`.
2. Set `VITE_USE_BACKEND=true`.
3. Set `VITE_API_BASE_URL` to your backend URL (example: `http://localhost:4000`).
4. Run `npm run dev`.

Notes:
- `src/services/portalApi.ts` is the backend-connected service wrapper.
- It falls back to local mock data from `src/services/portalData.ts` if backend is disabled or unavailable.

## Build

```bash
npm run build
```
