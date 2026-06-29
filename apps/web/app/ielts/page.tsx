"use client";

"use client";

import { useState, useRef } from "react";
import {
  GraduationCap,
  PenLine,
  Mic,
  MicOff,
  BookOpen,
  Headphones,
  BarChart3,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  scoreWriting,
  scoreSpeaking,
  genWritingPrompt,
  genSpeakingPrompt,
  type WritingScore,
  type SpeakingScore,
  type Criterion,
  type Correction,
} from "@/lib/ielts-api";
import { saveAttempt } from "@/lib/ielts-progress";
import { IeltsMock } from "@/components/IeltsMock";
import { IeltsProgress } from "@/components/IeltsProgress";

type Tab = "writing" | "speaking" | "reading" | "listening" | "progress";

const TABS: { key: Tab; label: string; icon: typeof PenLine }[] = [
  { key: "writing", label: "Writing", icon: PenLine },
  { key: "speaking", label: "Speaking", icon: Mic },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "progress", label: "Natijalar", icon: BarChart3 },
];

function bandColor(b: number): string {
  if (b >= 8.5) return "text-emerald-600";
  if (b >= 7) return "text-sky-600";
  if (b >= 5.5) return "text-amber-600";
  return "text-rose-600";
}
function bandBg(b: number): string {
  if (b >= 8.5) return "bg-emerald-500";
  if (b >= 7) return "bg-sky-500";
  if (b >= 5.5) return "bg-amber-500";
  return "bg-rose-500";
}

