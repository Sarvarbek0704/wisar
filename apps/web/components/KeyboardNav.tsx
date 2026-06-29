"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Maqolalar orasida klaviatura bilan o'tish (chap/o'ng strelka)
export function KeyboardNav({
  prev,
  next,
}: {
  prev?: string | null;
  next?: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /input|textarea|select/i.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && prev) router.push(prev);
      if (e.key === "ArrowRight" && next) router.push(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  return null;
}
