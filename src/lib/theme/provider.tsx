"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  parseThemePreference,
  PREFERENCE_MAX_AGE_SECONDS,
  THEME_PREFERENCE_KEY,
  type ThemePreference,
} from "@/lib/preferences";

export type { ThemePreference } from "@/lib/preferences";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(): ThemePreference | null {
  if (typeof window === "undefined") return null;

  try {
    return parseThemePreference(window.localStorage.getItem(THEME_PREFERENCE_KEY));
  } catch {
    return null;
  }
}

function getSystemTheme(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function resolveTheme(theme: ThemePreference): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return resolveTheme(theme);

  const resolvedTheme = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
  document.cookie = `${THEME_PREFERENCE_KEY}=${theme};path=/;max-age=${PREFERENCE_MAX_AGE_SECONDS};samesite=lax`;

  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, theme);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }

  return resolvedTheme;
}

export function ThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: React.ReactNode;
  initialTheme?: ThemePreference;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    initialTheme === "system" ? "light" : initialTheme,
  );
  const hasSyncedStoredTheme = useRef(false);

  useEffect(() => {
    if (!hasSyncedStoredTheme.current) {
      hasSyncedStoredTheme.current = true;

      const storedTheme = getStoredTheme();
      if (storedTheme && storedTheme !== theme) {
        queueMicrotask(() => {
          setThemeState(storedTheme);
          setResolvedTheme(resolveTheme(storedTheme));
        });

        return;
      }
    }

    setResolvedTheme(applyTheme(theme));

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(applyTheme("system"));

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    setResolvedTheme(resolveTheme(nextTheme));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return value;
}
