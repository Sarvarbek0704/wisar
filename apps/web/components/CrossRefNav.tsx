"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type SectionNav = { slug: string; articles: string[] };

/**
 * (N.N) cross-reference havolalarini ishlaydigan qiladi (26-vazifa).
 * Event delegation orqali `.cross-ref` bosilganda topic ichidagi
 * N-bo'lim / N-bobga (order bo'yicha) navigatsiya qiladi.
 */
export function CrossRefNav({ topic, sections }: { topic: string; sections: SectionNav[] }) {
  const router = useRouter();

  useEffect(() => {
    function navigate(el: HTMLElement) {
      const ch = Number(el.dataset.ch);
      const art = Number(el.dataset.art);
      if (!ch || !art) return;
      const section = sections[ch - 1];
      if (!section) return;
      const articleSlug = section.articles[art - 1];
      if (!articleSlug) return;
      router.push(`/${topic}/${section.slug}/${articleSlug}`);
    }

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest?.(".cross-ref") as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      navigate(el);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const el = (e.target as HTMLElement)?.closest?.(".cross-ref") as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      navigate(el);
    }

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [topic, sections, router]);

  return null;
}
