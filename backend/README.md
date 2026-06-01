# Backend Run Guide (Visual Studio + MySQL Docker)

## 1) Start MySQL in Docker

From the `backend` folder:

```powershell
docker compose -f docker-compose.mysql.yml up -d
```

MySQL will be exposed at `localhost:3306` with:
- Database: `secure_client_portal_dev`
- User: `portal_user`
- Password: `portal_password`

## 2) Run API from Visual Studio

1. Open `backend/SecureClientPortal.Backend.slnx` in Visual Studio.
2. Set startup project to `SecureClientPortal.Backend`.
3. Start with `https` or `http` profile.

Swagger/API should be available at:
- `https://localhost:7099/swagger` (HTTPS profile), or
- `http://localhost:5127/swagger` (HTTP profile)

## 3) If frontend should use backend

In project root `.env`:

```env
VITE_USE_BACKEND=true
VITE_API_BASE_URL=http://localhost:5127
```

Then run frontend:

```powershell
npm run dev
```
