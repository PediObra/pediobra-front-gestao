"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hydrateAuthStore, useAuthStore } from "@/lib/auth/store";
import { authService } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { needsSellerOnboarding } from "@/lib/auth/permissions";
import {
  SELLER_ONBOARDING_PATH,
  isPublicAuthPath,
  isSellerOnboardingPath,
  isTeamInvitationPath,
} from "@/lib/auth/routes";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const fetchedOnce = useRef(false);

  useEffect(() => {
    hydrateAuthStore();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) return;
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    authService
      .me()
      .then((me) => setUser(me))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clear();
        }
      });
  }, [hydrated, accessToken, setUser, clear]);

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = isPublicAuthPath(pathname);
    const isSellerOnboarding = isSellerOnboardingPath(pathname);
    const isTeamInvitation = isTeamInvitationPath(pathname);

    if (!accessToken && !isPublic) {
      router.replace("/login");
      return;
    }

    if (!accessToken || !user) return;

    if (needsSellerOnboarding(user)) {
      if (!isSellerOnboarding && !isTeamInvitation) {
        router.replace(SELLER_ONBOARDING_PATH);
      }
      return;
    }

    if ((isPublic && !isTeamInvitation) || isSellerOnboarding) {
      router.replace("/dashboard");
    }
  }, [hydrated, accessToken, user, pathname, router]);

  return children;
}
