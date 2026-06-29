"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, BookOpen, Target } from "lucide-react";
import { isLoggedIn, setCefr, setDailyGoal } from "@/lib/me-api";

const GOAL_OPTIONS = [5, 10, 20, 30];

type Question = {
  q: string;
  options: string[];
  answer: number; // index
  level: "A1" | "A2" | "B1" | "B2";
};

const QUESTIONS: Question[] = [
  {
    q: "Choose the correct answer: 'What ___ your name?'",
    options: ["is", "are", "am", "be"],
    answer: 0,
    level: "A1",
  },
  {
    q: "Choose the correct answer: 'I ___ to school every day.'",
    options: ["go", "goes", "going", "went"],
    answer: 0,
    level: "A1",
  },
  {
    q: "What is the plural of 'child'?",
    options: ["childs", "childes", "children", "childrens"],
    answer: 2,
    level: "A1",
  },
  {
    q: "Choose the correct answer: 'She ___ TV when I called.'",
    options: ["watch", "watches", "is watching", "was watching"],
    answer: 3,
    level: "A2",
  },
  {
    q: "Which sentence is correct?",
    options: [
      "I have never been to Paris.",
      "I have ever been to Paris.",
      "I ever been to Paris.",
      "I have been never to Paris.",
    ],
    answer: 0,
    level: "A2",
  },
  {
    q: "Choose the correct answer: 'If it rains, we ___ stay home.'",
    options: ["would", "will", "shall", "are"],
    answer: 1,
    level: "A2",
  },
  {
    q: "Which word is a synonym for 'happy'?",
    options: ["sad", "angry", "joyful", "tired"],
    answer: 2,
    level: "B1",
  },
  {
    q: "Choose the correct answer: 'By the time she arrived, we ___ for an hour.'",
    options: ["had been waiting", "were waiting", "waited", "have waited"],
    answer: 0,
    level: "B1",
  },
  {
    q: "Which word fits? 'The government ___ new policies last year.'",
    options: ["implements", "implemented", "implementing", "implement"],
    answer: 1,
    level: "B2",
  },
  {
    q: "Choose the best word: 'The documentary ___ a thought-provoking look at climate change.'",
    options: ["gives", "provides", "shows", "makes"],
    answer: 1,
    level: "B2",
  },
];

const LEVEL_TO_SECTION: Record<string, string> = {
  A1: "/ingliz-tili",
  A2: "/ingliz-tili",
  B1: "/ingliz-tili",
  B2: "/ingliz-tili",
};

function scoreToLevel(correct: number): string {
  if (correct <= 2) return "A1";
  if (correct <= 4) return "A2";
  if (correct <= 7) return "B1";
  return "B2";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState(10);

  const q = QUESTIONS[current];
  const progress = ((current) / QUESTIONS.length) * 100;

  function next() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 >= QUESTIONS.length) {
      const correct = newAnswers.filter((a, i) => a === QUESTIONS[i].answer).length;
      const detectedLevel = scoreToLevel(correct);
      setLevel(detectedLevel);
      localStorage.setItem("wisar-level", detectedLevel);
      localStorage.setItem("wisar-onboarded", "true");
      // CEFR darajasini serverga saqlaymiz (10-vazifa adaptiv tavsiya uchun)
      if (isLoggedIn()) setCefr(detectedLevel).catch(() => {});
      setDone(true);
    } else {
      setCurrent(current + 1);
    }
  }

  function skip() {
    localStorage.setItem("wisar-onboarded", "true");
    router.push("/");
  }

  function finish() {
    localStorage.setItem("wisar-goal", String(goal));
    if (isLoggedIn()) setDailyGoal(goal).catch(() => {});
    router.push(LEVEL_TO_SECTION[level] || "/");
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center font-sans">
        <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-accent/10">
          <BookOpen size={40} className="text-accent" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-ink">Sizning darajangiz:</h1>
        <div className="mb-4 rounded-2xl bg-accent px-8 py-3 text-4xl font-extrabold text-white">
          {level}
        </div>
        <p className="mb-6 text-soft">
          {level === "A1" && "Boshlang'ich daraja. Asosiy so'zlar va iboralar bilan boshlaymiz!"}
          {level === "A2" && "Yaxshi boshlanish! Oddiy suhbat va qoidalarni o'rganamiz."}
          {level === "B1" && "O'rta daraja. Erkin muloqot qobiliyatingizni oshiramiz."}
          {level === "B2" && "Zo'r! Murakkab mavzularda nutq va yozishni rivojlantiramiz."}
        </p>

        {/* Kunlik maqsad tanlash (4-vazifa) */}
        <div className="mb-8 w-full">
          <div className="mb-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink">
            <Target size={15} className="text-accent" />
            Kunlik maqsadingiz (daqiqa)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  goal === g
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-soft hover:border-accent/40"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={finish}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          O'qishni boshlash <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 font-sans">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Darajangizni aniqlaylik</h1>
          <p className="text-sm text-soft">{current + 1} / {QUESTIONS.length} savol</p>
        </div>
        <button onClick={skip} className="text-xs text-soft hover:text-accent">
          O'tkazib yuborish
        </button>
      </div>

      {/* Progress */}
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Savol */}
      <div className="mb-6 rounded-2xl border border-line bg-page p-6 shadow-card">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
          {q.level} daraja
        </div>
        <p className="text-lg font-semibold text-ink">{q.q}</p>
      </div>

      {/* Javoblar */}
      <div className="space-y-3">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition ${
              selected === i
                ? "border-accent bg-accent/10 text-ink"
                : "border-line bg-page text-ink hover:border-accent/50 hover:bg-accent/5"
            }`}
          >
            <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        ))}
      </div>

      <button
        onClick={next}
        disabled={selected === null}
        className="mt-6 w-full rounded-xl bg-accent py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {current + 1 === QUESTIONS.length ? "Natijani ko'rish" : "Keyingisi"}
        <ChevronRight className="ml-1 inline" size={16} />
      </button>
    </div>
  );
}
