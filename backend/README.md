# Secure Client Portal Backend (Node.js + Express + S3 Multipart)

This backend now covers:

1. Auth/login + token sessions
2. Role access control (accountant/client)
3. Clients directory + client profile APIs
4. Messaging APIs
5. Tasks/workflow APIs
6. Document metadata/search/permissions + S3 large-file upload/download
7. Audit logs + notifications

## Setup

```bash
cd backend
npm install
copy .env.example .env
```

Fill `.env` with real AWS values.

## PostgreSQL (Phase 1 Scaffold)

This repo now includes Prisma + PostgreSQL scaffolding.

1. Set `DATABASE_URL` in `.env`.
2. Generate Prisma client:

```bash
npm run db:generate
```

3. Create migration and apply:

```bash
npm run db:migrate -- --name init
```

4. Seed initial data:

```bash
npm run db:seed
```

Notes:
- Current API routes still read/write the in-memory store in `src/lib/store.js`.
- PostgreSQL connection is initialized on server start when `DATABASE_URL` is set.
- Phase 2 will move routes from in-memory to Prisma queries.

## Run

```bash
npm run dev
```

Server default: `http://localhost:4000`

## Demo Credentials

- `accountant@prospera.com` / `Password123!`
- `jane@acmecorp.com` / `Password123!`

## Auth Flow

1. `POST /api/auth/login`
2. Save returned `token`
3. Send header: `Authorization: Bearer <token>`
4. Use protected APIs

## Core Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Clients
- `GET /api/clients`
- `GET /api/clients/:clientId`
- `POST /api/clients` (accountant)
- `PATCH /api/clients/:clientId` (accountant)

### Messages
- `GET /api/messages/threads`
- `GET /api/messages/threads/:clientId`
- `POST /api/messages/threads/:clientId`
- `POST /api/messages/threads/:clientId/read`

### Tasks
- `GET /api/tasks`
- `POST /api/tasks` (accountant)
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId` (accountant)
- `POST /api/tasks/automation/run` (accountant, reminders + SLA updates)

### Documents
- `GET /api/documents`
- `POST /api/documents`
- `PATCH /api/documents/:documentId/status` (accountant)
- `GET /api/documents/:documentId/download-url`

### Uploads (multipart for large files)
- `POST /api/uploads/initiate`
- `POST /api/uploads/:uploadId/part-url`
- `POST /api/uploads/:uploadId/complete`
- `POST /api/uploads/:uploadId/abort`
- `DELETE /api/uploads/files`

### Notifications + Audit
- `GET /api/notifications`
- `POST /api/notifications/read-all`
- `POST /api/notifications/:notificationId/read`
- `GET /api/audits` (accountant)

### Requests
- `GET /api/requests`
- `POST /api/requests`
- `PATCH /api/requests/:requestId/status`
- `GET /api/requests/:requestId/timeline`

### Profile
- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `GET /api/profile/security`
- `PATCH /api/profile/security`
- `POST /api/profile/security/generate-backup-codes`
- `GET /api/profile/login-activity`

### Dashboard + Review
- `GET /api/dashboard/summary` (accountant)
- `GET /api/dashboard/review-queue` (accountant)
- `POST /api/reviews/:documentId/action` (`approve`, `reject`, `request_fix`)

## Notes

- Current data store is in-memory for speed while building UI.
- Restarting backend resets data.
- Next phase can swap to PostgreSQL/MongoDB without changing API shape much.
