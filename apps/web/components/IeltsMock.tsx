"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Play, Square, RotateCcw, Clock, AlertTriangle, FileText } from "lucide-react";
import {
  genReadingTest,
  genListeningTest,
  type ReadingTest,
  type ListeningTest,
  type PracticeQuestion,
} from "@/lib/ielts-api";
import { saveAttempt, estimateBand, isCorrect } from "@/lib/ielts-progress";

type Mode = "reading" | "listening";
type AnyTest = ReadingTest | ListeningTest;

function bandColor(b: number): string {
  if (b >= 8.5) return "text-emerald-600";
  if (b >= 7) return "text-sky-600";
  if (b >= 5.5) return "text-amber-600";
  return "text-rose-600";
}

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function IeltsMock({ mode }: { mode: Mode }) {
  const [test, setTest] = useState<AnyTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const passage = test ? ("passage" in test ? test.passage : test.script) : "";
  const isListening = mode === "listening";
  const DURATION = isListening ? 1200 : 3600;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  async function newTest() {
    setErr("");
    setTest(null);
    setAnswers({});
    setSubmitted(false);
    setRemaining(0);
    setLoading(true);
    if (timer.current) clearInterval(timer.current);
    try {
      const t = isListening ? await genListeningTest() : await genReadingTest();
      setTest(t);
      setRemaining(DURATION);
      timer.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(timer.current!);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function speak() {
    if (!test || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(passage);
    u.lang = "en-GB";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  // Vaqt tugaganda avtomatik topshirish
  useEffect(() => {
    if (remaining === 0 && test && !submitted) {
      submit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function submit() {
    if (!test) return;
    if (timer.current) clearInterval(timer.current);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    setSubmitted(true);
    const total = test.questions.length;
    const correct = test.questions.reduce(
      (n, q, i) => n + (isCorrect(answers[i] ?? "", q.answer) ? 1 : 0),
      0,
    );
    const band = estimateBand(correct, total);
    saveAttempt({ skill: mode, band, date: new Date().toISOString(), detail: `${correct}/${total}` });
  }

  const total = test?.questions.length ?? 0;
  const correct = test
    ? test.questions.reduce((n, q, i) => n + (isCorrect(answers[i] ?? "", q.answer) ? 1 : 0), 0)
    : 0;
  const band = estimateBand(correct, total);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={newTest}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {loading ? "Yaratilmoqda..." : test ? "Yangi test" : `${isListening ? "Listening" : "Reading"} test yarat`}
        </button>
        {test && !submitted && (
          <span className={`inline-flex items-center gap-1.5 text-sm font-mono ${remaining < 300 ? "text-rose-600 font-bold" : "text-soft"}`}>
            <Clock size={14} /> {mmss(remaining)}
          </span>
        )}
      </div>

      {err && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      {isListening && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle size={13} className="inline mr-1 shrink-0" /> Bu — brauzer sun'iy ovozi (TTS) bilan mashq. Real imtihon audiosi uchun <b>Cambridge IELTS 15-19</b>.
        </p>
      )}

      {test && (
        <div className="space-y-6">
          {/* Passage / Listening player */}
          {isListening ? (
            <div className="rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
              <button
                onClick={speak}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-medium text-white hover:opacity-90"
              >
                {speaking ? <Square size={16} /> : <Play size={16} />}
                {speaking ? "To'xtatish" : "Eshitish"}
              </button>
              <p className="mt-2 text-xs text-soft">Skriptni eshiting, savollarga javob bering.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-sans text-lg font-bold text-ink">{test.title}</h3>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{passage}</div>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {test.questions.map((q, i) => (
              <QuestionItem
                key={i}
                q={q}
                idx={i}
                value={answers[i] ?? ""}
                onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))}
                submitted={submitted}
              />
            ))}
          </div>

          {!submitted ? (
            <button
              onClick={submit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:opacity-90"
            >
              Topshirish va baholash
            </button>
          ) : (
            <div className="animate-fade-in rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
              <div className={`text-5xl font-extrabold ${bandColor(band)}`}>{band}</div>
              <p className="mt-1 text-sm text-ink">
                {correct} / {total} to'g'ri · <span className="text-soft">taxminiy band</span>
              </p>
              {isListening && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-soft"><FileText size={13} className="inline mr-1" />Skriptni ko'rsatish</summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-black/[0.02] p-3 text-sm text-ink">
                    {passage}
                  </p>
                </details>
              )}
              <button
                onClick={newTest}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-3 py-2 text-sm text-soft hover:bg-black/10"
              >
                <RotateCcw size={14} /> Yana bir test
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionItem({
  q,
  idx,
  value,
  onChange,
  submitted,
}: {
  q: PracticeQuestion;
  idx: number;
  value: string;
  onChange: (v: string) => void;
  submitted: boolean;
}) {
  const ok = submitted && isCorrect(value, q.answer);
  const wrong = submitted && !ok;
  const choices =
    q.type === "TFNG" ? ["TRUE", "FALSE", "NOT GIVEN"] : q.options && q.options.length ? q.options : null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        submitted ? (ok ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40") : "border-black/10 bg-white"
      }`}
    >
      <p className="mb-2 text-sm font-medium text-ink">
        <span className="text-soft">{idx + 1}.</span> {q.question}
      </p>

      {choices ? (
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => (
            <button
              key={c}
              disabled={submitted}
              onClick={() => onChange(c)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                value === c ? "bg-accent text-white" : "bg-black/5 text-ink hover:bg-black/10"
              } disabled:cursor-default`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={value}
          disabled={submitted}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Javob (1-3 so'z)..."
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
        />
      )}

      {submitted && (
        <div className="mt-2 text-xs">
          {wrong && (
            <p className="text-rose-600">
              Sizning javob: <b>{value || "—"}</b>
            </p>
          )}
          <p className="text-emerald-700">
            To'g'ri javob: <b>{q.answer}</b>
          </p>
          <p className="mt-0.5 text-soft">{q.explanation}</p>
        </div>
      )}
    </div>
  );
}
