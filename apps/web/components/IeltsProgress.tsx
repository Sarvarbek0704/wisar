"use client";

import { useEffect, useState } from "react";
import { PenLine, Mic, BookOpen, Headphones, Trash2 } from "lucide-react";
import {
  loadAttempts,
  latestBands,
  overallBand,
  clearAttempts,
  type Attempt,
  type Skill,
} from "@/lib/ielts-progress";

const SKILL_COLORS: Record<Skill, string> = {
  writing: "#3b82f6",
  speaking: "#8b5cf6",
  reading: "#10b981",
  listening: "#f59e0b",
};

function BandTrendChart({ attempts }: { attempts: Attempt[] }) {
  const recent = [...attempts].slice(-20);
  if (recent.length < 2) return null;

  const W = 560;
  const H = 140;
  const PAD = { top: 12, right: 16, bottom: 24, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minBand = 4;
  const maxBand = 9;
  const bandRange = maxBand - minBand;

  const xScale = (i: number) => PAD.left + (i / (recent.length - 1)) * chartW;
  const yScale = (b: number) => PAD.top + (1 - (b - minBand) / bandRange) * chartH;

  // Group into per-skill lines
  const bySkill: Record<Skill, { i: number; b: number }[]> = {
    writing: [], speaking: [], reading: [], listening: [],
  };
  recent.forEach((a, i) => bySkill[a.skill].push({ i, b: a.band }));

  const gridBands = [5, 6, 7, 8, 9];

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">Band trayektoriyasi</h3>
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
          {/* Grid lines */}
          {gridBands.map((b) => (
            <g key={b}>
              <line
                x1={PAD.left} y1={yScale(b)} x2={PAD.left + chartW} y2={yScale(b)}
                stroke="#f0f0f0" strokeWidth={1}
              />
              <text x={PAD.left - 4} y={yScale(b) + 4} textAnchor="end" fontSize={9} fill="#999">{b}</text>
            </g>
          ))}

          {/* Per-skill lines + dots */}
          {(Object.entries(bySkill) as [Skill, { i: number; b: number }[]][]).map(([skill, pts]) => {
            if (pts.length < 1) return null;
            const color = SKILL_COLORS[skill];
            const d = pts.map((p, j) =>
              `${j === 0 ? "M" : "L"} ${xScale(p.i).toFixed(1)} ${yScale(p.b).toFixed(1)}`
            ).join(" ");
            return (
              <g key={skill}>
                {pts.length > 1 && (
                  <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                )}
                {pts.map((p, j) => (
                  <circle key={j} cx={xScale(p.i)} cy={yScale(p.b)} r={3} fill={color} />
                ))}
              </g>
            );
          })}

          {/* X axis date labels (first + last) */}
          {recent.length >= 2 && (
            <>
              <text x={PAD.left} y={H - 4} fontSize={9} fill="#aaa" textAnchor="start">
                {new Date(recent[0].date).toLocaleDateString("uz", { month: "short", day: "numeric" })}
              </text>
              <text x={PAD.left + chartW} y={H - 4} fontSize={9} fill="#aaa" textAnchor="end">
                {new Date(recent[recent.length - 1].date).toLocaleDateString("uz", { month: "short", day: "numeric" })}
              </text>
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="mt-1 flex flex-wrap gap-3 px-1">
          {(Object.entries(SKILL_COLORS) as [Skill, string][]).map(([skill, color]) => (
            <span key={skill} className="inline-flex items-center gap-1 text-[11px] text-soft capitalize">
              <span style={{ background: color }} className="inline-block h-2 w-4 rounded-full" />
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const SKILLS: { key: Skill; label: string; icon: typeof PenLine }[] = [
  { key: "writing", label: "Writing", icon: PenLine },
  { key: "speaking", label: "Speaking", icon: Mic },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "listening", label: "Listening", icon: Headphones },
];

function bandColor(b: number): string {
  if (b >= 8.5) return "text-emerald-600";
  if (b >= 7) return "text-sky-600";
  if (b >= 5.5) return "text-amber-600";
  return "text-rose-600";
}

export function IeltsProgress() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setAttempts(loadAttempts());
  }, [tick]);

  // Boshqa tabda natija saqlanganda yangilanish uchun fokusda qayta o'qish
  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const bands = latestBands();
  const overall = overallBand();
  const recent = [...attempts].reverse().slice(0, 8);

  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-6 text-center text-sm text-soft">
        Hali natija yo'q. Esse baholang yoki mock test yeching — band trayektoriyangiz shu yerda chiqadi.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overall + skills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-soft">Umumiy</p>
          <p className={`text-3xl font-extrabold ${overall ? bandColor(overall) : "text-soft"}`}>
            {overall ?? "—"}
          </p>
        </div>
        {SKILLS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-2xl border border-black/5 bg-white p-4 text-center">
            <Icon size={15} className="mx-auto text-soft" />
            <p className="mt-1 text-[11px] text-soft">{label}</p>
            <p className={`text-2xl font-bold ${bands[key] ? bandColor(bands[key]!) : "text-black/20"}`}>
              {bands[key] ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Band trend chart */}
      {attempts.length >= 2 && <BandTrendChart attempts={attempts} />}

      {/* Recent history */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">So'nggi natijalar</h3>
          <button
            onClick={() => {
              if (confirm("Barcha natijalar o'chirilsinmi?")) {
                clearAttempts();
                setTick((t) => t + 1);
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-soft hover:text-rose-600"
          >
            <Trash2 size={12} /> Tozalash
          </button>
        </div>
        <div className="space-y-1.5">
          {recent.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-black/5 bg-white px-3 py-2 text-sm"
            >
              <span className={`w-10 font-bold ${bandColor(a.band)}`}>{a.band}</span>
              <span className="capitalize text-ink">{a.skill}</span>
              {a.detail && <span className="text-xs text-soft">· {a.detail}</span>}
              <span className="ml-auto text-xs text-soft">
                {new Date(a.date).toLocaleDateString("uz")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
