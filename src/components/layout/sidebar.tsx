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
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
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
  label: string;
  labelKey?: string;
  href: string;
  icon: typeof LayoutDashboard;
  show: (ctx: { isAdmin: boolean; isSeller: boolean }) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    show: () => true,
  },
  {
    label: "Pedidos",
    href: "/orders",
    icon: ClipboardList,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    label: "Produtos",
    href: "/products",
    icon: Package,
    show: () => true,
  },
  {
    label: "Ofertas da loja",
    href: "/seller-products",
    icon: PackageCheck,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    label: "Lojas",
    href: "/sellers",
    icon: Store,
    show: ({ isAdmin, isSeller }) => isAdmin || isSeller,
  },
  {
    label: "Motoristas",
    href: "/drivers",
    icon: Truck,
    show: ({ isAdmin }) => isAdmin,
  },
  {
    label: "Usuários",
    href: "/users",
    icon: Users,
    show: ({ isAdmin }) => isAdmin,
  },
  {
    label: "Pagamentos",
    href: "/payments",
    icon: Receipt,
    show: ({ isAdmin }) => isAdmin,
  },
  {
    label: "Blog",
    labelKey: "nav.blog",
    href: "/blog-posts",
    icon: Newspaper,
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
  const { t } = useI18n();

  const items = NAV_ITEMS.filter((item) => item.show({ isAdmin, isSeller }));

  return (
    <nav aria-label="Navegação principal" className={className}>
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
            {item.labelKey ? t(item.labelKey) : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Abrir menu de navegação"
          className="-ml-2 size-11 md:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="left-0 top-0 flex h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 border-y-0 border-l-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none [&>button]:right-2 [&>button]:top-2 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:text-sidebar-foreground"
      >
        <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
        <DialogDescription className="sr-only">
          Escolha uma seção do painel para navegar.
        </DialogDescription>

        <div className="h-16 flex items-center px-5 pr-14 border-b border-sidebar-border">
          <SidebarBrand />
        </div>

        <SidebarNav
          className="flex-1 p-3 space-y-0.5 overflow-y-auto"
          onNavigate={() => setOpen(false)}
        />

        <div className="p-3 text-[11px] text-sidebar-foreground/50 border-t border-sidebar-border">
          PediObra v1 · painel interno
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <SidebarBrand />
      </div>

      <SidebarNav className="flex-1 p-3 space-y-0.5" />

      <div className="p-3 text-[11px] text-sidebar-foreground/50 border-t border-sidebar-border">
        PediObra v1 · painel interno
      </div>
    </aside>
  );
}
