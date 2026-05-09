import { api } from "./client";
import {
  sha256File,
  shouldUsePresignedUploads,
  uploadFileToStorage,
} from "./uploads";
import type {
  CatalogImportMappingEntry,
  Paginated,
  SellerProductImportJob,
  SellerProductImportReviewRow,
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

export interface CreateManualProductReviewPayload {
  sellerId: number;
  product: {
    name: string;
    brand?: string;
    unit?: string;
    size?: string;
    description?: string;
    weight?: number;
    barcodes?: string[];
  };
  sellerProduct: {
    unitPriceCents: number;
    stockAmount?: number;
    active?: boolean;
    sku?: string;
  };
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

  listProductReview: (params: ListSellerProductImportsParams = {}) =>
    api.get<Paginated<SellerProductImportReviewRow>>(
      "/seller-product-imports/product-review",
      {
        query: params,
      },
    ),

  createProductReview: (payload: CreateManualProductReviewPayload) =>
    api.post<SellerProductImportJob>(
      "/seller-product-imports/product-review",
      payload,
    ),

  create: async (payload: CreateSellerProductImportPayload) => {
    if (shouldUsePresignedUploads()) {
      const [upload, checksum] = await Promise.all([
        uploadFileToStorage(payload.file, {
          bucketKey: "catalogImports",
          prefix: `seller-product-imports/seller-${payload.sellerId}`,
        }),
        sha256File(payload.file),
      ]);

      return api.post<SellerProductImportJob>("/seller-product-imports", {
        sellerId: payload.sellerId,
        mapping: JSON.stringify(payload.mapping),
        sourceObjectName: upload.objectName,
        sourceOriginalFilename: payload.file.name,
        sourceChecksum: checksum,
      });
    }

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

  approveProduct: (rowId: number) =>
    api.post<SellerProductImportJob>(
      `/seller-product-imports/rows/${rowId}/approve-product`,
    ),

  linkProduct: (rowId: number, productId: number) =>
    api.post<SellerProductImportJob>(
      `/seller-product-imports/rows/${rowId}/link-product`,
      { productId },
    ),

  rejectProduct: (rowId: number, reason: string) =>
    api.post<SellerProductImportJob>(
      `/seller-product-imports/rows/${rowId}/reject-product`,
      { reason },
    ),

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
