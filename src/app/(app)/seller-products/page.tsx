"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import {
  sellerProductsService,
  type ListSellerProductsParams,
} from "@/lib/api/seller-products";
import { sellersService } from "@/lib/api/sellers";
import { queryKeys } from "@/lib/query-keys";
import { centsToBRL } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/language-store";
import type { SellerProduct } from "@/lib/api/types";

export default function SellerProductsListPage() {
  const t = useTranslation();
  const { isAdmin, sellerIds } = useAuth();
  const [page, setPage] = useState(1);
  const [sellerId, setSellerId] = useState<string>(
    isAdmin ? "ALL" : sellerIds[0] ? String(sellerIds[0]) : "ALL",
  );
  const [inStockFilter, setInStockFilter] = useState<"ALL" | "YES" | "NO">(
    "ALL",
  );

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const params: ListSellerProductsParams = useMemo(
    () => ({
      page,
      limit: 10,
      sellerId: sellerId === "ALL" ? undefined : Number(sellerId),
      inStock: inStockFilter === "ALL" ? undefined : inStockFilter === "YES",
    }),
    [page, sellerId, inStockFilter],
  );

  const query = useQuery({
    queryKey: queryKeys.sellerProducts.list(params),
    queryFn: () => sellerProductsService.list(params),
  });

  const columns = useMemo<ColumnDef<SellerProduct>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            #{row.original.id}
          </span>
        ),
        size: 60,
      },
      {
        id: "product",
        header: t("sellerProducts.product"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.product?.name ??
                t("app.productFallback", { id: row.original.productId })}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.product?.brand ?? "—"}
              {row.original.sku && ` · SKU ${row.original.sku}`}
            </div>
          </div>
        ),
      },
      {
        id: "seller",
        header: t("sellerProducts.store"),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.seller?.name ??
              t("app.sellerFallback", { id: row.original.sellerId })}
          </span>
        ),
      },
      {
        accessorKey: "unitPriceCents",
        header: t("sellerProducts.price"),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {centsToBRL(row.original.unitPriceCents)}
          </span>
        ),
      },
      {
        accessorKey: "stockAmount",
        header: t("sellerProducts.stock"),
        cell: ({ row }) => {
          const stock = row.original.stockAmount;
          return (
            <Badge variant={stock > 0 ? "success" : "destructive"}>
              {stock} {t("sellerProducts.unitAbbr")}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/seller-products/${row.original.id}`}>
                <Eye className="size-4" />
                {t("actions.view")}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const canCreate = isAdmin || sellerIds.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("sellerProducts.title")}
        description={t("sellerProducts.description")}
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/seller-products/new">
                <Plus className="size-4" />
                {t("sellerProducts.new")}
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {isAdmin && (
          <Select
            value={sellerId}
            onValueChange={(v) => {
              setPage(1);
              setSellerId(v);
            }}
          >
            <SelectTrigger className="sm:w-64">
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
        )}
        <Select
          value={inStockFilter}
          onValueChange={(v) => {
            setPage(1);
            setInStockFilter(v as typeof inStockFilter);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("sellerProducts.all")}</SelectItem>
            <SelectItem value="YES">{t("sellerProducts.withStock")}</SelectItem>
            <SelectItem value="NO">
              {t("sellerProducts.withoutStock")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
      />
    </div>
  );
}
