"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type CTA = { label: string; href?: string; onClick?: () => void };

/**
 * Qayta ishlatiladigan bo'sh holat (empty state) kartasi (6-vazifa).
 * Lucide ikonka + sarlavha + tavsif + ixtiyoriy CTA. Theme token, dark mode.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  secondary,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  cta?: CTA;
  secondary?: CTA;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-page px-6 py-12 text-center font-sans">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon size={26} />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-soft">{description}</p>}
      {(cta || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {cta && <CtaButton cta={cta} primary />}
          {secondary && <CtaButton cta={secondary} />}
        </div>
      )}
    </div>
  );
}

function CtaButton({ cta, primary }: { cta: CTA; primary?: boolean }) {
  const cls = primary
    ? "inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
    : "inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-soft transition hover:text-ink";
  if (cta.href) {
    return (
      <Link href={cta.href} className={cls}>
        {cta.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={cta.onClick} className={cls}>
      {cta.label}
    </button>
  );
}
