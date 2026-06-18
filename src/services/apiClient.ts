const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const RAW_USE_BACKEND = (import.meta.env.VITE_USE_BACKEND as string | undefined)?.trim();
const AUTH_TOKEN_KEY = "accounting-document-control-auth-token";
const AUTH_REFRESH_TOKEN_KEY = "accounting-document-control-refresh-token";

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
const USE_BACKEND =
  RAW_USE_BACKEND === "1" ||
  RAW_USE_BACKEND?.toLowerCase() === "true" ||
  Boolean(API_BASE_URL);

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  if (!path.startsWith("/")) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}

function readAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(AUTH_TOKEN_KEY)?.trim() ??
    window.sessionStorage.getItem(AUTH_TOKEN_KEY)?.trim() ??
    ""
  );
}

function writeStoredValue(key: string, value: string, persistent: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const target = persistent ? window.localStorage : window.sessionStorage;
  const alternate = persistent ? window.sessionStorage : window.localStorage;

  alternate.removeItem(key);
  target.setItem(key, value.trim());
}

function clearStoredValue(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const token = readAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
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
    nestedError?.message ??
    `API request failed (${response.status}) for ${path}`;

  throw new ApiError(response.status, message, code, payload);
}

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    method: "GET",
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<T>(response);
}

export async function apiPutJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = buildHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export async function apiPostJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = buildHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, path);
  }

  return readJsonResponse<TResponse>(response);
}

export function hasApiBaseUrl() {
  return USE_BACKEND;
}

export function setAuthToken(token: string, persistent = true) {
  writeStoredValue(AUTH_TOKEN_KEY, token, persistent);
}

export function setRefreshToken(token: string, persistent = true) {
  writeStoredValue(AUTH_REFRESH_TOKEN_KEY, token, persistent);
}

export function clearAuthToken() {
  clearStoredValue(AUTH_TOKEN_KEY);
}

export function clearRefreshToken() {
  clearStoredValue(AUTH_REFRESH_TOKEN_KEY);
}

export function getAuthToken() {
  return readAuthToken();
}

export function getRefreshToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)?.trim() ??
    window.sessionStorage.getItem(AUTH_REFRESH_TOKEN_KEY)?.trim() ??
    ""
  );
}
