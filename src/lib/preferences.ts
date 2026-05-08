export type Locale = "pt-BR" | "en-US";
export type ThemePreference = "light" | "dark" | "system";

export const LOCALE_PREFERENCE_KEY = "pediobra-locale";
export const THEME_PREFERENCE_KEY = "pediobra-theme";
export const PREFERENCE_MAX_AGE_SECONDS = 31_536_000;

export function parseLocale(value: string | null | undefined): Locale | null {
  if (value === "pt-BR" || value === "en-US") return value;
  return null;
}

export function getInitialLocale(value: string | null | undefined): Locale {
  return parseLocale(value) ?? "pt-BR";
}

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return null;
}

export function getInitialThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return parseThemePreference(value) ?? "system";
}
