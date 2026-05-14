import { API_URL } from "./base-url";
import { api } from "./client";
import type {
  FulfillmentMethod,
  Order,
  Paginated,
  Payment,
  ProductCategory,
  Seller,
  SellerProduct,
  SellerStorefront,
} from "./types";
import type { PlaceSuggestion, ResolvedPlace } from "./geo";

export interface StorefrontProduct extends SellerProduct {
  storefrontId: number;
}

export interface ListStorefrontProductsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StorefrontCheckoutItemPayload {
  sellerProductId: number;
  quantity: number;
}

export interface StorefrontCheckoutPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentMethod: FulfillmentMethod;
  deliveryPlaceId?: string;
  deliveryAddress?: string;
  deliveryCep?: string | null;
  deliveryLatitude?: string;
  deliveryLongitude?: string;
  notes?: string | null;
  items: StorefrontCheckoutItemPayload[];
}

export interface StorefrontCheckoutResponse {
  order: PublicStorefrontOrder;
  payment: Pick<Payment, "id" | "status" | "provider" | "amountCents">;
  nextAction: "SELLER_COLLECTS_PAYMENT";
}

export interface PublicStorefrontOrder
  extends Pick<
    Order,
    | "id"
    | "status"
    | "fulfillmentMethod"
    | "deliveryProvider"
    | "paymentStatus"
    | "deliveryAddress"
    | "deliveryCep"
    | "pickupAddress"
    | "pickupCep"
    | "pickupContactName"
    | "pickupContactPhone"
    | "contactPhone"
    | "confirmationCode"
    | "totalAmountCents"
    | "deliveryFeeCents"
    | "createdAt"
    | "updatedAt"
  > {
  publicToken: string;
  seller: Pick<Seller, "id" | "name" | "phone" | "address" | "cep"> | null;
  items: Array<{
    id: number;
    quantity: number;
    unitPriceCents: number;
    totalPriceCents: number;
    sellerProduct?: StorefrontProduct | null;
  }>;
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    API_URL.endsWith("/") ? API_URL : API_URL + "/",
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchPublicJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Storefront request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(error);
    }

    return null;
  }
}

export const getStorefrontBySlug = (slug: string) =>
  fetchPublicJson<SellerStorefront>(
    buildUrl(`/storefronts/${encodeURIComponent(slug)}`),
  );

export const getStorefrontProducts = (
  slug: string,
  params: ListStorefrontProductsParams = {},
) =>
  fetchPublicJson<Paginated<StorefrontProduct>>(
    buildUrl(`/storefronts/${encodeURIComponent(slug)}/products`, {
      page: params.page ?? 1,
      limit: params.limit ?? 24,
      search: params.search,
    }),
  );

export const getStorefrontProduct = (slug: string, sellerProductId: number) =>
  fetchPublicJson<StorefrontProduct>(
    buildUrl(
      `/storefronts/${encodeURIComponent(slug)}/products/${sellerProductId}`,
    ),
  );

export const getPublicProductCategories = () =>
  fetchPublicJson<ProductCategory[]>(buildUrl("/product-categories"));

export const getPublicStorefrontOrder = (publicToken: string) =>
  fetchPublicJson<PublicStorefrontOrder>(
    buildUrl(`/storefronts/orders/${encodeURIComponent(publicToken)}`),
  );

export const storefrontGeoService = {
  autocomplete: (query: string, sessionToken: string) =>
    api.get<PlaceSuggestion[]>("/storefronts/places/autocomplete", {
      query: { query, sessionToken },
      skipAuth: true,
    }),

  resolve: (placeId: string, sessionToken: string) =>
    api.get<ResolvedPlace>("/storefronts/places/resolve", {
      query: { placeId, sessionToken },
      skipAuth: true,
    }),
};

export const storefrontCheckoutService = {
  checkout: (slug: string, payload: StorefrontCheckoutPayload) =>
    api.post<StorefrontCheckoutResponse>(
      `/storefronts/${encodeURIComponent(slug)}/checkout`,
      payload,
      { skipAuth: true },
    ),
};
