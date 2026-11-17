import * as transport from "../../services/apiClient";
export * from "../../services/apiClient";
export const apiGetJson = transport.apiGetJson as unknown as <T>(path: string, init?: RequestInit) => Promise<T>;
export const apiPostJson = transport.apiPostJson as unknown as <R = unknown, B = unknown>(path: string, body: B, init?: RequestInit) => Promise<R>;
export const apiPutJson = transport.apiPutJson as unknown as <R = unknown, B = unknown>(path: string, body: B, init?: RequestInit) => Promise<R>;
export const apiPatchJson = transport.apiPatchJson as unknown as <R = unknown, B = unknown>(path: string, body: B, init?: RequestInit) => Promise<R>;
export const apiDelete = transport.apiDelete as unknown as <R = void>(path: string, init?: RequestInit) => Promise<R>;
export const apiPostForm = transport.apiPostForm as unknown as <R = unknown>(path: string, body: FormData, init?: RequestInit) => Promise<R>;
export const apiGetBlob = transport.apiGetBlob as (path: string, init?: RequestInit) => Promise<{blob: Blob; contentType: string}>;
