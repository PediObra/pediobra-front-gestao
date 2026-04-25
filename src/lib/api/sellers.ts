import { api } from "./client";
import type { MembershipRole, Paginated, Seller, UserWithRelations } from "./types";

export interface ListSellersParams {
  page?: number;
  limit?: number;
  search?: string;
  email?: string;
  cep?: string;
}

export interface CreateSellerPayload {
  name: string;
  email: string;
  placeId?: string;
  address?: string;
  cep?: string;
  phone: string;
  logo?: File;
  primaryColor?: string;
  secondaryColor?: string;
  latitude?: string;
  longitude?: string;
}

export interface UpdateSellerPayload extends Partial<CreateSellerPayload> {
  clearLogo?: boolean;
}

function appendOptional(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;

  if (typeof File !== "undefined" && value instanceof File) {
    formData.append(key, value);
    return;
  }

  formData.append(key, String(value));
}

function buildSellerFormData(
  payload: CreateSellerPayload | UpdateSellerPayload,
) {
  const formData = new FormData();

  appendOptional(formData, "name", payload.name);
  appendOptional(formData, "email", payload.email);
  appendOptional(formData, "placeId", payload.placeId);
  appendOptional(formData, "address", payload.address);
  appendOptional(formData, "cep", payload.cep);
  appendOptional(formData, "phone", payload.phone);
  appendOptional(formData, "logo", payload.logo);
  appendOptional(formData, "primaryColor", payload.primaryColor);
  appendOptional(formData, "secondaryColor", payload.secondaryColor);
  appendOptional(formData, "latitude", payload.latitude);
  appendOptional(formData, "longitude", payload.longitude);

  if ("clearLogo" in payload) {
    appendOptional(formData, "clearLogo", payload.clearLogo);
  }

  return formData;
}

export interface UpdateSellerUserAccessPayload {
  membershipRole: MembershipRole;
  jobTitle?: string | null;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
}

export const sellersService = {
  list: (params: ListSellersParams = {}) =>
    api.get<Paginated<Seller>>("/sellers", { query: params }),

  getById: (id: number) => api.get<Seller>(`/sellers/${id}`),

  create: (payload: CreateSellerPayload) =>
    api.post<Seller>("/sellers", buildSellerFormData(payload)),

  update: (id: number, payload: UpdateSellerPayload) =>
    api.patch<Seller>(`/sellers/${id}`, buildSellerFormData(payload)),

  remove: (id: number) => api.delete<Seller>(`/sellers/${id}`),

  updateUserAccess: (
    sellerId: number,
    userId: number,
    payload: UpdateSellerUserAccessPayload,
  ) =>
    api.patch<UserWithRelations>(
      `/sellers/${sellerId}/users/${userId}/access`,
      payload,
    ),
};
