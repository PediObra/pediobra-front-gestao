import { api } from "./client";
import type {
  CatalogImportMappingEntry,
  Paginated,
  SellerProductImportJob,
  SellerProductImportStatus,
} from "./types";

export interface ListSellerProductImportsParams {
  page?: number;
  limit?: number;
  sellerId?: number;
  status?: SellerProductImportStatus;
}

export interface CreateSellerProductImportPayload {
  sellerId: number;
  file: File;
  mapping: CatalogImportMappingEntry[];
}

export interface CatalogImportMappingResponse {
  sellerId: number;
  mappings: CatalogImportMappingEntry[];
  canonicalFields: CatalogImportMappingEntry["canonicalField"][];
}

export const sellerProductImportsService = {
  list: (params: ListSellerProductImportsParams = {}) =>
    api.get<Paginated<SellerProductImportJob>>("/seller-product-imports", {
      query: params,
    }),

  getById: (id: number) =>
    api.get<SellerProductImportJob>(`/seller-product-imports/${id}`),

  create: (payload: CreateSellerProductImportPayload) => {
    const formData = new FormData();
    formData.set("sellerId", String(payload.sellerId));
    formData.set("mapping", JSON.stringify(payload.mapping));
    formData.set("file", payload.file);
    return api.post<SellerProductImportJob>(
      "/seller-product-imports",
      formData,
    );
  },

  apply: (id: number) =>
    api.post<SellerProductImportJob>(`/seller-product-imports/${id}/apply`),

  getMapping: (sellerId: number) =>
    api.get<CatalogImportMappingResponse>(
      `/sellers/${sellerId}/catalog-import-mapping`,
    ),

  upsertMapping: (sellerId: number, mappings: CatalogImportMappingEntry[]) =>
    api.post<CatalogImportMappingResponse>(
      `/sellers/${sellerId}/catalog-import-mapping`,
      { mappings },
    ),
};
