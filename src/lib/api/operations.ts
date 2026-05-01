import { api } from "./client";
import type { OperationOffer, OperationOverview } from "./types";

export interface ListOperationsOverviewParams {
  sellerId?: number;
}

export const operationsService = {
  overview: (params: ListOperationsOverviewParams = {}) =>
    api.get<OperationOverview>("/operations/overview", { query: params }),

  runDispatchCycle: () =>
    api.post<{ created: number; expired: number }>(
      "/operations/dispatch-cycle",
    ),

  expireOffer: (offerId: number) =>
    api.post<OperationOffer>(`/operations/offers/${offerId}/expire`),
};
