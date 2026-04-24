"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardHat,
  LayoutDashboard,
  Users,
  Store,
  Package,
  PackageCheck,
  Truck,
  Receipt,
  ClipboardList,
  Menu,
  Route,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type NavItem = {
  labelKey:
    | "nav.dashboard"
    | "nav.orders"
    | "nav.deliveryRequests"
    | "nav.products"
    | "nav.sellerProducts"
    | "nav.sellers"
    | "nav.drivers"
    | "nav.users"
    | "nav.payments";
  href: string;
  icon: typeof LayoutDashboard;
  show: (ctx: { isAdmin: boolean; isSeller: boolean }) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    labelKey: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    show: () => true,
  },
  {
    labelKey: "nav.orders",
    href: "/orders",
    icon: ClipboardList,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    labelKey: "nav.deliveryRequests",
    href: "/delivery-requests",
    icon: Route,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    labelKey: "nav.products",
    href: "/products",
    icon: Package,
    show: () => true,
  },
  {
    labelKey: "nav.sellerProducts",
    href: "/seller-products",
    icon: PackageCheck,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    labelKey: "nav.sellers",
    href: "/sellers",
    icon: Store,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    labelKey: "nav.drivers",
    href: "/drivers",
    icon: Truck,
    show: ({ isAdmin }) => isAdmin,
  },
  {
    labelKey: "nav.users",
    href: "/users",
    icon: Users,
    show: ({ isAdmin }) => isAdmin,
  },
  {
    labelKey: "nav.payments",
    href: "/payments",
    icon: Receipt,
    show: ({ isAdmin }) => isAdmin,
  },
];

export function SidebarBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="size-8 rounded-md bg-primary flex items-center justify-center">
        <HardHat className="size-5 text-primary-foreground" />
      </div>
      <span className="font-semibold tracking-tight">PediObra</span>
    </div>
  );
}

function SidebarNav({
  className,
  linkClassName,
  onNavigate,
}: {
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { isAdmin, isSeller } = useAuth();
  const t = useTranslation();

  const items = NAV_ITEMS.filter((item) => item.show({ isAdmin, isSeller }));

  return (
    <nav aria-label={t("sidebar.nav")} className={className}>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              linkClassName,
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const t = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("sidebar.open")}
          className="-ml-2 size-11 md:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="left-0 top-0 flex h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 border-y-0 border-l-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none [&>button]:right-2 [&>button]:top-2 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:text-sidebar-foreground"
      >
        <DialogTitle className="sr-only">{t("sidebar.menu")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("sidebar.description")}
        </DialogDescription>

        <div className="h-16 flex items-center px-5 pr-14 border-b border-sidebar-border">
          <SidebarBrand />
        </div>

        <SidebarNav
          className="flex-1 p-3 space-y-0.5 overflow-y-auto"
          onNavigate={() => setOpen(false)}
        />

        <div className="p-3 text-[11px] text-sidebar-foreground/50 border-t border-sidebar-border">
          {t("sidebar.footer")}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Sidebar() {
  const t = useTranslation();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <SidebarBrand />
      </div>

      <SidebarNav className="flex-1 p-3 space-y-0.5" />

      <div className="p-3 text-[11px] text-sidebar-foreground/50 border-t border-sidebar-border">
        {t("sidebar.footer")}
      </div>
    </aside>
  );
}
