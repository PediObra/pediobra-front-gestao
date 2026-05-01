"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CircleDot,
  Loader2,
  RefreshCw,
  TimerOff,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
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
import { ApiError } from "@/lib/api/client";
import { operationsService } from "@/lib/api/operations";
import { sellersService } from "@/lib/api/sellers";
import type {
  OperationIssue,
  OperationJob,
  OperationOffer,
} from "@/lib/api/types";
import {
  formatDateTime,
  formatDeliveryRequestCode,
  formatOrderCode,
} from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";

const SUMMARY_ITEMS = [
  {
    key: "activeOrders",
    title: "Pedidos ativos",
    description: "Pedidos ainda em fluxo",
  },
  {
    key: "activeDeliveryRequests",
    title: "Entregas ativas",
    description: "Avulsas em andamento",
  },
  {
    key: "openJobs",
    title: "Jobs abertos",
    description: "Despachos em aberto/aceitos",
  },
  {
    key: "activeOffers",
    title: "Ofertas ativas",
    description: "Motoristas avaliando aceite",
  },
  {
    key: "onlineDrivers",
    title: "Motoristas online",
    description: "Disponíveis na operação",
  },
] as const;

export default function OperationsPage() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [sellerFilter, setSellerFilter] = useState("ALL");

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

  const overviewParams = useMemo(
    () => (sellerFilter === "ALL" ? {} : { sellerId: Number(sellerFilter) }),
    [sellerFilter],
  );

  const overviewQuery = useQuery({
    queryKey: queryKeys.operations.overview(overviewParams),
    queryFn: () => operationsService.overview(overviewParams),
  });

  const refreshOperations = () => {
    qc.invalidateQueries({ queryKey: queryKeys.operations.all() });
    qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
    qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
    qc.invalidateQueries({ queryKey: queryKeys.drivers.all() });
    qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
  };

  const dispatchMutation = useMutation({
    mutationFn: operationsService.runDispatchCycle,
    onSuccess: (result) => {
      refreshOperations();
      toast.success(
        `Despacho reprocessado: ${result.created} oferta(s), ${result.expired} expirada(s).`,
      );
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const expireOfferMutation = useMutation({
    mutationFn: operationsService.expireOffer,
    onSuccess: () => {
      refreshOperations();
      toast.success("Oferta expirada e liberada para novo despacho.");
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operação"
        description="Fila de atenção, despacho e status em tempo real."
        actions={
          <>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger
                id="operations-seller-filter"
                aria-label="Empresas"
                className="w-full sm:w-64"
              >
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as empresas</SelectItem>
                {sellerOptions.map((seller) => (
                  <SelectItem key={seller.id} value={String(seller.id)}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => overviewQuery.refetch()}
              disabled={overviewQuery.isFetching}
            >
              {overviewQuery.isFetching ? (
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
          </>
        }
      />

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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {SUMMARY_ITEMS.map((item) => (
          <Card key={item.key}>
            <CardHeader className="p-4 pb-2">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-3xl">
                {overview ? overview.summary[item.key] : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              {item.description}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AttentionQueue issues={overview?.issues ?? []} isAdmin={isAdmin} />
        <OffersList
          offers={overview?.offers ?? []}
          isAdmin={isAdmin}
          pendingOfferId={expireOfferMutation.variables}
          isExpiring={expireOfferMutation.isPending}
          onExpire={(offerId) => expireOfferMutation.mutate(offerId)}
        />
      </div>

      <JobsList jobs={overview?.jobs ?? []} isAdmin={isAdmin} />
    </div>
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
  onExpire,
}: {
  offers: OperationOffer[];
  isAdmin: boolean;
  isExpiring: boolean;
  pendingOfferId?: number;
  onExpire: (offerId: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs e ofertas</CardTitle>
        <CardDescription>Ofertas abertas para motoristas.</CardDescription>
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
}: {
  jobs: OperationJob[];
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Despachos ativos</CardTitle>
        <CardDescription>
          Jobs abertos ou aceitos pela operação.
        </CardDescription>
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

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.displayMessage;
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a ação.";
}
