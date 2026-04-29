"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import {
  DeliveryRequestStatusBadge,
  PaymentStatusBadge,
} from "@/components/badges";
import {
  deliveryRequestsService,
  type ListDeliveryRequestsParams,
} from "@/lib/api/delivery-requests";
import { sellersService } from "@/lib/api/sellers";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import {
  centsToBRL,
  deliveryRequestStatusLabel,
  formatDateTime,
  formatDeliveryRequestCode,
} from "@/lib/formatters";
import type { DeliveryRequest, DeliveryRequestStatus } from "@/lib/api/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/lib/i18n/language-store";

const DELIVERY_REQUEST_STATUSES: DeliveryRequestStatus[] = [
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "CANCELLED",
];

export default function DeliveryRequestsListPage() {
  const t = useTranslation();
  const { isAdmin, sellerIds } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sellerFilter, setSellerFilter] = useState<string>(
    isAdmin ? "ALL" : sellerIds[0] ? String(sellerIds[0]) : "ALL",
  );
  const [requesterUserIdInput, setRequesterUserIdInput] = useState("");
  const debouncedRequesterUserId = useDebouncedValue(requesterUserIdInput, 400);

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
  });

  const params: ListDeliveryRequestsParams = useMemo(() => {
    const base: ListDeliveryRequestsParams = { page, limit: 10 };
    if (statusFilter !== "ALL") {
      base.status = statusFilter as DeliveryRequestStatus;
    }
    if (sellerFilter !== "ALL") {
      base.requesterSellerId = Number(sellerFilter);
    }
    const requesterUserId = Number(debouncedRequesterUserId);
    if (
      debouncedRequesterUserId &&
      Number.isFinite(requesterUserId) &&
      requesterUserId > 0
    ) {
      base.requesterUserId = requesterUserId;
    }
    return base;
  }, [page, statusFilter, sellerFilter, debouncedRequesterUserId]);

  const query = useQuery({
    queryKey: queryKeys.deliveryRequests.list(params),
    queryFn: () => deliveryRequestsService.list(params),
  });

  const columns = useMemo<ColumnDef<DeliveryRequest>[]>(
    () => [
      {
        id: "delivery",
        header: t("deliveries.delivery"),
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold">
              {formatDeliveryRequestCode(row.original)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(row.original.createdAt)}
            </div>
          </div>
        ),
      },
      {
        id: "requester",
        header: t("deliveries.requester"),
        cell: ({ row }) => (
          <div className="text-sm">
            <div>
              {row.original.requesterUser?.name ??
                t("app.userFallback", { id: row.original.requesterUserId })}
            </div>
            {row.original.requesterSeller && (
              <div className="text-xs text-muted-foreground">
                {row.original.requesterSeller.name}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "route",
        header: t("deliveries.route"),
        cell: ({ row }) => (
          <div className="max-w-xs text-sm">
            <div className="truncate">{row.original.pickupAddress}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.dropoffAddress}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => (
          <DeliveryRequestStatusBadge status={row.original.status} />
        ),
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
        accessorKey: "deliveryFeeCents",
        header: t("deliveries.fee"),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {centsToBRL(row.original.deliveryFeeCents)}
          </span>
        ),
      },
      {
        id: "driver",
        header: t("order.driver"),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.assignedDriverProfile?.user?.name ??
              (row.original.assignedDriverProfileId
                ? t("order.driverFallback", {
                    id: row.original.assignedDriverProfileId,
                  })
                : "—")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link
                href={`/delivery-requests/${row.original.id}`}
                prefetch={false}
              >
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("deliveries.title")}
        description={t("deliveries.description")}
        actions={
          <Button asChild>
            <Link href="/delivery-requests/new">
              <Plus className="size-4" />
              {t("deliveries.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setPage(1);
            setStatusFilter(v);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("orders.allStatuses")}</SelectItem>
            {DELIVERY_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {deliveryRequestStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sellerFilter}
          onValueChange={(v) => {
            setPage(1);
            setSellerFilter(v);
          }}
        >
          <SelectTrigger className="sm:w-60">
            <SelectValue placeholder={t("orders.allStores")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("orders.allStores")}</SelectItem>
            {(sellersQ.data?.data ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <Input
            placeholder={t("deliveries.requesterUserId")}
            className="sm:w-48"
            value={requesterUserIdInput}
            onChange={(e) => {
              setPage(1);
              setRequesterUserIdInput(e.target.value);
            }}
            inputMode="numeric"
          />
        )}
      </div>

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        emptyMessage={t("deliveries.empty")}
      />
    </div>
  );
}
