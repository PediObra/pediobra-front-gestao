"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { authService } from "@/lib/api/auth";
import type { AuthUser, RoleName } from "@/lib/api/types";
import {
  canAccessSeller,
  canEditSeller,
  canManageSellerProducts,
  canManageSellerStaff,
  hasRole,
  isAdmin,
  isDriver,
  isSeller,
  membershipFor,
  needsSellerOnboarding,
  sellerIdsOf,
} from "@/lib/auth/permissions";

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (role: RoleName) => boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isDriver: boolean;
  needsSellerOnboarding: boolean;
  sellerIds: number[];
  canAccessSeller: (sellerId: number) => boolean;
  canEditSeller: (sellerId: number) => boolean;
  canManageSellerProducts: (sellerId: number) => boolean;
  canManageSellerStaff: (sellerId: number) => boolean;
  membershipFor: (sellerId: number) => ReturnType<typeof membershipFor>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const response = await authService.login(credentials);
      setSession(response);
      return response.user;
    },
    [setSession],
  );

  const logout = useCallback(() => {
    clear();
    router.replace("/login");
  }, [clear, router]);

  return {
    user,
    isAuthenticated: !!accessToken && !!user,
    isLoading: !hydrated,
    login,
    logout,
    hasRole: (role) => hasRole(user, role),
    isAdmin: isAdmin(user),
    isSeller: isSeller(user),
    isDriver: isDriver(user),
    needsSellerOnboarding: needsSellerOnboarding(user),
    sellerIds: sellerIdsOf(user),
    canAccessSeller: (sellerId: number) => canAccessSeller(user, sellerId),
    canEditSeller: (sellerId: number) => canEditSeller(user, sellerId),
    canManageSellerProducts: (sellerId: number) =>
      canManageSellerProducts(user, sellerId),
    canManageSellerStaff: (sellerId: number) =>
      canManageSellerStaff(user, sellerId),
    membershipFor: (sellerId: number) => membershipFor(user, sellerId),
  };
}
