import {
  driverStatusLabel,
  membershipRoleLabel,
  orderStatusLabel,
  paymentStatusLabel,
  roleLabel,
} from "@/lib/formatters";
import { useLanguageStore } from "@/lib/i18n/language-store";
import type {
  DriverStatus,
  MembershipRole,
  OrderStatus,
  PaymentStatus,
  RoleName,
} from "@/lib/api/types";
import { Badge, type BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING: "muted",
  CONFIRMED: "default",
  PREPARING: "default",
  READY_FOR_PICKUP: "default",
  PICKED_UP: "default",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  DELIVERY_FAILED: "destructive",
  CANCELLED: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  useLanguageStore((state) => state.language);

  return (
    <Badge variant={ORDER_STATUS_VARIANT[status]}>
      {orderStatusLabel(status)}
    </Badge>
  );
}

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  PENDING: "muted",
  AUTHORIZED: "default",
  PAID: "success",
  FAILED: "destructive",
  REFUNDED: "warning",
  CANCELLED: "destructive",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  useLanguageStore((state) => state.language);

  return (
    <Badge variant={PAYMENT_STATUS_VARIANT[status]}>
      {paymentStatusLabel(status)}
    </Badge>
  );
}

const DRIVER_STATUS_VARIANT: Record<DriverStatus, BadgeVariant> = {
  PENDING: "muted",
  APPROVED: "success",
  REJECTED: "destructive",
  BLOCKED: "destructive",
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  useLanguageStore((state) => state.language);

  return (
    <Badge variant={DRIVER_STATUS_VARIANT[status]}>
      {driverStatusLabel(status)}
    </Badge>
  );
}

const ROLE_VARIANT: Record<RoleName, BadgeVariant> = {
  ADMIN: "default",
  CUSTOMER: "muted",
  SELLER: "warning",
  DRIVER: "secondary",
};

export function RoleBadge({ role }: { role: RoleName }) {
  useLanguageStore((state) => state.language);

  return (
    <Badge variant={ROLE_VARIANT[role] ?? "muted"}>
      {roleLabel(role)}
    </Badge>
  );
}

export function MembershipRoleBadge({ role }: { role: MembershipRole }) {
  useLanguageStore((state) => state.language);

  return (
    <Badge variant={role === "OWNER" ? "default" : "muted"}>
      {membershipRoleLabel(role)}
    </Badge>
  );
}
