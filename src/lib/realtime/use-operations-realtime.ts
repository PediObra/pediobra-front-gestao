"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  createAppSyncEventsClient,
  getAppSyncRealtimeConfig,
  isAppSyncRealtimeConfigured,
} from "@/lib/realtime/appsync-events-client";
import { getApiUrl } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { getAuthSnapshot, useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/query-keys";

const OPERATION_EVENTS = [
  "operations.order.created",
  "operations.payment.updated",
  "operations.driver.assigned",
  "operations.order.status.updated",
  "operations.deliveryRequest.status.updated",
  "operations.job.offer.created",
  "operations.job.offer.expired",
  "messages.updated",
] as const;

const EVENT_LABELS: Record<(typeof OPERATION_EVENTS)[number], string> = {
  "operations.order.created": "Novo pedido recebido",
  "operations.payment.updated": "Pagamento atualizado",
  "operations.driver.assigned": "Motorista atribuído",
  "operations.order.status.updated": "Pedido atualizado",
  "operations.deliveryRequest.status.updated": "Entrega atualizada",
  "operations.job.offer.created": "Oferta enviada ao motorista",
  "operations.job.offer.expired": "Oferta expirada",
  "messages.updated": "Nova mensagem",
};
const TOASTED_OPERATION_EVENTS = new Set<(typeof OPERATION_EVENTS)[number]>([
  "operations.order.created",
  "messages.updated",
]);

export function useOperationsRealtime(enabled = true) {
  const qc = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore(
    (state) => Boolean(state.accessToken) && Boolean(state.user),
  );

  useEffect(() => {
    if (!enabled || !isAuthenticated || !accessToken) return;

    const refreshOperationData = (eventName: (typeof OPERATION_EVENTS)[number]) => {
      qc.invalidateQueries({ queryKey: queryKeys.operations.all() });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all() });
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      qc.invalidateQueries({ queryKey: queryKeys.messages.all() });

      if (TOASTED_OPERATION_EVENTS.has(eventName)) {
        toast.message(EVENT_LABELS[eventName], {
          description: "Painel operacional atualizado em tempo real.",
        });
      }
    };

    const realtimeProvider = getRealtimeProvider();

    if (realtimeProvider === "appsync") {
      const config = getAppSyncRealtimeConfig();
      const channels = getManagementRealtimeChannels(user);

      if (config && channels.length) {
        const client = createAppSyncEventsClient({
          ...config,
          token: accessToken,
          channels,
          handlers: Object.fromEntries(
            OPERATION_EVENTS.map((eventName) => [
              eventName,
              () => refreshOperationData(eventName),
            ]),
          ),
          onError: (message) => {
            if (!getAuthSnapshot().accessToken) return;
            if (process.env.NODE_ENV === "development") {
              console.warn("AppSync realtime failed", message);
            }
          },
        });

        return () => client.disconnect();
      }

      if (process.env.NODE_ENV === "development") {
        console.warn(
          "AppSync realtime is selected but endpoints or channels are missing.",
        );
      }
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "AppSync realtime is selected but endpoints or channels are missing.",
        );
      }

      return;
    }

    const socket = io(`${getApiUrl()}/realtime`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    for (const eventName of OPERATION_EVENTS) {
      socket.on(eventName, () => refreshOperationData(eventName));
    }

    socket.on("connect_error", (error) => {
      if (!getAuthSnapshot().accessToken) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("Realtime connection failed", error.message);
      }
    });

    return () => {
      for (const eventName of OPERATION_EVENTS) {
        socket.off(eventName);
      }
      socket.disconnect();
    };
  }, [accessToken, enabled, isAuthenticated, qc, user]);
}

function getRealtimeProvider() {
  const provider = process.env.NEXT_PUBLIC_REALTIME_PROVIDER?.trim().toLowerCase();
  if (provider === "appsync" || provider === "socketio") return provider;
  if (provider === "socket.io") return "socketio";
  if (provider && process.env.NODE_ENV === "production") {
    throw new Error(`Unsupported realtime provider: ${provider}`);
  }
  return isAppSyncRealtimeConfigured() ? "appsync" : "socketio";
}

function getManagementRealtimeChannels(user: AuthUser | null) {
  if (!user) return [];

  const channels = [`/users/${user.id}`];

  if (user.roles.includes("ADMIN")) channels.push("/admins");

  for (const membership of user.sellers) {
    channels.push(`/sellers/${membership.seller.id}`);
  }

  return channels;
}
