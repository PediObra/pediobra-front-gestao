"use client";

import { useRouter } from "next/navigation";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Locale } from "@/lib/i18n";
import { useTheme, type ThemePreference } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEMES: ThemePreference[] = ["system", "light", "dark"];
const LOCALES: Locale[] = ["pt-BR", "en-US"];

export function PreferencesControls({
  className,
  buttonClassName,
  refreshOnLocaleChange = false,
}: {
  className?: string;
  buttonClassName?: string;
  refreshOnLocaleChange?: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const ThemeIcon = THEME_ICONS[theme];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("theme.label")}
            className={cn("size-9", buttonClassName)}
          >
            <ThemeIcon className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {THEMES.map((themeOption) => {
            const Icon = THEME_ICONS[themeOption];
            return (
              <DropdownMenuItem
                key={themeOption}
                onSelect={() => setTheme(themeOption)}
                className="cursor-pointer"
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(`theme.${themeOption}`)}
                {theme === themeOption && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t("common.active")}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("locale.label")}
            className={cn("size-9", buttonClassName)}
          >
            <Languages className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("locale.label")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LOCALES.map((localeOption) => (
            <DropdownMenuItem
              key={localeOption}
              onSelect={() => {
                setLocale(localeOption);
                if (refreshOnLocaleChange) {
                  router.refresh();
                }
              }}
              className="cursor-pointer"
            >
              {t(`locale.${localeOption}`)}
              {locale === localeOption && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {t("common.active")}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
