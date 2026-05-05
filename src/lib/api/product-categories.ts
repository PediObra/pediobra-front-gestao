import { api } from "./client";
import type { ProductCategory } from "./types";

export const productCategoriesService = {
  tree: () => api.get<ProductCategory[]>("/product-categories"),
};
