import { getAuthSnapshot, useAuthStore } from "@/lib/auth/store";
import { getLanguageSnapshot } from "@/lib/i18n/language-store";
import type { ApiErrorBody } from "./types";

const CONFIGURED_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function isLocalHostUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

function shouldUseSameOriginApi() {
  if (typeof window === "undefined") return false;
  if (!isLocalHostUrl(CONFIGURED_API_URL)) return false;

  return !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
    window.location.hostname,
  );
}

export function getApiUrl() {
  if (shouldUseSameOriginApi()) {
    return window.location.origin;
  }

  return CONFIGURED_API_URL;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message);
    this.status = status;
    this.body = body;
  }

  get displayMessage() {
    if (!this.body) return this.message;
    const msg = this.body.message;
    if (Array.isArray(msg)) return msg.join(" • ");
    return msg || this.message;
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue> | object;

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  skipAuth?: boolean;
}

function buildUrl(path: string, query?: QueryParams) {
  const apiUrl = getApiUrl();
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    apiUrl.endsWith("/") ? apiUrl : apiUrl + "/",
  );

  if (query) {
    for (const [key, value] of Object.entries(
      query as Record<string, QueryValue>,
    )) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text || null;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const { refreshToken } = getAuthSnapshot();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: {
          "Accept-Language": getLanguageSnapshot().language,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        useAuthStore.getState().clear();
        return false;
      }

      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: import("./types").AuthUser;
      };

      useAuthStore.getState().setSession(data);
      return true;
    } catch {
      useAuthStore.getState().clear();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function executeRequest<T>(
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<T> {
  const { method = "GET", query, body, signal, skipAuth } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": getLanguageSnapshot().language,
  };

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = getAuthSnapshot().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body:
      body === undefined || body === null
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal,
  });

  if (response.status === 401 && !skipAuth && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return executeRequest<T>(path, options, true);
    }
  }

  const parsed = await parseBody(response);

  if (!response.ok) {
    const errorBody =
      parsed && typeof parsed === "object" ? (parsed as ApiErrorBody) : null;
    const message =
      errorBody?.message && typeof errorBody.message === "string"
        ? errorBody.message
        : Array.isArray(errorBody?.message)
          ? errorBody.message.join(" • ")
          : response.statusText || "Request failed";
    throw new ApiError(response.status, message, errorBody);
  }

  return parsed as T;
}

export function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return executeRequest<T>(path, options, false);
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};

export const API_URL = CONFIGURED_API_URL;
