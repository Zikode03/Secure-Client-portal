import type { ApiBody, ApiDownloadRoute, ApiPath, ApiResponse, ApiRoute } from "./apiContractTypes";
const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
interface ApiErrorBody {
  code?: string;
  message?: string;
  error?: string | { code?: string; message?: string };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(status: number, message: string, code?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function normalizeBaseUrl(url?: string) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL);
const USE_BACKEND = true;

function buildUrl(path: string) {
  const origin = new URL(API_BASE_URL || window.location.origin).origin;
  const candidate = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  // Resolve exactly as the browser does, including backslash normalization.
  const target = new URL(candidate, window.location.origin);
  if (target.origin !== origin || target.username || target.password) {
    throw new ApiError(0, "Requests must use the configured API origin.", "UNTRUSTED_API_URL");
  }
  return candidate;
}

function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return headers;
}

let csrfTokenPromise: Promise<string> | undefined;

function getCsrfToken() {
  if (!csrfTokenPromise) {
    const pending = (async () => {
      const response = await fetch(buildUrl("/api/auth/csrf"), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) await throwApiError(response, "/api/auth/csrf");
      const body = await readJsonResponse<ApiResponse<"/api/auth/csrf">>(response);
      if (!body?.requestToken) throw new ApiError(0, "Could not establish a secure session.", "CSRF_UNAVAILABLE");
      return body.requestToken;
    })();
    csrfTokenPromise = pending;
    void pending.catch(() => { if (csrfTokenPromise === pending) csrfTokenPromise = undefined; });
  }
  return csrfTokenPromise;
}

async function apiMutation(path: string, init: RequestInit, request?: Request): Promise<Response> {
  const url = buildUrl(path);
  for (let attempt = 0; attempt < 2; attempt++) {
    const pending = getCsrfToken();
    const token = await pending;
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", token);
    // Keep an unused original Request so an explicit CSRF rejection can replay
    // JSON, FormData or file bodies without buffering/serializing them again.
    const response = request
      ? await fetch(new Request(request.clone(), { credentials: "include", headers }))
      : await fetch(url, { ...init, credentials: "include", headers });
    if (attempt === 0 && response.status === 403) {
      const body = await response.clone().json().catch(() => null) as ApiErrorBody | null;
      if (body?.code === "CSRF_INVALID") {
        if (csrfTokenPromise === pending) csrfTokenPromise = undefined;
        continue; // The middleware rejected the request before its action executed.
      }
    }
    if (response.ok && /\/api\/auth\/(login|logout|complete-invite|refresh|change-password|mfa\/verify)(?:\?|$)/.test(url)) {
      csrfTokenPromise = undefined;
    }
    return response;
  }
  throw new ApiError(403, "Could not validate the security token.", "CSRF_INVALID");
}

/** Absolute API base for clients that construct native Request objects. */
export function getApiBaseUrl() {
  return API_BASE_URL || window.location.origin;
}

/** Shared transport for the generated OpenAPI client; preserves ApiError behavior. */
export async function apiContractFetch(request: Request): Promise<Response> {
  buildUrl(request.url); // Reject another origin before obtaining tokens or sending cookies.
  const method = request.method.toUpperCase();
  const response = ["GET", "HEAD", "OPTIONS"].includes(method)
    ? await fetch(new Request(request, { credentials: "include", headers: buildHeaders({ headers: request.headers }) }))
    : await apiMutation(request.url, { headers: buildHeaders({ headers: request.headers }) }, request);
  if (!response.ok) await throwApiError(response, new URL(request.url).pathname);
  return response;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const bodyText = await response.text();
  if (!bodyText.trim()) {
    return undefined as T;
  }

  return JSON.parse(bodyText) as T;
}

async function throwApiError(response: Response, path: string): Promise<never> {
  const bodyText = await response.text();
  let payload: ApiErrorBody | undefined;

  if (bodyText.trim()) {
    try {
      payload = JSON.parse(bodyText) as ApiErrorBody;
    } catch {
      payload = undefined;
    }
  }

  const nestedError =
    typeof payload?.error === "string"
      ? { message: payload.error }
      : typeof payload?.error === "object"
        ? payload.error
        : undefined;

  const code = payload?.code ?? nestedError?.code;
  const message =
    payload?.message ??
    nestedError?.message ??
    `API request failed (${response.status}) for ${path}`;

  throw new ApiError(response.status, message, code, payload);
}

export function apiGetJson<const P extends ApiRoute<"get">>(path: P & ApiPath<P, "get">, init?: RequestInit): Promise<ApiResponse<P>>;
export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    method: "GET",
    credentials: "include",
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<T>(response);
}

export async function apiGetBlob<const P extends ApiDownloadRoute>(
  path: P,
  init?: RequestInit,
): Promise<{ blob: Blob; contentType: string }> {
  const response = await fetch(buildUrl(path), {
    ...init,
    method: "GET",
    credentials: "include",
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get("Content-Type")?.trim() || "application/octet-stream",
  };
}

export function apiPutJson<const P extends ApiRoute<"put">>(path: P & ApiPath<P, "put">, body: ApiBody<NoInfer<P>, "put">, init?: RequestInit): Promise<ApiResponse<P, "put">>;
export async function apiPutJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = buildHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await apiMutation(path, {
    ...init,
    method: "PUT",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export function apiPostJson<const P extends ApiRoute<"post">>(path: P & ApiPath<P, "post">, body: ApiBody<NoInfer<P>, "post">, init?: RequestInit): Promise<ApiResponse<P, "post">>;
export async function apiPostJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = buildHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await apiMutation(path, {
    ...init,
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export function apiPatchJson<const P extends ApiRoute<"patch">>(path: P & ApiPath<P, "patch">, body: ApiBody<NoInfer<P>, "patch">, init?: RequestInit): Promise<ApiResponse<P, "patch">>;
export async function apiPatchJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = buildHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await apiMutation(path, {
    ...init,
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export function apiPostForm<const P extends ApiRoute<"post">>(path: P & ApiPath<P, "post">, body: FormData, init?: RequestInit): Promise<ApiResponse<P, "post">>;
export async function apiPostForm<TResponse>(
  path: string,
  body: FormData,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = buildHeaders(init);
  headers.delete("Content-Type");

  const response = await apiMutation(path, {
    ...init,
    method: "POST",
    credentials: "include",
    headers,
    body,
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export function apiDelete<const P extends ApiRoute<"delete">>(path: P & ApiPath<P, "delete">, init?: RequestInit): Promise<ApiResponse<P, "delete">>;
export async function apiDelete<TResponse = void>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await apiMutation(path, {
    ...init,
    method: "DELETE",
    credentials: "include",
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export function hasApiBaseUrl() {
  return USE_BACKEND;
}
