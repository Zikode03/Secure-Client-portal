import createClient from "openapi-fetch";
import type { paths } from "./generated/portal-api";
import { ApiError, apiContractFetch, getApiBaseUrl } from "./apiClient";

/** All generated operations use the same origin, cookies, CSRF and errors as legacy requests. */
export const portalApiClient = createClient<paths>({
  baseUrl: getApiBaseUrl(),
  credentials: "include",
  fetch: apiContractFetch,
});

/** JSON endpoints must return their documented success payload. */
export async function apiData<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> {
  const result = await request;
  if (result.data === undefined) throw new ApiError(result.response.status, "The API returned an empty response.", "EMPTY_API_RESPONSE");
  return result.data;
}
