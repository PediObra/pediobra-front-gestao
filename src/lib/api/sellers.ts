import { api } from "./client";
import { shouldUsePresignedUploads, uploadFileToStorage } from "./uploads";
import type {
  MembershipRole,
  Paginated,
  Seller,
  SellerDeliverySettings,
  SellerDeliveryProvider,
  SellerOperatingHour,
  SellerOperationalSettings,
  SellerStorefront,
  SellerTeamInvitationCreated,
  SellerTeamInvitationPreview,
  StripeConnectOnboardingLinkResponse,
  StripeConnectStatus,
  AuthResponse,
  UserWithRelations,
} from "./types";

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

async function buildSellerRequestBody(
  payload: CreateSellerPayload | UpdateSellerPayload,
) {
  if (!shouldUsePresignedUploads() || !payload.logo) {
    return buildSellerFormData(payload);
  }

  const upload = await uploadFileToStorage(payload.logo, {
    bucketKey: "sellers",
    prefix: "logos",
  });
  const sellerPayload = { ...payload };
  delete sellerPayload.logo;

  return {
    ...sellerPayload,
    logoObjectName: upload.objectName,
  };
}

export interface UpdateSellerUserAccessPayload {
  membershipRole: MembershipRole;
  jobTitle?: string | null;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
}

export interface StripeConnectOnboardingLinkPayload {
  returnUrl?: string;
  refreshUrl?: string;
}

export interface UpdateSellerDeliverySettingsPayload {
  maxDeliveryRadiusMeters: number;
  deliveryProvider?: SellerDeliveryProvider;
}

export interface UpdateSellerOperationalSettingsPayload {
  isOnline?: boolean;
  autoOnlineEnabled?: boolean;
  operatingHours?: SellerOperatingHour[];
  acceptsScheduledOrders?: boolean;
  scheduledOrderingPaused?: boolean;
  scheduledMinLeadMinutes?: number;
  scheduledMaxLeadDays?: number;
}

export interface UpdateSellerAvailabilityPayload {
  isOnline: boolean;
}

export interface UpdateSellerStorefrontPayload {
  enabled?: boolean;
  slug?: string;
  publicName?: string;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  allowedFulfillmentMethods?: Array<"DELIVERY" | "STORE_PICKUP">;
  allowedPaymentProviders?: Array<
    "STRIPE" | "DIRECT_SELLER" | "EXTERNAL_PAYMENT_LINK"
  >;
  externalPaymentLinkUrl?: string | null;
  externalPaymentInstructions?: string | null;
}

export interface CreateSellerTeamInvitationPayload {
  email: string;
  membershipRole: MembershipRole;
  jobTitle?: string | null;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
}

export interface RegisterSellerTeamInvitationPayload {
  name: string;
  password: string;
}

export const sellersService = {
  list: (params: ListSellersParams = {}) =>
    api.get<Paginated<Seller>>("/sellers", { query: params }),

  getById: (id: number) => api.get<Seller>(`/sellers/${id}`),

  create: async (payload: CreateSellerPayload) =>
    api.post<Seller>("/sellers", await buildSellerRequestBody(payload)),

  update: async (id: number, payload: UpdateSellerPayload) =>
    api.patch<Seller>(`/sellers/${id}`, await buildSellerRequestBody(payload)),

  remove: (id: number) => api.delete<Seller>(`/sellers/${id}`),

  getStripeConnectStatus: (id: number) =>
    api.get<StripeConnectStatus>(`/sellers/${id}/stripe-connect/status`),

  getDeliverySettings: (id: number) =>
    api.get<SellerDeliverySettings>(`/sellers/${id}/delivery-settings`),

  updateDeliverySettings: (
    id: number,
    payload: UpdateSellerDeliverySettingsPayload,
  ) =>
    api.patch<SellerDeliverySettings>(
      `/sellers/${id}/delivery-settings`,
      payload,
    ),

  getOperationalSettings: (id: number) =>
    api.get<SellerOperationalSettings>(`/sellers/${id}/operational-settings`),

  updateOperationalSettings: (
    id: number,
    payload: UpdateSellerOperationalSettingsPayload,
  ) =>
    api.patch<SellerOperationalSettings>(
      `/sellers/${id}/operational-settings`,
      payload,
    ),

  updateAvailability: (id: number, payload: UpdateSellerAvailabilityPayload) =>
    api.patch<SellerOperationalSettings>(
      `/sellers/${id}/availability`,
      payload,
    ),

  getStorefront: (id: number) =>
    api.get<SellerStorefront>(`/sellers/${id}/storefront`),

  updateStorefront: (id: number, payload: UpdateSellerStorefrontPayload) =>
    api.patch<SellerStorefront>(`/sellers/${id}/storefront`, payload),

  createStripeConnectOnboardingLink: (
    id: number,
    payload: StripeConnectOnboardingLinkPayload,
  ) =>
    api.post<StripeConnectOnboardingLinkResponse>(
      `/sellers/${id}/stripe-connect/onboarding-link`,
      payload,
    ),

  updateUserAccess: (
    sellerId: number,
    userId: number,
    payload: UpdateSellerUserAccessPayload,
  ) =>
    api.patch<UserWithRelations>(
      `/sellers/${sellerId}/users/${userId}/access`,
      payload,
    ),

  getUserAccess: (sellerId: number, userId: number) =>
    api.get<UserWithRelations>(`/sellers/${sellerId}/users/${userId}/access`),

  removeUserAccess: (sellerId: number, userId: number) =>
    api.delete<UserWithRelations>(
      `/sellers/${sellerId}/users/${userId}/access`,
    ),

  createTeamInvitation: (
    sellerId: number,
    payload: CreateSellerTeamInvitationPayload,
  ) =>
    api.post<SellerTeamInvitationCreated>(
      `/sellers/${sellerId}/team-invitations`,
      payload,
    ),

  getTeamInvitation: (token: string) =>
    api.get<SellerTeamInvitationPreview>(`/seller-team-invitations/${token}`, {
      skipAuth: true,
    }),

  acceptTeamInvitation: (token: string) =>
    api.post<AuthResponse>(`/seller-team-invitations/${token}/accept`),

  registerTeamInvitation: (
    token: string,
    payload: RegisterSellerTeamInvitationPayload,
  ) =>
    api.post<AuthResponse>(
      `/seller-team-invitations/${token}/register`,
      payload,
      { skipAuth: true },
    ),
};
