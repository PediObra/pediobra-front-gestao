"use client";

import Link from "next/link";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { initials, roleLabel } from "@/lib/formatters";
import {
  LANGUAGE_OPTIONS,
  useTranslation,
  useLanguageStore,
} from "@/lib/i18n/language-store";
import { MobileSidebar, SidebarBrand } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const t = useTranslation();
  const { user, logout } = useAuth();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const selectedLanguage = LANGUAGE_OPTIONS.find(
    (option) => option.value === language,
  );

  const rolesLabel =
    user?.roles.map((r) => roleLabel(r)).join(" · ") ?? "";

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/95 backdrop-blur flex items-center gap-4 px-4 lg:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileSidebar />
        <SidebarBrand />
      </div>

      <div className="flex-1" />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("app.languageA11y", {
            language: selectedLanguage?.label ?? "Português",
          })}
        >
          {selectedLanguage?.label ?? "Português"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{t("app.language")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(value) =>
              setLanguage(value as typeof LANGUAGE_OPTIONS[number]["value"])
            }
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="cursor-pointer"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
              {t("app.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logout()}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            {t("app.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
