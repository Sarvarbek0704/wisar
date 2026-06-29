"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, RotateCcw, Award } from "lucide-react";
import {
  getQuiz,
  submitQuiz,
  type QuizForTaking,
  type QuizResult,
} from "@/lib/engage-api";

export function Quiz({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<QuizForTaking | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuiz(quizId)
      .then((q) => {
        setQuiz(q);
        setAnswers(new Array(q.questions.length).fill(-1));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [quizId]);

  function choose(qi: number, oi: number) {
    if (result) return;
    setAnswers((a) => {
      const n = [...a];
      n[qi] = oi;
      return n;
    });
  }
  async function submit() {
    setResult(await submitQuiz(quizId, answers));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() {
    setResult(null);
    setAnswers(new Array(quiz?.questions.length || 0).fill(-1));
  }

  if (loading) return <p className="font-sans text-soft">Yuklanmoqda...</p>;
  if (!quiz) return <p className="font-sans text-soft">Test topilmadi.</p>;

  const answeredAll = answers.length > 0 && answers.every((a) => a >= 0);
  const pct = result ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <div className="font-sans">
      <h1 className="mb-4 text-2xl font-bold text-ink">{quiz.title}</h1>

      {result && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-page p-5">
          <span
            className={
              "grid h-14 w-14 place-items-center rounded-full text-white " +
              (pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500")
            }
          >
            <Award size={26} />
          </span>
          <div>
            <div className="text-2xl font-bold text-ink">
              {result.score} / {result.total}
            </div>
            <div className="text-sm text-soft">
              {pct}% to'g'ri{" "}
              {pct >= 70 ? "— ajoyib!" : pct >= 40 ? "— yaxshi" : "— qayta o'qing"}
            </div>
          </div>
        </div>
      )}

      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => {
          const r = result?.results[qi];
          return (
            <li key={q.id} className="rounded-xl border border-line bg-page p-5">
              <div className="mb-3 font-semibold text-ink">
                {qi + 1}. {q.text}
              </div>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  let cls = "border-line text-ink hover:border-accent/40";
                  if (result && r) {
                    if (oi === r.correctIndex)
                      cls = "border-green-500 bg-green-500/10 text-ink";
                    else if (selected && !r.correct)
                      cls = "border-red-500 bg-red-500/10 text-ink";
                    else cls = "border-line text-soft";
                  } else if (selected) {
                    cls = "border-accent bg-accent/10 text-ink";
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => choose(qi, oi)}
                      disabled={!!result}
                      className={
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition " +
                        cls
                      }
                    >
                      <span
                        className={
                          "grid h-5 w-5 flex-none place-items-center rounded-full border text-[11px] " +
                          (selected ? "border-current" : "border-line")
                        }
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {result && r && oi === r.correctIndex && (
                        <CircleCheck size={16} className="flex-none text-green-600" />
                      )}
                      {result && r && selected && !r.correct && (
                        <CircleX size={16} className="flex-none text-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              {result && r?.explanation && (
                <p className="mt-3 rounded-lg bg-bg p-3 text-sm text-soft">
                  <span className="font-semibold text-ink">Izoh: </span>
                  {r.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {!result ? (
          <button
            onClick={submit}
            disabled={!answeredAll}
            className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Yakunlash
          </button>
        ) : (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 font-semibold text-soft transition hover:text-accent"
          >
            <RotateCcw size={16} />
            Qayta yechish
          </button>
        )}
      </div>
    </div>
  );
}
