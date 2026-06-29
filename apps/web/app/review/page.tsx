"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Check, RotateCcw, X } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import {
  getReviewQueue,
  gradeReview,
  type ReviewQueueItem,
} from "@/lib/review-api";
import { EmptyState } from "@/components/EmptyState";

export default function ReviewPage() {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
    getReviewQueue()
      .then((q) => setQueue(q))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!mounted) return null;

  if (!isLoggedIn()) {
    return (
      <div className="mx-auto max-w-page px-4 py-16 text-center font-sans">
        <p className="text-soft">
          Takrorlash navbatini ko'rish uchun{" "}
          <Link href="/login?next=/review" className="text-accent">
            kiring
          </Link>
          .
        </p>
      </div>
    );
  }

  const item = queue[idx];
  const total = queue.length;

  function advance() {
    setRevealed(false);
    setPicked(null);
    setDone((d) => d + 1);
    setIdx((i) => i + 1);
  }

  async function grade(quality: number) {
    if (!item) return;
    gradeReview(item.kind, item.refId, quality).catch(() => {});
    advance();
  }

  return (
    <div className="mx-auto max-w-page px-4 py-10 font-sans sm:px-6">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-ink">
        <Brain size={22} className="text-accent" />
        Takrorlash
      </h1>
      <p className="mb-6 text-sm text-soft">
        Karta va xato qilgan savollar bitta navbatda (SM-2 intervalli takrorlash).
      </p>

      {loading && <p className="text-soft">Yuklanmoqda...</p>}

      {!loading && total === 0 && (
        <EmptyState
          icon={Check}
          title="Bugun takrorlash kerak bo'lgan narsa yo'q 🎉"
          description="Flashkartalarni o'rganing yoki testlarni yeching — xato qilgan savollar ertaga shu yerda paydo bo'ladi."
          cta={{ label: "Flashkartalar", href: "/flashcards" }}
          secondary={{ label: "Kurslar", href: "/kurslar" }}
        />
      )}

      {!loading && total > 0 && idx >= total && (
        <EmptyState
          icon={Check}
          title={`Tugadi! ${done} ta element takrorlandi`}
          description="Ajoyib ish! Ertaga yana yangi navbat bo'ladi."
          cta={{ label: "Boshqa o'rganish", href: "/me" }}
        />
      )}

      {!loading && item && idx < total && (
        <div>
          {/* Progress */}
          <div className="mb-4 flex items-center justify-between text-xs text-soft">
            <span>
              {idx + 1} / {total}
            </span>
            <span className="rounded-full bg-bg px-2 py-0.5">
              {item.kind === "card" ? "So'z" : "Savol"} · {item.source}
            </span>
          </div>
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(idx / total) * 100}%` }}
            />
          </div>

          {item.kind === "card" ? (
            <CardReview item={item} revealed={revealed} onReveal={() => setRevealed(true)} onGrade={grade} />
          ) : (
            <QuestionReview
              item={item}
              picked={picked}
              onPick={(i) => {
                if (picked === null) {
                  setPicked(i);
                  setRevealed(true);
                }
              }}
              revealed={revealed}
              onNext={() => grade(picked === item.correctIndex ? 5 : 2)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CardReview({
  item,
  revealed,
  onReveal,
  onGrade,
}: {
  item: Extract<ReviewQueueItem, { kind: "card" }>;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (q: number) => void;
}) {
  return (
    <div>
      <button
        onClick={onReveal}
        className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-2xl border border-line bg-page p-8 text-center shadow-card transition hover:border-accent/40"
      >
        <div className="text-2xl font-bold text-ink">{item.front}</div>
        {item.ipa && <div className="mt-1 text-sm text-soft">/{item.ipa}/</div>}
        {revealed && (
          <div className="mt-5 border-t border-line pt-5">
            <div className="text-xl font-semibold text-accent">{item.back}</div>
            {item.example && <div className="mt-2 text-sm italic text-soft">{item.example}</div>}
          </div>
        )}
        {!revealed && <div className="mt-4 text-xs text-soft">Javobni ko'rish uchun bosing</div>}
      </button>

      {revealed && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <GradeBtn label="Bilmadim" color="rose" onClick={() => onGrade(1)} />
          <GradeBtn label="Qiyin" color="amber" onClick={() => onGrade(3)} />
          <GradeBtn label="Bilardim" color="emerald" onClick={() => onGrade(5)} />
        </div>
      )}
    </div>
  );
}

function QuestionReview({
  item,
  picked,
  onPick,
  revealed,
  onNext,
}: {
  item: Extract<ReviewQueueItem, { kind: "question" }>;
  picked: number | null;
  onPick: (i: number) => void;
  revealed: boolean;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="mb-4 rounded-2xl border border-line bg-page p-6 shadow-card">
        <p className="text-lg font-semibold text-ink">{item.text}</p>
      </div>
      <div className="space-y-2">
        {item.options.map((opt, i) => {
          const isCorrect = i === item.correctIndex;
          const isPicked = i === picked;
          let cls = "border-line bg-page text-ink hover:border-accent/40";
          if (revealed && isCorrect) cls = "border-success bg-success/10 text-ink";
          else if (revealed && isPicked && !isCorrect) cls = "border-danger bg-danger/10 text-ink";
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              disabled={revealed}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${cls}`}
            >
              <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-current text-xs font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {revealed && isCorrect && <Check size={16} className="text-success" />}
              {revealed && isPicked && !isCorrect && <X size={16} className="text-danger" />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-4">
          {item.explanation && (
            <p className="mb-3 rounded-xl bg-bg p-3 text-sm text-soft">{item.explanation}</p>
          )}
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-white hover:opacity-90"
          >
            <RotateCcw size={16} /> Keyingisi
          </button>
        </div>
      )}
    </div>
  );
}

function GradeBtn({
  label,
  color,
  onClick,
}: {
  label: string;
  color: "rose" | "amber" | "emerald";
  onClick: () => void;
}) {
  const map = {
    rose: "border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10",
    amber: "border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10",
    emerald: "border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${map[color]}`}
    >
      {label}
    </button>
  );
}
