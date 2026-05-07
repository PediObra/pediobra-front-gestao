"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hydrateAuthStore, useAuthStore } from "@/lib/auth/store";
import { authService } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { needsSellerOnboarding } from "@/lib/auth/permissions";

const PUBLIC_PATHS = ["/login", "/register"];
const SELLER_ONBOARDING_PATH = "/onboarding/seller";

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
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    const isSellerOnboarding =
      pathname === SELLER_ONBOARDING_PATH ||
      pathname.startsWith(`${SELLER_ONBOARDING_PATH}/`);

    if (!accessToken && !isPublic) {
      router.replace("/login");
      return;
    }

    if (!accessToken || !user) return;

    if (needsSellerOnboarding(user)) {
      if (!isSellerOnboarding) {
        router.replace(SELLER_ONBOARDING_PATH);
      }
      return;
    }

    if (isPublic || isSellerOnboarding) {
      router.replace("/dashboard");
    }
  }, [hydrated, accessToken, user, pathname, router]);

  return children;
}
