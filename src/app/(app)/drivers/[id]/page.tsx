"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { driversService } from "@/lib/api/drivers";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { DriverStatus } from "@/lib/api/types";
import { formatDate, formatPhone } from "@/lib/formatters";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DriverStatusBadge } from "@/components/badges";

const STATUS_ACTIONS: Array<{
  target: DriverStatus;
  labelKey: "driver.approve" | "driver.reject" | "driver.block";
  icon: typeof CheckCircle2;
  variant: "default" | "destructive" | "secondary" | "outline";
}> = [
  {
    target: "APPROVED",
    labelKey: "driver.approve",
    icon: CheckCircle2,
    variant: "default",
  },
  {
    target: "REJECTED",
    labelKey: "driver.reject",
    icon: XCircle,
    variant: "outline",
  },
  {
    target: "BLOCKED",
    labelKey: "driver.block",
    icon: Ban,
    variant: "destructive",
  },
];

export default function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation();
  const driverId = Number(id);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.drivers.byId(driverId),
    queryFn: () => driversService.getById(driverId),
    enabled: Number.isFinite(driverId),
  });

  const mutation = useMutation({
    mutationFn: (status: DriverStatus) =>
      driversService.updateStatus(driverId, status),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.drivers.byId(driverId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.drivers.all() });
      toast.success(t("order.statusUpdated"));
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("order.statusUpdateFailed");
      toast.error(msg);
    },
  });

  const driver = query.data;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/drivers">
            <ArrowLeft className="size-4" />
            {t("driver.backToDrivers")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={driver?.user?.name ?? t("app.loading")}
        description={driver?.user?.email}
        actions={driver && <DriverStatusBadge status={driver.status} />}
      />

      {query.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-2" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !driver ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("driver.notFound")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("driver.data")}</CardTitle>
              <CardDescription>{t("driver.dataDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                    CPF
                  </dt>
                  <dd className="font-mono">{driver.cpf}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                    CNH
                  </dt>
                  <dd className="font-mono">{driver.cnh}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                    {t("common.phone")}
                  </dt>
                  <dd>{formatPhone(driver.phone)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                    {t("common.createdAt")}
                  </dt>
                  <dd>{formatDate(driver.createdAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                    {t("common.address")}
                  </dt>
                  <dd>{driver.address}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t("driver.vehicles")}
                </h3>
                {driver.vehicles && driver.vehicles.length > 0 ? (
                  <ul className="space-y-2">
                    {driver.vehicles.map((v) => (
                      <li
                        key={v.id}
                        className="rounded-md border border-border p-3 flex items-start justify-between gap-3"
                      >
                        <div className="text-sm">
                          <div className="font-medium">
                            {v.brand} {v.model} {v.year ? `(${v.year})` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {v.type ?? t("driver.vehicle")} · {v.color ?? "—"}
                          </div>
                        </div>
                        <div className="font-mono text-sm font-semibold">
                          {v.plate}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("driver.noVehicles")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("driver.actions")}</CardTitle>
              <CardDescription>
                {t("driver.actionsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {STATUS_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isCurrent = driver.status === action.target;
                return (
                  <Button
                    key={action.target}
                    variant={action.variant}
                    className="w-full justify-start"
                    disabled={mutation.isPending || isCurrent}
                    onClick={() => mutation.mutate(action.target)}
                  >
                    {mutation.isPending &&
                    mutation.variables === action.target ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                    {t(action.labelKey)}
                    {isCurrent && (
                      <span className="ml-auto text-xs opacity-70">
                        {t("common.current")}
                      </span>
                    )}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
