import { api } from "./client";
import type {
  EvidenceType,
  Order,
  OrderEvidence,
  OrderStatus,
  Paginated,
} from "./types";

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sellerId?: number;
  clientUserId?: number;
  assignedDriverProfileId?: number;
  createdFrom?: string;
  createdTo?: string;
}

export interface OrderStats {
  total: number;
  active: number;
  delivered: number;
  cancelled: number;
  revenueCents: number;
  statusCounts: Partial<Record<OrderStatus, number>>;
}

export interface CreateOrderPayload {
  sellerId: number;
  deliveryAddress: string;
  customerAddressId?: number;
  deliveryCep?: string;
  contactPhone?: string;
  notes?: string;
  items: Array<{ sellerProductId: number; quantity: number }>;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  cancellationReason?: string;
  cancellationDetails?: string;
}

export interface AssignDriverPayload {
  driverProfileId: number;
}

export interface ConfirmOrderCodePayload {
  code: string;
}

export interface CreateOrderEvidencePayload {
  evidenceType: EvidenceType;
  image: File;
  note?: string;
}

function buildOrderEvidenceFormData(payload: CreateOrderEvidencePayload) {
  const formData = new FormData();

  formData.append("evidenceType", payload.evidenceType);
  formData.append("image", payload.image);
  if (payload.note) formData.append("note", payload.note);

  return formData;
}

export const ordersService = {
  list: (params: ListOrdersParams = {}) =>
    api.get<Paginated<Order>>("/orders", { query: params }),

  stats: (params: ListOrdersParams = {}) =>
    api.get<OrderStats>("/orders/stats", { query: params }),

  getById: (id: number) => api.get<Order>(`/orders/${id}`),

  create: (payload: CreateOrderPayload) => api.post<Order>("/orders", payload),

  updateStatus: (id: number, payload: UpdateOrderStatusPayload) =>
    api.patch<Order>(`/orders/${id}/status`, payload),

  assignDriver: (id: number, payload: AssignDriverPayload) =>
    api.patch<Order>(`/orders/${id}/assign-driver`, payload),

  confirmPickup: (id: number, payload: ConfirmOrderCodePayload) =>
    api.patch<Order>(`/orders/${id}/confirm-pickup`, payload),

  confirmDelivery: (id: number, payload: ConfirmOrderCodePayload) =>
    api.patch<Order>(`/orders/${id}/confirm-delivery`, payload),

  addEvidence: (id: number, payload: CreateOrderEvidencePayload) =>
    api.post<OrderEvidence>(
      `/orders/${id}/evidences`,
      buildOrderEvidenceFormData(payload),
    ),
};
