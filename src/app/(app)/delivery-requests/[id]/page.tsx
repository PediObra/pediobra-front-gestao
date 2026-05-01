"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { DeliveryRequestStripeDialog } from "@/components/payments/delivery-request-stripe-dialog";
import {
  DeliveryRequestStatusBadge,
  PaymentStatusBadge,
} from "@/components/badges";
import { deliveryRequestsService } from "@/lib/api/delivery-requests";
import { driversService } from "@/lib/api/drivers";
import { paymentsService } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { allowedDeliveryRequestStatusTransitions } from "@/lib/auth/permissions";
import { formatDeliveryRequestHistoryEntry } from "@/lib/status-history";
import {
  centsToBRL,
  deliveryRequestStatusLabel,
  evidenceTypeLabel,
  formatDateTime,
  formatDeliveryRequestCode,
  formatPhone,
  paymentStatusLabel,
} from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe/config";
import type {
  DeliveryRequestStatus,
  EvidenceType,
  PaymentStatus,
} from "@/lib/api/types";

const EVIDENCE_TYPES: EvidenceType[] = [
  "DRIVER_CONFIRMATION",
  "DELIVERY_PHOTO",
  "PICKUP_PHOTO",
  "GENERAL",
];

const MOCK_PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

export default function DeliveryRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const deliveryRequestId = Number(id);
  const t = useTranslation();
  const qc = useQueryClient();
  const { user, isAdmin, sellerIds } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.deliveryRequests.byId(deliveryRequestId),
    queryFn: () => deliveryRequestsService.getById(deliveryRequestId),
    enabled: Number.isFinite(deliveryRequestId),
  });

  const driversQ = useQuery({
    queryKey: queryKeys.drivers.list({
      page: 1,
      limit: 50,
      status: "APPROVED",
    }),
    queryFn: () =>
      driversService.list({ page: 1, limit: 50, status: "APPROVED" }),
    enabled: isAdmin,
  });

  const deliveryRequest = query.data;
  const transitions = allowedDeliveryRequestStatusTransitions(
    user,
    deliveryRequest ?? {
      requesterUserId: 0,
      requesterSellerId: null,
      assignedDriverProfileId: null,
      status: "",
    },
  );

  const [nextStatus, setNextStatus] = useState<DeliveryRequestStatus | "">("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetails, setCancelDetails] = useState("");
  const [driverSel, setDriverSel] = useState<string>("");
  const [evType, setEvType] = useState<EvidenceType>("GENERAL");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [evNote, setEvNote] = useState("");
  const [evFileInputKey, setEvFileInputKey] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const autoPaymentStartedRef = useRef(false);

  const canPayDeliveryRequest = Boolean(
    deliveryRequest &&
    (isAdmin ||
      user?.id === deliveryRequest.requesterUserId ||
      (deliveryRequest.requesterSellerId !== null &&
        deliveryRequest.requesterSellerId !== undefined &&
        sellerIds.includes(deliveryRequest.requesterSellerId))),
  );
  const hasReleasedPayment = Boolean(
    ["AUTHORIZED", "PAID"].includes(deliveryRequest?.paymentStatus ?? "") ||
    deliveryRequest?.payments?.some((payment) =>
      ["AUTHORIZED", "PAID"].includes(payment.status),
    ),
  );
  const canStartStripePayment = Boolean(
    deliveryRequest &&
    canPayDeliveryRequest &&
    deliveryRequest.status === "PENDING" &&
    deliveryRequest.deliveryFeeCents > 0 &&
    !hasReleasedPayment,
  );

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!nextStatus) throw new Error(t("order.selectStatus"));
      return deliveryRequestsService.updateStatus(deliveryRequestId, {
        status: nextStatus,
        cancellationReason:
          nextStatus === "CANCELLED" ? cancelReason || undefined : undefined,
        cancellationDetails:
          nextStatus === "CANCELLED" ? cancelDetails || undefined : undefined,
      });
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        queryKeys.deliveryRequests.byId(deliveryRequestId),
        updated,
      );
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      toast.success(t("order.statusUpdated"));
      setNextStatus("");
      setCancelReason("");
      setCancelDetails("");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.statusUpdateFailed"),
      );
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!driverSel) throw new Error(t("order.selectDriver"));
      return deliveryRequestsService.assignDriver(deliveryRequestId, {
        driverProfileId: Number(driverSel),
      });
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        queryKeys.deliveryRequests.byId(deliveryRequestId),
        updated,
      );
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      toast.success(t("order.driverAssigned"));
      setDriverSel("");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.assignFailed"),
      );
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: () => {
      if (!evFile) throw new Error(t("order.selectImage"));
      return deliveryRequestsService.addEvidence(deliveryRequestId, {
        evidenceType: evType,
        image: evFile,
        note: evNote || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.deliveryRequests.byId(deliveryRequestId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      toast.success(t("order.evidenceAdded"));
      setEvFile(null);
      setEvNote("");
      setEvFileInputKey((key) => key + 1);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("order.addFailed"),
      );
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      paymentsService.createMockForDeliveryRequest(deliveryRequestId, {
        status: paymentStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.deliveryRequests.byId(deliveryRequestId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      toast.success(t("payments.mockCreated"));
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : t("payments.createFailed"),
      );
    },
  });

  const stripePaymentMutation = useMutation({
    mutationFn: () => {
      if (!STRIPE_PUBLISHABLE_KEY) {
        throw new Error(t("payments.stripeKeyMissing"));
      }

      return paymentsService.createStripeForDeliveryRequest(deliveryRequestId);
    },
    onSuccess: (response) => {
      qc.invalidateQueries({
        queryKey: queryKeys.deliveryRequests.byId(deliveryRequestId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });

      if (["AUTHORIZED", "PAID"].includes(response.payment.status)) {
        toast.success(t("payments.deliveryPaymentAlreadyConfirmed"));
        return;
      }

      if (!response.clientSecret) {
        toast.error(t("payments.stripeClientSecretMissing"));
        return;
      }

      setStripeClientSecret(response.clientSecret);
      setPaymentDialogOpen(true);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("payments.createFailed"),
      );
    },
  });

  useEffect(() => {
    if (
      searchParams.get("pay") !== "1" ||
      autoPaymentStartedRef.current ||
      !canStartStripePayment
    ) {
      return;
    }

    autoPaymentStartedRef.current = true;
    stripePaymentMutation.mutate();
  }, [canStartStripePayment, searchParams, stripePaymentMutation]);

  function handleDeliveryPaymentSuccess() {
    setPaymentDialogOpen(false);
    setStripeClientSecret(null);
    qc.invalidateQueries({
      queryKey: queryKeys.deliveryRequests.byId(deliveryRequestId),
    });
    qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
    qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
    window.setTimeout(() => {
      qc.invalidateQueries({
        queryKey: queryKeys.deliveryRequests.byId(deliveryRequestId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
    }, 1500);
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!deliveryRequest) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("deliveries.notFound")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/delivery-requests">
            <ArrowLeft className="size-4" />
            {t("deliveries.backToDeliveries")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={
          <span className="font-mono">
            {formatDeliveryRequestCode(deliveryRequest)}
          </span>
        }
        description={t("deliveries.createdAt", {
          date: formatDateTime(deliveryRequest.createdAt),
        })}
        actions={
          <div className="flex items-center gap-2">
            <DeliveryRequestStatusBadge status={deliveryRequest.status} />
            {deliveryRequest.paymentStatus && (
              <PaymentStatusBadge status={deliveryRequest.paymentStatus} />
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                {t("deliveries.route")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <RouteBlock
                title={t("deliveries.pickup")}
                address={deliveryRequest.pickupAddress}
                cep={deliveryRequest.pickupCep}
                phone={deliveryRequest.pickupContactPhone}
                contact={deliveryRequest.pickupContactName}
                lat={deliveryRequest.pickupLatitude}
                lng={deliveryRequest.pickupLongitude}
              />
              <RouteBlock
                title={t("deliveries.dropoff")}
                address={deliveryRequest.dropoffAddress}
                cep={deliveryRequest.dropoffCep}
                phone={deliveryRequest.dropoffContactPhone}
                contact={deliveryRequest.dropoffContactName}
                lat={deliveryRequest.dropoffLatitude}
                lng={deliveryRequest.dropoffLongitude}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4" />
                {t("deliveries.package")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{deliveryRequest.packageDescription}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Info
                  label={t("deliveries.packageSize")}
                  value={deliveryRequest.packageSize}
                />
                <Info
                  label={t("deliveries.packageWeight")}
                  value={
                    deliveryRequest.packageWeightGrams
                      ? `${deliveryRequest.packageWeightGrams} g`
                      : null
                  }
                />
                <Info
                  label={t("deliveries.distance")}
                  value={
                    deliveryRequest.deliveryDistanceMeters
                      ? `${(deliveryRequest.deliveryDistanceMeters / 1000).toFixed(1)} km`
                      : null
                  }
                />
              </div>
              {deliveryRequest.notes && (
                <p className="border-l-2 border-border pl-2 text-xs text-muted-foreground">
                  {deliveryRequest.notes}
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-3 font-semibold">
                <span>{t("deliveries.fee")}</span>
                <span className="font-mono">
                  {centsToBRL(deliveryRequest.deliveryFeeCents)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("order.timeline")}</CardTitle>
              <CardDescription>
                {t("order.timelineDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryRequest.statusHistory?.length ? (
                <ol className="relative ml-2 space-y-4 border-l border-border">
                  {[...deliveryRequest.statusHistory]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((h) => {
                      const event = formatDeliveryRequestHistoryEntry(h, t);

                      return (
                        <li key={h.id} className="ml-4">
                          <div className="absolute -left-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {event.title}
                            </p>
                            <DeliveryRequestStatusBadge status={event.status} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{formatDateTime(h.createdAt)}</span>
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
                  count: deliveryRequest.evidences?.length ?? 0,
                })}
              </CardTitle>
              <CardDescription>
                {t("order.evidencesDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveryRequest.evidences?.length ? (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {deliveryRequest.evidences.map((e) => (
                    <a
                      key={e.id}
                      href={e.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-md border border-border bg-muted"
                    >
                      <div className="aspect-square overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={e.imageUrl}
                          alt={evidenceTypeLabel(e.evidenceType)}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="bg-card p-2">
                        <p className="text-xs font-medium">
                          {evidenceTypeLabel(e.evidenceType)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTime(e.createdAt)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("order.noEvidence")}
                </p>
              )}

              <div className="space-y-3 border-t border-border pt-4">
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
                        {EVIDENCE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {evidenceTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-image">{t("order.image")}</Label>
                    <div className="flex gap-3">
                      <ImageFilePreview
                        file={evFile}
                        alt={t("order.evidencePreview")}
                        className="size-20 shrink-0"
                      />
                      <Input
                        key={evFileInputKey}
                        id="ev-image"
                        type="file"
                        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setEvFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t("order.noteOptional")}</Label>
                    <Textarea
                      rows={2}
                      value={evNote}
                      onChange={(e) => setEvNote(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end sm:col-span-2">
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" />
                {t("deliveries.requester")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">
                {deliveryRequest.requesterUser?.name ??
                  `#${deliveryRequest.requesterUserId}`}
              </div>
              {deliveryRequest.requesterUser?.email && (
                <div className="text-muted-foreground">
                  {deliveryRequest.requesterUser.email}
                </div>
              )}
              {deliveryRequest.requesterSeller && (
                <div className="text-muted-foreground">
                  {deliveryRequest.requesterSeller.name}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-4" />
                {t("order.driver")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveryRequest.assignedDriverProfile ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium">
                    {deliveryRequest.assignedDriverProfile.user?.name ??
                      t("order.driverFallback", {
                        id: deliveryRequest.assignedDriverProfile.id,
                      })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPhone(deliveryRequest.assignedDriverProfile.phone)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("order.noDriver")}
                </p>
              )}

              {isAdmin && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label>{t("order.assignDriver")}</Label>
                  <Select value={driverSel} onValueChange={setDriverSel}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("order.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(driversQ.data?.data ?? []).map((driver) => (
                        <SelectItem key={driver.id} value={String(driver.id)}>
                          {driver.user?.name ?? `#${driver.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => assignMutation.mutate()}
                    disabled={!driverSel || assignMutation.isPending}
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {t("common.assign")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {transitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("order.changeStatus")}</CardTitle>
                <CardDescription>{t("order.allowedStatuses")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={nextStatus}
                  onValueChange={(v) =>
                    setNextStatus(v as DeliveryRequestStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("order.newStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {transitions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {deliveryRequestStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {nextStatus === "CANCELLED" && (
                  <div className="space-y-2">
                    <Input
                      placeholder={t("order.reason")}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <Textarea
                      placeholder={t("order.detailsOptional")}
                      rows={2}
                      value={cancelDetails}
                      onChange={(e) => setCancelDetails(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => statusMutation.mutate()}
                  disabled={!nextStatus || statusMutation.isPending}
                >
                  {statusMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t("common.apply")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                {t("order.payments", {
                  count: deliveryRequest.payments?.length ?? 0,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveryRequest.payments?.length ? (
                <div className="space-y-2">
                  {deliveryRequest.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-3 border-b border-border pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {payment.provider ?? "—"} · {payment.method ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(payment.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <PaymentStatusBadge status={payment.status} />
                        <span className="font-mono text-sm font-semibold">
                          {centsToBRL(payment.amountCents)}
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

              {canStartStripePayment && (
                <div className="space-y-3 rounded-md border border-primary/30 bg-primary/10 p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {t("payments.deliveryPendingPayment")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("payments.deliveryPendingPaymentDescription")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => stripePaymentMutation.mutate()}
                    disabled={stripePaymentMutation.isPending}
                  >
                    {stripePaymentMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    {t("payments.payAndDispatch")}
                  </Button>
                </div>
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
      </div>
      <DeliveryRequestStripeDialog
        open={paymentDialogOpen}
        clientSecret={stripeClientSecret}
        amountLabel={centsToBRL(deliveryRequest.deliveryFeeCents)}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={handleDeliveryPaymentSuccess}
      />
    </div>
  );
}

function RouteBlock({
  title,
  address,
  cep,
  phone,
  contact,
  lat,
  lng,
}: {
  title: string;
  address: string;
  cep?: string | null;
  phone?: string | null;
  contact?: string | null;
  lat?: string | null;
  lng?: string | null;
}) {
  const t = useTranslation();

  return (
    <div className="space-y-1 rounded-md border border-border p-3 text-sm">
      <div className="font-semibold">{title}</div>
      <p>{address}</p>
      {cep && <p className="text-muted-foreground">CEP {cep}</p>}
      {contact && <p className="text-muted-foreground">{contact}</p>}
      {phone && <p className="text-muted-foreground">{formatPhone(phone)}</p>}
      {(lat || lng) && (
        <p className="text-xs text-muted-foreground">
          {t("deliveries.coordinates", {
            lat: lat ?? "—",
            lng: lng ?? "—",
          })}
        </p>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
