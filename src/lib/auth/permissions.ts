import type {
  AuthUser,
  DeliveryRequestStatus,
  OrderStatus,
  RoleName,
} from "@/lib/api/types";

const ORDER_STATUS_GRAPH = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERED: [],
  DELIVERY_FAILED: [],
  CANCELLED: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

const DELIVERY_REQUEST_STATUS_GRAPH = {
  PENDING: ["CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERED: [],
  DELIVERY_FAILED: [],
  CANCELLED: [],
} as const satisfies Record<
  DeliveryRequestStatus,
  readonly DeliveryRequestStatus[]
>;

const SELLER_ORDER_STATUSES: readonly OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "CANCELLED",
] as const;

const DRIVER_WORK_STATUSES: readonly (OrderStatus | DeliveryRequestStatus)[] = [
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
] as const;

export function hasRole(user: AuthUser | null, role: RoleName): boolean {
  return !!user?.roles.includes(role);
}

export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, "ADMIN");
}

export function isSeller(user: AuthUser | null): boolean {
  return hasRole(user, "SELLER") || (user?.sellers.length ?? 0) > 0;
}

export function isDriver(user: AuthUser | null): boolean {
  return hasRole(user, "DRIVER") || (user?.driverProfiles.length ?? 0) > 0;
}

export function sellerIdsOf(user: AuthUser | null): number[] {
  return user?.sellers.map((s) => s.sellerId) ?? [];
}

export function membershipFor(user: AuthUser | null, sellerId: number) {
  return user?.sellers.find((s) => s.sellerId === sellerId);
}

export function isOwnerOf(user: AuthUser | null, sellerId: number): boolean {
  return membershipFor(user, sellerId)?.membershipRole === "OWNER";
}

export function canEditSeller(
  user: AuthUser | null,
  sellerId: number,
): boolean {
  if (isAdmin(user)) return true;
  const m = membershipFor(user, sellerId);
  if (!m) return false;
  return m.membershipRole === "OWNER" || m.canEditSeller;
}

export function canManageSellerProducts(
  user: AuthUser | null,
  sellerId: number,
): boolean {
  if (isAdmin(user)) return true;
  const m = membershipFor(user, sellerId);
  if (!m) return false;
  return m.membershipRole === "OWNER" || m.canManageSellerProducts;
}

export function canManageSellerStaff(
  user: AuthUser | null,
  sellerId: number,
): boolean {
  if (isAdmin(user)) return true;
  return isOwnerOf(user, sellerId);
}

export function canAccessSeller(
  user: AuthUser | null,
  sellerId: number,
): boolean {
  if (isAdmin(user)) return true;
  return sellerIdsOf(user).includes(sellerId);
}

/**
 * Estados de pedido que cada perfil pode aplicar.
 * Alinhado com orders.service do backend.
 */
export function allowedOrderStatusTransitions(
  user: AuthUser | null,
  order: {
    sellerId: number;
    assignedDriverProfileId?: number | null;
    status: string;
    paymentStatus?: string | null;
  },
) {
  const graphTransitions = orderStatusTransitions(order.status);
  const filterPaymentLockedDispatch = (statuses: readonly OrderStatus[]) =>
    ["PAID", "AUTHORIZED"].includes(order.paymentStatus ?? "")
      ? statuses
      : statuses.filter((status) => status !== "READY_FOR_PICKUP");
  const filterUnassignedDriverStatuses = (statuses: readonly OrderStatus[]) =>
    order.assignedDriverProfileId
      ? statuses
      : statuses.filter((status) => !DRIVER_WORK_STATUSES.includes(status));

  if (isAdmin(user)) {
    return filterUnassignedDriverStatuses(
      filterPaymentLockedDispatch(graphTransitions),
    );
  }

  if (canAccessSeller(user, order.sellerId)) {
    return filterPaymentLockedDispatch(
      graphTransitions.filter((status) =>
        SELLER_ORDER_STATUSES.includes(status),
      ),
    );
  }

  const driverProfileIds = user?.driverProfiles.map((d) => d.id) ?? [];
  if (
    order.assignedDriverProfileId &&
    driverProfileIds.includes(order.assignedDriverProfileId)
  ) {
    return graphTransitions.filter((status) =>
      DRIVER_WORK_STATUSES.includes(status),
    );
  }

  return [] as const;
}

export function allowedDeliveryRequestStatusTransitions(
  user: AuthUser | null,
  deliveryRequest: {
    requesterUserId: number;
    requesterSellerId?: number | null;
    assignedDriverProfileId?: number | null;
    status: string;
  },
) {
  const graphTransitions = deliveryRequestStatusTransitions(
    deliveryRequest.status,
  );
  const filterUnassignedDriverStatuses = (
    statuses: readonly DeliveryRequestStatus[],
  ) =>
    deliveryRequest.assignedDriverProfileId
      ? statuses
      : statuses.filter((status) => !DRIVER_WORK_STATUSES.includes(status));

  if (isAdmin(user)) {
    return filterUnassignedDriverStatuses(graphTransitions);
  }

  if (
    deliveryRequest.requesterSellerId &&
    canAccessSeller(user, deliveryRequest.requesterSellerId)
  ) {
    return graphTransitions.filter((status) => status === "CANCELLED");
  }

  if (
    user?.id === deliveryRequest.requesterUserId &&
    ["PENDING", "ASSIGNED"].includes(deliveryRequest.status)
  ) {
    return graphTransitions.filter((status) => status === "CANCELLED");
  }

  const driverProfileIds = user?.driverProfiles.map((d) => d.id) ?? [];
  if (
    deliveryRequest.assignedDriverProfileId &&
    driverProfileIds.includes(deliveryRequest.assignedDriverProfileId)
  ) {
    return graphTransitions.filter((status) =>
      DRIVER_WORK_STATUSES.includes(status),
    );
  }

  return [] as const;
}

function orderStatusTransitions(status: string): readonly OrderStatus[] {
  return isOrderStatus(status) ? ORDER_STATUS_GRAPH[status] : [];
}

function deliveryRequestStatusTransitions(
  status: string,
): readonly DeliveryRequestStatus[] {
  return isDeliveryRequestStatus(status)
    ? DELIVERY_REQUEST_STATUS_GRAPH[status]
    : [];
}

function isOrderStatus(status: string): status is OrderStatus {
  return status in ORDER_STATUS_GRAPH;
}

function isDeliveryRequestStatus(
  status: string,
): status is DeliveryRequestStatus {
  return status in DELIVERY_REQUEST_STATUS_GRAPH;
}
