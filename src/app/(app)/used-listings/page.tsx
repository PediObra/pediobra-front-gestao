"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Info, Plus, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { FilterField } from "@/components/filters/list-filter-controls";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sellersService } from "@/lib/api/sellers";
import {
  usedListingsService,
  type ListUsedListingsParams,
} from "@/lib/api/used-listings";
import type {
  UsedListing,
  UsedListingCondition,
  UsedListingStatus,
} from "@/lib/api/types";
import { centsToBRL, formatDateTime } from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import { queryKeys } from "@/lib/query-keys";
import {
  USED_LISTING_CONDITION_LABEL,
  USED_LISTING_STATUS_LABEL,
  usedListingQuantity,
  usedListingRegion,
} from "@/lib/used-listings";

const CONDITIONS: UsedListingCondition[] = [
  "USED",
  "SURPLUS",
  "OPEN_BOX",
  "PARTIAL",
  "EXCESS_LOT",
  "USED_TOOL",
  "OTHER",
];

const STATUSES: UsedListingStatus[] = [
  "ACTIVE",
  "DRAFT",
  "RESERVED",
  "SOLD",
  "CANCELLED",
  "EXPIRED",
  "REJECTED",
];

export default function UsedListingsPage() {
  const t = useTranslation();
  const router = useRouter();
  const { isAdmin, isSeller, user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sellerId, setSellerId] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | UsedListingStatus>("ACTIVE");
  const [condition, setCondition] = useState<"ALL" | UsedListingCondition>(
    "ALL",
  );
  const debouncedSearch = useDebouncedValue(search, 350);

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const sellerOptions = useMemo(() => {
    if (isAdmin) return sellersQ.data?.data ?? [];
    return user?.sellers.map((membership) => membership.seller) ?? [];
  }, [isAdmin, sellersQ.data?.data, user?.sellers]);

  const params: ListUsedListingsParams = useMemo(
    () => ({
      page,
      limit: 10,
      mine: isAdmin ? undefined : true,
      includeInactive: isAdmin ? true : undefined,
      search: normalizedText(debouncedSearch),
      ownerSellerId: sellerId === "ALL" ? undefined : Number(sellerId),
      status: status === "ALL" ? undefined : status,
      condition: condition === "ALL" ? undefined : condition,
    }),
    [condition, debouncedSearch, isAdmin, page, sellerId, status],
  );

  const query = useQuery({
    queryKey: queryKeys.usedListings.list(params),
    queryFn: () => usedListingsService.list(params),
  });

  const columns = useMemo<ColumnDef<UsedListing>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            #{row.original.id}
          </span>
        ),
        size: 64,
      },
      {
        id: "title",
        header: "Anúncio",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="line-clamp-2 font-medium">{row.original.title}</div>
            <div className="text-xs text-muted-foreground">
              {usedListingQuantity(row.original)}
            </div>
          </div>
        ),
      },
      {
        id: "owner",
        header: t("usedListings.owner"),
        cell: ({ row }) => (
          <div className="text-sm">
            <div>
              {row.original.ownerSeller?.name ??
                row.original.ownerUser?.name ??
                "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.ownerSellerId ? t("usedListings.store") : "Cliente"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "condition",
        header: t("usedListings.condition"),
        cell: ({ row }) => (
          <Badge variant="muted">
            {USED_LISTING_CONDITION_LABEL[row.original.condition]}
          </Badge>
        ),
      },
      {
        accessorKey: "priceCents",
        header: t("usedListings.price"),
        cell: ({ row }) => (
          <div className="font-mono text-sm font-semibold">
            {centsToBRL(row.original.priceCents)}
            {row.original.negotiable ? (
              <span className="ml-1 font-sans text-xs text-muted-foreground">
                neg.
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "region",
        header: t("usedListings.region"),
        cell: ({ row }) => (
          <span className="text-sm">
            {usedListingRegion(row.original) || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("usedListings.status"),
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {USED_LISTING_STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Criado",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  const canCreate = isAdmin || isSeller;
  const activeFilterCount = [
    search.trim(),
    sellerId !== "ALL",
    status !== "ACTIVE",
    condition !== "ALL",
  ].filter(Boolean).length;

  function resetFilters() {
    setPage(1);
    setSearch("");
    setSellerId("ALL");
    setStatus("ACTIVE");
    setCondition("ALL");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("usedListings.title")}
        description={t("usedListings.description")}
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/used-listings/new">
                <Plus className="size-4" />
                {t("usedListings.new")}
              </Link>
            </Button>
          )
        }
      />

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>{t("usedListings.notice")}</p>
        </CardContent>
      </Card>

      <div className="space-y-3 rounded-md border border-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
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
            Limpar
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterField
            label={t("usedListings.searchLabel")}
            htmlFor="used-listings-search"
            className="md:col-span-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="used-listings-search"
                placeholder={t("usedListings.search")}
                className="pl-8"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
              />
            </div>
          </FilterField>

          <FilterField
            label={t("usedListings.store")}
            htmlFor="used-listings-store-filter"
          >
            <Select
              value={sellerId}
              onValueChange={(nextSellerId) => {
                setPage(1);
                setSellerId(nextSellerId);
              }}
            >
              <SelectTrigger id="used-listings-store-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as lojas</SelectItem>
                {sellerOptions.map((seller) => (
                  <SelectItem key={seller.id} value={String(seller.id)}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField
            label={t("usedListings.status")}
            htmlFor="used-listings-status-filter"
          >
            <Select
              value={status}
              onValueChange={(nextStatus) => {
                setPage(1);
                setStatus(nextStatus as typeof status);
              }}
            >
              <SelectTrigger id="used-listings-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {USED_LISTING_STATUS_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField
            label={t("usedListings.condition")}
            htmlFor="used-listings-condition-filter"
          >
            <Select
              value={condition}
              onValueChange={(nextCondition) => {
                setPage(1);
                setCondition(nextCondition as typeof condition);
              }}
            >
              <SelectTrigger id="used-listings-condition-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {CONDITIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {USED_LISTING_CONDITION_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
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
        onRowClick={(listing) => router.push(`/used-listings/${listing.id}`)}
      />
    </div>
  );
}

function normalizedText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function statusBadgeVariant(
  status: UsedListingStatus,
): "success" | "destructive" | "warning" | "default" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "REJECTED" || status === "CANCELLED") return "destructive";
  if (status === "RESERVED") return "warning";
  if (status === "SOLD") return "default";
  return "muted";
}
