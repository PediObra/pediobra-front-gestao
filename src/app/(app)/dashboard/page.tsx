"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CircleDot,
  ClipboardList,
  DollarSign,
  Loader2,
  RefreshCw,
  Route,
  TimerOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  DeliveryRequestStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import {
  deliveryRequestsService,
  type DeliveryRequestStats,
} from "@/lib/api/delivery-requests";
import {
  ordersService,
  type ListOrdersParams,
  type OrderStats,
} from "@/lib/api/orders";
import { operationsService } from "@/lib/api/operations";
import { sellersService } from "@/lib/api/sellers";
import type {
  OperationIssue,
  OperationJob,
  OperationOffer,
  Order,
} from "@/lib/api/types";
import {
  centsToBRL,
  formatDateTime,
  formatDeliveryRequestCode,
  formatOrderCode,
} from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/language-store";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type DashboardPeriod = "today" | "yesterday" | "last7Days";

const ALL_SELLERS = "ALL";
const PENDING_ORDERS_FALLBACK_REFRESH_MS = 30_000;

export default function DashboardPage() {
  const t = useTranslation();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [sellerFilter, setSellerFilter] = useState(ALL_SELLERS);

  const periodRange = useMemo(() => getDashboardPeriodRange(period), [period]);
  const periodParams = useMemo(
    () => ({
      createdFrom: periodRange.from.toISOString(),
      createdTo: periodRange.to.toISOString(),
    }),
    [periodRange],
  );
  const selectedSellerId =
    sellerFilter === ALL_SELLERS ? undefined : Number(sellerFilter);

  const sellersQuery = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const sellerOptions = useMemo(
    () =>
      isAdmin
        ? (sellersQuery.data?.data ?? [])
        : (user?.sellers.map((membership) => membership.seller) ?? []),
    [isAdmin, sellersQuery.data?.data, user?.sellers],
  );

  const selectedSeller = sellerOptions.find(
    (seller) => seller.id === selectedSellerId,
  );

  const orderParams = useMemo(
    () => ({
      ...periodParams,
      ...(selectedSellerId ? { sellerId: selectedSellerId } : {}),
    }),
    [periodParams, selectedSellerId],
  );
  const deliveryParams = useMemo(
    () => ({
      ...periodParams,
      ...(selectedSellerId ? { requesterSellerId: selectedSellerId } : {}),
    }),
    [periodParams, selectedSellerId],
  );
  const overviewParams = useMemo(
    () => (selectedSellerId ? { sellerId: selectedSellerId } : {}),
    [selectedSellerId],
  );
  const pendingOrderParams = useMemo<ListOrdersParams>(
    () => ({
      page: 1,
      limit: 1,
      status: "PENDING",
    }),
    [],
  );

  const ordersStatsQ = useQuery({
    queryKey: queryKeys.orders.stats(orderParams),
    queryFn: () => ordersService.stats(orderParams),
  });
  const deliveriesStatsQ = useQuery({
    queryKey: queryKeys.deliveryRequests.stats(deliveryParams),
    queryFn: () => deliveryRequestsService.stats(deliveryParams),
  });
  const pendingOrdersQ = useQuery({
    queryKey: queryKeys.orders.list(pendingOrderParams),
    queryFn: () => ordersService.list(pendingOrderParams),
    refetchInterval: PENDING_ORDERS_FALLBACK_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
  const overviewQuery = useQuery({
    queryKey: queryKeys.operations.overview(overviewParams),
    queryFn: () => operationsService.overview(overviewParams),
  });

  const dispatchMutation = useMutation({
    mutationFn: operationsService.runDispatchCycle,
    onSuccess: (result) => {
      refreshDashboard();
      toast.success(
        `Despacho reprocessado: ${result.created} oferta(s), ${result.expired} expirada(s).`,
      );
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const expireOfferMutation = useMutation({
    mutationFn: operationsService.expireOffer,
    onSuccess: () => {
      refreshDashboard();
      toast.success("Oferta expirada e liberada para novo despacho.");
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const isFetching =
    ordersStatsQ.isFetching ||
    deliveriesStatsQ.isFetching ||
    pendingOrdersQ.isFetching ||
    overviewQuery.isFetching;
  const pendingOrder = pendingOrdersQ.data?.data[0];
  const pendingOrdersCount = pendingOrdersQ.data?.meta.total ?? 0;
  const overview = overviewQuery.data;
  const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
    { value: "today", label: t("dashboard.period.today") },
    { value: "yesterday", label: t("dashboard.period.yesterday") },
    { value: "last7Days", label: t("dashboard.period.last7Days") },
  ];

  function refreshDashboard() {
    qc.invalidateQueries({ queryKey: queryKeys.operations.all() });
    qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
    qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
    qc.invalidateQueries({ queryKey: queryKeys.drivers.all() });
    qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Operação</h1>
            <p className="text-sm text-muted-foreground">
              Números, fila de atenção e despacho em tempo real.
            </p>
          </div>
          {pendingOrder && pendingOrdersCount > 0 ? (
            <div className="flex shrink-0 justify-end">
              <PendingOrderAlert
                order={pendingOrder}
                count={pendingOrdersCount}
                showSellerName={sellerOptions.length > 1}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("dashboard.period")}</p>
          <p className="text-xs text-muted-foreground">
            {selectedSeller?.name ?? "Todas as empresas"} ·{" "}
            {t("dashboard.periodHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Select value={sellerFilter} onValueChange={setSellerFilter}>
            <SelectTrigger
              id="dashboard-seller-filter"
              aria-label="Empresas"
              className="w-full sm:w-64"
            >
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SELLERS}>Todas as empresas</SelectItem>
              {sellerOptions.map((seller) => (
                <SelectItem key={seller.id} value={String(seller.id)}>
                  {seller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <MetricSection
        title="Pedidos"
        metrics={orderMetrics(ordersStatsQ.data, ordersStatsQ.isLoading)}
      />

      <MetricSection
        title="Entregas avulsas"
        metrics={deliveryMetrics(
          deliveriesStatsQ.data,
          deliveriesStatsQ.isLoading,
        )}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fila operacional</h2>
            <p className="text-sm text-muted-foreground">
              Atenção, ofertas e despachos ativos no escopo selecionado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshDashboard}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Atualizar
            </Button>
            <Button
              onClick={() => dispatchMutation.mutate()}
              disabled={!isAdmin || dispatchMutation.isPending}
              title={!isAdmin ? "Somente admin" : undefined}
            >
              {dispatchMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CircleDot className="size-4" />
              )}
              Reprocessar despacho
            </Button>
          </div>
        </div>

        {overviewQuery.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Não foi possível carregar a operação</CardTitle>
              <CardDescription>
                {errorMessage(overviewQuery.error)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => overviewQuery.refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AttentionQueue
            issues={overview?.issues ?? []}
            isAdmin={isAdmin}
          />
          <OffersList
            offers={overview?.offers ?? []}
            isAdmin={isAdmin}
            activeOffers={overview?.summary.activeOffers ?? 0}
            pendingOfferId={expireOfferMutation.variables}
            isExpiring={expireOfferMutation.isPending}
            onExpire={(offerId) => expireOfferMutation.mutate(offerId)}
          />
        </div>

        <JobsList
          jobs={overview?.jobs ?? []}
          isAdmin={isAdmin}
          openJobs={overview?.summary.openJobs ?? 0}
        />
      </section>
    </div>
  );
}

function MetricSection({
  title,
  metrics,
}: {
  title: string;
  metrics: MetricCard[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className="group">
              <Card className="transition-colors group-hover:border-primary/50">
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                  <CardDescription className="text-xs uppercase tracking-wider">
                    {metric.label}
                  </CardDescription>
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-[oklch(0.35_0.1_60)] dark:bg-primary/12 dark:text-[oklch(0.84_0.15_78)]">
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {metric.loading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <div className="font-mono text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {metric.hint}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

type MetricCard = {
  label: string;
  icon: typeof ClipboardList;
  value: string | number;
  hint: string;
  href: string;
  loading: boolean;
};

function orderMetrics(stats: OrderStats | undefined, loading: boolean) {
  return [
    {
      label: "Total dos pedidos",
      icon: ClipboardList,
      value: stats?.total ?? 0,
      hint: "Pedidos criados no período",
      href: "/orders",
      loading,
    },
    {
      label: "Pedidos ativos",
      icon: CircleDot,
      value: stats?.active ?? 0,
      hint: "Pedidos ainda em fluxo",
      href: "/orders",
      loading,
    },
    {
      label: "Receita em pedidos",
      icon: DollarSign,
      value: centsToBRL(stats?.revenueCents ?? 0),
      hint: "Pedidos finalizados no período",
      href: "/orders",
      loading,
    },
    {
      label: "Entregues / cancelados",
      icon: ClipboardList,
      value: `${stats?.delivered ?? 0} / ${stats?.cancelled ?? 0}`,
      hint: "Fechamentos no período",
      href: "/orders",
      loading,
    },
  ] satisfies MetricCard[];
}

function deliveryMetrics(
  stats: DeliveryRequestStats | undefined,
  loading: boolean,
) {
  return [
    {
      label: "Total das entregas",
      icon: Route,
      value: stats?.total ?? 0,
      hint: "Entregas avulsas criadas no período",
      href: "/delivery-requests",
      loading,
    },
    {
      label: "Entregas ativas",
      icon: CircleDot,
      value: stats?.active ?? 0,
      hint: "Avulsas em andamento",
      href: "/delivery-requests",
      loading,
    },
    {
      label: "Receita em entregas",
      icon: DollarSign,
      value: centsToBRL(stats?.feeCents ?? 0),
      hint: "Frete das entregas do período",
      href: "/delivery-requests",
      loading,
    },
    {
      label: "Entregues / canceladas",
      icon: Route,
      value: `${stats?.delivered ?? 0} / ${stats?.cancelled ?? 0}`,
      hint: "Fechamentos no período",
      href: "/delivery-requests",
      loading,
    },
  ] satisfies MetricCard[];
}

function PendingOrderAlert({
  order,
  count,
  showSellerName,
}: {
  order: Order;
  count: number;
  showSellerName: boolean;
}) {
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
          {showSellerName && order.seller?.name ? ` · ${order.seller.name}` : ""}
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

function AttentionQueue({
  issues,
  isAdmin,
}: {
  issues: OperationIssue[];
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Fila Atenção</CardTitle>
            <CardDescription>
              Problemas que pedem ação operacional.
            </CardDescription>
          </div>
          <Badge variant={issues.length ? "warning" : "success"}>
            {issues.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum problema operacional destacado agora.
          </p>
        ) : (
          issues.map((issue, index) => (
            <div
              key={`${issue.type}-${issue.orderId ?? issue.deliveryRequestId ?? issue.offerId ?? issue.driverProfileId ?? index}`}
              className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-[color-mix(in_oklch,var(--warning)_80%,black)]" />
                  <p className="font-medium">{issue.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {issueDescription(issue)}
                </p>
              </div>
              <IssueActions issue={issue} isAdmin={isAdmin} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function IssueActions({
  issue,
  isAdmin,
}: {
  issue: OperationIssue;
  isAdmin: boolean;
}) {
  const links = targetLinks(
    {
      orderId: issue.orderId,
      deliveryRequestId: issue.deliveryRequestId,
      driverProfileId: issue.driverProfileId,
      paymentId: issue.paymentId,
    },
    {
      includeDriver: isAdmin,
      includePayment: isAdmin,
    },
  );

  const showDriverBadge = !isAdmin && issue.driverProfileId;
  const showPaymentBadge = !isAdmin && issue.paymentId;

  if (links.length === 0 && !showDriverBadge && !showPaymentBadge) return null;

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {showDriverBadge ? (
        <Badge variant="muted">Motorista #{issue.driverProfileId}</Badge>
      ) : null}
      {showPaymentBadge ? (
        <Badge variant="muted">Pagamento #{issue.paymentId}</Badge>
      ) : null}
      {links.map((link) => (
        <Button key={link.href} asChild variant="outline" size="sm">
          <Link href={link.href}>
            {link.label}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ))}
    </div>
  );
}

function OffersList({
  offers,
  isAdmin,
  isExpiring,
  pendingOfferId,
  activeOffers,
  onExpire,
}: {
  offers: OperationOffer[];
  isAdmin: boolean;
  isExpiring: boolean;
  pendingOfferId?: number;
  activeOffers: number;
  onExpire: (offerId: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Jobs e ofertas</CardTitle>
            <CardDescription>Ofertas abertas para motoristas.</CardDescription>
          </div>
          <Badge variant={activeOffers ? "warning" : "muted"}>
            {activeOffers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma oferta ativa no momento.
          </p>
        ) : (
          offers.map((offer) => (
            <div key={offer.id} className="rounded-md border border-border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Oferta #{offer.id}</span>
                    <Badge
                      variant={
                        offer.status === "ACCEPTING" ? "warning" : "muted"
                      }
                    >
                      {offer.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Job #{offer.deliveryJobId} · Motorista{" "}
                    {offer.driverName ?? `#${offer.driverProfileId}`}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Enviada {formatDateTime(offer.offeredAt)}</span>
                    <span>Expira {formatDateTime(offer.expiresAt)}</span>
                    <span>{formatDistance(offer.distanceMeters)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {targetLinks(offer, {
                    includeDriver: isAdmin,
                    includePayment: isAdmin,
                  }).map((link) => (
                    <Button key={link.href} asChild variant="ghost" size="sm">
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isAdmin || isExpiring}
                    onClick={() => onExpire(offer.id)}
                    title={!isAdmin ? "Somente admin" : undefined}
                  >
                    {isExpiring && pendingOfferId === offer.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <TimerOff className="size-4" />
                    )}
                    Expirar
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function JobsList({
  jobs,
  isAdmin,
  openJobs,
}: {
  jobs: OperationJob[];
  isAdmin: boolean;
  openJobs: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Despachos ativos</CardTitle>
            <CardDescription>
              Jobs abertos ou aceitos pela operação.
            </CardDescription>
          </div>
          <Badge variant={openJobs ? "warning" : "muted"}>{openJobs}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum job ativo no momento.
          </p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Job #{job.id}</span>
                  <Badge
                    variant={job.status === "OPEN" ? "warning" : "default"}
                  >
                    {job.status}
                  </Badge>
                  <TargetBadge job={job} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.orderStatus ? (
                    <OrderStatusBadge status={job.orderStatus} />
                  ) : null}
                  {job.deliveryRequestStatus ? (
                    <DeliveryRequestStatusBadge
                      status={job.deliveryRequestStatus}
                    />
                  ) : null}
                  {job.orderPaymentStatus ? (
                    <PaymentStatusBadge status={job.orderPaymentStatus} />
                  ) : null}
                  {job.deliveryRequestPaymentStatus ? (
                    <PaymentStatusBadge
                      status={job.deliveryRequestPaymentStatus}
                    />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualizado {formatDateTime(job.updatedAt ?? job.createdAt)}
                  {job.acceptedByDriverProfileId
                    ? ` · Motorista #${job.acceptedByDriverProfileId}`
                    : " · Sem motorista aceito"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {targetLinks(job, {
                  includeDriver: isAdmin,
                  includePayment: isAdmin,
                }).map((link) => (
                  <Button key={link.href} asChild variant="outline" size="sm">
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                {job.acceptedByDriverProfileId && isAdmin ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/drivers/${job.acceptedByDriverProfileId}`}>
                      Motorista
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TargetBadge({ job }: { job: OperationJob }) {
  if (job.orderId) {
    return (
      <Badge variant="secondary">{formatOrderCode({ id: job.orderId })}</Badge>
    );
  }

  if (job.deliveryRequestId) {
    return (
      <Badge variant="secondary">
        {formatDeliveryRequestCode({ id: job.deliveryRequestId })}
      </Badge>
    );
  }

  return <Badge variant="muted">Sem origem</Badge>;
}

function targetLinks(
  target: {
    orderId?: number | null;
    deliveryRequestId?: number | null;
    driverProfileId?: number | null;
    paymentId?: number | null;
  },
  options: {
    includeDriver: boolean;
    includePayment: boolean;
  },
) {
  const links: Array<{ href: string; label: string }> = [];

  if (target.orderId) {
    links.push({ href: `/orders/${target.orderId}`, label: "Pedido" });
  }

  if (target.deliveryRequestId) {
    links.push({
      href: `/delivery-requests/${target.deliveryRequestId}`,
      label: "Entrega",
    });
  }

  if (target.driverProfileId && options.includeDriver) {
    links.push({
      href: `/drivers/${target.driverProfileId}`,
      label: "Motorista",
    });
  }

  if (target.paymentId && options.includePayment) {
    links.push({ href: "/payments", label: "Pagamento/refund" });
  }

  return links;
}

function issueDescription(issue: OperationIssue) {
  if (issue.type === "ASSIGNED_DRIVER_UNREACHABLE") {
    const target = issue.deliveryJobId
      ? `Job #${issue.deliveryJobId}`
      : "Job aceito";
    if (issue.driverAvailability === "OFFLINE") {
      return `${target} com motorista offline. Oriente o motorista a abrir o app ou reatribua a entrega.`;
    }
    return issue.lastLocationAt
      ? `${target} sem localização recente desde ${formatDateTime(issue.lastLocationAt)}. Oriente o motorista a abrir o app e reenviar localização.`
      : `${target} sem localização registrada. Oriente o motorista a abrir o app e reenviar localização.`;
  }
  if (issue.type === "ONLINE_DRIVER_STALE_LOCATION") {
    return issue.lastLocationAt
      ? `Última localização em ${formatDateTime(issue.lastLocationAt)}. Oriente o motorista a abrir o app e reenviar localização.`
      : "Motorista online sem localização registrada. Oriente o motorista a abrir o app e reenviar localização.";
  }
  if (issue.createdAt) return `Criado em ${formatDateTime(issue.createdAt)}.`;
  if (issue.lastLocationAt) {
    return `Última localização em ${formatDateTime(issue.lastLocationAt)}.`;
  }
  if (issue.offerId) return `Oferta #${issue.offerId}.`;
  if (issue.deliveryJobId) return `Job #${issue.deliveryJobId}.`;
  if (issue.paymentId) return `Pagamento #${issue.paymentId}.`;
  return issue.type;
}

function formatDistance(distanceMeters?: number | null) {
  if (distanceMeters === null || distanceMeters === undefined)
    return "distância —";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1).replace(".", ",")} km`;
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
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.displayMessage;
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a ação.";
}
