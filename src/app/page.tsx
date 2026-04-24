"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { useTranslation } from "@/lib/i18n/language-store";
import { HardHat } from "lucide-react";

export default function RootPage() {
  const t = useTranslation();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [hydrated, accessToken, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <HardHat className="size-10 animate-pulse text-primary" />
      <p className="text-sm">{t("app.loading")} PediObra</p>
    </div>
  );
}
