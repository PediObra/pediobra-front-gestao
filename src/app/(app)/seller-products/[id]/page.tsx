"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { sellerProductsService } from "@/lib/api/seller-products";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { centsToBRL } from "@/lib/formatters";
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
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyInput } from "@/components/forms/money-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SellerProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation();
  const sellerProductId = Number(id);
  const { canManageSellerProducts } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: queryKeys.sellerProducts.byId(sellerProductId),
    queryFn: () => sellerProductsService.getById(sellerProductId),
    enabled: Number.isFinite(sellerProductId),
  });

  const sp = query.data;
  const canManage = sp ? canManageSellerProducts(sp.sellerId) : false;

  const [priceCents, setPriceCents] = useState(0);
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (sp) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable fields from the fetched offer.
      setPriceCents(sp.unitPriceCents);
      setStock(sp.stockAmount);
      setSku(sp.sku ?? "");
      setActive(sp.active !== false);
    }
  }, [sp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: () =>
      sellerProductsService.update(sellerProductId, {
        unitPriceCents: priceCents,
        stockAmount: stock,
        active,
        sku: sku || undefined,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.sellerProducts.byId(sellerProductId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
      toast.success(t("sellerProduct.updated"));
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("product.saveFailed");
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => sellerProductsService.remove(sellerProductId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
      toast.success(t("sellerProduct.archived"));
      router.push("/seller-products");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("product.archiveFailed");
      toast.error(msg);
    },
  });

  const primaryImage =
    sp?.product?.images?.find((i) => i.isPrimary) ?? sp?.product?.images?.[0];

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
        title={sp?.product?.name ?? t("sellerProduct.offer")}
        description={
          sp
            ? t("sellerProduct.descriptionLine", {
                store: sp.seller?.name ?? `#${sp.sellerId}`,
                price: centsToBRL(sp.unitPriceCents),
              })
            : undefined
        }
        actions={
          sp && canManage && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="size-4" />
                  {t("common.archive")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("sellerProduct.archiveTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("sellerProduct.archiveDescription")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost">{t("common.cancel")}</Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {t("common.archive")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !sp ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("sellerProduct.notFound")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("sellerProducts.product")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-square rounded-md border border-border bg-muted overflow-hidden flex items-center justify-center">
                {primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryImage.url}
                    alt={sp.product?.name ?? ""}
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">{sp.product?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {sp.product?.brand ?? "—"}
                  {sp.product?.unit && ` · ${sp.product.unit}`}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/products/${sp.productId}`}>
                  {t("sellerProduct.productDetails")}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("sellerProduct.offerSettings")}</CardTitle>
              <CardDescription>
                {canManage
                  ? t("sellerProduct.editValues")
                  : t("sellerProduct.noPermission")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("sellerProduct.availability")}</Label>
                <Button
                  type="button"
                  variant={active ? "secondary" : "outline"}
                  disabled={!canManage}
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
              <div className="space-y-2">
                <Label htmlFor="price">{t("sellerProduct.unitPrice")}</Label>
                <MoneyInput
                  valueCents={priceCents}
                  onChangeCents={setPriceCents}
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">
                  {t("sellerProduct.operationalStock")}
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  disabled={!canManage}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  disabled={!canManage}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              {canManage && (
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {t("common.saveChanges")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
