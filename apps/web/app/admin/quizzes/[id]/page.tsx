"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  adminQuizForEdit,
  adminCreateQuestion,
  adminDeleteQuestion,
  type AdminQuiz,
} from "@/lib/engage-api";

export default function QuizEditor() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<AdminQuiz | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setQuiz(await adminQuizForEdit(quizId).catch(() => null));
  }, [quizId]);
  useEffect(() => {
    load();
  }, [load]);

  async function addQuestion() {
    setErr("");
    const filled = options
      .map((o, i) => ({ o: o.trim(), i }))
      .filter((x) => x.o);
    if (!text.trim() || filled.length < 2) {
      setErr("Savol matni va kamida 2 ta variant kerak.");
      return;
    }
    const newCorrect = filled.findIndex((x) => x.i === correct);
    if (newCorrect < 0) {
      setErr("To'g'ri deb belgilangan variant bo'sh.");
      return;
    }
    setSaving(true);
    try {
      await adminCreateQuestion({
        quizId,
        text: text.trim(),
        options: filled.map((x) => x.o),
        correctIndex: newCorrect,
        explanation: explanation.trim() || undefined,
        order: quiz?.questions.length ?? 0,
      });
      setText("");
      setOptions(["", "", "", ""]);
      setCorrect(0);
      setExplanation("");
      await load();
    } finally {
      setSaving(false);
    }
  }
  async function removeQuestion(id: string) {
    await adminDeleteQuestion(id);
    load();
  }

  if (!quiz) return <p className="font-sans text-soft">Yuklanmoqda...</p>;

  return (
    <div className="font-sans">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={15} />
        Orqaga
      </button>
      <h1 className="mb-6 text-2xl font-bold text-ink">
        Test: {quiz.title}
      </h1>

      {/* Mavjud savollar */}
      <ol className="mb-8 space-y-3">
        {quiz.questions.map((q, qi) => (
          <li
            key={q.id}
            className="rounded-xl border border-line bg-page p-4 text-sm"
          >
            <div className="flex items-start gap-2">
              <span className="font-semibold text-ink">
                {qi + 1}. {q.text}
              </span>
              <button
                onClick={() => removeQuestion(q.id)}
                className="ml-auto flex-none text-soft hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {q.options.map((o, oi) => (
                <li
                  key={oi}
                  className={
                    oi === q.correctIndex
                      ? "font-medium text-green-600"
                      : "text-soft"
                  }
                >
                  {String.fromCharCode(65 + oi)}. {o}
                  {oi === q.correctIndex && " (to'g'ri)"}
                </li>
              ))}
            </ul>
            {q.explanation && (
              <p className="mt-1 text-xs text-soft">Izoh: {q.explanation}</p>
            )}
          </li>
        ))}
        {quiz.questions.length === 0 && (
          <li className="text-sm text-soft">Hozircha savol yo'q.</li>
        )}
      </ol>

      {/* Yangi savol */}
      <div className="rounded-2xl border border-line bg-page p-5">
        <h2 className="mb-3 font-bold text-ink">Yangi savol</h2>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Savol matni"
          className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                title="To'g'ri javob"
              />
              <input
                value={o}
                onChange={(e) =>
                  setOptions((arr) =>
                    arr.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                placeholder={`Variant ${String.fromCharCode(65 + i)}`}
                className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-soft">
          To'g'ri javobni radio bilan belgilang.
        </p>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Izoh (ixtiyoriy) — javob nega to'g'ri"
          className="mt-3 h-20 w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
        <button
          onClick={addQuestion}
          disabled={saving}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Plus size={15} />
          Savol qo'shish
        </button>
      </div>
    </div>
  );
}
