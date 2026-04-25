"use client";

import Link from "next/link";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { initials, ROLE_LABEL } from "@/lib/formatters";
import { MobileSidebar, SidebarBrand } from "@/components/layout/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PreferencesControls } from "@/components/preferences/preferences-controls";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { user, logout } = useAuth();

  const rolesLabel =
    user?.roles.map((r) => ROLE_LABEL[r] ?? r).join(" · ") ?? "";

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/95 backdrop-blur flex items-center gap-4 px-4 lg:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileSidebar />
        <SidebarBrand />
      </div>

      <div className="flex-1" />

      <PreferencesControls />

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-[oklch(0.3_0.1_60)] font-semibold">
              {user ? initials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {rolesLabel}
            </span>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground font-normal truncate">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <UserIcon className="size-4" />
              Meu perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logout()}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
