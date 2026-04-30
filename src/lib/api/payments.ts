import { api } from "./client";
import type { Paginated, Payment, PaymentStatus } from "./types";

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  orderId?: number;
  deliveryRequestId?: number;
  status?: PaymentStatus;
}

export interface CreateMockPaymentPayload {
  provider?: string;
  method?: string;
  transactionId?: string;
  status?: PaymentStatus;
}

export interface CreateRefundPayload {
  amountCents?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "other";
  note?: string;
}

export const paymentsService = {
  list: (params: ListPaymentsParams = {}) =>
    api.get<Paginated<Payment>>("/payments", { query: params }),

  getById: (id: number) => api.get<Payment>(`/payments/${id}`),

  listByOrder: (orderId: number) =>
    api.get<Payment[]>(`/payments/orders/${orderId}`),

  listByDeliveryRequest: (deliveryRequestId: number) =>
    api.get<Payment[]>(`/payments/delivery-requests/${deliveryRequestId}`),

  createMock: (orderId: number, payload: CreateMockPaymentPayload) =>
    api.post<Payment>(`/payments/orders/${orderId}/mock`, payload),

  createMockForDeliveryRequest: (
    deliveryRequestId: number,
    payload: CreateMockPaymentPayload,
  ) =>
    api.post<Payment>(
      `/payments/delivery-requests/${deliveryRequestId}/mock`,
      payload,
    ),

  updateStatus: (id: number, status: PaymentStatus) =>
    api.patch<Payment>(`/payments/${id}/status`, { status }),

  refund: (id: number, payload: CreateRefundPayload) =>
    api.post<Payment>(`/payments/${id}/refund`, payload),
};
