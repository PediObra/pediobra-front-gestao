import { getAuthSnapshot, useAuthStore } from "@/lib/auth/store";
import { getLanguageSnapshot } from "@/lib/i18n/language-store";
import type { ApiErrorBody } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    API_URL.endsWith("/") ? API_URL : API_URL + "/",
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

export { API_URL };
