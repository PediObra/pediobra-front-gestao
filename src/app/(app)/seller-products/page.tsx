"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileClock,
  FileSearch,
  FileUp,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { FilterField } from "@/components/filters/list-filter-controls";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  CATEGORY_FILTER_ALL,
  ProductCategoryFilterSelect,
  categoryFilterParams,
  formatProductCategory,
} from "@/components/products/product-category-select";
import { ProductAreaTabs } from "@/components/products/product-area-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { productCategoriesService } from "@/lib/api/product-categories";
import { sellersService } from "@/lib/api/sellers";
import { queryKeys } from "@/lib/query-keys";
import { centsToBRL } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
  const router = useRouter();
  const { isAdmin, user, sellerIds, canManageSellerProducts } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [sellerId, setSellerId] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ACTIVE");
  const [search, setSearch] = useState("");
  const [categorySelection, setCategorySelection] =
    useState(CATEGORY_FILTER_ALL);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedMinPrice = useDebouncedValue(minPrice, 350);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 350);

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

  const params: ListSellerProductsParams = useMemo(
    () => ({
      page,
      limit: 10,
      sellerId: sellerId === "ALL" ? undefined : Number(sellerId),
      search: normalizedText(debouncedSearch),
      ...categoryFilterParams(categorySelection),
      minPriceCents: parsePriceCents(debouncedMinPrice),
      maxPriceCents: parsePriceCents(debouncedMaxPrice),
      active: activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
      includeInactive: activeFilter === "ALL" ? true : undefined,
    }),
    [
      page,
      sellerId,
      debouncedSearch,
      categorySelection,
      debouncedMinPrice,
      debouncedMaxPrice,
      activeFilter,
    ],
  );

  const query = useQuery({
    queryKey: queryKeys.sellerProducts.list(params),
    queryFn: () => sellerProductsService.list(params),
  });
  const categoriesQ = useQuery({
    queryKey: queryKeys.productCategories.tree(),
    queryFn: () => productCategoriesService.tree(),
  });
  const canCreate = isAdmin || sellerIds.length > 0;
  const importsParams = useMemo(
    () => ({
      page: 1,
      limit: 3,
      sellerId: sellerId === "ALL" ? undefined : Number(sellerId),
    }),
    [sellerId],
  );
  const importsQ = useQuery({
    queryKey: queryKeys.sellerProductImports.list(importsParams),
    queryFn: () => sellerProductImportsService.list(importsParams),
    enabled: canCreate,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ sellerProduct, active }: ToggleSellerProductVariables) =>
      sellerProductsService.update(sellerProduct.id, {
        active,
      }),
    onMutate: async ({ sellerProduct, active }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sellerProducts.all() });

      const previousLists = qc.getQueriesData<Paginated<SellerProduct>>({
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
            {row.original.product?.category ? (
              <div className="text-xs text-muted-foreground">
                {formatProductCategory(row.original.product.category)}
              </div>
            ) : null}
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
    ],
    [canManageSellerProducts, t, toggleMutation],
  );

  const activeFilterCount = [
    sellerId !== "ALL",
    activeFilter !== "ACTIVE",
    search.trim(),
    categorySelection !== CATEGORY_FILTER_ALL,
    minPrice.trim(),
    maxPrice.trim(),
  ].filter(Boolean).length;

  function resetFilters() {
    setPage(1);
    setSellerId("ALL");
    setActiveFilter("ACTIVE");
    setSearch("");
    setCategorySelection(CATEGORY_FILTER_ALL);
    setMinPrice("");
    setMaxPrice("");
  }

  const importHref =
    sellerId === "ALL"
      ? "/seller-product-imports/new"
      : `/seller-product-imports/new?sellerId=${sellerId}`;

  return (
    <div className="space-y-6">
      {isAdmin && <ProductAreaTabs active="store" />}

      <PageHeader
        title={t("sellerProducts.title")}
        description={t("sellerProducts.description")}
        actions={
          canCreate && (
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <Button asChild variant="outline">
                  <Link href="/seller-product-imports/product-review">
                    <FileSearch className="size-4" />
                    Revisar importados
                  </Link>
                </Button>
              ) : null}
              {sellerOptions.length === 0 ? (
                <Button type="button" variant="outline" disabled>
                  <FileUp className="size-4" />
                  {t("sellerProductImports.importCsv")}
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={importHref}>
                    <FileUp className="size-4" />
                    {t("sellerProductImports.importCsv")}
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/seller-products/new">
                  <Plus className="size-4" />
                  {t("sellerProducts.new")}
                </Link>
              </Button>
            </div>
          )
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <FilterField
            label={t("sellerProducts.searchLabel")}
            htmlFor="seller-products-search"
            className="md:col-span-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="seller-products-search"
                placeholder={t("sellerProducts.search")}
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
          </FilterField>
          <FilterField
            label={t("sellerProducts.store")}
            htmlFor="seller-products-store-filter"
          >
            <Select
              value={sellerId}
              onValueChange={(v) => {
                setPage(1);
                setSellerId(v);
              }}
            >
              <SelectTrigger id="seller-products-store-filter">
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
          <FilterField
            label={t("sellerProducts.status")}
            htmlFor="seller-products-active-filter"
          >
            <Select
              value={activeFilter}
              onValueChange={(v) => {
                setPage(1);
                setActiveFilter(v as typeof activeFilter);
              }}
            >
              <SelectTrigger id="seller-products-active-filter">
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
          </FilterField>
          <FilterField
            label={t("products.categoryFilter")}
            htmlFor="seller-products-category-filter"
          >
            <ProductCategoryFilterSelect
              categories={categoriesQ.data ?? []}
              value={categorySelection}
              triggerId="seller-products-category-filter"
              onValueChange={(value) => {
                setPage(1);
                setCategorySelection(value);
              }}
              placeholder={t("products.categoryFilter")}
              allLabel={t("products.anyCategory")}
              parentLabel={(category) =>
                t("products.allInCategory", { category: category.name })
              }
            />
          </FilterField>
          <FilterField
            label={t("sellerProducts.price")}
            htmlFor="seller-products-min-price"
            className="md:col-span-2 xl:col-span-2"
          >
            <div className="grid min-h-9 overflow-hidden rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-2 px-3 py-1">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  Mín.
                </span>
                <Input
                  id="seller-products-min-price"
                  aria-label={t("sellerProducts.minPriceLabel")}
                  placeholder="0,00"
                  inputMode="decimal"
                  value={minPrice}
                  onChange={(e) => {
                    setPage(1);
                    setMinPrice(e.target.value);
                  }}
                  className="h-7 min-w-0 rounded-none border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex min-w-0 items-center gap-2 border-t border-border px-3 py-1 sm:border-l sm:border-t-0">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  Máx.
                </span>
                <Input
                  id="seller-products-max-price"
                  aria-label={t("sellerProducts.maxPriceLabel")}
                  placeholder="0,00"
                  inputMode="decimal"
                  value={maxPrice}
                  onChange={(e) => {
                    setPage(1);
                    setMaxPrice(e.target.value);
                  }}
                  className="h-7 min-w-0 rounded-none border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </FilterField>
        </div>
      </div>

      {canCreate && (
        <div className="rounded-md border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FileClock className="size-4" />
            Importacoes recentes
          </div>
          {importsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (importsQ.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma importacao recente.
            </p>
          ) : (
            <div className="grid gap-2">
              {importsQ.data?.data.slice(0, 3).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() =>
                    router.push(`/seller-product-imports/${job.id}`)
                  }
                >
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">
                      #{job.id}
                    </span>{" "}
                    {job.seller?.name ?? `Loja #${job.sellerId}`}
                  </span>
                  <Badge variant="secondary">{job.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRowClick={(sellerProduct) =>
          router.push(`/seller-products/${sellerProduct.id}`)
        }
      />
    </div>
  );
}

function normalizedText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePriceCents(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}
