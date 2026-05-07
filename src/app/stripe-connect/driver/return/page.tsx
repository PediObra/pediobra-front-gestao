"use client";

import { use, useEffect } from "react";
import { HardHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function parseRedirectUrl(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(rawValue);
    const allowedProtocols = new Set(["exp:", "exps:", "pediobra-driver:"]);
    return allowedProtocols.has(url.protocol) ? rawValue : null;
  } catch {
    return null;
  }
}

export default function DriverStripeConnectReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectUrl?: string | string[] }>;
}) {
  const params = use(searchParams);
  const redirectUrl = parseRedirectUrl(params.redirectUrl);
  const canRedirect = Boolean(redirectUrl);

  useEffect(() => {
    if (!redirectUrl) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.location.replace(redirectUrl);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [redirectUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {canRedirect ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <HardHat className="size-6" />
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Voltando para o app
          </h1>
          <p className="text-sm text-muted-foreground">
            {canRedirect
              ? "O Stripe finalizou esta etapa. O app do motorista deve abrir automaticamente."
              : "Nao encontrei um retorno valido para abrir o app do motorista."}
          </p>
        </div>
        {redirectUrl ? (
          <Button asChild className="w-full">
            <a href={redirectUrl}>Abrir app do motorista</a>
          </Button>
        ) : null}
      </section>
    </main>
  );
}
