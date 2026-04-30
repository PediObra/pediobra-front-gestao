"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { sellerProductsService } from "@/lib/api/seller-products";
import { productsService } from "@/lib/api/products";
import { sellersService } from "@/lib/api/sellers";
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
            <Input
              placeholder={t("sellerProduct.searchProduct")}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder={t("sellerProduct.selectProduct")} />
              </SelectTrigger>
              <SelectContent>
                {(productsQ.data?.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} {p.brand ? `· ${p.brand}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>{t("sellerProduct.availability")}</Label>
            <Button
              type="button"
              variant={active ? "secondary" : "outline"}
              onClick={() => setActive((current) => !current)}
            >
              {active ? (
                <ToggleRight className="size-4" />
              ) : (
                <ToggleLeft className="size-4" />
              )}
              {active
                ? t("sellerProducts.active")
                : t("sellerProducts.inactive")}
            </Button>
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
