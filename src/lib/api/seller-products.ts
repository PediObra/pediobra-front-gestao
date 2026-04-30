import { api } from "./client";
import type { Paginated, SellerProduct } from "./types";

export interface ListSellerProductsParams {
  page?: number;
  limit?: number;
  sellerId?: number;
  productId?: number;
  sku?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  active?: boolean;
  includeInactive?: boolean;
}

export interface CreateSellerProductPayload {
  sellerId: number;
  productId: number;
  stockAmount?: number;
  unitPriceCents: number;
  active?: boolean;
  sku?: string;
}

export const sellerProductsService = {
  list: (params: ListSellerProductsParams = {}) =>
    api.get<Paginated<SellerProduct>>("/seller-products", { query: params }),

  getById: (id: number) => api.get<SellerProduct>(`/seller-products/${id}`),

  create: (payload: CreateSellerProductPayload) =>
    api.post<SellerProduct>("/seller-products", payload),

  update: (id: number, payload: Partial<CreateSellerProductPayload>) =>
    api.patch<SellerProduct>(`/seller-products/${id}`, payload),

  remove: (id: number) => api.delete<SellerProduct>(`/seller-products/${id}`),
};
