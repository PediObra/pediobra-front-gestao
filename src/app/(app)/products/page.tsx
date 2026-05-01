"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Barcode,
  Eye,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
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
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { productsService, type ListProductsParams } from "@/lib/api/products";
import type { Product } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/language-store";
import { queryKeys } from "@/lib/query-keys";

type PresenceFilter = "all" | "yes" | "no";

const presenceToBoolean = (value: PresenceFilter) => {
  if (value === "all") return undefined;
  return value === "yes";
};

const optionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function ProductsListPage() {
  const t = useTranslation();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [imageFilter, setImageFilter] = useState<PresenceFilter>("all");
  const [barcodeFilter, setBarcodeFilter] = useState<PresenceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<PresenceFilter>("all");
  const [brandFilter, setBrandFilter] = useState<PresenceFilter>("all");
  const [descriptionFilter, setDescriptionFilter] =
    useState<PresenceFilter>("all");
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedBrand = useDebouncedValue(brand, 300);
  const debouncedBarcode = useDebouncedValue(barcode, 300);
  const debouncedUnit = useDebouncedValue(unit, 300);
  const debouncedCategoryId = useDebouncedValue(categoryId, 300);
  const debouncedMinWeight = useDebouncedValue(minWeight, 300);
  const debouncedMaxWeight = useDebouncedValue(maxWeight, 300);

  const params: ListProductsParams = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      brand: debouncedBrand || undefined,
      barcode: debouncedBarcode || undefined,
      unit: debouncedUnit || undefined,
      categoryId: optionalNumber(debouncedCategoryId),
      minWeight: optionalNumber(debouncedMinWeight),
      maxWeight: optionalNumber(debouncedMaxWeight),
      hasImage: presenceToBoolean(imageFilter),
      hasBarcode: presenceToBoolean(barcodeFilter),
      hasCategory: presenceToBoolean(categoryFilter),
      hasBrand: presenceToBoolean(brandFilter),
      hasDescription: presenceToBoolean(descriptionFilter),
    }),
    [
      page,
      debouncedSearch,
      debouncedBrand,
      debouncedBarcode,
      debouncedUnit,
      debouncedCategoryId,
      debouncedMinWeight,
      debouncedMaxWeight,
      imageFilter,
      barcodeFilter,
      categoryFilter,
      brandFilter,
      descriptionFilter,
    ],
  );

  const query = useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsService.list(params),
  });

  const activeFilterCount = [
    search,
    brand,
    barcode,
    unit,
    categoryId,
    minWeight,
    maxWeight,
    imageFilter !== "all",
    barcodeFilter !== "all",
    categoryFilter !== "all",
    brandFilter !== "all",
    descriptionFilter !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setPage(1);
    setSearch("");
    setBrand("");
    setBarcode("");
    setUnit("");
    setCategoryId("");
    setMinWeight("");
    setMaxWeight("");
    setImageFilter("all");
    setBarcodeFilter("all");
    setCategoryFilter("all");
    setBrandFilter("all");
    setDescriptionFilter("all");
  };

  const updatePresenceFilter =
    (setter: (value: PresenceFilter) => void) => (value: string) => {
      setPage(1);
      setter(value as PresenceFilter);
    };

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
        id: "barcode",
        header: t("products.barcode"),
        cell: ({ row }) => {
          const primary =
            row.original.barcodes?.find((item) => item.isPrimary) ??
            row.original.barcodes?.[0];
          return (
            <div className="flex max-w-44 items-center gap-2 text-sm text-muted-foreground">
              <Barcode className="size-4 shrink-0" />
              <span className="truncate">{primary?.barcode ?? "—"}</span>
              {row.original.barcodes && row.original.barcodes.length > 1 && (
                <Badge variant="muted" className="shrink-0">
                  +{row.original.barcodes.length - 1}
                </Badge>
              )}
            </div>
          );
        },
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
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
            value={brand}
            onChange={(e) => {
              setPage(1);
              setBrand(e.target.value);
            }}
          />
          <div className="relative">
            <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("products.filterBarcode")}
              className="pl-8"
              value={barcode}
              onChange={(e) => {
                setPage(1);
                setBarcode(e.target.value);
              }}
            />
          </div>
          <Input
            placeholder={t("products.filterUnit")}
            value={unit}
            onChange={(e) => {
              setPage(1);
              setUnit(e.target.value);
            }}
          />
          <Input
            placeholder={t("products.filterCategoryId")}
            inputMode="numeric"
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
          />
          <Input
            placeholder={t("products.minWeight")}
            inputMode="numeric"
            value={minWeight}
            onChange={(e) => {
              setPage(1);
              setMinWeight(e.target.value);
            }}
          />
          <Input
            placeholder={t("products.maxWeight")}
            inputMode="numeric"
            value={maxWeight}
            onChange={(e) => {
              setPage(1);
              setMaxWeight(e.target.value);
            }}
          />
          <PresenceSelect
            value={imageFilter}
            onValueChange={updatePresenceFilter(setImageFilter)}
            placeholder={t("products.imageFilter")}
            allLabel={t("products.anyImage")}
            yesLabel={t("products.withImage")}
            noLabel={t("products.withoutImage")}
          />
          <PresenceSelect
            value={barcodeFilter}
            onValueChange={updatePresenceFilter(setBarcodeFilter)}
            placeholder={t("products.barcodeFilter")}
            allLabel={t("products.anyBarcode")}
            yesLabel={t("products.withBarcode")}
            noLabel={t("products.withoutBarcode")}
          />
          <PresenceSelect
            value={categoryFilter}
            onValueChange={updatePresenceFilter(setCategoryFilter)}
            placeholder={t("products.categoryFilter")}
            allLabel={t("products.anyCategory")}
            yesLabel={t("products.withCategory")}
            noLabel={t("products.withoutCategory")}
          />
          <PresenceSelect
            value={brandFilter}
            onValueChange={updatePresenceFilter(setBrandFilter)}
            placeholder={t("products.brandFilter")}
            allLabel={t("products.anyBrand")}
            yesLabel={t("products.withBrand")}
            noLabel={t("products.withoutBrand")}
          />
          <PresenceSelect
            value={descriptionFilter}
            onValueChange={updatePresenceFilter(setDescriptionFilter)}
            placeholder={t("products.descriptionFilter")}
            allLabel={t("products.anyDescription")}
            yesLabel={t("products.withDescription")}
            noLabel={t("products.withoutDescription")}
          />
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
      />
    </div>
  );
}

function PresenceSelect({
  value,
  onValueChange,
  placeholder,
  allLabel,
  yesLabel,
  noLabel,
}: {
  value: PresenceFilter;
  onValueChange: (value: string) => void;
  placeholder: string;
  allLabel: string;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        <SelectItem value="yes">{yesLabel}</SelectItem>
        <SelectItem value="no">{noLabel}</SelectItem>
      </SelectContent>
    </Select>
  );
}
