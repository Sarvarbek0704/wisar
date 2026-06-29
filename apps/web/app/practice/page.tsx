"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle, Send, Mic, MicOff, Loader2, ArrowLeft, Sparkles, Check,
} from "lucide-react";
import {
  createThread,
  askStream,
  getFeedback,
  type TutorMessage,
  type RoleplayFeedback,
} from "@/lib/tutor-api";

type Scenario = { id: string; title: string; emoji: string; desc: string; prompt: string; opener: string };

const SCENARIOS: Scenario[] = [
  {
    id: "restaurant",
    title: "Restoranda buyurtma",
    emoji: "🍽️",
    desc: "Ofitsiant bilan suhbat, taom buyurtma qilish.",
    prompt: "You are a waiter at a restaurant. The user is a customer ordering food.",
    opener: "Good evening! Welcome to our restaurant. Here is the menu — can I get you something to drink first?",
  },
  {
    id: "interview",
    title: "Ish suhbati",
    emoji: "💼",
    desc: "HR menejer bilan ish bo'yicha intervyu.",
    prompt: "You are an HR manager interviewing the user for a job. Ask typical interview questions.",
    opener: "Hello, thanks for coming in today. Could you start by telling me a little about yourself?",
  },
  {
    id: "shopping",
    title: "Do'konda xarid",
    emoji: "🛍️",
    desc: "Sotuvchi bilan kiyim tanlash, narx so'rash.",
    prompt: "You are a shop assistant in a clothing store helping the user buy clothes.",
    opener: "Hi there! Are you looking for anything in particular today?",
  },
  {
    id: "doctor",
    title: "Shifokorda",
    emoji: "🩺",
    desc: "Shifokorga shikoyatlarni tushuntirish.",
    prompt: "You are a doctor. The user is a patient describing their symptoms.",
    opener: "Hello, please have a seat. What seems to be the problem today?",
  },
  {
    id: "airport",
    title: "Aeroportda",
    emoji: "✈️",
    desc: "Ro'yxatdan o'tish, chipta va bagaj.",
    prompt: "You are an airline check-in agent at the airport helping the user check in.",
    opener: "Good morning! May I see your passport and ticket, please?",
  },
  {
    id: "friends",
    title: "Yangi tanishuv",
    emoji: "👋",
    desc: "Yangi odam bilan suhbatlashish.",
    prompt: "You are a friendly person meeting the user at a social event. Make small talk.",
    opener: "Hey! I don't think we've met before. I'm Alex — what's your name?",
  },
];

export default function PracticePage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState<RoleplayFeedback | null>(null);
  const [loadingFb, setLoadingFb] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function start(s: Scenario) {
    setScenario(s);
    setMessages([{ role: "assistant", content: s.opener }]);
    setFeedback(null);
    try {
      const t = await createThread("roleplay", { scenario: s.prompt });
      setThreadId(t.id);
    } catch {
      /* offline — local-only suhbat */
    }
  }

  async function send() {
    const q = input.trim();
    if (!q || streaming || !threadId) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      let acc = "";
      for await (const delta of askStream(threadId, q)) {
        acc += delta;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: "(AI sozlanmagan — javob yo'q)" };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: (e as Error).message };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function toggleMic() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + text);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
  }

  async function finish() {
    if (!threadId) return;
    setLoadingFb(true);
    try {
      setFeedback(await getFeedback(threadId));
    } catch {
      /* ignore */
    } finally {
      setLoadingFb(false);
    }
  }

  const micSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // ── Scenario tanlash ──
  if (!scenario) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 font-sans sm:px-6">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-ink">
          <MessageCircle size={22} className="text-accent" />
          Suhbat amaliyoti
        </h1>
        <p className="mb-6 text-sm text-soft">
          AI bilan turli vaziyatlarda ingliz tilida suhbatlashing. Oxirida fikr-mulohaza olasiz.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => start(s)}
              className="flex items-start gap-3 rounded-2xl border border-line bg-page p-4 text-left transition hover:border-accent/40"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span>
                <span className="block font-semibold text-ink">{s.title}</span>
                <span className="block text-sm text-soft">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Suhbat ──
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col px-4 py-6 font-sans">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => {
            setScenario(null);
            setThreadId(null);
            setMessages([]);
          }}
          className="inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent"
        >
          <ArrowLeft size={15} /> Senariylar
        </button>
        <span className="text-sm font-semibold text-ink">
          {scenario.emoji} {scenario.title}
        </span>
        <button
          onClick={finish}
          disabled={loadingFb || messages.length < 3}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-soft transition hover:text-accent disabled:opacity-40"
        >
          {loadingFb ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Yakunlash
        </button>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto rounded-2xl border border-line bg-page p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto rounded-br-sm bg-accent text-white"
                : "mr-auto rounded-bl-sm bg-bg text-ink"
            }`}
          >
            {m.content || "…"}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {feedback && (
        <div className="mt-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles size={15} className="text-accent" /> Fikr-mulohaza · Daraja: {feedback.level}
          </div>
          {feedback.strengths?.length > 0 && (
            <div className="mb-2">
              {feedback.strengths.map((s, i) => (
                <p key={i} className="flex items-start gap-1.5 text-ink">
                  <Check size={14} className="mt-0.5 flex-none text-success" /> {s}
                </p>
              ))}
            </div>
          )}
          {feedback.mistakes?.length > 0 && (
            <ul className="space-y-1.5">
              {feedback.mistakes.map((e, i) => (
                <li key={i}>
                  <span className="text-danger line-through">{e.text}</span>{" "}
                  <span className="text-success">{e.fix}</span>
                  <span className="block text-xs text-soft">{e.why}</span>
                </li>
              ))}
            </ul>
          )}
          {feedback.tips?.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-soft">
              {feedback.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {micSupported && (
          <button
            onClick={toggleMic}
            className={`grid h-10 w-10 flex-none place-items-center rounded-xl border transition ${
              recording ? "border-rose-400 bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "border-line text-soft hover:text-accent"
            }`}
            title="Ovozli kiritish"
          >
            {recording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type in English..."
          className="flex-1 rounded-xl border border-line bg-page px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
