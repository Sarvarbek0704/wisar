"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, X } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { saveScroll, getScroll } from "@/lib/me-api";

const LS_KEY = (id: string) => `wisar-scroll-${id}`;

function maxScroll(): number {
  const el = document.documentElement;
  return Math.max(1, el.scrollHeight - el.clientHeight);
}

/**
 * O'qish pozitsiyasini eslab qoladi (5-vazifa).
 * Scroll % debounce bilan saqlanadi (login → DB, aks holda localStorage).
 * Qayta ochilganda "davom etish" tugmasi ko'rinadi (jarring auto-scroll yo'q).
 */
export function ReadingPosition({ articleId }: { articleId: string }) {
  const [resumePct, setResumePct] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saqlangan pozitsiyani yuklash
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let pct: number | null = null;
      if (isLoggedIn()) {
        pct = await getScroll(articleId)
          .then((r) => r.scrollPct)
          .catch(() => null);
      }
      if (pct === null && typeof window !== "undefined") {
        const raw = localStorage.getItem(LS_KEY(articleId));
        pct = raw ? Number(raw) : null;
      }
      if (!cancelled && pct !== null && pct > 0.05 && pct < 0.95) {
        setResumePct(pct);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // Scroll % ni debounce bilan saqlash
  useEffect(() => {
    function persist(pct: number) {
      if (typeof window !== "undefined") localStorage.setItem(LS_KEY(articleId), String(pct));
      if (isLoggedIn()) saveScroll(articleId, pct).catch(() => {});
    }
    function onScroll() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        persist(Math.min(1, window.scrollY / maxScroll()));
      }, 800);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [articleId]);

  function resume() {
    if (resumePct === null) return;
    window.scrollTo({ top: resumePct * maxScroll(), behavior: "smooth" });
    setResumePct(null);
  }

  if (resumePct === null) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 animate-fade-in font-sans">
      <div className="flex items-center gap-2 rounded-full border border-line bg-page px-3 py-2 shadow-card">
        <button
          onClick={resume}
          className="flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80"
        >
          <ArrowDown size={15} />
          Qaldagi joyingizdan davom etasizmi? ({Math.round(resumePct * 100)}%)
        </button>
        <button
          onClick={() => setResumePct(null)}
          className="text-soft hover:text-ink"
          aria-label="Yopish"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
