"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import type {
  SellerProductImportJob,
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
      toast.success("Importacao aplicada");
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
  const canApply =
    job?.status === "READY_FOR_REVIEW" && !applyMutation.isPending;

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
                <InfoLine label="Status ETL" value={job.status} />
                <InfoLine
                  label="Processado em"
                  value={formatDateTime(job.processedAt)}
                />
                <InfoLine
                  label="Aplicado em"
                  value={formatDateTime(job.appliedAt)}
                />
                <InfoLine
                  label="Tentativas"
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
                <CardDescription>Contadores do preview.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Linhas" value={stats.totalRows} />
                <Metric label="Validas" value={stats.validRows} />
                <Metric label="Invalidas" value={stats.invalidRows} />
                <Metric label="Aplicadas" value={stats.appliedRows} />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button disabled={!canApply} onClick={() => applyMutation.mutate()}>
              {applyMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Aplicar importacao
            </Button>
          </div>

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
                              variant={
                                row.status === "INVALID" ||
                                row.status === "SKIPPED"
                                  ? "destructive"
                                  : row.status === "APPLIED"
                                    ? "success"
                                    : "muted"
                              }
                            >
                              {row.status}
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
                            {(row.errors ?? []).join(" • ") || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "VALID").length,
    invalidRows: rows.filter((row) => row.status === "INVALID").length,
    appliedRows: rows.filter((row) => row.status === "APPLIED").length,
  };
}

function statusLabel(status: SellerProductImportStatus) {
  const labels: Record<SellerProductImportStatus, string> = {
    UPLOADED: "Enviado",
    QUEUED: "Na fila",
    PROCESSING: "Processando",
    READY_FOR_REVIEW: "Pronto para revisar",
    APPLYING: "Aplicando",
    APPLIED: "Aplicado",
    FAILED: "Falhou",
    APPLY_FAILED: "Falha ao aplicar",
  };
  return labels[status];
}
