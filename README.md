# Accounting Document Control & Compliance Portal

This folder contains the React + TypeScript frontend for the accounting workflow portal.

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
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
```
