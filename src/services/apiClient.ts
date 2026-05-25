const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const RAW_USE_BACKEND = (import.meta.env.VITE_USE_BACKEND as string | undefined)?.trim();

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

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

export async function apiPutJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(buildUrl(path), {
    ...init,
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as TResponse;
}

export async function apiPostJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(buildUrl(path), {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as TResponse;
}

export function hasApiBaseUrl() {
  return USE_BACKEND;
}
