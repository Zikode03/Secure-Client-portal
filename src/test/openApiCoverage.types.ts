import { apiGetBlob, apiGetJson, apiPostJson, apiPutJson } from "../services/apiClient";

// Compile-only assertions: these are never sent as HTTP requests.
export async function assertOpenApiCoverage() {
  const users = await apiGetJson("/api/admin/users");
  users[0].email.toLowerCase();
  // @ts-expect-error response fields come from OpenAPI, not caller-supplied shapes
  users[0].inventedField;
  // @ts-expect-error unknown endpoints are rejected
  await apiGetJson("/api/not-a-portal-endpoint");
  // @ts-expect-error a document id cannot consume extra route segments
  await apiGetJson("/api/documents/id/does-not-exist");
  // @ts-expect-error the method must exist for the endpoint
  await apiPostJson("/api/admin/team-progress", {});
  // @ts-expect-error request body fields are checked
  await apiPutJson("/api/admin/users/user-id/role", { role: 42 });
  // @ts-expect-error missing required request fields are rejected
  await apiPostJson("/api/auth/login", { email: "test@example.invalid" });
  // @ts-expect-error caller-defined response overrides cannot bypass the contract
  await apiGetJson<{ inventedField: string }>("/api/admin/users");
  // @ts-expect-error JSON endpoints cannot be downloaded through the binary transport
  await apiGetBlob("/api/admin/users");
  const versions = await apiGetJson(`/api/documents/${encodeURIComponent("id")}/versions`);
  versions[0].versionNumber.toFixed();
  const roles = await apiGetJson("/api/roles");
  roles[0].permissions.includes("roles.update");
}
