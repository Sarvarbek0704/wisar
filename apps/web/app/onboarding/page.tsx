"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, BookOpen, Target, ArrowLeft } from "lucide-react";
import { isLoggedIn, setCefr, setDailyGoal } from "@/lib/me-api";
import { COURSES, type Course } from "@/lib/placement";

const GOAL_OPTIONS = [5, 10, 20, 30];

type Step = "course" | "quiz" | "result";

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("course");
  const [course, setCourse] = useState<Course | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState(10);

  function chooseCourse(c: Course) {
    setCourse(c);
    setCurrent(0);
    setAnswers([]);
    setSelected(null);
    setStep("quiz");
  }

  function next() {
    if (selected === null || !course) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 >= course.questions.length) {
      const correct = newAnswers.filter((a, i) => a === course.questions[i].answer).length;
      const detected = course.scoreToLevel(correct, course.questions.length);
      setLevel(detected);
      localStorage.setItem("wisar-level", detected);
      localStorage.setItem("wisar-course", course.id);
      localStorage.setItem("wisar-onboarded", "true");
      // CEFR faqat til kurslari uchun ma'noli
      if (isLoggedIn() && course.id !== "dasturlash") setCefr(detected).catch(() => {});
      setStep("result");
    } else {
      setCurrent(current + 1);
    }
  }

  function skip() {
    localStorage.setItem("wisar-onboarded", "true");
    router.push("/kurslar");
  }

  function finish() {
    if (!course) return;
    localStorage.setItem("wisar-goal", String(goal));
    if (isLoggedIn()) setDailyGoal(goal).catch(() => {});
    router.push(course.start[level] || `/${course.id}`);
  }

  // ─── 1-qadam: kurs tanlash ──────────────────────────────────────────────────
  if (step === "course") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 font-sans">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-ink">Nimani o'rganmoqchisiz?</h1>
          <p className="text-sm text-soft">
            Qisqa test darajangizni aniqlaydi — keyin aynan sizga mos darsdan boshlaymiz.
          </p>
        </div>

        <div className="space-y-3">
          {COURSES.map((c) => (
            <button
              key={c.id}
              onClick={() => chooseCourse(c)}
              className="flex w-full items-center gap-4 rounded-2xl border border-line bg-page p-5 text-left transition hover:border-accent/50 hover:bg-accent/5"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="flex-1">
                <span className="block font-semibold text-ink">{c.title}</span>
                <span className="block text-sm text-soft">{c.subtitle}</span>
              </span>
              <ChevronRight size={18} className="text-soft" />
            </button>
          ))}
        </div>

        <button onClick={skip} className="mt-8 w-full text-center text-xs text-soft hover:text-accent">
          O'tkazib yuborish
        </button>
      </div>
    );
  }

  // ─── 3-qadam: natija ────────────────────────────────────────────────────────
  if (step === "result" && course) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center font-sans">
        <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-accent/10">
          <BookOpen size={40} className="text-accent" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-ink">
          {course.emoji} {course.title} — sizning darajangiz:
        </h1>
        <div className="mb-4 rounded-2xl bg-accent px-8 py-3 text-3xl font-extrabold text-white">
          {level}
        </div>
        <p className="mb-8 text-soft">{course.blurb[level]}</p>

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
          Birinchi darsni boshlash <ChevronRight size={18} />
        </button>

        <button
          onClick={() => setStep("course")}
          className="mt-4 text-xs text-soft hover:text-accent"
        >
          Boshqa kursni tanlash
        </button>
      </div>
    );
  }

  // ─── 2-qadam: test ──────────────────────────────────────────────────────────
  if (!course) return null;
  const q = course.questions[current];
  const progress = (current / course.questions.length) * 100;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("course")}
            className="text-soft hover:text-accent"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-ink">
              {course.emoji} {course.title}
            </h1>
            <p className="text-sm text-soft">
              {current + 1} / {course.questions.length} savol
            </p>
          </div>
        </div>
        <button onClick={skip} className="text-xs text-soft hover:text-accent">
          O'tkazib yuborish
        </button>
      </div>

      <div className="mb-8 h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-page p-6 shadow-card">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
          {q.level} daraja
        </div>
        <p className="text-lg font-semibold text-ink">{q.q}</p>
      </div>

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
        {current + 1 === course.questions.length ? "Natijani ko'rish" : "Keyingisi"}
        <ChevronRight className="ml-1 inline" size={16} />
      </button>
    </div>
  );
}
