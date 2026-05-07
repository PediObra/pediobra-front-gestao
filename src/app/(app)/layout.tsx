"use client";

import Link from "next/link";
import { Building2, HardHat } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/language-store";
import { useOperationsRealtime } from "@/lib/realtime/use-operations-realtime";
import { Button } from "@/components/ui/button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, needsSellerOnboarding } = useAuth();
  const t = useTranslation();
  useOperationsRealtime(!needsSellerOnboarding);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <HardHat className="size-10 animate-pulse text-primary" />
          <p className="text-sm">{t("app.loadingPanel")}</p>
        </div>
      </div>
    );
  }

  if (needsSellerOnboarding) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-secondary/40 p-6">
        <div className="w-full max-w-md space-y-4 rounded-md border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-primary">
            <Building2 className="size-5 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Cadastre sua empresa
            </h1>
            <p className="text-sm text-muted-foreground">
              Para usar a plataforma, você precisa cadastrar uma loja e
              vincular sua conta como dono.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/onboarding/seller">Ir para cadastro da loja</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-screen bg-secondary/40">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
