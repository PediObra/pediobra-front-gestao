"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api/client";
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

export function useOperationsRealtime() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore(
    (state) => Boolean(state.accessToken) && Boolean(state.user),
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io(`${getApiUrl()}/realtime`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    const refreshOperationData = (eventName: (typeof OPERATION_EVENTS)[number]) => {
      qc.invalidateQueries({ queryKey: queryKeys.operations.all() });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all() });
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      qc.invalidateQueries({ queryKey: queryKeys.messages.all() });

      toast.message(EVENT_LABELS[eventName], {
        description: "Painel operacional atualizado em tempo real.",
      });
    };

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
  }, [accessToken, isAuthenticated, qc]);
}
