"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import type {
  StripeConnectOnboardingStatus,
  StripeConnectStatus,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/formatters";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const STATUS_LABEL: Record<StripeConnectOnboardingStatus, string> = {
  NOT_STARTED: "Nao configurado",
  PENDING_ONBOARDING: "Onboarding pendente",
  PENDING_REVIEW: "Em analise",
  REQUIREMENTS_DUE: "Dados pendentes",
  READY: "Pronto",
  RESTRICTED: "Restrito",
};

const STATUS_VARIANT: Record<StripeConnectOnboardingStatus, BadgeVariant> = {
  NOT_STARTED: "muted",
  PENDING_ONBOARDING: "warning",
  PENDING_REVIEW: "secondary",
  REQUIREMENTS_DUE: "warning",
  READY: "success",
  RESTRICTED: "destructive",
};

export function StripeConnectStatusCard({
  title,
  description,
  status,
  actionLabel,
  actionLoading,
  blockedNotice,
  onAction,
}: {
  title: string;
  description?: string;
  status?: StripeConnectStatus | null;
  actionLabel?: string;
  actionLoading?: boolean;
  blockedNotice?: string;
  onAction?: () => void;
}) {
  const onboardingStatus = status?.stripeOnboardingStatus ?? "NOT_STARTED";
  const actionDisabled = !status?.connectEnabled || actionLoading;
  const showBlockedNotice =
    Boolean(status?.connectEnabled) &&
    onboardingStatus !== "READY" &&
    Boolean(blockedNotice);

  return (
    <Card>
      <CardHeader className="gap-3 border-b border-border sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <Badge variant={STATUS_VARIANT[onboardingStatus]}>
          {STATUS_LABEL[onboardingStatus]}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
        <ConnectMetric
          label="Conta Stripe"
          value={status?.stripeAccountId ?? "Ainda nao criada"}
        />
        <ConnectMetric
          label="Payouts"
          value={status?.stripePayoutsEnabled ? "Habilitados" : "Pendentes"}
        />
        <ConnectMetric
          label="Dados enviados"
          value={status?.stripeDetailsSubmitted ? "Sim" : "Nao"}
        />
        <ConnectMetric
          label="Atualizacao"
          value={
            status?.stripeAccountUpdatedAt
              ? formatDateTime(status.stripeAccountUpdatedAt)
              : "Sem sincronizacao"
          }
        />
        {status?.stripeDisabledReason ? (
          <div className="sm:col-span-2">
            <ConnectMetric label="Restricao" value={status.stripeDisabledReason} />
          </div>
        ) : null}
        {showBlockedNotice ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 sm:col-span-2">
            {blockedNotice}
          </div>
        ) : null}
        {onAction && actionLabel ? (
          <div className="sm:col-span-2">
            <Button onClick={onAction} disabled={actionDisabled}>
              {actionLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConnectMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}
