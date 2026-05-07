import { api } from "./client";
import type { AuthResponse, AuthUser } from "./types";

export type EmailVerificationPurpose =
  | "CUSTOMER_REGISTER"
  | "SELLER_REGISTER"
  | "DRIVER_REGISTER";

export interface EmailVerificationResponse {
  email: string;
  purpose: EmailVerificationPurpose;
  expiresAt: string;
  devCode?: string;
}

export interface ConfirmEmailVerificationResponse {
  emailVerificationToken: string;
  expiresAt: string;
}

export const authService = {
  createEmailVerification: (payload: {
    email: string;
    purpose: EmailVerificationPurpose;
  }) =>
    api.post<EmailVerificationResponse>("/auth/email-verifications", payload, {
      skipAuth: true,
    }),

  confirmEmailVerification: (payload: {
    email: string;
    purpose: EmailVerificationPurpose;
    code: string;
  }) =>
    api.post<ConfirmEmailVerificationResponse>(
      "/auth/email-verifications/confirm",
      payload,
      { skipAuth: true },
    ),

  login: (payload: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", payload, { skipAuth: true }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    emailVerificationToken: string;
  }) =>
    api.post<{ id: number; name: string; email: string; roles: string[] }>(
      "/auth/register",
      payload,
      { skipAuth: true },
    ),

  registerSeller: (payload: {
    name: string;
    email: string;
    password: string;
    emailVerificationToken: string;
  }) =>
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
