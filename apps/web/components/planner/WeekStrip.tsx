"use client";

import { dateKey, isToday, shortWeekday, type DayData, type Habit } from "@/lib/planner";

export function WeekStrip({
  week,
  selected,
  days,
  habits,
  log,
  onSelect,
}: {
  week: Date[];
  selected: Date;
  days: Record<string, DayData>;
  habits: Habit[];
  log: Record<string, Record<string, boolean>>;
  onSelect: (d: Date) => void;
}) {
  const selKey = dateKey(selected);

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {week.map((d) => {
        const k = dateKey(d);
        const day = days[k];
        const dayLog = log[k] || {};
        const isSel = k === selKey;
        const today = isToday(d);

        const taskDone = day?.tasks.filter((t) => t.done).length ?? 0;
        const taskTotal = day?.tasks.length ?? 0;
        const habitDone = habits.filter((h) => dayLog[h.id]).length;
        const total = taskTotal + habits.length;
        const done = taskDone + habitDone;
        const pct = total ? done / total : 0;
        const hasData = (day?.blocks.length ?? 0) > 0 || taskTotal > 0;

        return (
          <button
            key={k}
            onClick={() => onSelect(d)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition ${
              isSel
                ? "border-accent bg-accent/10"
                : "border-line bg-page hover:border-accent/40"
            }`}
          >
            <span className={`text-[10px] font-medium uppercase ${isSel ? "text-accent" : "text-soft"}`}>
              {shortWeekday(d)}
            </span>
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${
                today
                  ? "bg-accent text-white"
                  : isSel
                  ? "text-accent"
                  : "text-ink"
              }`}
            >
              {d.getDate()}
            </span>
            {/* Completion dot/ring */}
            <span className="flex h-1.5 items-center gap-0.5">
              {hasData ? (
                <span className="h-1.5 w-6 overflow-hidden rounded-full bg-line">
                  <span
                    className="block h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-line" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
