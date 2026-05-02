import type {
  DeliveryRequestStatus,
  DeliveryRequestStatusHistoryEntry,
  OrderStatus,
  OrderStatusHistoryEntry,
} from "@/lib/api/types";
import {
  deliveryRequestStatusLabel,
  orderStatusLabel,
} from "@/lib/formatters";
import type { TranslationKey } from "@/lib/i18n/translations";

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

interface TimelineCopy<TStatus extends string> {
  title: string;
  status: TStatus;
  actor?: string;
  note?: string;
}

const ORDER_EVENT_TITLE: Record<OrderStatus, TranslationKey> = {
  PENDING: "order.timelineEvent.order.PENDING",
  CONFIRMED: "order.timelineEvent.order.CONFIRMED",
  PREPARING: "order.timelineEvent.order.PREPARING",
  READY_FOR_PICKUP: "order.timelineEvent.order.READY_FOR_PICKUP",
  READY_FOR_CUSTOMER_PICKUP:
    "order.timelineEvent.order.READY_FOR_CUSTOMER_PICKUP",
  PICKED_UP: "order.timelineEvent.order.PICKED_UP",
  OUT_FOR_DELIVERY: "order.timelineEvent.order.OUT_FOR_DELIVERY",
  DELIVERED: "order.timelineEvent.order.DELIVERED",
  CUSTOMER_PICKED_UP: "order.timelineEvent.order.CUSTOMER_PICKED_UP",
  DELIVERY_FAILED: "order.timelineEvent.order.DELIVERY_FAILED",
  CANCELLED: "order.timelineEvent.order.CANCELLED",
};

const DELIVERY_REQUEST_EVENT_TITLE: Record<
  DeliveryRequestStatus,
  TranslationKey
> = {
  PENDING: "order.timelineEvent.deliveryRequest.PENDING",
  ASSIGNED: "order.timelineEvent.deliveryRequest.ASSIGNED",
  PICKED_UP: "order.timelineEvent.deliveryRequest.PICKED_UP",
  OUT_FOR_DELIVERY: "order.timelineEvent.deliveryRequest.OUT_FOR_DELIVERY",
  DELIVERED: "order.timelineEvent.deliveryRequest.DELIVERED",
  DELIVERY_FAILED: "order.timelineEvent.deliveryRequest.DELIVERY_FAILED",
  CANCELLED: "order.timelineEvent.deliveryRequest.CANCELLED",
};

const GENERATED_NOTE_PATTERNS = [
  /^Order created\.$/,
  /^Status changed to [A-Z_]+\.$/,
  /^Delivery job offer accepted by driver profile \d+\.$/,
];

export function formatOrderHistoryEntry(
  entry: OrderStatusHistoryEntry,
  t: TranslateFn,
): TimelineCopy<OrderStatus> {
  const status: OrderStatus = entry.toStatus ?? entry.status ?? "PENDING";

  return {
    title: isDriverAcceptedNote(entry.note)
      ? t("order.timelineEvent.driverAccepted")
      : t(ORDER_EVENT_TITLE[status]),
    status,
    actor: formatActor(entry.changedByUser?.name, t),
    note: formatCustomNote(entry.note, {
      fromStatus: entry.fromStatus,
      toStatus: status,
      statusLabel: orderStatusLabel,
      t,
    }),
  };
}

export function formatDeliveryRequestHistoryEntry(
  entry: DeliveryRequestStatusHistoryEntry,
  t: TranslateFn,
): TimelineCopy<DeliveryRequestStatus> {
  const status: DeliveryRequestStatus =
    entry.toStatus ?? entry.status ?? "PENDING";

  return {
    title: isDriverAcceptedNote(entry.note)
      ? t("order.timelineEvent.driverAccepted")
      : t(DELIVERY_REQUEST_EVENT_TITLE[status]),
    status,
    actor: formatActor(entry.changedByUser?.name, t),
    note: formatCustomNote(entry.note, {
      fromStatus: entry.fromStatus,
      toStatus: status,
      statusLabel: deliveryRequestStatusLabel,
      t,
    }),
  };
}

function formatActor(name: string | undefined, t: TranslateFn) {
  return name ? t("order.changedBy", { name }) : undefined;
}

function isDriverAcceptedNote(note: string | null | undefined) {
  return note?.startsWith("Delivery job offer accepted by driver profile ");
}

function formatCustomNote<TStatus extends string>(
  note: string | null | undefined,
  input: {
    fromStatus: TStatus | null | undefined;
    toStatus: TStatus;
    statusLabel: (status: TStatus) => string;
    t: TranslateFn;
  },
) {
  if (note && !GENERATED_NOTE_PATTERNS.some((pattern) => pattern.test(note))) {
    return note;
  }

  if (input.fromStatus && input.fromStatus !== input.toStatus) {
    return input.t("order.timelineEvent.transition", {
      from: input.statusLabel(input.fromStatus),
      to: input.statusLabel(input.toStatus),
    });
  }

  return undefined;
}
