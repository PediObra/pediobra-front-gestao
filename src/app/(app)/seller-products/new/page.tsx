"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Info, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { sellerProductsService } from "@/lib/api/seller-products";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { productsService } from "@/lib/api/products";
import { sellersService } from "@/lib/api/sellers";
import type { Product } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTranslation } from "@/lib/i18n/language-store";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/forms/money-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_PRODUCTS: Product[] = [];

export default function NewSellerProductPage() {
  const router = useRouter();
  const t = useTranslation();
  const qc = useQueryClient();
  const { isAdmin, user, canManageSellerProducts } = useAuth();

  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [newProductSize, setNewProductSize] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [stock, setStock] = useState(0);
  const [active, setActive] = useState(true);
  const [sku, setSku] = useState("");

  const debouncedSearch = useDebouncedValue(productSearch, 300);

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const availableSellers = useMemo(
    () =>
      isAdmin
        ? (sellersQ.data?.data ?? [])
        : (user?.sellers.map((membership) => membership.seller) ?? []),
    [isAdmin, sellersQ.data?.data, user?.sellers],
  );

  const sellerId =
    selectedSellerId ||
    (!isAdmin && availableSellers[0] ? String(availableSellers[0].id) : "");

  const productsQ = useQuery({
    queryKey: queryKeys.products.list({
      page: 1,
      limit: 20,
      search: debouncedSearch || undefined,
    }),
    queryFn: () =>
      productsService.list({
        page: 1,
        limit: 20,
        search: debouncedSearch || undefined,
      }),
    enabled: Boolean(sellerId),
  });
  const linkedProductIdsQ = useQuery({
    queryKey: ["sellerProducts", "linkedProductIds", sellerId],
    queryFn: () => fetchLinkedProductIds(Number(sellerId)),
    enabled: Boolean(sellerId),
  });

  const canCreateForSelected = sellerId
    ? isAdmin || canManageSellerProducts(Number(sellerId))
    : false;
  const formFieldsDisabled = !sellerId;
  const linkedProductIds = useMemo(
    () => new Set(linkedProductIdsQ.data ?? []),
    [linkedProductIdsQ.data],
  );
  const products = productsQ.data?.data ?? EMPTY_PRODUCTS;
  const selectableProducts = useMemo(
    () => products.filter((product) => !linkedProductIds.has(product.id)),
    [linkedProductIds, products],
  );
  const newProductName = productId ? "" : productSearch.trim();
  const shouldCreateProductReview = Boolean(sellerId && newProductName);
  const emptyProductLabel =
    products.length > 0 && selectableProducts.length === 0
      ? t("sellerProduct.noAvailableProducts")
      : t("sellerProduct.noProductsFound");

  function handleSellerChange(nextSellerId: string) {
    setSelectedSellerId(nextSellerId);
    setProductId("");
    setProductSearch("");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!sellerId) throw new Error(t("sellerProduct.selectStoreProduct"));
      if (productId) {
        const sellerProduct = await sellerProductsService.create({
          sellerId: Number(sellerId),
          productId: Number(productId),
          unitPriceCents: priceCents,
          stockAmount: stock,
          active,
          sku: sku || undefined,
        });
        return { type: "sellerProduct" as const, sellerProduct };
      }
      if (!newProductName) {
        throw new Error(t("sellerProduct.selectOrNameProduct"));
      }

      const job = await sellerProductImportsService.createProductReview({
        sellerId: Number(sellerId),
        product: {
          name: newProductName,
          brand: newProductBrand.trim() || undefined,
          unit: newProductUnit.trim() || undefined,
          size: newProductSize.trim() || undefined,
          description: newProductDescription.trim() || undefined,
        },
        sellerProduct: {
          unitPriceCents: priceCents,
          stockAmount: stock,
          active,
          sku: sku.trim() || undefined,
        },
      });
      return { type: "productReview" as const, job };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
      if (result.type === "productReview") {
        qc.invalidateQueries({
          queryKey: queryKeys.sellerProductImports.all(),
        });
        toast.success(t("sellerProduct.sentToReview"));
        router.push(`/seller-product-imports/${result.job.id}`);
        return;
      }

      toast.success(t("sellerProduct.created"));
      router.push(`/seller-products/${result.sellerProduct.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("sellerProduct.createFailed");
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/seller-products">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={t("sellerProducts.new")}
        description={t("sellerProduct.newDescription")}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("sellerProduct.data")}</CardTitle>
          <CardDescription>{t("sellerProduct.priceHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("sellerProducts.store")}</Label>
            <Select value={sellerId} onValueChange={handleSellerChange}>
              <SelectTrigger aria-label={t("sellerProducts.store")}>
                <SelectValue placeholder={t("sellerProduct.selectStore")} />
              </SelectTrigger>
              <SelectContent>
                {availableSellers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canCreateForSelected && sellerId && (
              <p className="text-xs text-destructive">
                {t("sellerProduct.managePermissionError")}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>{t("sellerProducts.product")}</Label>
            <ProductCombobox
              value={productId}
              search={productSearch}
              open={productSearchOpen}
              products={selectableProducts}
              ariaLabel={t("sellerProducts.product")}
              disabled={formFieldsDisabled}
              isLoading={
                Boolean(sellerId) &&
                (productsQ.isFetching || linkedProductIdsQ.isFetching)
              }
              placeholder={
                formFieldsDisabled
                  ? t("sellerProduct.selectStoreFirst")
                  : t("sellerProduct.searchProduct")
              }
              emptyLabel={emptyProductLabel}
              loadingLabel={t("app.loading")}
              onOpenChange={setProductSearchOpen}
              onSearchChange={(nextSearch) => {
                setProductSearch(nextSearch);
                setProductId("");
              }}
              onValueChange={(nextProductId, product) => {
                setProductId(nextProductId);
                setProductSearch(productLabel(product));
                setProductSearchOpen(false);
              }}
            />
            {!productId && sellerId ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {newProductName
                      ? t("sellerProduct.newProductReviewNotice", {
                          product: newProductName,
                        })
                      : t("sellerProduct.newProductReviewHint")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {shouldCreateProductReview ? (
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="new-product-brand">{t("product.brand")}</Label>
                <Input
                  id="new-product-brand"
                  value={newProductBrand}
                  disabled={formFieldsDisabled}
                  onChange={(event) => setNewProductBrand(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-product-unit">{t("product.unit")}</Label>
                <Input
                  id="new-product-unit"
                  value={newProductUnit}
                  disabled={formFieldsDisabled}
                  placeholder={t("product.unitPlaceholder")}
                  onChange={(event) => setNewProductUnit(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-product-size">{t("product.size")}</Label>
                <Input
                  id="new-product-size"
                  value={newProductSize}
                  disabled={formFieldsDisabled}
                  onChange={(event) => setNewProductSize(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="new-product-description">
                  {t("common.description")}
                </Label>
                <Textarea
                  id="new-product-description"
                  value={newProductDescription}
                  disabled={formFieldsDisabled}
                  rows={3}
                  onChange={(event) =>
                    setNewProductDescription(event.target.value)
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="price">{t("sellerProduct.unitPrice")}</Label>
            <MoneyInput
              id="price"
              valueCents={priceCents}
              onChangeCents={setPriceCents}
              disabled={formFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">{t("sellerProduct.operationalStock")}</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              value={stock}
              disabled={formFieldsDisabled}
              onChange={(e) => setStock(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="active">
                  {t("sellerProduct.availability")}
                </Label>
                <p className="text-xs font-medium text-muted-foreground">
                  {active
                    ? t("sellerProducts.active")
                    : t("sellerProducts.inactive")}
                </p>
              </div>
              <Switch
                id="active"
                checked={active}
                disabled={formFieldsDisabled}
                onCheckedChange={setActive}
                aria-label={t("sellerProduct.availability")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("sellerProduct.availabilityHint")}
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sku">{t("sellerProduct.skuOptional")}</Label>
            <Input
              id="sku"
              value={sku}
              disabled={formFieldsDisabled}
              onChange={(e) => setSku(e.target.value)}
              placeholder={t("sellerProduct.skuPlaceholder")}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="ghost" asChild>
              <Link href="/seller-products">{t("common.cancel")}</Link>
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                mutation.isPending ||
                !sellerId ||
                (!productId && !newProductName) ||
                !canCreateForSelected ||
                linkedProductIdsQ.isFetching
              }
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {shouldCreateProductReview
                ? t("sellerProduct.submitForReview")
                : t("sellerProduct.create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductCombobox({
  value,
  search,
  open,
  products,
  ariaLabel,
  disabled = false,
  isLoading,
  placeholder,
  emptyLabel,
  loadingLabel,
  onOpenChange,
  onSearchChange,
  onValueChange,
}: {
  value: string;
  search: string;
  open: boolean;
  products: Product[];
  ariaLabel: string;
  disabled?: boolean;
  isLoading: boolean;
  placeholder: string;
  emptyLabel: string;
  loadingLabel: string;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (search: string) => void;
  onValueChange: (value: string, product: Product) => void;
}) {
  const firstProduct = products[0];

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open && !disabled}
        aria-controls="seller-product-product-options"
        aria-autocomplete="list"
        value={search}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          if (!disabled) onOpenChange(true);
        }}
        onChange={(event) => {
          if (disabled) return;
          onSearchChange(event.target.value);
          onOpenChange(true);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Escape") onOpenChange(false);
          if (event.key === "Enter" && firstProduct) {
            event.preventDefault();
            onValueChange(String(firstProduct.id), firstProduct);
          }
        }}
        onBlur={() => window.setTimeout(() => onOpenChange(false), 120)}
      />

      {open && !disabled ? (
        <div
          id="seller-product-product-options"
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {loadingLabel}
            </div>
          ) : products.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={value === String(product.id)}
                className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onValueChange(String(product.id), product)}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {value === String(product.id) ? (
                    <Check className="size-4" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {product.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {productMeta(product)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function productLabel(product: Product) {
  return [product.name, product.brand].filter(Boolean).join(" · ");
}

function productMeta(product: Product) {
  const meta = [product.brand, product.size, product.unit]
    .filter(Boolean)
    .join(" · ");

  return meta || `#${product.id}`;
}

async function fetchLinkedProductIds(sellerId: number) {
  const limit = 100;
  const firstPage = await sellerProductsService.list({
    sellerId,
    page: 1,
    limit,
    includeInactive: true,
  });

  const remainingPages =
    firstPage.meta.totalPages > 1
      ? await Promise.all(
          Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
            sellerProductsService.list({
              sellerId,
              page: index + 2,
              limit,
              includeInactive: true,
            }),
          ),
        )
      : [];

  return Array.from(
    new Set(
      [firstPage, ...remainingPages].flatMap((page) =>
        page.data.map((sellerProduct) => sellerProduct.productId),
      ),
    ),
  );
}
