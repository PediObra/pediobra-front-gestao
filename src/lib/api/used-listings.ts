import { api } from "./client";
import type {
  Paginated,
  UsedListing,
  UsedListingCondition,
  UsedListingInquiry,
  UsedListingInquiryStatus,
  UsedListingStatus,
} from "./types";

export interface ListUsedListingsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UsedListingStatus;
  condition?: UsedListingCondition;
  ownerUserId?: number;
  ownerSellerId?: number;
  baseProductId?: number;
  mine?: boolean;
  includeInactive?: boolean;
}

export interface ListUsedListingInquiriesParams {
  page?: number;
  limit?: number;
  listingId?: number;
  buyerUserId?: number;
  ownerSellerId?: number;
  status?: UsedListingInquiryStatus;
  mine?: boolean;
}

export interface CreateUsedListingPayload {
  ownerSellerId?: number;
  baseProductId?: number;
  title: string;
  description: string;
  condition: UsedListingCondition;
  quantity?: number;
  unit?: string;
  remainingAmountDescription?: string;
  priceCents?: number;
  negotiable?: boolean;
  status?: UsedListingStatus;
  publicNeighborhood?: string;
  publicCity?: string;
  publicState?: string;
  pickupAddress: string;
  pickupCep?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupLatitude?: string;
  pickupLongitude?: string;
}

export type UpdateUsedListingPayload = Partial<CreateUsedListingPayload>;

export interface UpdateUsedListingStatusPayload {
  status: UsedListingStatus;
  moderationReason?: string;
}

function buildImagesFormData(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return formData;
}

export const usedListingsService = {
  list: (params: ListUsedListingsParams = {}) =>
    api.get<Paginated<UsedListing>>("/used-listings", { query: params }),

  getById: (id: number) => api.get<UsedListing>(`/used-listings/${id}`),

  create: (payload: CreateUsedListingPayload) =>
    api.post<UsedListing>("/used-listings", payload),

  update: (id: number, payload: UpdateUsedListingPayload) =>
    api.patch<UsedListing>(`/used-listings/${id}`, payload),

  updateStatus: (id: number, payload: UpdateUsedListingStatusPayload) =>
    api.patch<UsedListing>(`/used-listings/${id}/status`, payload),

  assignBuyer: (id: number, inquiryId: number | null) =>
    api.patch<
      UsedListingInquiry | { listingId: number; selectedBuyerInquiryId: null }
    >(`/used-listings/${id}/buyer`, { inquiryId }),

  uploadImages: (id: number, files: File[]) =>
    api.post<UsedListing>(
      `/used-listings/${id}/images`,
      buildImagesFormData(files),
    ),

  removeImage: (id: number, imageId: number) =>
    api.delete<{ id: number; removed: boolean }>(
      `/used-listings/${id}/images/${imageId}`,
    ),

  createInquiry: (id: number) =>
    api.post<UsedListingInquiry>(`/used-listings/${id}/inquiries`),

  listInquiries: (params: ListUsedListingInquiriesParams = {}) =>
    api.get<Paginated<UsedListingInquiry>>("/used-listings/inquiries", {
      query: params,
    }),

  getInquiryById: (id: number) =>
    api.get<UsedListingInquiry>(`/used-listings/inquiries/${id}`),
};
