"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { sellerProductsService } from "@/lib/api/seller-products";
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

export default function NewSellerProductPage() {
  const router = useRouter();
  const t = useTranslation();
  const qc = useQueryClient();
  const { isAdmin, sellerIds, canManageSellerProducts } = useAuth();

  const [sellerId, setSellerId] = useState<string>(
    sellerIds[0] ? String(sellerIds[0]) : "",
  );
  const [productId, setProductId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
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
  });

  const availableSellers = useMemo(() => {
    if (isAdmin) return sellersQ.data?.data ?? [];
    return (sellersQ.data?.data ?? []).filter((s) =>
      sellerIds.includes(s.id),
    );
  }, [isAdmin, sellersQ.data, sellerIds]);

  const canCreateForSelected = sellerId
    ? isAdmin || canManageSellerProducts(Number(sellerId))
    : false;

  const mutation = useMutation({
    mutationFn: () => {
      if (!sellerId || !productId)
        throw new Error(t("sellerProduct.selectStoreProduct"));
      return sellerProductsService.create({
        sellerId: Number(sellerId),
        productId: Number(productId),
        unitPriceCents: priceCents,
        stockAmount: stock,
        active,
        sku: sku || undefined,
      });
    },
    onSuccess: (sp) => {
      qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
      toast.success(t("sellerProduct.created"));
      router.push(`/seller-products/${sp.id}`);
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
          <CardDescription>
            {t("sellerProduct.priceHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("sellerProducts.store")}</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger>
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
              products={productsQ.data?.data ?? []}
              isLoading={productsQ.isFetching}
              placeholder={t("sellerProduct.searchProduct")}
              emptyLabel={t("sellerProduct.noProductsFound")}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">{t("sellerProduct.unitPrice")}</Label>
            <MoneyInput
              valueCents={priceCents}
              onChangeCents={setPriceCents}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">{t("sellerProduct.operationalStock")}</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="active">{t("sellerProduct.availability")}</Label>
                <p className="text-xs font-medium text-muted-foreground">
                  {active
                    ? t("sellerProducts.active")
                    : t("sellerProducts.inactive")}
                </p>
              </div>
              <Switch
                id="active"
                checked={active}
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
                !productId ||
                !canCreateForSelected
              }
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("sellerProduct.create")}
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
        aria-expanded={open}
        aria-controls="seller-product-product-options"
        aria-autocomplete="list"
        value={search}
        placeholder={placeholder}
        onFocus={() => onOpenChange(true)}
        onChange={(event) => {
          onSearchChange(event.target.value);
          onOpenChange(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onOpenChange(false);
          if (event.key === "Enter" && firstProduct) {
            event.preventDefault();
            onValueChange(String(firstProduct.id), firstProduct);
          }
        }}
        onBlur={() => window.setTimeout(() => onOpenChange(false), 120)}
      />

      {open ? (
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
