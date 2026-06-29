"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Flame, Layers } from "lucide-react";
import { getDecks, getStats, type FlashcardDeck, type FlashcardStats } from "@/lib/flashcards-api";
import { isLoggedIn } from "@/lib/auth";

const LEVEL_COLORS: Record<string, string> = {
  a1: "#4f46e5",
  a2: "#0891b2",
  b1: "#059669",
  b2: "#d97706",
  c1: "#dc2626",
  c2: "#7c3aed",
};

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    getDecks()
      .then((d) => {
        setDecks(d);
        if (isLoggedIn()) {
          getStats().then(setStats).catch(() => {});
        }
      })
      .catch(() => setErr("Flashcard dastalari yuklanmadi"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 font-sans">
      <div className="mb-8">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-ink">
          <Layers className="text-accent" size={26} />
          Flashcard lug'at
        </h1>
        <p className="text-soft">
          Ingliz tili so'zlarini SM-2 spaced repetition usuli bilan o'rganing.
        </p>
      </div>

      {/* Umumiy statistika (login bo'lsa) */}
      {stats && (
        <div className="mb-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line bg-page p-4 text-center">
            <div className="text-2xl font-bold text-ink">{stats.total}</div>
            <div className="text-xs text-soft">Jami kartalar</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{stats.due}</div>
            <div className="text-xs text-amber-600">Bugun takrorlanadi</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{stats.mastered}</div>
            <div className="text-xs text-emerald-600">O'zlashtirilgan</div>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-bg" />
          ))}
        </div>
      )}

      {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      <div className="space-y-3">
        {decks.map((deck) => {
          const color = LEVEL_COLORS[deck.slug] || "#3b5bdb";
          const deckStats = stats?.byDeck.find((d) => d.deckSlug === deck.slug);
          return (
            <Link
              key={deck.id}
              href={`/flashcards/${deck.slug}`}
              className="flex items-center gap-4 rounded-2xl border border-line bg-page p-5 transition hover:border-accent/30 hover:shadow-sm"
            >
              <div
                className="flex h-12 w-12 flex-none items-center justify-center rounded-xl text-sm font-extrabold text-white"
                style={{ background: color }}
              >
                {deck.level.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink">{deck.title}</div>
                <div className="text-sm text-soft">{deck._count.cards} ta karta</div>
              </div>
              {deckStats && (
                <div className="flex flex-col items-end gap-1 text-xs">
                  {deckStats.due > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                      {deckStats.due} takrorlash
                    </span>
                  )}
                  {deckStats.mastered > 0 && (
                    <span className="text-emerald-600">{deckStats.mastered} o'zlashtirilgan</span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {!isLoggedIn() && !loading && decks.length > 0 && (
        <p className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-soft">
          <Link href="/login" className="font-medium text-accent">
            Kiring
          </Link>{" "}
          — progress saqlanadi va SM-2 takrorlash rejimi ishlaydi.
        </p>
      )}
    </div>
  );
}
