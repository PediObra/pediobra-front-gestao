"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Eye, Image as ImageIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { productsService, type ListProductsParams } from "@/lib/api/products";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/lib/i18n/language-store";
import type { Product } from "@/lib/api/types";

export default function ProductsListPage() {
  const t = useTranslation();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedBrand = useDebouncedValue(brand, 300);

  const params: ListProductsParams = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      brand: debouncedBrand || undefined,
    }),
    [page, debouncedSearch, debouncedBrand],
  );

  const query = useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsService.list(params),
  });

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "image",
        header: "",
        size: 60,
        cell: ({ row }) => {
          const primary =
            row.original.images?.find((i) => i.isPrimary) ??
            row.original.images?.[0];
          return (
            <div className="size-10 rounded-md border border-border bg-muted overflow-hidden flex items-center justify-center">
              {primary ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primary.url}
                  alt={row.original.name}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: t("products.product"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.brand ?? "—"}
              {row.original.size && ` · ${row.original.size}`}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "unit",
        header: t("products.unit"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground uppercase">
            {row.original.unit ?? "—"}
          </span>
        ),
      },
      {
        id: "category",
        header: t("products.category"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.category?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/products/${row.original.id}`}>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("products.title")}
        description={t("products.description")}
        actions={
          isAdmin && (
            <Button asChild>
              <Link href="/products/new">
                <Plus className="size-4" />
                {t("products.new")}
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("products.searchName")}
            className="pl-8"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Input
          placeholder={t("products.filterBrand")}
          className="sm:w-60"
          value={brand}
          onChange={(e) => {
            setPage(1);
            setBrand(e.target.value);
          }}
        />
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
