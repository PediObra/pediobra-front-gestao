"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DriverStatusBadge } from "@/components/badges";
import { ApiError } from "@/lib/api/client";
import { driversService, type ListDriversParams } from "@/lib/api/drivers";
import { operationsService } from "@/lib/api/operations";
import { queryKeys } from "@/lib/query-keys";
import { driverStatusLabel, formatPhone } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/language-store";
import type { DriverProfile, DriverStatus } from "@/lib/api/types";

const STATUS_OPTIONS: Array<DriverStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "BLOCKED",
];

export default function DriversListPage() {
  const t = useTranslation();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DriverStatus | "ALL">("ALL");
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

  const params: ListDriversParams = useMemo(
    () => ({
      page,
      limit: 10,
      status: status === "ALL" ? undefined : status,
    }),
    [page, status],
  );

  const query = useQuery({
    queryKey: queryKeys.drivers.list(params),
    queryFn: () => driversService.list(params),
  });

  const cleanupMutation = useMutation({
    mutationFn: operationsService.cleanupDriverLocations,
    onSuccess: (result) => {
      setCleanupDialogOpen(false);
      toast.success(
        `Histórico antigo de GPS limpo: ${result.deleted} ponto(s) apagado(s).`,
      );
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : "Não foi possível limpar o histórico de GPS.",
      );
    },
  });

  const columns = useMemo<ColumnDef<DriverProfile>[]>(
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
        id: "name",
        header: t("drivers.name"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.user?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.user?.email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "cpf",
        header: "CPF",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.cpf}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: t("drivers.phone"),
        cell: ({ row }) => (
          <span className="text-sm">{formatPhone(row.original.phone)}</span>
        ),
      },
      {
        id: "vehicles",
        header: t("drivers.vehicles"),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.vehicles?.length ?? 0}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => <DriverStatusBadge status={row.original.status} />,
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("drivers.title")}
        description={t("drivers.description")}
        actions={
          isAdmin ? (
            <Button
              variant="outline"
              onClick={() => setCleanupDialogOpen(true)}
            >
              <Trash2 className="size-4" />
              Limpar histórico de GPS
            </Button>
          ) : null
        }
      />

      <div className="flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v as DriverStatus | "ALL");
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === "ALL"
                  ? t("drivers.allStatuses")
                  : driverStatusLabel(opt)}
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
        onRowClick={(driver) => router.push(`/drivers/${driver.id}`)}
      />

      <Dialog
        open={cleanupDialogOpen}
        onOpenChange={(open) => {
          if (!cleanupMutation.isPending) setCleanupDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar histórico antigo de GPS?</DialogTitle>
            <DialogDescription>
              Esta ação apaga fisicamente os pontos antigos gravados em
              driver_locations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>
              Serão removidos apenas pontos de histórico com mais de 48 horas. A
              última localização operacional do motorista continua preservada no
              perfil e segue disponível para despacho e tracking atual.
            </p>
            <p>
              Essa rotina também roda automaticamente; este botão serve para uma
              limpeza manual de suporte quando necessário.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={cleanupMutation.isPending}
              onClick={() => setCleanupDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={cleanupMutation.isPending}
              onClick={() => cleanupMutation.mutate()}
            >
              {cleanupMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Limpar histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
