"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
import { paymentsService, type ListPaymentsParams } from "@/lib/api/payments";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/api/client";
import {
  centsToBRL,
  formatDateTime,
  paymentStatusLabel,
} from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import type { Payment, PaymentStatus } from "@/lib/api/types";

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
