"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HardHat, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n/language-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const t = useTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const loginSchema = z.object({
    email: z.string().email(t("login.invalidEmail")),
    password: z.string().min(1, t("login.requiredPassword")),
  });

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setSubmitting(true);
    try {
      await login(values);
      toast.success(t("login.success"));
      router.replace("/dashboard");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("login.failed");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 grid lg:grid-cols-2 min-h-screen">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-blueprint opacity-[0.15] pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary flex items-center justify-center">
            <HardHat className="size-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PediObra</span>
        </div>
        <div className="relative space-y-4 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            {t("login.heroTitle")}
          </h1>
          <p className="text-sidebar-foreground/70">
            {t("login.heroSubtitle")}
          </p>
        </div>
        <div className="relative text-xs text-sidebar-foreground/60">
          {t("login.footer", { year: new Date().getFullYear() })}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="size-10 rounded-md bg-primary flex items-center justify-center">
              <HardHat className="size-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              PediObra
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("login.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("login.subtitle")}
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="master@pediobra.local"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t("login.submit")}
            </Button>
          </form>

          <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground space-y-1 font-mono">
            <p className="font-medium text-foreground">
              {t("login.seedCredentials")}
            </p>
            <p>master@pediobra.local / 123456 (ADMIN)</p>
            <p>marina.centro@pediobra.local / 123456 (SELLER OWNER)</p>
            <p>carlos.estoque@pediobra.local / 123456 (SELLER EMPLOYEE)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
