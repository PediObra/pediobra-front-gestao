"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { useAuth } from "@/hooks/use-auth";
import type {
  SellerProductImportJob,
  SellerProductImportRow,
  SellerProductImportRowStatus,
  SellerProductImportStatus,
} from "@/lib/api/types";
import { centsToBRL, formatDateTime } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";

const STATUS_VARIANT: Record<
  SellerProductImportStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  UPLOADED: "muted",
  QUEUED: "warning",
  PROCESSING: "default",
  READY_FOR_REVIEW: "default",
  APPLYING: "warning",
  PENDING_PRODUCT_REVIEW: "warning",
  APPLIED: "success",
  FAILED: "destructive",
  APPLY_FAILED: "destructive",
};

export default function SellerProductImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const jobId = Number(id);
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.sellerProductImports.byId(jobId),
    queryFn: () => sellerProductImportsService.getById(jobId),
    enabled: Number.isFinite(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "QUEUED" || status === "PROCESSING" ? 5000 : false;
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => sellerProductImportsService.apply(jobId),
    onSuccess: (job) => {
      qc.setQueryData(queryKeys.sellerProductImports.byId(jobId), job);
      qc.invalidateQueries({ queryKey: queryKeys.sellerProductImports.all() });
      qc.invalidateQueries({ queryKey: queryKeys.sellerProducts.all() });
      setConfirmApplyOpen(false);
      toast.success(
        job.status === "PENDING_PRODUCT_REVIEW"
          ? "Ofertas existentes aplicadas; produtos novos ficaram para revisão do catálogo"
          : "Importação aplicada",
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : "Nao foi possivel aplicar a importacao",
      );
    },
  });

  const job = query.data;
  const rows = job?.rows ?? [];
  const stats = summarize(job);
  const canApply = job?.status === "READY_FOR_REVIEW" && !applyMutation.isPending;
  const pendingProductRows = rows.filter(
    (row) => row.status === "PENDING_PRODUCT_REVIEW",
  );
  const reviewPreviewRows =
    job?.status === "READY_FOR_REVIEW" ? rows.filter(needsProductReview) : [];
  const productReviewRows = [...pendingProductRows, ...reviewPreviewRows];
  const productReviewCountLabel = `${productReviewRows.length} produto${
    productReviewRows.length === 1 ? "" : "s"
  }`;
  const productReviewVerb =
    productReviewRows.length === 1 ? "será enviado" : "serão enviados";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Importacao #${jobId}`}
        description="Revise o resultado do ETL antes de aplicar no catalogo."
        actions={
          <Button asChild variant="outline">
            <Link href="/seller-products">
              <ArrowLeft className="size-4" />
              Voltar para ofertas
            </Link>
          </Button>
        }
      />

      {query.isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando importacao…
          </CardContent>
        </Card>
      ) : !job ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Importacao nao encontrada.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {job.seller?.name ?? `Loja #${job.sellerId}`}
                  <Badge variant={STATUS_VARIANT[job.status]}>
                    {statusLabel(job.status)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {job.sourceOriginalFilename ?? "Arquivo CSV"} · criado em{" "}
                  {formatDateTime(job.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <InfoLine
                  label="Status da importação"
                  value={statusLabel(job.status)}
                />
                <InfoLine
                  label="Processado em"
                  value={formatDateTime(job.processedAt)}
                />
                {job.appliedAt ? (
                  <InfoLine
                    label="Aplicado em"
                    value={formatDateTime(job.appliedAt)}
                  />
                ) : null}
                <InfoLine
                  label="Execuções ETL"
                  value={String(job.attemptCount ?? 0)}
                />
                {job.etlNotificationError ? (
                  <div className="md:col-span-2 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-destructive">
                    {job.etlNotificationError}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
                <CardDescription>
                  Separacao entre ofertas aplicadas e produtos para curadoria.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Linhas" value={stats.totalRows} />
                <Metric label="Aplicaveis" value={stats.applicableRows} />
                <Metric label="Aplicadas" value={stats.appliedRows} />
                <Metric
                  label={
                    job.status === "READY_FOR_REVIEW"
                      ? "Revisão do catálogo"
                      : "Revisão externa"
                  }
                  value={stats.productReviewRows}
                />
              </CardContent>
            </Card>
          </div>

          {productReviewRows.length > 0 ? (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex flex-col gap-4 p-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">
                    {job.status === "READY_FOR_REVIEW"
                      ? `${productReviewCountLabel} ${productReviewVerb} para revisão do catálogo ao aplicar`
                      : `${productReviewCountLabel} aguardando revisão do catálogo`}
                  </div>
                  <div className="text-muted-foreground">
                    {job.status === "READY_FOR_REVIEW"
                      ? "A pendência de revisão será criada quando a loja clicar em Aplicar importação."
                      : "As ofertas que já tinham produto global confiável foram aplicadas. Produtos novos precisam ser aprovados ou vinculados pela equipe de catálogo antes de entrar na base global."}
                  </div>
                  {job.status === "READY_FOR_REVIEW" ? (
                    <div className="text-muted-foreground">
                      Ao aplicar, somente linhas com produto existente e match
                      confiável viram ofertas da loja agora. Produtos novos ou
                      pouco confiáveis seguem para revisão do catálogo.
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  {isAdmin && pendingProductRows.length > 0 ? (
                    <Button asChild variant="outline" className="h-11 w-full">
                      <Link href="/seller-product-imports/product-review">
                        <FileSearch className="size-4" />
                        Revisar produtos
                      </Link>
                    </Button>
                  ) : null}
                  {job.status === "READY_FOR_REVIEW" ? (
                    <Button
                      disabled={!canApply}
                      className="h-11 w-full cursor-pointer"
                      onClick={() => setConfirmApplyOpen(true)}
                    >
                      {applyMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Aplicar importação
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {job.status === "READY_FOR_REVIEW" ? (
                <p className="max-w-2xl text-right text-sm text-muted-foreground">
                  Ao aplicar, somente linhas com produto existente e match
                  confiável viram ofertas da loja agora. Produtos novos ou pouco
                  confiáveis seguem para revisão do catálogo.
                </p>
              ) : null}
              <Button
                disabled={!canApply}
                className="cursor-pointer"
                onClick={() => setConfirmApplyOpen(true)}
              >
                {applyMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Aplicar importação
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Linhas processadas</CardTitle>
              <CardDescription>
                Amostra completa retornada pelo ETL para revisao.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Preco</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-sm text-muted-foreground"
                        >
                          Nenhuma linha processada ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={rowStatusVariant(row)}
                              className="whitespace-nowrap"
                            >
                              {rowStatusLabel(row)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.normalizedPayload?.product?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            {centsToBRL(
                              row.normalizedPayload?.sellerProduct
                                ?.unitPriceCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {row.normalizedPayload?.sellerProduct?.sku ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div>{row.matchStrategy ?? "—"}</div>
                              <div className="text-muted-foreground">
                                {row.existingProductId
                                  ? `Produto #${row.existingProductId}`
                                  : row.createdProductId
                                    ? `Criado #${row.createdProductId}`
                                    : "Sem produto"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-destructive">
                            {(row.errors ?? []).join(" • ") ||
                              (row.warnings ?? []).join(" • ") ||
                              row.reviewRejectionReason ||
                              "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={confirmApplyOpen}
            onOpenChange={(open) => {
              if (!applyMutation.isPending) setConfirmApplyOpen(open);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aplicar importação?</DialogTitle>
                <DialogDescription>
                  Esta ação vai criar ou atualizar ofertas da loja para as
                  linhas com produto existente e match confiável.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
                Produtos novos ou pouco confiáveis não entram direto no catálogo
                global. Eles serão enviados para revisão do catálogo.
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={applyMutation.isPending}
                  onClick={() => setConfirmApplyOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="cursor-pointer"
                  disabled={applyMutation.isPending}
                  onClick={() => applyMutation.mutate()}
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Confirmar aplicação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function summarize(job: SellerProductImportJob | undefined) {
  const rows = job?.rows ?? [];
  const pendingRows = rows.filter(
    (row) => row.status === "PENDING_PRODUCT_REVIEW",
  ).length;
  const reviewPreviewRows =
    job?.status === "READY_FOR_REVIEW"
      ? rows.filter(needsProductReview).length
      : 0;
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "VALID").length,
    invalidRows: rows.filter((row) => row.status === "INVALID").length,
    applicableRows: rows.filter(
      (row) =>
        (row.status === "VALID" || row.status === "WARNING") &&
        row.existingProductId &&
        (row.matchConfidenceBps ?? 0) >= 9000,
    ).length,
    appliedRows: rows.filter((row) => row.status === "APPLIED").length,
    productReviewRows: pendingRows + reviewPreviewRows,
  };
}

function statusLabel(status: SellerProductImportStatus) {
  const labels: Record<SellerProductImportStatus, string> = {
    UPLOADED: "Enviado",
    QUEUED: "Na fila",
    PROCESSING: "Processando",
    READY_FOR_REVIEW: "Pronto para revisar",
    APPLYING: "Aplicando",
    PENDING_PRODUCT_REVIEW: "Revisão externa",
    APPLIED: "Aplicado",
    FAILED: "Falhou",
    APPLY_FAILED: "Falha ao aplicar",
  };
  return labels[status];
}

function rowStatusLabel(row: SellerProductImportRow) {
  if (needsProductReview(row)) return "Revisão externa";

  const labels: Record<SellerProductImportRowStatus, string> = {
    VALID: "Aplicavel",
    WARNING: "Aplicavel com aviso",
    INVALID: "Invalida",
    APPLIED: "Aplicada",
    SKIPPED: "Ignorada",
    PENDING_PRODUCT_REVIEW: "Revisão externa",
    PRODUCT_REJECTED: "Rejeitada",
  };
  return labels[row.status];
}

function rowStatusVariant(
  row: SellerProductImportRow,
): NonNullable<BadgeProps["variant"]> {
  const status = row.status;
  if (needsProductReview(row)) return "warning";
  if (status === "APPLIED") return "success";
  if (status === "PENDING_PRODUCT_REVIEW") return "warning";
  if (
    status === "INVALID" ||
    status === "SKIPPED" ||
    status === "PRODUCT_REJECTED"
  ) {
    return "destructive";
  }
  return "muted";
}

function needsProductReview(row: SellerProductImportRow) {
  if (row.status !== "VALID" && row.status !== "WARNING") return false;
  if (!row.normalizedPayload?.product?.name) return false;
  return !isTrustedExistingMatch(row);
}

function isTrustedExistingMatch(row: SellerProductImportRow) {
  return (
    Boolean(row.existingProductId) &&
    (row.matchStrategy === "EXACT_BARCODE" ||
      row.matchStrategy === "EXACT_FINGERPRINT") &&
    (row.matchConfidenceBps ?? 0) >= 9000
  );
}
