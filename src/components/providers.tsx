"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster, toast, type ExternalToast } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { ApiError } from "@/lib/api/client";
import { ThemeProvider } from "@/lib/theme-provider";

type ToastMethod = "success" | "info" | "warning" | "error" | "message" | "loading";

let activeToastId: string | number | undefined;
let toastSequence = 0;
let singleToastSlotConfigured = false;

function configureSingleToastSlot() {
  if (singleToastSlotConfigured) return;
  singleToastSlotConfigured = true;

  const methods: ToastMethod[] = [
    "success",
    "info",
    "warning",
    "error",
    "message",
    "loading",
  ];

  for (const method of methods) {
    const original = toast[method].bind(toast);
    toast[method] = ((message, data) => {
      if (activeToastId !== undefined) {
        toast.dismiss(activeToastId);
      }

      const id = data?.id ?? `gestao-toast-${++toastSequence}`;
      activeToastId = id;

      const nextData: ExternalToast = {
        ...data,
        id,
        onAutoClose: (closedToast) => {
          if (activeToastId === id) activeToastId = undefined;
          data?.onAutoClose?.(closedToast);
        },
        onDismiss: (dismissedToast) => {
          if (activeToastId === id) activeToastId = undefined;
          data?.onDismiss?.(dismissedToast);
        },
      };

      return original(message, nextData);
    }) as (typeof toast)[typeof method];
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  configureSingleToastSlot();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error instanceof ApiError) {
                if ([401, 403, 404].includes(error.status)) return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
        expand={false}
        visibleToasts={1}
        duration={2600}
        toastOptions={{
          classNames: {
            toast: "gestao-toast !font-sans",
          },
        }}
      />
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
