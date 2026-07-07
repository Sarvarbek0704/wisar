"use client";

import { useEffect, useState } from "react";
import { BarChart3, Pencil, Check, Target } from "lucide-react";
import {
  dateKey, lastNDays, shortWeekday, toMin, dayCompletion,
  loadWeeklyGoalHours, saveWeeklyGoalHours,
  type DayData, type Habit,
} from "@/lib/planner";

export function WeeklyStats({
  today,
  days,
  habits,
  log,
}: {
  today: Date;
  days: Record<string, DayData>;
  habits: Habit[];
  log: Record<string, Record<string, boolean>>;
}) {
  const [goal, setGoal] = useState(10);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("10");

  useEffect(() => {
    setGoal(loadWeeklyGoalHours());
  }, []);

  function saveGoal() {
    const n = Number(val) || 10;
    saveWeeklyGoalHours(n);
    setGoal(loadWeeklyGoalHours());
    setEditing(false);
  }

  const range = lastNDays(today, 7);

  const bars = range.map((d) => {
    const k = dateKey(d);
    const day = days[k];
    const dayLog = log[k] || {};
    const plannedMin = day?.blocks.reduce((s, b) => s + Math.max(toMin(b.end) - toMin(b.start), 0), 0) ?? 0;
    const hours = plannedMin / 60;
    const completion = day ? dayCompletion(day, habits, dayLog) : 0;
    return { d, k, hours, completion };
  });

  const totalH = Math.round(bars.reduce((s, b) => s + b.hours, 0) * 10) / 10;
  const maxH = Math.max(...bars.map((b) => b.hours), goal / 7, 4);
  const avgCompletion = Math.round(
    (bars.reduce((s, b) => s + b.completion, 0) / bars.length) * 100,
  );
  const goalPct = goal > 0 ? Math.min(100, Math.round((totalH / goal) * 100)) : 0;
  const goalLineTop = 100 - Math.min(100, (goal / maxH) * 100);

  return (
    <div className="rounded-2xl border border-line bg-page p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-sans font-bold text-ink">
          <BarChart3 size={17} className="text-accent" /> Haftalik tahlil
        </h3>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-lg font-bold text-ink">
              {totalH}<span className="text-xs font-normal text-soft">/{goal} soat</span>
            </div>
            <div className="text-[10px] uppercase text-soft">maqsad {goalPct}%</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent">{avgCompletion}<span className="text-xs font-normal text-soft">%</span></div>
            <div className="text-[10px] uppercase text-soft">bajarildi</div>
          </div>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="number"
                min={1}
                max={100}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                className="w-14 rounded-lg border border-line bg-bg px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              />
              <button onClick={saveGoal} className="text-accent hover:opacity-80">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setVal(String(goal)); setEditing(true); }}
              title="Haftalik maqsadni o'zgartirish"
              className="grid h-7 w-7 place-items-center rounded-lg border border-line text-soft transition hover:text-accent"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Bar chart + maqsad chizig'i */}
      <div className="relative flex h-28 items-end justify-between gap-1.5">
        {goal > 0 && goalLineTop >= 0 && goalLineTop <= 100 && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
            style={{ top: `${goalLineTop}%` }}
            title={`Kunlik o'rtacha maqsad: ${Math.round((goal / 7) * 10) / 10} soat`}
          >
            <div className="h-px flex-1 border-t border-dashed border-amber-500/70" />
            <Target size={11} className="ml-1 flex-none text-amber-500" />
          </div>
        )}
        {bars.map((b) => {
          const h = Math.max((b.hours / maxH) * 100, b.hours > 0 ? 6 : 0);
          const isToday = b.k === dateKey(today);
          return (
            <div key={b.k} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div className="relative w-full overflow-hidden rounded-md bg-bg" style={{ height: "100%" }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-md transition-all ${isToday ? "bg-accent" : "bg-accent/40"}`}
                    style={{ height: `${h}%` }}
                    title={`${Math.round(b.hours * 10) / 10} soat · ${Math.round(b.completion * 100)}%`}
                  />
                </div>
              </div>
              <span className={`text-[10px] ${isToday ? "font-bold text-accent" : "text-soft"}`}>
                {shortWeekday(b.d)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
