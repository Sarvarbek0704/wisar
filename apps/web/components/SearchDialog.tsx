"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, CornerDownLeft } from "lucide-react";
import { search, type SearchResult } from "@/lib/api";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K bilan ochish
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Debounce qidiruv
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await search(q));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setResults([]);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-soft transition hover:bg-black/5 hover:text-ink"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Qidirish</span>
        <kbd className="hidden rounded bg-black/5 px-1.5 text-[11px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-page shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-soft" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Mavzu, bob, bo'lim qidiring..."
                className="h-14 flex-1 bg-transparent font-sans text-ink outline-none placeholder:text-soft"
              />
              <button onClick={close} aria-label="Yopish" className="text-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2 font-sans">
              {loading && (
                <p className="px-3 py-4 text-sm text-soft">Qidirilmoqda...</p>
              )}
              {!loading && q.trim().length >= 2 && results.length === 0 && (
                <p className="px-3 py-4 text-sm text-soft">Hech narsa topilmadi.</p>
              )}
              {results.map((r, i) => (
                <Link
                  key={i}
                  href={`/${r.topicSlug}/${r.sectionSlug}/${r.slug}`}
                  onClick={close}
                  className="block rounded-lg px-3 py-2.5 transition hover:bg-bg"
                >
                  <div className="text-[11px] uppercase tracking-wide text-soft">
                    {r.topicTitle} · {r.sectionTitle}
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    <span className="line-clamp-1">{r.title}</span>
                    <CornerDownLeft size={13} className="ml-auto flex-none text-soft" />
                  </div>
                </Link>
              ))}
              {q.trim().length < 2 && (
                <p className="px-3 py-4 text-sm text-soft">
                  Kamida 2 ta harf kiriting.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
