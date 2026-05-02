"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import {
  BellRing,
  ClipboardList,
  Package,
  Store,
  Truck,
  ArrowRight,
  DollarSign,
  Route,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  ordersService,
  type ListOrdersParams,
  type OrderStats,
} from "@/lib/api/orders";
import { sellersService } from "@/lib/api/sellers";
import { productsService } from "@/lib/api/products";
import { driversService } from "@/lib/api/drivers";
import {
  deliveryRequestsService,
  type DeliveryRequestStats,
} from "@/lib/api/delivery-requests";
import { queryKeys } from "@/lib/query-keys";
import {
  centsToBRL,
  formatDateTime,
  formatDeliveryRequestCode,
  formatOrderCode,
} from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeliveryRequestStatusBadge, OrderStatusBadge } from "@/components/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  DeliveryRequestStatus,
  OrderStatus,
  Paginated,
  Order,
  DeliveryRequest,
  DriverProfile,
  Product,
  Seller,
} from "@/lib/api/types";

type DashboardPeriod = "today" | "yesterday" | "last7Days";

export default function DashboardPage() {
  const t = useTranslation();
  const { user, isAdmin, isSeller, sellerIds } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("today");

  const sellerId = !isAdmin && isSeller ? sellerIds[0] : undefined;
  const periodRange = useMemo(() => getDashboardPeriodRange(period), [period]);
  const periodParams = {
    createdFrom: periodRange.from.toISOString(),
    createdTo: periodRange.to.toISOString(),
  };

  const sharedOrderParams = {
    ...(sellerId ? { sellerId } : {}),
    ...periodParams,
  };
  const pendingOrderParams: ListOrdersParams = {
    page: 1,
    limit: 1,
    status: "PENDING",
    ...(sellerId ? { sellerId } : {}),
  };
  const sharedDeliveryParams = {
    ...(sellerId ? { requesterSellerId: sellerId } : {}),
    ...periodParams,
  };
  const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
    { value: "today", label: t("dashboard.period.today") },
    { value: "yesterday", label: t("dashboard.period.yesterday") },
    { value: "last7Days", label: t("dashboard.period.last7Days") },
  ];

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.orders.stats(sharedOrderParams),
        queryFn: () => ordersService.stats(sharedOrderParams),
      },
      {
        queryKey: queryKeys.orders.list({
          page: 1,
          limit: 5,
          ...sharedOrderParams,
        }),
        queryFn: () =>
          ordersService.list({
            page: 1,
            limit: 5,
            ...sharedOrderParams,
          }),
      },
      {
        queryKey: queryKeys.orders.list(pendingOrderParams),
        queryFn: () => ordersService.list(pendingOrderParams),
      },
      {
        queryKey: queryKeys.sellers.list({ page: 1, limit: 1 }),
        queryFn: () => sellersService.list({ page: 1, limit: 1 }),
        enabled: isAdmin,
      },
      {
        queryKey: queryKeys.products.list({ page: 1, limit: 1 }),
        queryFn: () => productsService.list({ page: 1, limit: 1 }),
      },
      {
        queryKey: queryKeys.drivers.list({ page: 1, limit: 1 }),
        queryFn: () => driversService.list({ page: 1, limit: 1 }),
        enabled: isAdmin,
      },
      {
        queryKey: queryKeys.deliveryRequests.stats(sharedDeliveryParams),
        queryFn: () => deliveryRequestsService.stats(sharedDeliveryParams),
      },
      {
        queryKey: queryKeys.deliveryRequests.list({
          page: 1,
          limit: 5,
          ...sharedDeliveryParams,
        }),
        queryFn: () =>
          deliveryRequestsService.list({
            page: 1,
            limit: 5,
            ...sharedDeliveryParams,
          }),
      },
    ],
  });

  const [
    ordersStatsQ,
    ordersRecentQ,
    pendingOrdersQ,
    sellersQ,
    productsQ,
    driversQ,
    deliveriesStatsQ,
    deliveriesRecentQ,
  ] = results as [
    { data?: OrderStats; isLoading: boolean },
    { data?: Paginated<Order>; isLoading: boolean },
    { data?: Paginated<Order>; isLoading: boolean },
    { data?: Paginated<Seller>; isLoading: boolean },
    { data?: Paginated<Product>; isLoading: boolean },
    { data?: Paginated<DriverProfile>; isLoading: boolean },
    { data?: DeliveryRequestStats; isLoading: boolean },
    { data?: Paginated<DeliveryRequest>; isLoading: boolean },
  ];

  const statusCounts = ordersStatsQ.data?.statusCounts ?? {};
  const deliveryStatusCounts = deliveriesStatsQ.data?.statusCounts ?? {};

  const cards: Array<{
    label: string;
    icon: typeof ClipboardList;
    value: string | number;
    hint: string;
    loading: boolean;
    href: string;
  }> = [
    {
      label: t("dashboard.activeOrders"),
      icon: ClipboardList,
      value: ordersStatsQ.data?.active ?? 0,
      hint: t("dashboard.deliveredCancelled", {
        delivered: ordersStatsQ.data?.delivered ?? 0,
        cancelled: ordersStatsQ.data?.cancelled ?? 0,
      }),
      loading: ordersStatsQ.isLoading,
      href: "/orders",
    },
    {
      label: t("dashboard.periodRevenue"),
      icon: DollarSign,
      value: centsToBRL(ordersStatsQ.data?.revenueCents ?? 0),
      hint: t("dashboard.periodRevenueHint"),
      loading: ordersStatsQ.isLoading,
      href: "/orders",
    },
    {
      label: t("dashboard.activeDeliveries"),
      icon: Route,
      value: deliveriesStatsQ.data?.active ?? 0,
      hint: t("dashboard.deliveryRequestsHint"),
      loading: deliveriesStatsQ.isLoading,
      href: "/delivery-requests",
    },
    {
      label: t("dashboard.registeredProducts"),
      icon: Package,
      value: productsQ.data?.meta.total ?? "—",
      hint: t("dashboard.globalCatalog"),
      loading: productsQ.isLoading,
      href: "/products",
    },
    ...(isAdmin
      ? [
          {
            label: t("dashboard.activeStores"),
            icon: Store,
            value: sellersQ.data?.meta.total ?? "—",
            hint: t("dashboard.registeredSellers"),
            loading: sellersQ.isLoading,
            href: "/sellers",
          },
          {
            label: t("dashboard.drivers"),
            icon: Truck,
            value: driversQ.data?.meta.total ?? "—",
            hint: t("dashboard.driversHint"),
            loading: driversQ.isLoading,
            href: "/drivers",
          },
        ]
      : []),
  ];

  const recentOrders = ordersRecentQ.data?.data ?? [];
  const recentDeliveries = deliveriesRecentQ.data?.data ?? [];
  const pendingOrder = pendingOrdersQ.data?.data[0];
  const pendingOrdersCount = pendingOrdersQ.data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.greeting", {
          name: user?.name?.split(" ")[0] ?? t("dashboard.visitor"),
        })}
        description={
          isAdmin
            ? t("dashboard.adminDescription")
            : t("dashboard.sellerDescription")
        }
        actions={
          pendingOrder && pendingOrdersCount > 0 ? (
            <PendingOrderAlert order={pendingOrder} count={pendingOrdersCount} />
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("dashboard.period")}</p>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.periodHint")}
          </p>
        </div>
        <div
          className="inline-flex rounded-md border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label={t("dashboard.period")}
        >
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={period === option.value}
              className={cn(
                "h-8 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === option.value &&
                  "bg-background text-foreground shadow-sm",
              )}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="group">
              <Card className="transition-colors group-hover:border-primary/50">
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardDescription className="text-xs uppercase tracking-wider">
                      {card.label}
                    </CardDescription>
                  </div>
                  <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center text-[oklch(0.35_0.1_60)] dark:bg-primary/12 dark:text-[oklch(0.84_0.15_78)]">
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {card.loading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <div className="text-3xl font-semibold font-mono tracking-tight">
                      {card.value}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("dashboard.recentOrders")}</CardTitle>
              <CardDescription>
                {t("dashboard.lastFiveOrders")}
              </CardDescription>
            </div>
            <Link
              href="/orders"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {t("dashboard.viewAll")}
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {ordersRecentQ.isLoading ? (
              <div className="px-6 pb-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground">
                {t("dashboard.noOrders")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50"
                    >
                      <div className="font-mono text-sm font-medium w-24 shrink-0">
                        {formatOrderCode(order)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {order.seller?.name ??
                            t("app.sellerFallback", { id: order.sellerId })}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formatDateTime(order.createdAt)}
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="font-mono text-sm font-semibold w-24 text-right">
                        {centsToBRL(order.totalAmountCents)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.ordersStatusDistribution")}</CardTitle>
            <CardDescription>{t("dashboard.ordersInPeriod")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {ordersStatsQ.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))
            ) : (
              (
                [
                  "PENDING",
                  "CONFIRMED",
                  "PREPARING",
                  "READY_FOR_PICKUP",
                  "READY_FOR_CUSTOMER_PICKUP",
                  "PICKED_UP",
                  "OUT_FOR_DELIVERY",
                  "DELIVERED",
                  "CUSTOMER_PICKED_UP",
                  "DELIVERY_FAILED",
                  "CANCELLED",
                ] as OrderStatus[]
              ).map((status) => (
                <div
                  key={status}
                  className="flex items-center justify-between gap-2"
                >
                  <OrderStatusBadge status={status} />
                  <span className="font-mono text-sm font-medium">
                    {statusCounts[status] ?? 0}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("dashboard.recentDeliveries")}</CardTitle>
              <CardDescription>
                {t("dashboard.lastFiveDeliveries")}
              </CardDescription>
            </div>
            <Link
              href="/delivery-requests"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("dashboard.viewAll")}
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {deliveriesRecentQ.isLoading ? (
              <div className="space-y-2 px-6 pb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentDeliveries.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground">
                {t("dashboard.noDeliveries")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentDeliveries.map((delivery) => (
                  <li key={delivery.id}>
                    <Link
                      href={`/delivery-requests/${delivery.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50"
                    >
                      <div className="w-24 shrink-0 font-mono text-sm font-medium">
                        {formatDeliveryRequestCode(delivery)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {delivery.dropoffAddress}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatDateTime(delivery.createdAt)}
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <DeliveryRequestStatusBadge status={delivery.status} />
                      </div>
                      <div className="w-24 text-right font-mono text-sm font-semibold">
                        {centsToBRL(delivery.deliveryFeeCents)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.deliveriesStatusDistribution")}</CardTitle>
            <CardDescription>
              {t("dashboard.deliveriesInPeriod")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {deliveriesStatsQ.isLoading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))
            ) : (
              (
                [
                  "PENDING",
                  "ASSIGNED",
                  "PICKED_UP",
                  "OUT_FOR_DELIVERY",
                  "DELIVERED",
                  "DELIVERY_FAILED",
                  "CANCELLED",
                ] as DeliveryRequestStatus[]
              ).map((status) => (
                <div
                  key={status}
                  className="flex items-center justify-between gap-2"
                >
                  <DeliveryRequestStatusBadge status={status} />
                  <span className="font-mono text-sm font-medium">
                    {deliveryStatusCounts[status] ?? 0}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PendingOrderAlert({ order, count }: { order: Order; count: number }) {
  const t = useTranslation();

  return (
    <Link
      href={`/orders/${order.id}`}
      className="animate-pending-order-attention flex w-full items-center gap-3 rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/15 sm:w-auto"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/20 text-[color-mix(in_oklch,var(--primary)_75%,black)] dark:text-primary">
        <BellRing className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">
          {t("dashboard.pendingOrders")}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {t("dashboard.pendingOrdersDescription", {
            code: formatOrderCode(order),
          })}
        </span>
      </span>
      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
        {t("dashboard.pendingOrdersCount", { count })}
      </span>
      <span className="hidden items-center gap-1 text-sm font-medium sm:inline-flex">
        {t("dashboard.pendingOrdersAction")}
        <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

function getDashboardPeriodRange(period: DashboardPeriod) {
  const now = new Date();
  const todayStart = startOfLocalDay(now);

  if (period === "today") {
    return {
      from: todayStart,
      to: addDays(todayStart, 1),
    };
  }

  if (period === "yesterday") {
    return {
      from: addDays(todayStart, -1),
      to: todayStart,
    };
  }

  return {
    from: addDays(todayStart, -6),
    to: addDays(todayStart, 1),
  };
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
