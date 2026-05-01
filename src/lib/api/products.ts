import { api } from "./client";
import type { Paginated, Product } from "./types";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  categoryId?: number;
  unit?: string;
  barcode?: string;
  minWeight?: number;
  maxWeight?: number;
  hasImage?: boolean;
  hasBarcode?: boolean;
  hasCategory?: boolean;
  hasBrand?: boolean;
  hasDescription?: boolean;
}

export interface ProductImageInput {
  file: File;
  position?: number;
  isPrimary?: boolean;
}

export interface ProductBarcodeInput {
  barcode: string;
  barcodeType?: string;
  isPrimary?: boolean;
}

export interface CreateProductPayload {
  categoryId?: number;
  name: string;
  description?: string;
  size?: string;
  weight?: number;
  brand?: string;
  unit?: string;
  images?: ProductImageInput[];
  barcodes?: ProductBarcodeInput[];
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  clearImages?: boolean;
}

function appendOptional(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, String(value));
}

function buildProductFormData(
  payload: CreateProductPayload | UpdateProductPayload,
) {
  const formData = new FormData();

  appendOptional(formData, "categoryId", payload.categoryId);
  appendOptional(formData, "name", payload.name);
  appendOptional(formData, "description", payload.description);
  appendOptional(formData, "size", payload.size);
  appendOptional(formData, "weight", payload.weight);
  appendOptional(formData, "brand", payload.brand);
  appendOptional(formData, "unit", payload.unit);

  if ("clearImages" in payload) {
    appendOptional(formData, "clearImages", payload.clearImages);
  }

  if (payload.images?.length) {
    for (const image of payload.images) {
      formData.append("images", image.file);
    }

    formData.append(
      "imageMetadata",
      JSON.stringify(
        payload.images.map((image, index) => ({
          position: image.position ?? index,
          isPrimary: image.isPrimary ?? false,
        })),
      ),
    );
  }

  if (payload.barcodes) {
    formData.append("barcodes", JSON.stringify(payload.barcodes));
  }

  return formData;
}

export const productsService = {
  list: (params: ListProductsParams = {}) =>
    api.get<Paginated<Product>>("/products", { query: params }),

  getById: (id: number) => api.get<Product>(`/products/${id}`),

  create: (payload: CreateProductPayload) =>
    api.post<Product>("/products", buildProductFormData(payload)),

  update: (id: number, payload: UpdateProductPayload) =>
    api.patch<Product>(`/products/${id}`, buildProductFormData(payload)),

  remove: (id: number) => api.delete<Product>(`/products/${id}`),
};
