"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table/data-table";
import { PaymentStatusBadge } from "@/components/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { paymentsService, type ListPaymentsParams } from "@/lib/api/payments";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/api/client";
import {
  centsToBRL,
  formatDateTime,
  paymentStatusLabel,
} from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import type { Payment, PaymentPayout, PaymentStatus } from "@/lib/api/types";

const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

export default function PaymentsListPage() {
  const t = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("ALL");
  const [editing, setEditing] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [newStatus, setNewStatus] = useState<PaymentStatus>("PAID");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const params: ListPaymentsParams = useMemo(
    () => ({
      page,
      limit: 10,
      status: status === "ALL" ? undefined : (status as PaymentStatus),
    }),
    [page, status],
  );

  const query = useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsService.list(params),
  });
  const payoutParams = useMemo(() => ({ page: 1, limit: 10 }), []);
  const payoutsQuery = useQuery({
    queryKey: queryKeys.payments.payouts(payoutParams),
    queryFn: () => paymentsService.listPayouts(payoutParams),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error(t("payments.noPaymentSelected"));
      return paymentsService.updateStatus(editing.id, newStatus);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      toast.success(t("payments.updated"));
      setEditing(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("payments.updateFailed");
      toast.error(msg);
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => {
      if (!refunding) throw new Error("Nenhum pagamento selecionado");
      const amountCents = parseRefundAmountCents(refundAmount);

      if (refundAmount.trim() && amountCents === undefined) {
        throw new Error("Valor de refund invalido");
      }

      return paymentsService.refund(refunding.id, {
        amountCents,
        reason: "requested_by_customer",
        note: refundNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      toast.success("Refund solicitado");
      setRefunding(null);
      setRefundAmount("");
      setRefundNote("");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : "Nao foi possivel criar refund";
      toast.error(msg);
    },
  });
  const processPayoutsMutation = useMutation({
    mutationFn: paymentsService.processPayouts,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      toast.success("Repasses processados");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel processar repasses";
      toast.error(msg);
    },
  });
  const payoutActionMutation = useMutation({
    mutationFn: ({
      payoutId,
      action,
    }: {
      payoutId: number;
      action: "retry" | "reverse";
    }) =>
      action === "reverse"
        ? paymentsService.reversePayoutTransfer(payoutId)
        : paymentsService.retryPayoutTransfer(payoutId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.all() });
      toast.success("Repasse atualizado");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel atualizar o repasse";
      toast.error(msg);
    },
  });

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            #{row.original.id}
          </span>
        ),
        size: 60,
      },
      {
        id: "target",
        header: t("payments.target"),
        cell: ({ row }) => <PaymentTarget payment={row.original} />,
      },
      {
        id: "provider",
        header: t("payments.providerMethod"),
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.provider ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.method ?? "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "amountCents",
        header: t("payments.amount"),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {centsToBRL(row.original.amountCents)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
      },
      {
        id: "refunds",
        header: "Refunds",
        cell: ({ row }) => {
          const refundedCents = (row.original.refunds ?? [])
            .filter((refund) => refund.status === "SUCCEEDED")
            .reduce((sum, refund) => sum + refund.amountCents, 0);

          return (
            <span className="font-mono text-xs text-muted-foreground">
              {refundedCents > 0 ? centsToBRL(refundedCents) : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("payments.created"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row.original);
                setNewStatus(row.original.status);
              }}
            >
              <Pencil className="size-4" />
              {t("common.status")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={row.original.status !== "PAID"}
              onClick={() => {
                setRefunding(row.original);
                setRefundAmount("");
                setRefundNote("");
              }}
            >
              <Undo2 className="size-4" />
              Refund
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
        title={t("payments.title")}
        description={t("payments.description")}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("orders.allStatuses")}</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {paymentStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        emptyMessage={t("payments.empty")}
        onRowClick={(payment) => router.push(paymentTargetPath(payment))}
      />

      <PayoutsPanel
        payouts={payoutsQuery.data?.data ?? []}
        loading={payoutsQuery.isLoading}
        processing={processPayoutsMutation.isPending}
        actionLoading={payoutActionMutation.isPending}
        onProcess={() => processPayoutsMutation.mutate()}
        onRetry={(payoutId) =>
          payoutActionMutation.mutate({ payoutId, action: "retry" })
        }
        onReverse={(payoutId) =>
          payoutActionMutation.mutate({ payoutId, action: "reverse" })
        }
      />

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payments.updateTitle")}</DialogTitle>
            <DialogDescription>
              {t("payments.updateDescription", {
                paymentId: editing?.id ?? "—",
                orderId:
                  editing?.orderId ??
                  (editing?.deliveryRequestId
                    ? `D${editing.deliveryRequestId}`
                    : "—"),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t("payments.newStatus")}</Label>
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as PaymentStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {paymentStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!refunding}
        onOpenChange={(o) => {
          if (!o) setRefunding(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar refund</DialogTitle>
            <DialogDescription>
              Deixe o valor em branco para reembolsar o saldo restante do
              pagamento #{refunding?.id ?? "—"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Valor opcional</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex.: 25,90"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nota interna</Label>
              <Input
                value={refundNote}
                onChange={(event) => setRefundNote(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefunding(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirmar refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutsPanel({
  payouts,
  loading,
  processing,
  actionLoading,
  onProcess,
  onRetry,
  onReverse,
}: {
  payouts: PaymentPayout[];
  loading: boolean;
  processing: boolean;
  actionLoading: boolean;
  onProcess: () => void;
  onRetry: (payoutId: number) => void;
  onReverse: (payoutId: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Repasses Connect</CardTitle>
          <CardDescription>Transfers e reversals dos payouts aprovados</CardDescription>
        </div>
        <Button onClick={onProcess} disabled={processing}>
          {processing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Processar aprovados
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : payouts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum repasse encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Payout</th>
                  <th className="py-2 pr-3 font-medium">Destino</th>
                  <th className="py-2 pr-3 font-medium">Valor</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Transfer</th>
                  <th className="py-2 pr-3 font-medium text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((payout) => (
                  <PayoutRow
                    key={payout.id}
                    payout={payout}
                    actionLoading={actionLoading}
                    onRetry={onRetry}
                    onReverse={onReverse}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayoutRow({
  payout,
  actionLoading,
  onRetry,
  onReverse,
}: {
  payout: PaymentPayout;
  actionLoading: boolean;
  onRetry: (payoutId: number) => void;
  onReverse: (payoutId: number) => void;
}) {
  const canRetry =
    payout.status === "APPROVED" &&
    payout.stripeTransferStatus !== "TRANSFERRED";
  const canReverse =
    Boolean(payout.stripeTransferId) &&
    (payout.stripeTransferReversedAmountCents ?? 0) < payout.amountCents;

  return (
    <tr>
      <td className="py-3 pr-3 font-mono text-xs">#{payout.id}</td>
      <td className="py-3 pr-3">
        {payout.recipientType === "SELLER"
          ? payout.seller?.name ?? `Loja #${payout.sellerId ?? "—"}`
          : payout.driverProfile?.user?.name ??
            `Motorista #${payout.driverProfileId ?? "—"}`}
      </td>
      <td className="py-3 pr-3 font-mono font-semibold">
        {centsToBRL(payout.amountCents)}
      </td>
      <td className="py-3 pr-3">
        <Badge variant={payout.status === "PAID" ? "success" : "muted"}>
          {payout.status}
        </Badge>
      </td>
      <td className="py-3 pr-3">
        <div className="max-w-[220px] truncate font-mono text-xs">
          {payout.stripeTransferId ?? "—"}
        </div>
        {payout.stripeTransferStatus ? (
          <div className="text-xs text-muted-foreground">
            {payout.stripeTransferStatus}
          </div>
        ) : null}
      </td>
      <td className="py-3 pr-0">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={!canRetry || actionLoading}
            onClick={() => onRetry(payout.id)}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canReverse || actionLoading}
            onClick={() => onReverse(payout.id)}
          >
            <RotateCcw className="size-4" />
            Reversal
          </Button>
        </div>
      </td>
    </tr>
  );
}

function parseRefundAmountCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

function PaymentTarget({ payment }: { payment: Payment }) {
  const t = useTranslation();

  if (payment.deliveryRequestId) {
    return (
      <Link
        href={paymentTargetPath(payment)}
        className="font-mono text-xs font-medium hover:underline"
      >
        {t("payments.delivery")} #{payment.deliveryRequestId}
      </Link>
    );
  }

  return (
    <Link
      href={paymentTargetPath(payment)}
      className="font-mono text-xs font-medium hover:underline"
    >
      {t("payments.order")} #{payment.orderId}
    </Link>
  );
}

function paymentTargetPath(payment: Payment) {
  return payment.deliveryRequestId
    ? `/delivery-requests/${payment.deliveryRequestId}`
    : `/orders/${payment.orderId}`;
}
