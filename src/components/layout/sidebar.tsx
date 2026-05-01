"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PanelLeftClose,
  Users,
  Store,
  Package,
  PackageCheck,
  Truck,
  Receipt,
  ClipboardList,
  Menu,
  Route,
  RadioTower,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PediObraLogo } from "@/components/brand/pediobra-logo";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    | "nav.payments"
    | "nav.operations";
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
  {
    labelKey: "nav.operations",
    href: "/operations",
    icon: RadioTower,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
];

const SIDEBAR_COLLAPSED_STORAGE_KEY = "pediobra:sidebar-collapsed";
const sidebarCollapsedListeners = new Set<() => void>();

function readStoredSidebarCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

function subscribeToSidebarCollapsed(listener: () => void) {
  sidebarCollapsedListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      sidebarCollapsedListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    sidebarCollapsedListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function setStoredSidebarCollapsed(value: boolean) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(value),
      );
    } catch {
      // Keep the toggle usable even when browser storage is unavailable.
    }
  }

  sidebarCollapsedListeners.forEach((listener) => listener());
}

export function SidebarBrand({
  className,
  labelClassName,
  collapsed = false,
}: {
  className?: string;
  labelClassName?: string;
  collapsed?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <PediObraLogo />
      <span
        className={cn(
          "truncate font-semibold tracking-tight",
          collapsed && "sr-only",
          labelClassName,
        )}
      >
        PediObra
      </span>
    </div>
  );
}

function SidebarNav({
  className,
  linkClassName,
  onNavigate,
  collapsed = false,
}: {
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
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
        const label = t(item.labelKey);
        const link = (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              linkClassName,
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className={cn("truncate", collapsed && "sr-only")}>
              {label}
            </span>
          </Link>
        );

        if (!collapsed) {
          return link;
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              arrowClassName="fill-sidebar-accent stroke-sidebar-border"
              className="border-sidebar-border bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground shadow-2xl shadow-black/30"
            >
              {label}
            </TooltipContent>
          </Tooltip>
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
  const collapsed = useSyncExternalStore(
    subscribeToSidebarCollapsed,
    readStoredSidebarCollapsed,
    () => false,
  );

  const toggleCollapsed = () => {
    setStoredSidebarCollapsed(!collapsed);
  };

  const toggleLabel = collapsed ? t("sidebar.expand") : t("sidebar.collapse");

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={80}>
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "h-16 flex items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "gap-2.5 px-4",
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={toggleLabel}
                  onClick={toggleCollapsed}
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring hover:bg-sidebar-accent"
                >
                  <SidebarBrand collapsed />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
                arrowClassName="fill-sidebar-accent stroke-sidebar-border"
                className="border-sidebar-border bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground shadow-2xl shadow-black/30"
              >
                {toggleLabel}
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <SidebarBrand className="flex-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={toggleLabel}
                    onClick={toggleCollapsed}
                    className="size-8 shrink-0 cursor-pointer text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
                  >
                    <PanelLeftClose className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  align="center"
                  arrowClassName="fill-sidebar-accent stroke-sidebar-border"
                  className="border-sidebar-border bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground shadow-2xl shadow-black/30"
                >
                  {toggleLabel}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <SidebarNav
          collapsed={collapsed}
          className={cn("flex-1 space-y-0.5", collapsed ? "p-2" : "p-3")}
        />

        {collapsed ? (
          <div className="h-10 border-t border-sidebar-border" />
        ) : (
          <div className="p-3 text-[11px] text-sidebar-foreground/50 border-t border-sidebar-border">
            {t("sidebar.footer")}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
