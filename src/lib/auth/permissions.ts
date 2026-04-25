import type { AuthUser, RoleName } from "@/lib/api/types";

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
  const filterPaymentLockedDispatch = <T extends readonly string[]>(
    statuses: T,
  ) =>
    ["PAID", "AUTHORIZED"].includes(order.paymentStatus ?? "")
      ? statuses
      : statuses.filter((status) => status !== "READY_FOR_PICKUP");

  if (isAdmin(user)) {
    return filterPaymentLockedDispatch([
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELIVERY_FAILED",
      "CANCELLED",
    ] as const);
  }

  if (canAccessSeller(user, order.sellerId)) {
    return filterPaymentLockedDispatch([
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "CANCELLED",
    ] as const);
  }

  const driverProfileIds = user?.driverProfiles.map((d) => d.id) ?? [];
  if (
    order.assignedDriverProfileId &&
    driverProfileIds.includes(order.assignedDriverProfileId)
  ) {
    return [
      "PICKED_UP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELIVERY_FAILED",
    ] as const;
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
  if (isAdmin(user)) {
    return [
      "ASSIGNED",
      "PICKED_UP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELIVERY_FAILED",
      "CANCELLED",
    ] as const;
  }

  if (
    deliveryRequest.requesterSellerId &&
    canAccessSeller(user, deliveryRequest.requesterSellerId)
  ) {
    return ["CANCELLED"] as const;
  }

  if (
    user?.id === deliveryRequest.requesterUserId &&
    ["PENDING", "ASSIGNED"].includes(deliveryRequest.status)
  ) {
    return ["CANCELLED"] as const;
  }

  return [] as const;
}
