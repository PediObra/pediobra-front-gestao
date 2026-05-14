import { api } from "./client";
import { shouldUsePresignedUploads, uploadFileToStorage } from "./uploads";
import type {
  EvidenceType,
  FulfillmentMethod,
  InternalDeliveryAvailability,
  Order,
  OrderEvidence,
  OrderStatus,
  Paginated,
  SellerDeliveryProvider,
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
  fulfillmentMethod?: FulfillmentMethod;
  deliveryAddress?: string;
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
  deliveryProvider?: SellerDeliveryProvider;
}

export interface RejectOrderBySellerPayload {
  reason: string;
  details?: string;
}

export interface RejectOrderBySellerResponse {
  outcome:
    | "REASSIGNED"
    | "AWAITING_CUSTOMER_APPROVAL"
    | "CANCELLED_NO_ALTERNATIVE";
  order: Order | null;
  approval?: {
    expiresAt: string;
    oldTotalCents: number;
    newTotalCents: number;
    deltaCents: number;
  };
}

export interface AssignDriverPayload {
  driverProfileId: number;
}

export interface ConfirmOrderCodePayload {
  code: string;
  directPaymentReceived?: boolean;
  directPaymentMethod?: "CARD_POS" | "PIX_SELLER" | "CASH" | "OTHER";
  directPaymentReference?: string;
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

async function buildOrderEvidencePayload(
  id: number,
  payload: CreateOrderEvidencePayload,
) {
  if (!shouldUsePresignedUploads()) {
    return buildOrderEvidenceFormData(payload);
  }

  const upload = await uploadFileToStorage(payload.image, {
    bucketKey: "orders",
    prefix: `orders/${id}/evidences`,
  });

  return {
    evidenceType: payload.evidenceType,
    note: payload.note,
    imageObjectName: upload.objectName,
  };
}

export const ordersService = {
  list: (params: ListOrdersParams = {}) =>
    api.get<Paginated<Order>>("/orders", { query: params }),

  stats: (params: ListOrdersParams = {}) =>
    api.get<OrderStats>("/orders/stats", { query: params }),

  getById: (id: number) => api.get<Order>(`/orders/${id}`),

  getInternalDeliveryAvailability: (id: number) =>
    api.get<InternalDeliveryAvailability>(
      `/orders/${id}/internal-delivery-availability`,
    ),

  create: (payload: CreateOrderPayload) => api.post<Order>("/orders", payload),

  updateStatus: (id: number, payload: UpdateOrderStatusPayload) =>
    api.patch<Order>(`/orders/${id}/status`, payload),

  rejectBySeller: (id: number, payload: RejectOrderBySellerPayload) =>
    api.post<RejectOrderBySellerResponse>(
      `/orders/${id}/seller-rejections`,
      payload,
    ),

  approveReassignment: (id: number) =>
    api.post<Order>(`/orders/${id}/reassignment/approve`),

  cancelReassignment: (id: number) =>
    api.post<Order>(`/orders/${id}/reassignment/cancel`),

  assignDriver: (id: number, payload: AssignDriverPayload) =>
    api.patch<Order>(`/orders/${id}/assign-driver`, payload),

  confirmPickup: (id: number, payload: ConfirmOrderCodePayload) =>
    api.patch<Order>(`/orders/${id}/confirm-pickup`, payload),

  confirmDelivery: (id: number, payload: ConfirmOrderCodePayload) =>
    api.patch<Order>(`/orders/${id}/confirm-delivery`, payload),

  confirmCustomerPickup: (id: number, payload: ConfirmOrderCodePayload) =>
    api.patch<Order>(`/orders/${id}/confirm-customer-pickup`, payload),

  addEvidence: async (id: number, payload: CreateOrderEvidencePayload) =>
    api.post<OrderEvidence>(
      `/orders/${id}/evidences`,
      await buildOrderEvidencePayload(id, payload),
    ),
};
