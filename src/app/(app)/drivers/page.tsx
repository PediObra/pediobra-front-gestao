"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DriverStatusBadge } from "@/components/badges";
import { driversService, type ListDriversParams } from "@/lib/api/drivers";
import { queryKeys } from "@/lib/query-keys";
import { driverStatusLabel, formatPhone } from "@/lib/formatters";
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
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DriverStatus | "ALL">("ALL");

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
          <span className="text-sm">
            {row.original.vehicles?.length ?? 0}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => <DriverStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/drivers/${row.original.id}`}>
                <Eye className="size-4" />
                {t("actions.details")}
              </Link>
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
        title={t("drivers.title")}
        description={t("drivers.description")}
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
                {opt === "ALL" ? t("drivers.allStatuses") : driverStatusLabel(opt)}
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
      />
    </div>
  );
}
