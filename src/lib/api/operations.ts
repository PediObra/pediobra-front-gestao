import { api } from "./client";
import type { OperationOffer, OperationOverview } from "./types";

export const operationsService = {
  overview: () => api.get<OperationOverview>("/operations/overview"),

  runDispatchCycle: () =>
    api.post<{ created: number; expired: number }>(
      "/operations/dispatch-cycle",
    ),

  expireOffer: (offerId: number) =>
    api.post<OperationOffer>(`/operations/offers/${offerId}/expire`),
};
