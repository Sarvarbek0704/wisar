"use client";

import { createContext, useContext, useEffect, useState } from "react";
import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";

export type Locale = "uz" | "ru" | "en";

const MESSAGES: Record<Locale, Record<string, string>> = {
  uz: uz as Record<string, string>,
  ru: ru as Record<string, string>,
  en: en as Record<string, string>,
};

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "uz", label: "O'z" },
  { code: "ru", label: "Рус" },
  { code: "en", label: "Eng" },
];

const STORAGE_KEY = "wisar-locale";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue>({
  locale: "uz",
  setLocale: () => {},
  t: (k) => (uz as Record<string, string>)[k] ?? k,
});

/** Yengil i18n (38-vazifa) — kontekst + t(). Tanlov localStorage'da. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("uz");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && MESSAGES[saved]) setLocaleState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }

  function t(key: string): string {
    return MESSAGES[locale][key] ?? MESSAGES.uz[key] ?? key;
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
