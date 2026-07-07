"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Timer, Coffee, Flame } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { addActivity } from "@/lib/me-api";

type Mode = "focus" | "break";
const DURATIONS: Record<Mode, number> = { focus: 25 * 60, break: 5 * 60 };

export function FocusTimer() {
  const [mode, setMode] = useState<Mode>("focus");
  const [left, setLeft] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [justLogged, setJustLogged] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setLeft((l) => {
          if (l <= 1) {
            // sikl tugadi
            if (mode === "focus") {
              setSessions((s) => s + 1);
              // Yakunlangan fokus sessiya — haqiqiy kunlik faollikka (DailyActivity) yoziladi.
              // Shu orqali /me va boshqa joylardagi kunlik maqsad/heatmap bilan bog'lanadi.
              if (isLoggedIn()) {
                addActivity({ minutes: Math.round(DURATIONS.focus / 60) }).catch(() => {});
                setJustLogged(true);
                setTimeout(() => setJustLogged(false), 4000);
              }
            }
            const next: Mode = mode === "focus" ? "break" : "focus";
            setMode(next);
            // ovozli signal (ixtiyoriy, xato bo'lsa jim)
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const o = ctx.createOscillator();
              o.connect(ctx.destination);
              o.frequency.value = 660;
              o.start();
              setTimeout(() => { o.stop(); ctx.close(); }, 220);
            } catch {}
            return DURATIONS[next];
          }
          return l - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  function reset() {
    setRunning(false);
    setLeft(DURATIONS[mode]);
  }
  function switchMode(m: Mode) {
    setMode(m);
    setLeft(DURATIONS[m]);
    setRunning(false);
  }

  const mins = Math.floor(left / 60).toString().padStart(2, "0");
  const secs = (left % 60).toString().padStart(2, "0");
  const pct = 1 - left / DURATIONS[mode];

  // SVG ring
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="rounded-2xl border border-line bg-page p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-sans font-bold text-ink">
          <Timer size={17} className="text-rose-500" /> Fokus
        </h3>
        <div className="flex rounded-lg bg-bg p-0.5">
          <button
            onClick={() => switchMode("focus")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${mode === "focus" ? "bg-page text-ink shadow-sm" : "text-soft"}`}
          >
            Ish
          </button>
          <button
            onClick={() => switchMode("break")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${mode === "break" ? "bg-page text-ink shadow-sm" : "text-soft"}`}
          >
            Dam
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--bg)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke={mode === "focus" ? "#f43f5e" : "#10b981"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {mode === "break" && <Coffee size={14} className="mb-0.5 text-emerald-500" />}
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">{mins}:{secs}</span>
            <span className="text-[10px] uppercase text-soft">{mode === "focus" ? "ishlash" : "dam olish"}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? "Pauza" : "Boshlash"}
          </button>
          <button
            onClick={reset}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line text-soft transition hover:text-ink"
            title="Qayta"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {sessions > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-soft">
            <Flame size={12} className="text-amber-500" />
            Bugun <span className="font-bold text-ink">{sessions}</span> fokus sessiya yakunlandi
            {justLogged && (
              <span className="animate-fade-in text-emerald-600">· kunlik maqsadga qo'shildi</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
