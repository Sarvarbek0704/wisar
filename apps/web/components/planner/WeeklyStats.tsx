"use client";

import { BarChart3 } from "lucide-react";
import { dateKey, lastNDays, shortWeekday, toMin, dayCompletion, type DayData, type Habit } from "@/lib/planner";

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

  const maxH = Math.max(...bars.map((b) => b.hours), 4);
  const totalH = Math.round(bars.reduce((s, b) => s + b.hours, 0) * 10) / 10;
  const avgCompletion = Math.round(
    (bars.reduce((s, b) => s + b.completion, 0) / bars.length) * 100,
  );

  return (
    <div className="rounded-2xl border border-line bg-page p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-sans font-bold text-ink">
          <BarChart3 size={17} className="text-accent" /> Haftalik tahlil
        </h3>
        <div className="flex gap-3 text-right">
          <div>
            <div className="text-lg font-bold text-ink">{totalH}<span className="text-xs font-normal text-soft"> soat</span></div>
            <div className="text-[10px] uppercase text-soft">rejalashtirilgan</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent">{avgCompletion}<span className="text-xs font-normal text-soft">%</span></div>
            <div className="text-[10px] uppercase text-soft">bajarildi</div>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex h-28 items-end justify-between gap-1.5">
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
