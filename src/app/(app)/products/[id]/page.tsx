"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { productsService } from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { useTranslation } from "@/lib/i18n/language-store";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation();
  const productId = Number(id);
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: queryKeys.products.byId(productId),
    queryFn: () => productsService.getById(productId),
    enabled: Number.isFinite(productId),
  });

  const product = query.data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [size, setSize] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [clearImages, setClearImages] = useState(false);
  const [imageInputKey, setImageInputKey] = useState(0);

  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable fields from the fetched record.
      setName(product.name);
      setDescription(product.description ?? "");
      setBrand(product.brand ?? "");
      setUnit(product.unit ?? "");
      setSize(product.size ?? "");
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: () =>
      productsService.update(productId, {
        name,
        description,
        brand,
        unit,
        size,
        clearImages: clearImages || undefined,
        images: imageFiles.length
          ? imageFiles.map((file, index) => ({
              file,
              position: index,
              isPrimary: index === 0,
            }))
          : undefined,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.products.byId(productId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.products.all() });
      toast.success(t("product.updated"));
      setImageFiles([]);
      setClearImages(false);
      setImageInputKey((key) => key + 1);
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
    mutationFn: () => productsService.remove(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all() });
      toast.success(t("product.archived"));
      router.push("/products");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("product.archiveFailed");
      toast.error(msg);
    },
  });

  const images = product?.images ?? [];
  const primaryImage =
    images.find((i) => i.isPrimary) ?? images[0] ?? null;
  const pendingPrimaryImage = imageFiles[0] ?? null;
  const showExistingImages = !clearImages && imageFiles.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/products">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={product?.name ?? t("app.loading")}
        description={product?.category?.name ?? product?.brand ?? undefined}
        actions={
          product && isAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="size-4" />
                  {t("common.archive")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("product.archiveTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("product.archiveDescription")}
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
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      ) : !product ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("product.notFound")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("product.gallery")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-square rounded-md border border-border bg-muted overflow-hidden flex items-center justify-center">
                {pendingPrimaryImage ? (
                  <ImageFilePreview
                    file={pendingPrimaryImage}
                    alt={t("product.newImageAlt", { product: product.name })}
                    className="size-full border-0"
                  />
                ) : showExistingImages && primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryImage.url}
                    alt={product.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-10 text-muted-foreground" />
                )}
              </div>
              {imageFiles.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {imageFiles.map((file) => (
                    <ImageFilePreview
                      key={`${file.name}-${file.lastModified}`}
                      file={file}
                      alt={t("product.newImageFileAlt", { file: file.name })}
                      className="aspect-square"
                    />
                  ))}
                </div>
              ) : showExistingImages && images.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="aspect-square rounded-md border border-border bg-muted overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {product.barcodes && product.barcodes.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    {t("product.barcodes")}
                  </p>
                  <ul className="space-y-1">
                    {product.barcodes.map((b) => (
                      <li
                        key={b.id}
                        className="font-mono text-xs flex items-center justify-between"
                      >
                        <span>{b.barcode}</span>
                        {b.barcodeType && (
                          <span className="text-muted-foreground">
                            {b.barcodeType}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("product.details")}</CardTitle>
              <CardDescription>
                {isAdmin
                  ? t("product.detailsEditable")
                  : t("product.detailsReadonly")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input
                  id="name"
                  disabled={!isAdmin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">{t("common.description")}</Label>
                <Textarea
                  id="description"
                  rows={3}
                  disabled={!isAdmin}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">{t("product.brand")}</Label>
                <Input
                  id="brand"
                  disabled={!isAdmin}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">{t("product.unit")}</Label>
                <Input
                  id="unit"
                  disabled={!isAdmin}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">{t("product.size")}</Label>
                <Input
                  id="size"
                  disabled={!isAdmin}
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="product-images">{t("product.replaceImages")}</Label>
                <Input
                  key={imageInputKey}
                  id="product-images"
                  type="file"
                  multiple
                  accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                  disabled={!isAdmin || clearImages}
                  onChange={(event) =>
                    setImageFiles(Array.from(event.target.files ?? []))
                  }
                />
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {imageFiles.map((file) => (
                      <figure
                        key={`${file.name}-${file.lastModified}`}
                        className="space-y-1"
                      >
                        <ImageFilePreview
                          file={file}
                          alt={t("product.imagePreviewAlt", {
                            file: file.name,
                          })}
                          className="aspect-square"
                        />
                        <figcaption className="truncate text-xs text-muted-foreground">
                          {file.name}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
              {images.length > 0 && (
                <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearImages}
                    disabled={!isAdmin}
                    onCheckedChange={(checked) => {
                      setClearImages(checked === true);
                      if (checked === true) {
                        setImageFiles([]);
                        setImageInputKey((key) => key + 1);
                      }
                    }}
                  />
                  {t("product.removeCurrentImages")}
                </label>
              )}

              {isAdmin && (
                <div className="sm:col-span-2 flex justify-end pt-2">
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
