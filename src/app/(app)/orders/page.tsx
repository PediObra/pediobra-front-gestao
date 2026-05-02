"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DateRangeFilter,
  FilterField,
} from "@/components/filters/list-filter-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/badges";
import { ordersService, type ListOrdersParams } from "@/lib/api/orders";
import { sellersService } from "@/lib/api/sellers";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import {
  centsToBRL,
  formatDateTime,
  formatOrderCode,
  orderStatusLabel,
} from "@/lib/formatters";
import {
  dateInputToNextDayIso,
  dateInputToStartIso,
} from "@/lib/date-filters";
import type { Order, OrderStatus } from "@/lib/api/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/lib/i18n/language-store";

const ORDER_STATUSES: OrderStatus[] = [
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
];

export default function OrdersListPage() {
  const t = useTranslation();
  const { isAdmin, user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sellerFilter, setSellerFilter] = useState<string>("ALL");
  const [clientUserIdInput, setClientUserIdInput] = useState("");
  const [createdFromInput, setCreatedFromInput] = useState("");
  const [createdToInput, setCreatedToInput] = useState("");
  const debouncedClientId = useDebouncedValue(clientUserIdInput, 400);

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const sellerOptions = useMemo(
    () =>
      isAdmin
        ? (sellersQ.data?.data ?? [])
        : (user?.sellers.map((membership) => membership.seller) ?? []),
    [isAdmin, sellersQ.data?.data, user?.sellers],
  );

  const params: ListOrdersParams = useMemo(() => {
    const base: ListOrdersParams = {
      page,
      limit: 10,
    };
    if (statusFilter !== "ALL") base.status = statusFilter as OrderStatus;
    if (sellerFilter !== "ALL") base.sellerId = Number(sellerFilter);
    const clientId = Number(debouncedClientId);
    if (debouncedClientId && Number.isFinite(clientId) && clientId > 0) {
      base.clientUserId = clientId;
    }
    base.createdFrom = dateInputToStartIso(createdFromInput);
    base.createdTo = dateInputToNextDayIso(createdToInput);
    return base;
  }, [
    page,
    statusFilter,
    sellerFilter,
    debouncedClientId,
    createdFromInput,
    createdToInput,
  ]);

  const query = useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => ordersService.list(params),
  });

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "code",
        header: t("orders.order"),
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold">
              {formatOrderCode(row.original)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(row.original.createdAt)}
            </div>
          </div>
        ),
      },
      {
        id: "client",
        header: t("orders.client"),
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.clientUser?.name ??
              t("app.userFallback", { id: row.original.clientUserId })}
          </div>
        ),
      },
      {
        id: "seller",
        header: t("orders.store"),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.seller?.name ??
              t("app.sellerFallback", { id: row.original.sellerId })}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        id: "payment",
        header: t("orders.payment"),
        cell: ({ row }) =>
          row.original.paymentStatus ? (
            <PaymentStatusBadge status={row.original.paymentStatus} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "totalAmountCents",
        header: t("orders.total"),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {centsToBRL(
              row.original.totalAmountCents +
                (row.original.deliveryFeeCents ?? 0),
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/orders/${row.original.id}`}>
                <Eye className="size-4" />
                {t("actions.open")}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const activeFilterCount = [
    statusFilter !== "ALL",
    sellerFilter !== "ALL",
    clientUserIdInput.trim(),
    createdFromInput,
    createdToInput,
  ].filter(Boolean).length;

  function resetFilters() {
    setPage(1);
    setStatusFilter("ALL");
    setSellerFilter("ALL");
    setClientUserIdInput("");
    setCreatedFromInput("");
    setCreatedToInput("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("orders.title")}
        description={
          isAdmin ? t("orders.adminDescription") : t("orders.sellerDescription")
        }
      />

      <div className="space-y-3 rounded-md border border-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" />
            {t("products.filters")}
            {activeFilterCount > 0 && (
              <Badge variant="secondary">
                {t("products.activeFilters", { count: activeFilterCount })}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
          >
            <RotateCcw className="size-4" />
            {t("products.clearFilters")}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label={t("common.status")} htmlFor="orders-status-filter">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setPage(1);
                setStatusFilter(v);
              }}
            >
              <SelectTrigger id="orders-status-filter">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("orders.allStatuses")}</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {orderStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t("orders.store")} htmlFor="orders-store-filter">
            <Select
              value={sellerFilter}
              onValueChange={(v) => {
                setPage(1);
                setSellerFilter(v);
              }}
            >
              <SelectTrigger id="orders-store-filter">
                <SelectValue placeholder={t("orders.allStores")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("orders.allStores")}</SelectItem>
                {sellerOptions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <DateRangeFilter
            id="orders-created-range"
            label={t("orders.createdRange")}
            fromLabel={t("filters.from")}
            toLabel={t("filters.to")}
            fromValue={createdFromInput}
            toValue={createdToInput}
            onFromChange={(value) => {
              setPage(1);
              setCreatedFromInput(value);
            }}
            onToChange={(value) => {
              setPage(1);
              setCreatedToInput(value);
            }}
            className="md:col-span-2 xl:col-span-2"
          />
          {isAdmin && (
            <FilterField
              label={t("orders.clientId")}
              htmlFor="orders-client-filter"
            >
              <Input
                id="orders-client-filter"
                placeholder={t("orders.clientId")}
                value={clientUserIdInput}
                onChange={(e) => {
                  setPage(1);
                  setClientUserIdInput(e.target.value);
                }}
                inputMode="numeric"
              />
            </FilterField>
          )}
        </div>
      </div>

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        emptyMessage={t("orders.empty")}
      />
    </div>
  );
}
