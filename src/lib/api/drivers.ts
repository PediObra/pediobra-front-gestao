import { api } from "./client";
import type {
  DriverProfile,
  DriverStatus,
  Paginated,
  StripeConnectStatus,
} from "./types";

export interface ListDriversParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DriverStatus;
}

export const driversService = {
  list: (params: ListDriversParams = {}) =>
    api.get<Paginated<DriverProfile>>("/drivers", { query: params }),

  getById: (id: number) => api.get<DriverProfile>(`/drivers/${id}`),

  getStripeConnectStatus: (id: number) =>
    api.get<StripeConnectStatus>(`/drivers/${id}/stripe-connect/status`),

  updateStatus: (id: number, status: DriverStatus) =>
    api.patch<DriverProfile>(`/drivers/${id}/status`, { status }),
};
