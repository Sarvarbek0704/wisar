"use client";

import { Languages } from "lucide-react";
import { useI18n, LOCALES } from "@/lib/i18n";

/** Til tanlash (38-vazifa). */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-line p-0.5" title="Til">
      <Languages size={13} className="ml-1 text-soft" />
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={`rounded-md px-1.5 py-0.5 text-xs font-medium transition ${
            locale === l.code ? "bg-accent text-white" : "text-soft hover:text-ink"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
