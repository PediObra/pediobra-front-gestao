"use client";

import { use, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { ordersService } from "@/lib/api/orders";
import { paymentsService } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import {
  centsToBRL,
  evidenceTypeLabel,
  formatDateTime,
  formatOrderCode,
  formatPhone,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/formatters";
import {
  allowedOrderStatusTransitions,
  canAccessSeller,
} from "@/lib/auth/permissions";
import { formatOrderHistoryEntry } from "@/lib/status-history";
import { useTranslation } from "@/lib/i18n/language-store";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { MessageThreadCard } from "@/components/messages/message-thread-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/badges";
import type {
  EvidenceType,
  OrderStatus,
  PaymentStatus,
  SellerDeliveryProvider,
} from "@/lib/api/types";

const EVIDENCE_TYPES: EvidenceType[] = [
  "SELLER_CONFIRMATION",
  "DRIVER_CONFIRMATION",
  "DELIVERY_PHOTO",
  "PICKUP_PHOTO",
  "GENERAL",
];

const MOCK_PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "AWAITING_DIRECT_PAYMENT",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

type StatusUpdateInput = {
  status: OrderStatus;
  cancellationReason?: string;
  cancellationDetails?: string;
  deliveryProvider?: SellerDeliveryProvider;
};

type StatusConfirmation = {
  status: OrderStatus;
  type: "accept" | "reject" | "cancel";
};

type SellerRejectionReasonOption =
  | "NO_STOCK"
  | "NO_DELIVERY_DRIVERS"
  | "OTHER";

type DirectSellerPaymentMethod = "CARD_POS" | "PIX_SELLER" | "CASH" | "OTHER";

const SELLER_REJECTION_REASON_OPTIONS: SellerRejectionReasonOption[] = [
  "NO_STOCK",
  "NO_DELIVERY_DRIVERS",
  "OTHER",
];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation();
  const orderId = Number(id);
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.orders.byId(orderId),
    queryFn: () => ordersService.getById(orderId),
    enabled: Number.isFinite(orderId),
  });

  const order = query.data;
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation | null>(null);
  const [sellerRejectionReason, setSellerRejectionReason] = useState("");
  const [sellerRejectionDetails, setSellerRejectionDetails] = useState("");
  const [acceptDeliveryProvider, setAcceptDeliveryProvider] =
    useState<SellerDeliveryProvider>("INTERNAL");
  const shouldLoadInternalDeliveryAvailability =
    !!order &&
    statusConfirmation?.type === "accept" &&
    order.fulfillmentMethod !== "STORE_PICKUP" &&
    order.deliveryProvider === "UNDECIDED";
  const internalDeliveryAvailabilityQuery = useQuery({
    queryKey: queryKeys.orders.internalDeliveryAvailability(orderId),
    queryFn: () => ordersService.getInternalDeliveryAvailability(orderId),
    enabled:
      Number.isFinite(orderId) && shouldLoadInternalDeliveryAvailability,
  });

  const transitions = allowedOrderStatusTransitions(
    user,
    order ?? { sellerId: 0, status: "" },
  );

  const [pickupCode, setPickupCode] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [customerPickupCode, setCustomerPickupCode] = useState("");
  const [directPaymentReceived, setDirectPaymentReceived] = useState(false);
  const [directPaymentMethod, setDirectPaymentMethod] =
    useState<DirectSellerPaymentMethod>("CARD_POS");
  const [directPaymentReference, setDirectPaymentReference] = useState("");
  const [evType, setEvType] = useState<EvidenceType>("GENERAL");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [evNote, setEvNote] = useState("");
  const [evFileInputKey, setEvFileInputKey] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");

  const statusMutation = useMutation({
    mutationFn: (payload: StatusUpdateInput) =>
      ordersService.updateStatus(orderId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.orders.byId(orderId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success(t("order.statusUpdated"));
      setStatusConfirmation(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.statusUpdateFailed");
      toast.error(msg);
    },
  });

  const sellerRejectionMutation = useMutation({
    mutationFn: () =>
      ordersService.rejectBySeller(orderId, {
        reason: sellerRejectionReasonLabel(
          sellerRejectionReason as SellerRejectionReasonOption,
          t,
        ),
        details:
          sellerRejectionReason === "OTHER"
            ? sellerRejectionDetails.trim() || undefined
            : undefined,
      }),
    onSuccess: (response) => {
      if (response.order) {
        qc.setQueryData(queryKeys.orders.byId(orderId), response.order);
      }
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      const message =
        response.outcome === "REASSIGNED"
          ? "Pedido enviado para outra loja disponível."
          : response.outcome === "AWAITING_CUSTOMER_APPROVAL"
            ? "Pedido aguardando aprovação do comprador para troca de loja."
            : "Pedido cancelado: nenhuma loja alternativa disponível.";
      toast.success(message);
      setStatusConfirmation(null);
      setSellerRejectionReason("");
      setSellerRejectionDetails("");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.statusUpdateFailed");
      toast.error(msg);
    },
  });

  const pickupMutation = useMutation({
    mutationFn: () =>
      ordersService.confirmPickup(orderId, { code: pickupCode.trim() }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.orders.byId(orderId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success(t("order.pickupConfirmed"));
      setPickupCode("");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.pickupConfirmationFailed");
      toast.error(msg);
    },
  });

  const customerPickupMutation = useMutation({
    mutationFn: () =>
      ordersService.confirmCustomerPickup(orderId, {
        code: customerPickupCode.trim(),
        ...(order?.paymentStatus === "AWAITING_DIRECT_PAYMENT"
          ? {
              directPaymentReceived,
              directPaymentMethod,
              directPaymentReference:
                directPaymentReference.trim() || undefined,
            }
          : {}),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.orders.byId(orderId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success(t("order.customerPickupConfirmed"));
      setCustomerPickupCode("");
      setDirectPaymentReceived(false);
      setDirectPaymentReference("");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.pickupConfirmationFailed");
      toast.error(msg);
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: () =>
      ordersService.confirmDelivery(orderId, {
        code: deliveryCode.trim(),
        ...(order?.paymentStatus === "AWAITING_DIRECT_PAYMENT"
          ? {
              directPaymentReceived,
              directPaymentMethod,
              directPaymentReference:
                directPaymentReference.trim() || undefined,
            }
          : {}),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.orders.byId(orderId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success(t("order.deliveryConfirmed"));
      setDeliveryCode("");
      setDirectPaymentReceived(false);
      setDirectPaymentReference("");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.deliveryConfirmationFailed");
      toast.error(msg);
    },
  });

  function handlePickupCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextCode = event.target.value.replace(/\D/g, "").slice(0, 4);
    setPickupCode(nextCode);
    if (nextCode.length === 4) {
      event.currentTarget.blur();
    }
  }

  function handleCustomerPickupCodeChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextCode = event.target.value.replace(/\D/g, "").slice(0, 4);
    setCustomerPickupCode(nextCode);
    if (nextCode.length === 4) {
      event.currentTarget.blur();
    }
  }

  function handleDeliveryCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextCode = event.target.value.replace(/\D/g, "").slice(0, 4);
    setDeliveryCode(nextCode);
    if (nextCode.length === 4) {
      event.currentTarget.blur();
    }
  }

  const evidenceMutation = useMutation({
    mutationFn: () => {
      if (!evFile) throw new Error(t("order.selectImage"));

      return ordersService.addEvidence(orderId, {
        evidenceType: evType,
        image: evFile,
        note: evNote || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.byId(orderId) });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success(t("order.evidenceAdded"));
      setEvFile(null);
      setEvNote("");
      setEvFileInputKey((key) => key + 1);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.addFailed");
      toast.error(msg);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      paymentsService.createMock(orderId, {
        status: paymentStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.byId(orderId) });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      toast.success(t("payments.mockCreated"));
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("payments.createFailed");
      toast.error(msg);
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/orders">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("order.notFound")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const canChangeStatus = transitions.length > 0;
  const isStorePickup = order.fulfillmentMethod === "STORE_PICKUP";
  const orderDeliveryProvider = order.deliveryProvider ?? "INTERNAL";
  const isDeliveryProviderUndecided = orderDeliveryProvider === "UNDECIDED";
  const isSellerDelivery = orderDeliveryProvider === "SELLER";
  const isInternalDelivery =
    !isStorePickup && orderDeliveryProvider === "INTERNAL";
  const isSellerReassignmentBlocked =
    !!order.sellerReassignmentStatus &&
    order.sellerReassignmentStatus !== "NONE";
  const requiresDirectPaymentConfirmation =
    order.paymentStatus === "AWAITING_DIRECT_PAYMENT";
  const shouldShowDeliveryProvider =
    !isStorePickup && !isDeliveryProviderUndecided;
  const canConfirmPickup =
    order.status === "READY_FOR_PICKUP" &&
    isInternalDelivery &&
    !isSellerReassignmentBlocked &&
    (isAdmin || canAccessSeller(user, order.sellerId));
  const canConfirmDelivery =
    order.status === "OUT_FOR_DELIVERY" &&
    isSellerDelivery &&
    !isSellerReassignmentBlocked &&
    (isAdmin || canAccessSeller(user, order.sellerId));
  const canConfirmCustomerPickup =
    order.status === "READY_FOR_CUSTOMER_PICKUP" &&
    isStorePickup &&
    !isSellerReassignmentBlocked &&
    (isAdmin || canAccessSeller(user, order.sellerId));
  const confirmationCopy = statusConfirmation
    ? getStatusConfirmationCopy(statusConfirmation.type, t)
    : null;
  const shouldChooseDeliveryProvider =
    statusConfirmation?.type === "accept" &&
    !isStorePickup &&
    isDeliveryProviderUndecided;
  const isInternalDeliveryAvailabilityPending =
    shouldChooseDeliveryProvider && internalDeliveryAvailabilityQuery.isPending;
  const isInternalDeliveryAvailable =
    shouldChooseDeliveryProvider &&
    internalDeliveryAvailabilityQuery.isSuccess &&
    internalDeliveryAvailabilityQuery.data.available === true;
  const shouldDisableInternalDelivery =
    shouldChooseDeliveryProvider && !isInternalDeliveryAvailable;
  const selectedAcceptDeliveryProvider = shouldDisableInternalDelivery
    ? "SELLER"
    : acceptDeliveryProvider;
  const shouldDisableConfirmStatusChange =
    sellerRejectionMutation.isPending ||
    statusMutation.isPending ||
    (statusConfirmation?.type === "reject" &&
      !sellerRejectionReason.trim()) ||
    (shouldChooseDeliveryProvider && isInternalDeliveryAvailabilityPending);

  const requestStatusChange = (status: OrderStatus) => {
    if (order.status === "PENDING" && status === "CONFIRMED") {
      setAcceptDeliveryProvider(
        orderDeliveryProvider === "SELLER" ? "SELLER" : "INTERNAL",
      );
      setStatusConfirmation({ status, type: "accept" });
      return;
    }

    if (order.status === "PENDING" && status === "CANCELLED") {
      setSellerRejectionReason("");
      setSellerRejectionDetails("");
      setStatusConfirmation({ status, type: "reject" });
      return;
    }

    if (status === "CANCELLED") {
      setStatusConfirmation({ status, type: "cancel" });
      return;
    }

    statusMutation.mutate({ status });
  };

  const confirmStatusChange = () => {
    if (!statusConfirmation) return;

    if (statusConfirmation.type === "reject") {
      sellerRejectionMutation.mutate();
      return;
    }

    statusMutation.mutate({
      status: statusConfirmation.status,
      cancellationReason:
        statusConfirmation.status === "CANCELLED"
          ? getDefaultCancellationReason(statusConfirmation.type, t)
          : undefined,
      deliveryProvider: shouldChooseDeliveryProvider
        ? selectedAcceptDeliveryProvider
        : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/orders">
            <ArrowLeft className="size-4" />
            {t("order.backToOrders")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={<span className="font-mono">{formatOrderCode(order)}</span>}
        description={t("order.createdAt", {
          date: formatDateTime(order.createdAt),
        })}
        actions={
          <div className="flex items-center gap-2">
            {!isStorePickup && (
              <Badge variant={isSellerDelivery ? "secondary" : "outline"}>
                {shouldShowDeliveryProvider
                  ? isSellerDelivery
                    ? t("order.deliveryProviderSeller")
                    : t("order.deliveryProviderInternal")
                  : t("order.deliveryProviderUndecided")}
              </Badge>
            )}
            {order.sellerReassignmentStatus &&
              order.sellerReassignmentStatus !== "NONE" && (
                <Badge variant="secondary">
                  {sellerReassignmentStatusLabel(order.sellerReassignmentStatus)}
                </Badge>
              )}
            <OrderStatusBadge status={order.status} />
            {order.paymentStatus && (
              <PaymentStatusBadge status={order.paymentStatus} />
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4" />
                {t("order.items", { count: order.items?.length ?? 0 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(order.items ?? []).map((item) => {
                const product = item.sellerProduct?.product;
                const primary =
                  product?.images?.find((i) => i.isPrimary) ??
                  product?.images?.[0];
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="size-16 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
                      {primary ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(primary.url)}
                          alt={product?.name ?? ""}
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {product?.name ??
                          t("app.productFallback", {
                            id: item.sellerProductId,
                          })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {centsToBRL(item.unitPriceCents)}
                      </p>
                    </div>
                    <div className="text-sm font-mono font-semibold">
                      {centsToBRL(item.totalPriceCents)}
                    </div>
                  </div>
                );
              })}

              {!isStorePickup ? (
                <div className="flex justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    {t("order.deliveryFee")}
                  </span>
                  <span className="font-mono">
                    {centsToBRL(order.deliveryFeeCents ?? 0)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    {t("order.pickupFee")}
                  </span>
                  <span className="font-mono">{centsToBRL(0)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span>{t("order.total")}</span>
                <span className="font-mono">
                  {centsToBRL(
                    order.totalAmountCents + (order.deliveryFeeCents ?? 0),
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <MessageThreadCard targetType="ORDER" targetId={order.id} />

          <Card>
            <CardHeader>
              <CardTitle>{t("order.timeline")}</CardTitle>
              <CardDescription>
                {t("order.timelineDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.statusHistory?.length ? (
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {[...order.statusHistory]
                    .sort((a, b) => b.id - a.id)
                    .map((h) => {
                      const event = formatOrderHistoryEntry(h, t);

                      return (
                        <li key={h.id} className="ml-4">
                          <div className="absolute -left-1.5 size-3 rounded-full bg-primary border-2 border-background" />
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {event.title}
                            </p>
                            <OrderStatusBadge status={event.status} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(h.createdAt)}
                            </span>
                            {event.actor ? <span>{event.actor}</span> : null}
                          </div>
                          {event.note && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.note}
                            </p>
                          )}
                        </li>
                      );
                    })}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("order.noHistory")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-4" />
                {t("order.evidences", {
                  count: order.evidences?.length ?? 0,
                })}
              </CardTitle>
              <CardDescription>
                {t("order.evidencesDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.evidences?.length ? (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {order.evidences.map((e) => (
                    <a
                      key={e.id}
                      href={resolveMediaUrl(e.imageUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-md border border-border overflow-hidden bg-muted"
                    >
                      <div className="aspect-square overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveMediaUrl(e.imageUrl)}
                          alt={evidenceTypeLabel(e.evidenceType)}
                          className="size-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 bg-card">
                        <p className="text-xs font-medium">
                          {evidenceTypeLabel(e.evidenceType)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTime(e.createdAt)}
                        </p>
                        {e.note && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {e.note}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("order.noEvidence")}
                </p>
              )}

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-medium">{t("order.addEvidence")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("order.type")}</Label>
                    <Select
                      value={evType}
                      onValueChange={(v) => setEvType(v as EvidenceType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVIDENCE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {evidenceTypeLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-image">{t("order.image")}</Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <ImageFilePreview
                        file={evFile}
                        alt={
                          evFile
                            ? t("order.evidencePreviewFile", {
                                file: evFile.name,
                              })
                            : t("order.evidencePreview")
                        }
                        className="size-20 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          key={evFileInputKey}
                          id="ev-image"
                          type="file"
                          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            setEvFile(event.target.files?.[0] ?? null)
                          }
                        />
                        {evFile && (
                          <p className="truncate text-xs text-muted-foreground">
                            {evFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ev-note">{t("order.noteOptional")}</Label>
                    <Textarea
                      id="ev-note"
                      rows={2}
                      value={evNote}
                      onChange={(e) => setEvNote(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => evidenceMutation.mutate()}
                      disabled={!evFile || evidenceMutation.isPending}
                    >
                      {evidenceMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Camera className="size-4" />
                      )}
                      {t("common.send")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                {t("order.payments", { count: order.payments?.length ?? 0 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.payments?.length ? (
                <div className="space-y-2">
                {order.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 border-b border-border pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {p.provider ?? "—"} · {p.method ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(p.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <PaymentStatusBadge status={p.status} />
                      <span className="font-mono text-sm font-semibold">
                        {centsToBRL(p.amountCents)}
                      </span>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/payments">Pagamento/refund</Link>
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("payments.empty")}
                </p>
              )}

              {isAdmin && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label>{t("payments.newStatus")}</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(value) =>
                      setPaymentStatus(value as PaymentStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {paymentStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => paymentMutation.mutate()}
                    disabled={paymentMutation.isPending}
                  >
                    {paymentMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    {t("payments.createMock")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" />
                {t("order.client")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">
                {order.clientUser?.name ?? `#${order.clientUserId}`}
              </div>
              {order.clientUser?.email && (
                <div className="text-muted-foreground">
                  {order.clientUser.email}
                </div>
              )}
              {order.contactPhone && (
                <div className="text-muted-foreground">
                  {formatPhone(order.contactPhone)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                {isStorePickup ? t("order.storePickup") : t("order.delivery")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {isStorePickup ? (
                <>
                  <p>
                    {order.pickupContactName ??
                      order.seller?.name ??
                      `#${order.sellerId}`}
                  </p>
                  <p className="text-muted-foreground">
                    {order.pickupAddress ?? order.seller?.address ?? "—"}
                  </p>
                  {order.pickupCep && (
                    <p className="text-muted-foreground">
                      CEP {order.pickupCep}
                    </p>
                  )}
                  {order.pickupContactPhone && (
                    <p className="text-muted-foreground">
                      {formatPhone(order.pickupContactPhone)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>{order.deliveryAddress}</p>
                  <p className="text-muted-foreground">
                    {shouldShowDeliveryProvider
                      ? isSellerDelivery
                        ? t("order.deliveryProviderSeller")
                        : t("order.deliveryProviderInternal")
                      : t("order.deliveryProviderUndecided")}
                  </p>
                  {order.deliveryCep && (
                    <p className="text-muted-foreground">
                      CEP {order.deliveryCep}
                    </p>
                  )}
                </>
              )}
              {order.notes && (
                <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 mt-2">
                  {order.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {isInternalDelivery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-4" />
                {t("order.driver")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.assignedDriverProfile ? (
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    {order.assignedDriverProfile.user?.name ??
                      t("order.driverFallback", {
                        id: order.assignedDriverProfile.id,
                      })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPhone(order.assignedDriverProfile.phone)}
                  </div>
                  {order.assignedDriverProfile.vehicles?.[0] && (
                    <div className="text-xs text-muted-foreground">
                      {order.assignedDriverProfile.vehicles[0].model} ·{" "}
                      {order.assignedDriverProfile.vehicles[0].plate}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("order.noDriver")}
                </p>
              )}

            </CardContent>
          </Card>
          )}

          {order.sellerReassignmentStatus &&
            order.sellerReassignmentStatus !== "NONE" && (
              <Card>
                <CardHeader>
                  <CardTitle>Troca de loja</CardTitle>
                  <CardDescription>
                    {sellerReassignmentStatusDescription(
                      order.sellerReassignmentStatus,
                      order.pendingReassignmentExpiresAt,
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          {order.sellerAttempts?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Tentativas de loja</CardTitle>
                <CardDescription>
                  Histórico de lojas consultadas para este pedido.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...order.sellerAttempts]
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((attempt) => (
                    <div
                      key={attempt.id}
                      className="space-y-1 border-b border-border pb-3 text-sm last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {attempt.seller?.name ?? `#${attempt.sellerId}`}
                        </span>
                        <Badge variant="outline">
                          {sellerAttemptStatusLabel(attempt.status)}
                        </Badge>
                      </div>
                      {attempt.rejectionReason && (
                        <p className="text-xs text-muted-foreground">
                          {attempt.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : null}

          {canChangeStatus && (
            <Card>
              <CardHeader>
                <CardTitle>{t("order.changeStatus")}</CardTitle>
                <CardDescription>{t("order.allowedStatuses")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  {transitions.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={statusButtonVariant(order.status, status)}
                      onClick={() => requestStatusChange(status)}
                      disabled={
                        statusMutation.isPending ||
                        sellerRejectionMutation.isPending
                      }
                    >
                      {statusMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {statusButtonLabel(order.status, status, t)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {canConfirmPickup && (
            <Card>
              <CardHeader>
                <CardTitle>{t("order.pickupConfirmation")}</CardTitle>
                <CardDescription>
                  {t("order.pickupConfirmationDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pickup-code">{t("order.pickupCode")}</Label>
                  <Input
                    id="pickup-code"
                    inputMode="numeric"
                    maxLength={4}
                    value={pickupCode}
                    onChange={handlePickupCodeChange}
                    placeholder="0000"
                  />
                </div>
                {requiresDirectPaymentConfirmation && (
                  <DirectPaymentConfirmationFields
                    received={directPaymentReceived}
                    method={directPaymentMethod}
                    reference={directPaymentReference}
                    onReceivedChange={setDirectPaymentReceived}
                    onMethodChange={setDirectPaymentMethod}
                    onReferenceChange={setDirectPaymentReference}
                  />
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => pickupMutation.mutate()}
                  disabled={pickupCode.length !== 4 || pickupMutation.isPending}
                >
                  {pickupMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {t("order.confirmPickup")}
                </Button>
              </CardContent>
            </Card>
          )}

          {canConfirmCustomerPickup && (
            <Card>
              <CardHeader>
                <CardTitle>{t("order.customerPickupConfirmation")}</CardTitle>
                <CardDescription>
                  {t("order.customerPickupConfirmationDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customer-pickup-code">
                    {t("order.customerPickupCode")}
                  </Label>
                  <Input
                    id="customer-pickup-code"
                    inputMode="numeric"
                    maxLength={4}
                    value={customerPickupCode}
                    onChange={handleCustomerPickupCodeChange}
                    placeholder="0000"
                  />
                </div>
                {requiresDirectPaymentConfirmation && (
                  <DirectPaymentConfirmationFields
                    received={directPaymentReceived}
                    method={directPaymentMethod}
                    reference={directPaymentReference}
                    onReceivedChange={setDirectPaymentReceived}
                    onMethodChange={setDirectPaymentMethod}
                    onReferenceChange={setDirectPaymentReference}
                  />
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => customerPickupMutation.mutate()}
                  disabled={
                    customerPickupCode.length !== 4 ||
                    (requiresDirectPaymentConfirmation &&
                      !directPaymentReceived) ||
                    customerPickupMutation.isPending
                  }
                >
                  {customerPickupMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {t("order.confirmCustomerPickup")}
                </Button>
              </CardContent>
            </Card>
          )}

          {canConfirmDelivery && (
            <Card>
              <CardHeader>
                <CardTitle>{t("order.deliveryConfirmation")}</CardTitle>
                <CardDescription>
                  {t("order.sellerDeliveryConfirmationDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="delivery-code">
                    {t("order.deliveryCode")}
                  </Label>
                  <Input
                    id="delivery-code"
                    inputMode="numeric"
                    maxLength={4}
                    value={deliveryCode}
                    onChange={handleDeliveryCodeChange}
                    placeholder="0000"
                  />
                </div>
                {requiresDirectPaymentConfirmation && (
                  <DirectPaymentConfirmationFields
                    received={directPaymentReceived}
                    method={directPaymentMethod}
                    reference={directPaymentReference}
                    onReceivedChange={setDirectPaymentReceived}
                    onMethodChange={setDirectPaymentMethod}
                    onReferenceChange={setDirectPaymentReference}
                  />
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => deliveryMutation.mutate()}
                  disabled={
                    deliveryCode.length !== 4 ||
                    (requiresDirectPaymentConfirmation &&
                      !directPaymentReceived) ||
                    deliveryMutation.isPending
                  }
                >
                  {deliveryMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {t("order.confirmDelivery")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={!!statusConfirmation}
        onOpenChange={(open) => {
          if (!open) setStatusConfirmation(null);
        }}
      >
        <DialogContent className="gap-6 p-6 sm:max-w-[580px]">
          <DialogHeader className="space-y-2 pr-8">
            <DialogTitle>{confirmationCopy?.title}</DialogTitle>
            <DialogDescription>
              {confirmationCopy?.description}
            </DialogDescription>
          </DialogHeader>
          {statusConfirmation?.type === "reject" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="seller-rejection-reason">
                  {t("order.reason")}
                </Label>
                <Select
                  value={sellerRejectionReason}
                  onValueChange={(value) => {
                    setSellerRejectionReason(value);
                    if (value !== "OTHER") {
                      setSellerRejectionDetails("");
                    }
                  }}
                >
                  <SelectTrigger id="seller-rejection-reason">
                    <SelectValue
                      placeholder={t("order.rejectReasonPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {SELLER_REJECTION_REASON_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {sellerRejectionReasonLabel(option, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {sellerRejectionReason === "OTHER" && (
                <div className="space-y-1.5">
                  <Label htmlFor="seller-rejection-details">
                    {t("order.detailsOptional")}
                  </Label>
                  <Textarea
                    id="seller-rejection-details"
                    rows={3}
                    value={sellerRejectionDetails}
                    onChange={(event) =>
                      setSellerRejectionDetails(event.target.value)
                    }
                    placeholder={t("order.rejectReasonOtherPlaceholder")}
                  />
                </div>
              )}
            </div>
          )}
          {shouldChooseDeliveryProvider && (
            <TooltipProvider delayDuration={0}>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    value: "INTERNAL" as const,
                    title: t("order.acceptDeliveryProviderInternal"),
                    description: t("order.acceptDeliveryProviderInternalHint"),
                    disabled: shouldDisableInternalDelivery,
                    disabledReason: shouldDisableInternalDelivery
                      ? isInternalDeliveryAvailabilityPending
                        ? t("order.acceptDeliveryProviderInternalChecking")
                        : t("order.acceptDeliveryProviderInternalUnavailable")
                      : undefined,
                    icon: Truck,
                  },
                  {
                    value: "SELLER" as const,
                    title: t("order.acceptDeliveryProviderSeller"),
                    description: t("order.acceptDeliveryProviderSellerHint"),
                    disabled: false,
                    disabledReason: undefined,
                    icon: Store,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected =
                    selectedAcceptDeliveryProvider === option.value;
                  const optionButton = (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAcceptDeliveryProvider(option.value)}
                      disabled={option.disabled}
                      aria-pressed={selected}
                      className={cn(
                        "flex min-h-[168px] w-full cursor-pointer flex-col items-center justify-start rounded-md border p-5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
                        option.disabled &&
                          "hover:border-border hover:bg-background",
                      )}
                    >
                      <span className="flex flex-col items-center gap-3">
                        <span
                          className={cn(
                            "flex size-16 shrink-0 items-center justify-center rounded-lg border",
                            selected
                              ? "border-primary/30 bg-primary text-primary-foreground"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-7" />
                        </span>
                        <span className="space-y-2">
                          <span className="block text-base font-semibold leading-6">
                            {option.title}
                          </span>
                          <span className="block max-w-[210px] text-[13px] leading-6 text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </span>
                    </button>
                  );

                  if (!option.disabledReason) {
                    return optionButton;
                  }

                  return (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <span className="block">
                          {optionButton}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="center"
                        className="max-w-64 text-center"
                      >
                        {option.disabledReason}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
          <DialogFooter className="pt-1 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => setStatusConfirmation(null)}
              disabled={
                statusMutation.isPending || sellerRejectionMutation.isPending
              }
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={
                statusConfirmation?.status === "CANCELLED"
                  ? "destructive"
                  : "default"
              }
              onClick={confirmStatusChange}
              disabled={shouldDisableConfirmStatusChange}
              className="cursor-pointer"
            >
              {statusMutation.isPending || sellerRejectionMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {confirmationCopy?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DirectPaymentConfirmationFields({
  received,
  method,
  reference,
  onReceivedChange,
  onMethodChange,
  onReferenceChange,
}: {
  received: boolean;
  method: DirectSellerPaymentMethod;
  reference: string;
  onReceivedChange: (value: boolean) => void;
  onMethodChange: (value: DirectSellerPaymentMethod) => void;
  onReferenceChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-amber-300/70 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <Checkbox
          id="direct-payment-received"
          checked={received}
          onCheckedChange={(checked) => onReceivedChange(checked === true)}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="direct-payment-received">
            Pagamento recebido direto pela loja
          </Label>
          <p className="text-xs text-muted-foreground">
            Confirme somente depois de receber na maquininha, Pix, dinheiro ou
            outro meio combinado com o cliente.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Meio recebido</Label>
          <Select
            value={method}
            onValueChange={(value) =>
              onMethodChange(value as DirectSellerPaymentMethod)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CARD_POS">Cartao na maquininha</SelectItem>
              <SelectItem value="PIX_SELLER">Pix da loja</SelectItem>
              <SelectItem value="CASH">Dinheiro</SelectItem>
              <SelectItem value="OTHER">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="direct-payment-reference">Referencia opcional</Label>
          <Input
            id="direct-payment-reference"
            value={reference}
            onChange={(event) => onReferenceChange(event.target.value)}
            placeholder="NSU, Pix ou observacao"
          />
        </div>
      </div>
    </div>
  );
}

function statusButtonLabel(
  currentStatus: string,
  nextStatus: OrderStatus,
  t: ReturnType<typeof useTranslation>,
) {
  if (currentStatus === "PENDING" && nextStatus === "CONFIRMED") {
    return t("order.acceptOrder");
  }

  if (currentStatus === "PENDING" && nextStatus === "CANCELLED") {
    return t("order.rejectOrder");
  }

  if (nextStatus === "CANCELLED") return t("order.cancelOrder");

  return orderStatusLabel(nextStatus);
}

function statusButtonVariant(currentStatus: string, nextStatus: OrderStatus) {
  if (nextStatus === "CANCELLED") return "destructive";
  if (currentStatus === "PENDING" && nextStatus === "CONFIRMED") {
    return "default";
  }
  return "outline";
}

function sellerReassignmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    FINDING_SELLER: "Buscando loja",
    AWAITING_CUSTOMER_APPROVAL: "Aguardando comprador",
    AWAITING_PAYMENT_REAUTH: "Aguardando pagamento",
  };

  return labels[status] ?? status;
}

function sellerReassignmentStatusDescription(
  status: string,
  expiresAt?: string | null,
) {
  if (status === "AWAITING_CUSTOMER_APPROVAL") {
    return expiresAt
      ? `Comprador precisa aprovar a nova loja até ${formatDateTime(expiresAt)}.`
      : "Comprador precisa aprovar a nova loja.";
  }

  if (status === "AWAITING_PAYMENT_REAUTH") {
    return "Comprador aprovou a troca e precisa reautorizar o pagamento.";
  }

  return "Pedido em troca de loja.";
}

function sellerAttemptStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    REJECTED: "Recusada",
    AWAITING_CUSTOMER_APPROVAL: "Aguardando cliente",
    ACCEPTED: "Aceita",
    EXPIRED: "Expirada",
    SKIPPED: "Ignorada",
  };

  return labels[status] ?? status;
}

function sellerRejectionReasonLabel(
  reason: SellerRejectionReasonOption,
  t: ReturnType<typeof useTranslation>,
) {
  const labels: Record<SellerRejectionReasonOption, string> = {
    NO_STOCK: t("order.rejectReasonNoStock"),
    NO_DELIVERY_DRIVERS: t("order.rejectReasonNoDeliveryDrivers"),
    OTHER: t("order.rejectReasonOther"),
  };

  return labels[reason];
}

function getStatusConfirmationCopy(
  type: StatusConfirmation["type"],
  t: ReturnType<typeof useTranslation>,
) {
  if (type === "accept") {
    return {
      title: t("order.acceptModalTitle"),
      description: t("order.acceptModalDescription"),
      confirmLabel: t("order.confirmAccept"),
    };
  }

  if (type === "reject") {
    return {
      title: t("order.rejectModalTitle"),
      description: t("order.rejectModalDescription"),
      confirmLabel: t("order.confirmReject"),
    };
  }

  return {
    title: t("order.cancelModalTitle"),
    description: t("order.cancelModalDescription"),
    confirmLabel: t("order.confirmCancel"),
  };
}

function getDefaultCancellationReason(
  type: StatusConfirmation["type"],
  t: ReturnType<typeof useTranslation>,
) {
  return type === "reject"
    ? t("order.rejectDefaultReason")
    : t("order.cancelDefaultReason");
}
