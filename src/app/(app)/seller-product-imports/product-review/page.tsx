"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { productsService } from "@/lib/api/products";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import type { Product, SellerProductImportReviewRow } from "@/lib/api/types";
import { centsToBRL, formatDateTime } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

export default function SellerProductImportReviewPage() {
  const qc = useQueryClient();
  const { isAdmin, isLoading } = useAuth();
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ page, limit: PAGE_SIZE }), [page]);

  const query = useQuery({
    queryKey: queryKeys.sellerProductImports.productReview(params),
    queryFn: () => sellerProductImportsService.listProductReview(params),
    enabled: isAdmin,
  });

  const invalidateReview = (jobId?: number) => {
    if (jobId) {
      qc.invalidateQueries({
        queryKey: queryKeys.sellerProductImports.byId(jobId),
      });
    }
    qc.invalidateQueries({ queryKey: queryKeys.sellerProductImports.all() });
    qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
    qc.invalidateQueries({
      queryKey: ["sellerProductImports", "productReview"],
    });
    qc.invalidateQueries({ queryKey: queryKeys.products.all() });
  };

  const approveMutation = useMutation({
    mutationFn: (rowId: number) =>
      sellerProductImportsService.approveProduct(rowId),
    onSuccess: (job) => {
      toast.success("Produto aprovado e oferta da loja criada");
      invalidateReview(job.id);
    },
    onError: showMutationError("Não foi possível aprovar o produto"),
  });

  const linkMutation = useMutation({
    mutationFn: ({ rowId, productId }: { rowId: number; productId: number }) =>
      sellerProductImportsService.linkProduct(rowId, productId),
    onSuccess: (job) => {
      toast.success("Produto vinculado e oferta da loja criada");
      invalidateReview(job.id);
    },
    onError: showMutationError("Não foi possível vincular o produto"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ rowId, reason }: { rowId: number; reason: string }) =>
      sellerProductImportsService.rejectProduct(rowId, reason),
    onSuccess: (job) => {
      toast.success("Produto rejeitado");
      invalidateReview(job.id);
    },
    onError: showMutationError("Não foi possível rejeitar o produto"),
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;
  const busy =
    approveMutation.isPending ||
    linkMutation.isPending ||
    rejectMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando permissão...
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Apenas admins podem revisar produtos globais importados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisão de produtos importados"
        description="Aprove, vincule ou rejeite produtos novos enviados por lojas no CSV."
        actions={
          <Button asChild variant="outline">
            <Link href="/seller-products">
              <ExternalLink className="size-4" />
              Voltar para ofertas
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="size-5" />
            Pendências de catálogo global
          </CardTitle>
          <CardDescription>
            Aprovar cria um produto global verificado. Vincular usa um produto
            existente. As duas ações criam ou atualizam a oferta da loja que
            importou o CSV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Produto importado</TableHead>
                  <TableHead>Oferta</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="min-w-72">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Nenhum produto pendente de revisão.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <ReviewRow
                      key={row.id}
                      row={row}
                      busy={busy}
                      onApprove={() => approveMutation.mutate(row.id)}
                      onLink={(productId) => {
                        linkMutation.mutate({ rowId: row.id, productId });
                      }}
                      onReject={(reason) => {
                        rejectMutation.mutate({ rowId: row.id, reason });
                      }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {meta.page} de {meta.totalPages || 1} · {meta.total}{" "}
                pendencia(s)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    query.isFetching || (meta.totalPages || 1) <= meta.page
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  Próxima
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={query.isFetching}
                  onClick={() => query.refetch()}
                  aria-label="Atualizar fila"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewRow({
  row,
  busy,
  onApprove,
  onLink,
  onReject,
}: {
  row: SellerProductImportReviewRow;
  busy: boolean;
  onApprove: () => void;
  onLink: (productId: number) => void;
  onReject: (reason: string) => void;
}) {
  const product = row.normalizedPayload?.product;
  const offer = row.normalizedPayload?.sellerProduct;
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approveMode, setApproveMode] = useState<"create" | "link">("create");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const productSearchParams = useMemo(
    () => ({
      page: 1,
      limit: 6,
      search: debouncedProductSearch.trim() || undefined,
    }),
    [debouncedProductSearch],
  );
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(productSearchParams),
    queryFn: () => productsService.list(productSearchParams),
    enabled:
      approveConfirmOpen &&
      approveMode === "link" &&
      debouncedProductSearch.trim().length >= 2,
  });
  const canConfirmReject = rejectReason.trim().length >= 3;
  const canConfirmApprove = approveMode === "create" || !!selectedProduct;

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="space-y-1 text-sm">
          <div className="font-medium">
            {row.job.seller?.name ?? `Loja #${row.job.sellerId}`}
          </div>
          <Link
            href={`/seller-product-imports/${row.jobId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Importação #{row.jobId}, linha {row.rowNumber}
            <ExternalLink className="size-3" />
          </Link>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(row.createdAt)}
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="max-w-sm space-y-1 text-sm">
          <div className="font-medium">{product?.name ?? "Sem nome"}</div>
          <div className="text-xs text-muted-foreground">
            {[product?.brand, product?.unit, product?.size]
              .filter(Boolean)
              .join(" · ") || "Sem marca/unidade/tamanho"}
          </div>
          {product?.barcodes?.length ? (
            <div className="flex flex-wrap gap-1">
              {product.barcodes.map((barcode) => (
                <Badge key={barcode} variant="muted">
                  {barcode}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-top text-sm">
        <div>{centsToBRL(offer?.unitPriceCents)}</div>
        <div className="text-xs text-muted-foreground">
          Estoque: {offer?.stockAmount ?? 0}
        </div>
        <div className="text-xs text-muted-foreground">
          SKU: {offer?.sku ?? "—"}
        </div>
      </TableCell>
      <TableCell className="align-top text-xs">
        <div>{row.matchStrategy ?? "Sem estratégia"}</div>
        <div className="text-muted-foreground">
          {row.matchConfidenceBps === null ||
          row.matchConfidenceBps === undefined
            ? "Sem confiança"
            : `${(row.matchConfidenceBps / 100).toFixed(0)}%`}
        </div>
        {(row.warnings ?? []).length > 0 ? (
          <div className="mt-2 max-w-48 text-warning">
            {(row.warnings ?? []).join(" • ")}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              size="sm"
              className="w-full cursor-pointer"
              disabled={busy}
              onClick={() => setApproveConfirmOpen(true)}
            >
              <CheckCircle2 className="size-4" />
              Aprovar produto
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="w-full cursor-pointer"
              disabled={busy}
              onClick={() => setRejectConfirmOpen(true)}
            >
              <XCircle className="size-4" />
              Rejeitar
            </Button>
          </div>
        </div>

        <Dialog
          open={approveConfirmOpen}
          onOpenChange={(open) => {
            if (!busy) setApproveConfirmOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolver produto importado</DialogTitle>
              <DialogDescription>
                Crie um produto global novo ou vincule esta linha a um produto
                existente do catálogo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={approveMode === "create" ? "default" : "outline"}
                className="cursor-pointer"
                disabled={busy}
                onClick={() => {
                  setApproveMode("create");
                  setSelectedProduct(null);
                }}
              >
                Criar novo produto
              </Button>
              <Button
                type="button"
                variant={approveMode === "link" ? "default" : "outline"}
                className="cursor-pointer"
                disabled={busy}
                onClick={() => setApproveMode("link")}
              >
                Selecionar produto
              </Button>
            </div>

            {approveMode === "create" ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{product?.name ?? "Sem nome"}</div>
                <div className="mt-1 text-muted-foreground">
                  Um produto global verificado será criado com os dados
                  importados. A oferta da loja{" "}
                  {row.job.seller?.name ?? `#${row.job.sellerId}`} será criada
                  ou atualizada junto com o produto.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  value={productSearch}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setSelectedProduct(null);
                  }}
                  placeholder="Buscar produto por nome"
                  disabled={busy}
                />
                <div className="rounded-md border border-border">
                  {productSearch.trim().length < 2 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Digite pelo menos 2 caracteres para buscar no catálogo.
                    </div>
                  ) : productsQuery.isLoading ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Buscando produtos...
                    </div>
                  ) : (productsQuery.data?.data ?? []).length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    <div className="max-h-64 divide-y divide-border overflow-y-auto">
                      {(productsQuery.data?.data ?? []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full cursor-pointer flex-col gap-1 p-3 text-left text-sm hover:bg-muted/50"
                          disabled={busy}
                          onClick={() => setSelectedProduct(item)}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Produto #{item.id}
                            {[item.brand, item.unit, item.size]
                              .filter(Boolean)
                              .join(" · ")
                              ? ` · ${[item.brand, item.unit, item.size]
                                  .filter(Boolean)
                                  .join(" · ")}`
                              : ""}
                          </span>
                          {selectedProduct?.id === item.id ? (
                            <Badge className="w-fit" variant="success">
                              Selecionado
                            </Badge>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProduct ? (
                  <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
                    <div className="font-medium">
                      Produto selecionado: {selectedProduct.name}
                    </div>
                    <div className="text-muted-foreground">
                      A oferta da loja será criada ou atualizada para o produto
                      #{selectedProduct.id}.
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => setApproveConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={busy || !canConfirmApprove}
                onClick={() => {
                  if (approveMode === "link") {
                    if (!selectedProduct) return;
                    onLink(selectedProduct.id);
                  } else {
                    onApprove();
                  }
                  setApproveConfirmOpen(false);
                }}
              >
                <CheckCircle2 className="size-4" />
                {approveMode === "link"
                  ? "Confirmar vínculo"
                  : "Confirmar aprovação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={rejectConfirmOpen}
          onOpenChange={(open) => {
            if (!busy) setRejectConfirmOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar produto importado?</DialogTitle>
              <DialogDescription>
                Essa linha não criará produto global nem oferta para a loja.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm">
              <div className="font-medium">{product?.name ?? "Sem nome"}</div>
              <Textarea
                className="mt-3 bg-background"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Motivo para rejeitar"
                disabled={busy}
                rows={3}
              />
              {!canConfirmReject ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Informe o motivo da rejeição para continuar.
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => setRejectConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="cursor-pointer"
                disabled={busy || !canConfirmReject}
                onClick={() => {
                  if (!canConfirmReject) return;
                  onReject(rejectReason.trim());
                  setRejectConfirmOpen(false);
                }}
              >
                <XCircle className="size-4" />
                Confirmar rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

function showMutationError(fallback: string) {
  return (error: unknown) => {
    toast.error(error instanceof ApiError ? error.displayMessage : fallback);
  };
}
