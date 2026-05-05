import { api } from "./client";
import type { Paginated, Payment, PaymentPayout, PaymentStatus } from "./types";

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  orderId?: number;
  deliveryRequestId?: number;
  status?: PaymentStatus;
}

export interface ListPaymentPayoutsParams {
  page?: number;
  limit?: number;
  status?: string;
  transferStatus?: string;
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

export interface StripePaymentResponse {
  payment: Payment;
  clientSecret: string | null;
  paymentIntentId: string | null;
}

export const paymentsService = {
  list: (params: ListPaymentsParams = {}) =>
    api.get<Paginated<Payment>>("/payments", { query: params }),

  listPayouts: (params: ListPaymentPayoutsParams = {}) =>
    api.get<Paginated<PaymentPayout>>("/payments/payouts", { query: params }),

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

  createStripeForDeliveryRequest: (deliveryRequestId: number) =>
    api.post<StripePaymentResponse>(
      `/payments/delivery-requests/${deliveryRequestId}/stripe`,
    ),

  updateStatus: (id: number, status: PaymentStatus) =>
    api.patch<Payment>(`/payments/${id}/status`, { status }),

  refund: (id: number, payload: CreateRefundPayload) =>
    api.post<Payment>(`/payments/${id}/refund`, payload),

  processPayouts: () => api.post<unknown>("/payments/payouts/process"),

  transferPayout: (id: number) =>
    api.post<unknown>(`/payments/payouts/${id}/transfer`),

  retryPayoutTransfer: (id: number) =>
    api.post<unknown>(`/payments/payouts/${id}/retry-transfer`),

  reversePayoutTransfer: (id: number) =>
    api.post<unknown>(`/payments/payouts/${id}/reverse-transfer`),
};
