"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, ChevronRight, Eye, Trophy, Frown, HelpCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import {
  getDeckCards,
  reviewCard,
  type FlashcardWithReview,
  type DeckWithCards,
} from "@/lib/flashcards-api";
import { isLoggedIn } from "@/lib/auth";

export default function FlashcardStudyPage() {
  const { level } = useParams<{ level: string }>();
  const router = useRouter();
  const [data, setData] = useState<DeckWithCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // O'qish holati
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    getDeckCards(level)
      .then(setData)
      .catch(() => setErr("Dasta yuklanmadi"))
      .finally(() => setLoading(false));
  }, [level]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans">
        <p className="text-soft">Yuklanmoqda...</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <p className="text-rose-600">{err || "Topilmadi"}</p>
        <Link href="/flashcards" className="mt-4 inline-block text-accent hover:underline">← Orqaga</Link>
      </div>
    );
  }

  const cards = data.cards;
  const total = cards.length;

  if (done || total === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center font-sans">
        <Trophy size={52} className="mb-4 mx-auto text-amber-500" />
        <h1 className="mb-2 text-2xl font-bold text-ink">Seans tugadi!</h1>
        <p className="mb-6 text-soft">{sessionCount} ta karta ko'rib chiqildi.</p>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => { setCardIndex(0); setFlipped(false); setDone(false); setSessionCount(0); }}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Yana boshidan
          </button>
          <Link
            href="/flashcards"
            className="rounded-xl border border-line py-3 text-center text-ink hover:bg-bg"
          >
            Dastalarga qaytish
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[cardIndex];

  async function handleQuality(q: 0 | 1 | 2 | 3 | 4 | 5) {
    if (isLoggedIn()) {
      reviewCard(card.id, q).catch(() => {});
    }
    setSessionCount((n) => n + 1);
    const next = cardIndex + 1;
    if (next >= total) {
      setDone(true);
    } else {
      setCardIndex(next);
      setFlipped(false);
    }
  }

  const progress = Math.round((cardIndex / total) * 100);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 font-sans">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/flashcards" className="inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent">
          <ArrowLeft size={15} /> {data.title}
        </Link>
        <span className="text-sm text-soft">{cardIndex + 1} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Karta */}
      <div
        className="mb-6 cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className={`relative min-h-48 overflow-hidden rounded-3xl border-2 p-8 text-center transition-all duration-300 ${
            flipped
              ? "border-accent/30 bg-accent/5"
              : "border-line bg-page shadow-card"
          }`}
        >
          {!flipped ? (
            <>
              <p className="text-2xl font-bold text-ink">{card.front}</p>
              {card.ipa && (
                <p className="mt-2 font-mono text-sm text-soft">{card.ipa}</p>
              )}
              {card.pos && (
                <span className="mt-3 inline-block rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-soft">
                  {card.pos}
                </span>
              )}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-soft">
                <Eye size={13} /> Ko'rish uchun bosing
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs uppercase tracking-wide text-soft">Tarjima</p>
              <p className="text-xl font-semibold text-ink">{card.back}</p>
              {card.example && (
                <p className="mt-4 text-sm italic text-soft">"{card.example}"</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* SM-2 tugmalar */}
      {flipped ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuality(1)}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            <Frown size={22} className="mx-auto mb-1" />
            Bilmadim
          </button>
          <button
            onClick={() => handleQuality(3)}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            <HelpCircle size={22} className="mx-auto mb-1" />
            Qiyinroq edi
          </button>
          <button
            onClick={() => handleQuality(5)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 size={22} className="mx-auto mb-1" />
            Bildim
          </button>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white hover:opacity-90"
        >
          Tarjimani ko'rish <ChevronRight className="ml-1 inline" size={16} />
        </button>
      )}

      {!isLoggedIn() && (
        <p className="mt-4 text-center text-xs text-soft">
          <Link href="/login" className="text-accent">Kiring</Link> — progress serverda saqlanadi
        </p>
      )}
    </div>
  );
}
