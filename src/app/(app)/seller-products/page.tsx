"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import type { Paginated, SellerProduct } from "@/lib/api/types";

type ToggleSellerProductVariables = {
  sellerProduct: SellerProduct;
  active: boolean;
};

const SELLER_PRODUCTS_LIST_QUERY_KEY = ["sellerProducts", "list"] as const;

function updateSellerProductActive(
  data: Paginated<SellerProduct> | undefined,
  id: number,
  active: boolean,
) {
  if (!data) return data;

  return {
    ...data,
    data: data.data.map((sellerProduct) =>
      sellerProduct.id === id ? { ...sellerProduct, active } : sellerProduct,
    ),
  };
}

export default function SellerProductsListPage() {
  const t = useTranslation();
  const { isAdmin, sellerIds, canManageSellerProducts } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [sellerId, setSellerId] = useState<string>(
    isAdmin ? "ALL" : sellerIds[0] ? String(sellerIds[0]) : "ALL",
  );
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ACTIVE");

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
      active:
        activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
      includeInactive: activeFilter === "ALL" ? true : undefined,
    }),
    [page, sellerId, activeFilter],
  );

  const query = useQuery({
    queryKey: queryKeys.sellerProducts.list(params),
    queryFn: () => sellerProductsService.list(params),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ sellerProduct, active }: ToggleSellerProductVariables) =>
      sellerProductsService.update(sellerProduct.id, {
        active,
      }),
    onMutate: async ({ sellerProduct, active }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sellerProducts.all() });

      const previousLists =
        qc.getQueriesData<Paginated<SellerProduct>>({
          queryKey: SELLER_PRODUCTS_LIST_QUERY_KEY,
        });
      const previousDetail = qc.getQueryData<SellerProduct>(
        queryKeys.sellerProducts.byId(sellerProduct.id),
      );

      qc.setQueriesData<Paginated<SellerProduct>>(
        { queryKey: SELLER_PRODUCTS_LIST_QUERY_KEY },
        (current) =>
          updateSellerProductActive(current, sellerProduct.id, active),
      );
      qc.setQueryData<SellerProduct>(
        queryKeys.sellerProducts.byId(sellerProduct.id),
        (current) => (current ? { ...current, active } : current),
      );

      return { previousLists, previousDetail };
    },
    onError: (_error, { sellerProduct }, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data);
      });
      qc.setQueryData(
        queryKeys.sellerProducts.byId(sellerProduct.id),
        context?.previousDetail,
      );
      toast.error(t("sellerProduct.updateFailed"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
      toast.success(t("sellerProduct.updated"));
    },
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
        accessorKey: "active",
        header: t("sellerProducts.status"),
        cell: ({ row }) => {
          const active = row.original.active !== false;
          const canToggle = canManageSellerProducts(row.original.sellerId);
          return (
            <div className="flex items-center gap-3">
              <Switch
                checked={active}
                disabled={!canToggle}
                onCheckedChange={(nextActive) => {
                  if (toggleMutation.isPending) return;
                  toggleMutation.mutate({
                    sellerProduct: row.original,
                    active: nextActive,
                  });
                }}
                aria-label={t("sellerProduct.availability")}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {active
                  ? t("sellerProducts.active")
                  : t("sellerProducts.inactive")}
              </span>
            </div>
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
    [canManageSellerProducts, t, toggleMutation],
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
          value={activeFilter}
          onValueChange={(v) => {
            setPage(1);
            setActiveFilter(v as typeof activeFilter);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("sellerProducts.all")}</SelectItem>
            <SelectItem value="ACTIVE">
              {t("sellerProducts.active")}
            </SelectItem>
            <SelectItem value="INACTIVE">
              {t("sellerProducts.inactive")}
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
