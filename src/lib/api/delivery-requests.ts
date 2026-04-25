import { api } from "./client";
import type {
  DeliveryRequest,
  DeliveryRequestEvidence,
  DeliveryRequestStatus,
  EvidenceType,
  Paginated,
} from "./types";

export interface ListDeliveryRequestsParams {
  page?: number;
  limit?: number;
  status?: DeliveryRequestStatus;
  requesterSellerId?: number;
  requesterUserId?: number;
  assignedDriverProfileId?: number;
  createdFrom?: string;
  createdTo?: string;
}

export interface DeliveryRequestStats {
  total: number;
  active: number;
  delivered: number;
  cancelled: number;
  feeCents: number;
  statusCounts: Partial<Record<DeliveryRequestStatus, number>>;
}

export interface QuoteDeliveryRequestPayload {
  pickupLatitude?: string;
  pickupLongitude?: string;
  dropoffLatitude?: string;
  dropoffLongitude?: string;
  pickupPlaceId?: string;
  dropoffPlaceId?: string;
  placesSessionToken?: string;
  pickupCep?: string;
  dropoffCep?: string;
}

export interface DeliveryRequestQuote {
  distanceMeters: number;
  estimatedFeeCents: number;
  pricingSource: "ESTIMATED";
  breakdown: {
    baseFeeCents: number;
    minimumFeeCents: number;
    feePerKmCents: number;
  };
}

export interface CreateDeliveryRequestPayload {
  requesterSellerId?: number;
  pickupAddress: string;
  pickupCep?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupLatitude?: string;
  pickupLongitude?: string;
  pickupPlaceId?: string;
  dropoffAddress: string;
  dropoffCep?: string;
  dropoffContactName?: string;
  dropoffContactPhone?: string;
  dropoffLatitude?: string;
  dropoffLongitude?: string;
  dropoffPlaceId?: string;
  placesSessionToken?: string;
  packageDescription: string;
  packageSize?: string;
  packageWeightGrams?: number;
  notes?: string;
  deliveryFeeCents?: number;
}

export interface UpdateDeliveryRequestStatusPayload {
  status: DeliveryRequestStatus;
  cancellationReason?: string;
  cancellationDetails?: string;
}

export interface AssignDeliveryRequestDriverPayload {
  driverProfileId: number;
}

export interface CreateDeliveryRequestEvidencePayload {
  evidenceType: EvidenceType;
  image: File;
  note?: string;
}

function buildDeliveryRequestEvidenceFormData(
  payload: CreateDeliveryRequestEvidencePayload,
) {
  const formData = new FormData();

  formData.append("evidenceType", payload.evidenceType);
  formData.append("image", payload.image);
  if (payload.note) formData.append("note", payload.note);

  return formData;
}

export const deliveryRequestsService = {
  quote: (payload: QuoteDeliveryRequestPayload) =>
    api.post<DeliveryRequestQuote>("/delivery-requests/quote", payload),

  list: (params: ListDeliveryRequestsParams = {}) =>
    api.get<Paginated<DeliveryRequest>>("/delivery-requests", {
      query: params,
    }),

  stats: (params: ListDeliveryRequestsParams = {}) =>
    api.get<DeliveryRequestStats>("/delivery-requests/stats", {
      query: params,
    }),

  getById: (id: number) =>
    api.get<DeliveryRequest>(`/delivery-requests/${id}`),

  create: (payload: CreateDeliveryRequestPayload) =>
    api.post<DeliveryRequest>("/delivery-requests", payload),

  updateStatus: (
    id: number,
    payload: UpdateDeliveryRequestStatusPayload,
  ) => api.patch<DeliveryRequest>(`/delivery-requests/${id}/status`, payload),

  assignDriver: (
    id: number,
    payload: AssignDeliveryRequestDriverPayload,
  ) =>
    api.patch<DeliveryRequest>(
      `/delivery-requests/${id}/assign-driver`,
      payload,
    ),

  addEvidence: (id: number, payload: CreateDeliveryRequestEvidencePayload) =>
    api.post<DeliveryRequestEvidence>(
      `/delivery-requests/${id}/evidences`,
      buildDeliveryRequestEvidenceFormData(payload),
    ),
};
