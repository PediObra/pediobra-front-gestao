"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { translations, type TranslationKey } from "./translations";

export type SupportedLanguage = "pt-BR" | "en" | "es";

export const DEFAULT_LANGUAGE: SupportedLanguage = "pt-BR";

export const LANGUAGE_OPTIONS: Array<{
  value: SupportedLanguage;
  label: string;
  flag: string;
}> = [
  { value: "pt-BR", label: "Português", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "pediobra-language",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getLanguageSnapshot() {
  return useLanguageStore.getState();
}

type TranslationParams = Record<string, string | number>;

export function translate(
  key: TranslationKey,
  params: TranslationParams = {},
  language: SupportedLanguage = getLanguageSnapshot().language,
) {
  const template =
    translations[language][key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;

  return template.replace(/\{(\w+)\}/g, (_match, token: string) =>
    String(params[token] ?? ""),
  );
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  return (key: TranslationKey, params?: TranslationParams) =>
    translate(key, params, language);
}
