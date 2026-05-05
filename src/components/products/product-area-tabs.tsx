"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";

type ProductAreaTab = "system" | "store";

export function ProductAreaTabs({ active }: { active: ProductAreaTab }) {
  const t = useTranslation();
  const tabs: Array<{
    value: ProductAreaTab;
    href: string;
    label: string;
  }> = [
    {
      value: "system",
      href: "/products",
      label: t("products.tabs.system"),
    },
    {
      value: "store",
      href: "/seller-products",
      label: t("products.tabs.store"),
    },
  ];

  return (
    <div
      className="inline-flex w-fit rounded-md border border-border bg-muted/40 p-1"
      role="tablist"
      aria-label={t("products.tabs.label")}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          role="tab"
          aria-selected={active === tab.value}
          className={cn(
            "h-8 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
            "inline-flex items-center hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active === tab.value && "bg-background text-foreground shadow-sm",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
