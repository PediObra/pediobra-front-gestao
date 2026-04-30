import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/lib/api/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  clear: () => void;
  markHydrated: () => void;
}

let authHydrationStarted = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "pediobra-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
      skipHydration: true,
    },
  ),
);

export function hydrateAuthStore() {
  if (typeof window === "undefined") return;

  if (useAuthStore.persist.hasHydrated()) {
    useAuthStore.getState().markHydrated();
    return;
  }

  if (authHydrationStarted) return;
  authHydrationStarted = true;
  void useAuthStore.persist.rehydrate();
}

export function getAuthSnapshot() {
  return useAuthStore.getState();
}
