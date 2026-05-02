import type {
  DriverStatus,
  DeliveryRequestStatus,
  EvidenceType,
  MembershipRole,
  OrderStatus,
  PaymentStatus,
  RoleName,
} from "@/lib/api/types";
import { getLanguageSnapshot, translate } from "@/lib/i18n/language-store";

function intlLocale() {
  const language = getLanguageSnapshot().language;
  if (language === "en") return "en-US";
  if (language === "es") return "es-ES";
  return "pt-BR";
}

export function centsToBRL(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat(intlLocale(), {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function centsToDecimalString(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function decimalStringToCents(value: string): number {
  const cleaned = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(cleaned);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(intlLocale(), {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(intlLocale(), {
      dateStyle: "short",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatCep(cep: string | null | undefined) {
  if (!cep) return "—";
  const digits = cep.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return cep;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY_FOR_PICKUP: "Pronto p/ retirada",
  READY_FOR_CUSTOMER_PICKUP: "Pronto para retirar",
  PICKED_UP: "Coletado",
  OUT_FOR_DELIVERY: "Em rota",
  DELIVERED: "Entregue",
  CUSTOMER_PICKED_UP: "Retirado na loja",
  DELIVERY_FAILED: "Falha na entrega",
  CANCELLED: "Cancelado",
};

export function orderStatusLabel(status: OrderStatus) {
  return translate(`status.order.${status}` as Parameters<typeof translate>[0]);
}

export function deliveryRequestStatusLabel(status: DeliveryRequestStatus) {
  return translate(
    `status.deliveryRequest.${status}` as Parameters<typeof translate>[0],
  );
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  AUTHORIZED: "Autorizado",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
};

export function paymentStatusLabel(status: PaymentStatus) {
  return translate(
    `status.payment.${status}` as Parameters<typeof translate>[0],
  );
}

export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  BLOCKED: "Bloqueado",
};

export function driverStatusLabel(status: DriverStatus) {
  return translate(
    `status.driver.${status}` as Parameters<typeof translate>[0],
  );
}

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: "Admin",
  CUSTOMER: "Cliente",
  SELLER: "Vendedor",
  DRIVER: "Motorista",
};

export function roleLabel(role: RoleName) {
  return translate(`role.${role}` as Parameters<typeof translate>[0]);
}

export const MEMBERSHIP_ROLE_LABEL: Record<MembershipRole, string> = {
  OWNER: "Proprietário",
  EMPLOYEE: "Funcionário",
};

export function membershipRoleLabel(role: MembershipRole) {
  return translate(`membership.${role}` as Parameters<typeof translate>[0]);
}

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  SELLER_CONFIRMATION: "Confirmação do vendedor",
  DRIVER_CONFIRMATION: "Confirmação do motorista",
  DELIVERY_PHOTO: "Foto da entrega",
  PICKUP_PHOTO: "Foto da coleta",
  GENERAL: "Geral",
};

export function evidenceTypeLabel(type: EvidenceType) {
  return translate(`evidence.${type}` as Parameters<typeof translate>[0]);
}

export function formatDeliveryRequestCode(deliveryRequest: { id: number }) {
  return `#D${String(deliveryRequest.id).padStart(4, "0")}`;
}

export function formatOrderCode(order: {
  code?: string | null;
  id: number;
}) {
  return order.code ?? `#${String(order.id).padStart(4, "0")}`;
}

export function roleNamesOf(
  roles: Array<{ name: string } | string> | undefined | null,
): RoleName[] {
  if (!roles) return [];
  return roles
    .map((r) => (typeof r === "string" ? r : r.name).toUpperCase())
    .filter((name): name is RoleName =>
      ["ADMIN", "CUSTOMER", "SELLER", "DRIVER"].includes(name),
    );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
