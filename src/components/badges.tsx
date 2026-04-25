import {
  DRIVER_STATUS_LABEL,
  MEMBERSHIP_ROLE_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  ROLE_LABEL,
} from "@/lib/formatters";
import type {
  BlogPostStatus,
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
  return (
    <Badge variant={ORDER_STATUS_VARIANT[status]}>
      {ORDER_STATUS_LABEL[status] ?? status}
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
  return (
    <Badge variant={PAYMENT_STATUS_VARIANT[status]}>
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const BLOG_STATUS_VARIANT: Record<BlogPostStatus, BadgeVariant> = {
  DRAFT: "muted",
  PUBLISHED: "success",
  SCHEDULED: "warning",
  ARCHIVED: "destructive",
};

const BLOG_STATUS_LABEL: Record<BlogPostStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  SCHEDULED: "Agendado",
  ARCHIVED: "Arquivado",
};

export function BlogStatusBadge({
  status,
  label,
}: {
  status: BlogPostStatus;
  label?: string;
}) {
  return (
    <Badge variant={BLOG_STATUS_VARIANT[status]}>
      {label ?? BLOG_STATUS_LABEL[status] ?? status}
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
  return (
    <Badge variant={DRIVER_STATUS_VARIANT[status]}>
      {DRIVER_STATUS_LABEL[status] ?? status}
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
  return (
    <Badge variant={ROLE_VARIANT[role] ?? "muted"}>
      {ROLE_LABEL[role] ?? role}
    </Badge>
  );
}

export function MembershipRoleBadge({ role }: { role: MembershipRole }) {
  return (
    <Badge variant={role === "OWNER" ? "default" : "muted"}>
      {MEMBERSHIP_ROLE_LABEL[role] ?? role}
    </Badge>
  );
}
