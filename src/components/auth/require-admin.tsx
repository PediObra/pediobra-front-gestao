"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();

  if (isAdmin) {
    return children;
  }

  return (
    <Card>
      <CardContent className="flex min-h-[22rem] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth.adminOnly.title")}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {t("auth.adminOnly.description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">{t("auth.adminOnly.action")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
