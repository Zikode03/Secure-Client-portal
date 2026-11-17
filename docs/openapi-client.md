# OpenAPI frontend client

The backend's Swagger metadata is the source of truth. The frontend commits its
snapshot at `openapi/portal-api.json` and generates
`src/services/generated/portal-api.d.ts` with `openapi-typescript`.
`portalApiClient.ts` uses those generated types with `openapi-fetch` to check
paths, HTTP methods, parameters, request bodies and responses at compile time.

Client, admin and accountant screens now use generated contracts throughout their
backend calls, including authentication, settings, users, roles, assignments,
inboxes, documents, compliance and monthly packs. The route-aware helpers in
`apiClient.ts` infer request/response types from `paths` through
`apiContractTypes.ts`; callers cannot provide a replacement response interface.
The feature clients built with `portalApiClient` continue using the same generated
contracts and protected transport. Binary requests are limited to documented file
endpoints, and multipart uploads preserve their existing FormData handling.

The contract currently describes 202 operations. Roles and assignments have explicit
backend response DTOs. Other success responses are derived from actual C# return
expressions by `tools/ContractMetadata`. Correct genuine field, nullability and union
mismatches instead of casting payloads to make the build pass. Screen view models
may remain local; their incoming values must satisfy the generated response types.

Generic transport overrides exist only in `src/test/fixtures/apiTransportFixture.ts`
for isolated transport and component tests. Production imports of fixtures are
rejected. No fixture data or test adapter is included in product workflows.

## Updating a backend contract

1. Change backend DTOs/actions and document their actual response types. Run the
   backend's export command and commit its `openapi/portal-api.json` snapshot.
2. From this frontend repository, synchronize that same backend checkout:

   ```powershell
   npm run api:sync -- --backend-root "C:\path\to\Secure-Client-portal-backend"
   ```

   Alternatively set `PORTAL_BACKEND_ROOT` and run `npm run api:sync`.
   This builds the API in Release, exports metadata without running the server,
   and regenerates TypeScript. It does not connect to SQL Server, run migrations,
   create encryption keys, start background jobs or reactivate bank integration.
   Before exporting, it regenerates source response metadata and rebuilds the API
   to embed it. Check mode verifies that metadata without rewriting it.
3. Fix genuine TypeScript mismatches, run `npm run build:check`, and run relevant
   tests. Commit the frontend snapshot and generated types with the client changes.
4. To verify an existing frontend snapshot against a specific backend checkout:

   ```powershell
   npm run api:sync -- --backend-root "C:\path\to\Secure-Client-portal-backend" --check
   ```

`npm run api:generate` regenerates types from the committed frontend snapshot.
`npm run api:check` compares generated types to that snapshot and checks every
production API helper call for resolved OpenAPI types and test-transport imports,
without writing files.
Both build commands run this check first. Compile-only assertions in
`src/test/openApiCoverage.types.ts` verify that unknown routes, wrong methods,
invalid request bodies and response overrides are rejected. `npm run api:test` checks that missing
and modified generated files cause a failure.

Frontend CI verifies its snapshot/types, TypeScript, bundle and client tests.
Backend CI exports fresh controller metadata and rejects a changed backend
snapshot, checks source response metadata and runs the complete backend suite.
Frontend CI runs the complete frontend suite. These are separate repositories:
frontend CI does not silently fetch a
different backend branch or assume that its snapshot matches the deployed API.
Use `api:sync --check` with the intended backend checkout and coordinate releases.

## Calling the client

```ts
import { apiData, portalApiClient } from "./portalApiClient";

const users = await apiData(portalApiClient.GET("/api/admin/users"));
const documents = await apiData(portalApiClient.GET("/api/documents"));

```

Use `apiData` only when the endpoint promises a JSON payload. For a documented
204 response, use the typed client directly and inspect its response. Do not
submit requests from the compile-only examples in `openApiContract.typecheck.ts`.

The adapter in `apiClient.ts` reuses the existing trusted API origin, includes
HttpOnly session cookies, shares CSRF token bootstrap with the route-aware helpers and
invalidates tokens after authentication changes. It retries a write once only
when the server explicitly returns `CSRF_INVALID`. Native Request clones preserve
the body for that retry, including FormData, without reserializing files.
Non-success responses remain `ApiError` instances. Origin overrides are checked
before obtaining CSRF tokens or sending credentials. Browsers continue to enforce
CORS; generated types do not replace backend authorization or runtime validation.

Swagger documents `scp_access` cookie authentication and the `X-CSRF-Token`
security scheme. Anonymous mutations, including login, still require CSRF.
The existing `/api/auth/csrf` route now has a typed controller so it appears in
both the exported contract and development Swagger. Swagger UI remains enabled
only in Development; it is not added to client-facing portal navigation.

## Backend-only export

From the backend repository:

```powershell
dotnet build src/SecureClientPortal.Api/SecureClientPortal.Api.csproj --configuration Release
dotnet run --project tools/ContractMetadata/ContractMetadata.csproj --configuration Release -- .
dotnet build src/SecureClientPortal.Api/SecureClientPortal.Api.csproj --configuration Release
dotnet src/SecureClientPortal.Api/bin/Release/net8.0/SecureClientPortal.Api.dll --export-openapi openapi/portal-api.json
```

The normal API startup path is unchanged when the export argument is absent.
The exporter uses the same Swagger registration, stable operation IDs, qualified
schema IDs and sorted JSON in both repositories. Response nullability and required
banking properties are represented explicitly. Banking errors document service
errors, automatic model validation and API exception responses.

Dependency installation currently uses `npm ci --legacy-peer-deps` because the
existing React Vite plugin declares Vite <=7 while this repository uses Vite 8.
OpenAPI packages are pinned. `@testing-library/dom` is now an explicit development
dependency so the legacy peer-resolution mode retains the existing test runtime.

Reference documentation: [OpenAPI TypeScript](https://openapi-ts.dev/node) and
[openapi-fetch](https://openapi-ts.dev/openapi-fetch/api).

## Verification scope

The exported contract contains 145 paths and 186 operations, with zero missing
success contracts. All frontend tests pass (260) and all backend tests pass (231).
Compile-time negative checks, metadata coverage checks and missing/stale artifact
checks pass. Nine checks also ran against an isolated SQL Server database to verify
account identity and audit transaction rollback; that database was then removed.
Local verification is not a production deployment or a full real-browser journey.
No running Visual Studio API was restarted.
