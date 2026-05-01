import type {
  ListDriversParams,
  ListDeliveryRequestsParams,
  ListOrdersParams,
  ListPaymentsParams,
  ListProductsParams,
  ListSellerProductsParams,
  ListSellersParams,
  ListUsersParams,
  ListAddressesParams,
} from "@/lib/api";

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  users: {
    all: () => ["users"] as const,
    list: (params: ListUsersParams) => ["users", "list", params] as const,
    byId: (id: number) => ["users", "byId", id] as const,
  },
  sellers: {
    all: () => ["sellers"] as const,
    list: (params: ListSellersParams) => ["sellers", "list", params] as const,
    byId: (id: number) => ["sellers", "byId", id] as const,
  },
  products: {
    all: () => ["products"] as const,
    list: (params: ListProductsParams) => ["products", "list", params] as const,
    byId: (id: number) => ["products", "byId", id] as const,
  },
  sellerProducts: {
    all: () => ["sellerProducts"] as const,
    list: (params: ListSellerProductsParams) =>
      ["sellerProducts", "list", params] as const,
    byId: (id: number) => ["sellerProducts", "byId", id] as const,
  },
  orders: {
    all: () => ["orders"] as const,
    list: (params: ListOrdersParams) => ["orders", "list", params] as const,
    stats: (params: ListOrdersParams) => ["orders", "stats", params] as const,
    byId: (id: number) => ["orders", "byId", id] as const,
  },
  deliveryRequests: {
    all: () => ["deliveryRequests"] as const,
    list: (params: ListDeliveryRequestsParams) =>
      ["deliveryRequests", "list", params] as const,
    stats: (params: ListDeliveryRequestsParams) =>
      ["deliveryRequests", "stats", params] as const,
    byId: (id: number) => ["deliveryRequests", "byId", id] as const,
  },
  drivers: {
    all: () => ["drivers"] as const,
    list: (params: ListDriversParams) => ["drivers", "list", params] as const,
    byId: (id: number) => ["drivers", "byId", id] as const,
  },
  payments: {
    all: () => ["payments"] as const,
    list: (params: ListPaymentsParams) => ["payments", "list", params] as const,
    byId: (id: number) => ["payments", "byId", id] as const,
    byOrder: (orderId: number) => ["payments", "byOrder", orderId] as const,
    byDeliveryRequest: (deliveryRequestId: number) =>
      ["payments", "byDeliveryRequest", deliveryRequestId] as const,
  },
  operations: {
    all: () => ["operations"] as const,
    overview: () => ["operations", "overview"] as const,
  },
  addresses: {
    all: () => ["addresses"] as const,
    list: (params: ListAddressesParams) =>
      ["addresses", "list", params] as const,
    byId: (id: number) => ["addresses", "byId", id] as const,
  },
} as const;
