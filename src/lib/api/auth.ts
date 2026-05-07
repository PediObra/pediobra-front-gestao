import { api } from "./client";
import type { AuthResponse, AuthUser } from "./types";

export const authService = {
  login: (payload: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", payload, { skipAuth: true }),

  register: (payload: { name: string; email: string; password: string }) =>
    api.post<{ id: number; name: string; email: string; roles: string[] }>(
      "/auth/register",
      payload,
      { skipAuth: true },
    ),

  registerSeller: (payload: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>("/auth/register/seller", payload, {
      skipAuth: true,
    }),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>(
      "/auth/refresh",
      { refreshToken },
      { skipAuth: true },
    ),

  me: () => api.get<AuthUser>("/auth/me"),
};