function CriteriaBars({ items }: { items: Criterion[] }) {
  return (
    <div className="space-y-3">
      {items.map((c, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">{c.name}</span>
            <span className={`font-bold ${bandColor(c.band)}`}>{c.band}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-black/5">
            <div
              className={`h-1.5 rounded-full ${bandBg(c.band)}`}
              style={{ width: `${(c.band / 9) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-soft">{c.comment}</p>
        </div>
      ))}
    </div>
  );
}

function CorrectionsList({ items }: { items: Correction[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      {items.map((c, i) => (
        <div key={i} className="rounded-lg border border-black/5 bg-black/[0.02] p-3 text-sm">
          <p className="text-rose-600 line-through decoration-rose-300">{c.original}</p>
          <p className="font-medium text-emerald-700">→ {c.better}</p>
          <p className="mt-0.5 text-xs text-soft">{c.why}</p>
        </div>
      ))}
    </div>
  );
}

function Report({ s }: { s: WritingScore | SpeakingScore }) {
  return (
    <div className="mt-6 animate-fade-in space-y-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-4">
        <div className={`text-5xl font-extrabold ${bandColor(s.overallBand)}`}>{s.overallBand}</div>
        <div>
          <p className="text-xs uppercase tracking-wide text-soft">Umumiy band</p>
          <p className="text-sm text-ink">
            {s.overallBand >= 8.5
              ? "Native-daraja (band 9 yaqin)"
              : s.overallBand >= 7
                ? "Kuchli — yuqori band"
                : s.overallBand >= 5.5
                  ? "O'rta — yaxshilash kerak"
                  : "Asoslar ustida ishla"}
          </p>
          {"wordCount" in s && <p className="text-xs text-soft">{s.wordCount} so'z</p>}
        </div>
      </div>

      <CriteriaBars items={s.criteria} />

      {s.strengths?.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-emerald-700">Kuchli tomonlar</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {s.strengths.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {s.improvements?.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-amber-700">Yaxshilash kerak</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {s.improvements.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {s.corrections?.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Tuzatishlar</h3>
          <CorrectionsList items={s.corrections} />
        </div>
      )}

      {s.modelAnswer && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-sky-700">Band-9 namuna</h3>
          <p className="whitespace-pre-wrap rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-sm leading-relaxed text-ink">
            {s.modelAnswer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function IeltsCoachPage() {
  const [tab, setTab] = useState<Tab>("writing");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 font-sans text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={15} /> Bosh sahifa
      </Link>

      <header className="mb-6 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Sparkles size={13} /> AI baholaydi — IELTS imtihonchisi kabi
        </div>
        <h1 className="flex items-center justify-center gap-2 font-sans text-3xl font-extrabold tracking-tight text-ink">
          <GraduationCap className="text-accent" /> AI IELTS Coach
        </h1>
        <p className="mt-2 text-soft">
          Esse yoki nutqingizni yozing — 4 mezon bo'yicha band, tuzatish va band-9 namuna oling.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-accent text-white" : "bg-black/5 text-soft hover:bg-black/10"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "writing" && <WritingTab />}
      {tab === "speaking" && <SpeakingTab />}
      {tab === "reading" && <IeltsMock mode="reading" />}
      {tab === "listening" && <IeltsMock mode="listening" />}
      {tab === "progress" && <IeltsProgress />}
    </div>
  );
}

function WritingTab() {
  const [task, setTask] = useState<1 | 2>(2);
  const [prompt, setPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<WritingScore | null>(null);

  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  async function generate() {
    setErr("");
    setGenLoading(true);
    try {
      const { prompt: p } = await genWritingPrompt(task);
      setPrompt(p);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGenLoading(false);
    }
  }

  async function run() {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const r = await scoreWriting(task, prompt, essay);
      setResult(r);
      saveAttempt({
        skill: "writing",
        band: r.overallBand,
        date: new Date().toISOString(),
        detail: `Task ${task}`,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {[1, 2].map((t) => (
          <button
            key={t}
            onClick={() => setTask(t as 1 | 2)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              task === t ? "bg-ink text-white" : "bg-black/5 text-soft"
            }`}
          >
            Task {t}
          </button>
        ))}
        <button
          onClick={generate}
          disabled={genLoading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-3 py-1.5 text-sm text-soft hover:bg-black/10 disabled:opacity-40"
        >
          {genLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
          Topshiriq yarat
        </button>
        <span className="self-center text-xs text-soft">
          {task === 2 ? "min ~250 so'z" : "min ~150 so'z"} · {words} so'z
        </span>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Savol/topshiriq — "Topshiriq yarat" tugmasini bosing yoki o'zingiz yozing.`}
        className="mb-3 w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
        rows={3}
      />
      <textarea
        value={essay}
        onChange={(e) => setEssay(e.target.value)}
        placeholder="Essengizni shu yerga yozing (inglizcha)..."
        className="w-full resize-y rounded-xl border border-black/10 bg-white p-3 text-sm leading-relaxed text-ink outline-none focus:border-accent"
        rows={12}
      />

      <button
        onClick={run}
        disabled={loading || words < 20}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
        {loading ? "Baholanmoqda..." : "Baholash"}
      </button>

      {err && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      {result && <Report s={result} />}
    </div>
  );
}

function SpeakingTab() {
  const [part, setPart] = useState<1 | 2 | 3>(2);
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<SpeakingScore | null>(null);
  const [recording, setRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  async function generate() {
    setErr("");
    setGenLoading(true);
    try {
      const { question: q } = await genSpeakingPrompt(part);
      setQuestion(q);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGenLoading(false);
    }
  }

  async function run() {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const r = await scoreSpeaking(part, question, transcript);
      setResult(r);
      saveAttempt({
        skill: "speaking",
        band: r.overallBand,
        date: new Date().toISOString(),
        detail: `Part ${part}`,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() => setPart(p as 1 | 2 | 3)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              part === p ? "bg-ink text-white" : "bg-black/5 text-soft"
            }`}
          >
            Part {p}
          </button>
        ))}
        <button
          onClick={generate}
          disabled={genLoading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-3 py-1.5 text-sm text-soft hover:bg-black/10 disabled:opacity-40"
        >
          {genLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
          Savol yarat
        </button>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={`Savol/cue card — "Savol yarat" tugmasini bosing yoki o'zingiz yozing.`}
        className="mb-3 w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
        rows={3}
      />
      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Javobingizni yozing yoki mikrofon belgisini bosib gapirib yuboring..."
          className={`w-full resize-y rounded-xl border p-3 pr-12 text-sm leading-relaxed text-ink outline-none focus:border-accent ${recording ? "border-rose-400 bg-rose-50/30" : "border-black/10 bg-white"}`}
          rows={8}
        />
        <button
          type="button"
          title={recording ? "Yozishni to'xtatish" : "Ovozni matnga aylantirish"}
          onClick={() => {
            if (typeof window === "undefined") return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
            if (!SR) { alert("Brauzeringiz ovozni tanishni qo'llab-quvvatlamaydi."); return; }
            if (recording) {
              recogRef.current?.stop();
              setRecording(false);
              return;
            }
            const r = new SR();
            r.lang = "en-US";
            r.continuous = true;
            r.interimResults = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            r.onresult = (e: any) => {
              const text = Array.from(e.results as ArrayLike<SpeechRecognitionResult>)
                .slice(e.resultIndex)
                .map((res: SpeechRecognitionResult) => res[0].transcript)
                .join(" ");
              setTranscript((prev) => (prev ? prev + " " + text : text));
            };
            r.onerror = () => setRecording(false);
            r.onend = () => setRecording(false);
            recogRef.current = r;
            r.start();
            setRecording(true);
          }}
          className={`absolute right-3 top-3 rounded-lg p-1.5 transition ${recording ? "bg-rose-500 text-white" : "bg-black/5 text-soft hover:bg-black/10"}`}
        >
          {recording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>
      {recording && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-rose-600">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse-soft" />
          Yozilmoqda... To&apos;xtatish uchun mikrofon belgisini bosing.
        </p>
      )}

      <button
        onClick={run}
        disabled={loading || transcript.trim().length < 20}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
        {loading ? "Baholanmoqda..." : "Baholash"}
      </button>

      {err && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      {result && <Report s={result} />}
    </div>
  );
}
