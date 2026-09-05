"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Sun, Cloud, HardDrive,
  Copy, ArrowDownToLine, Sparkles,
} from "lucide-react";
import { DayView } from "@/components/planner/DayView";
import { DaySidebar } from "@/components/planner/DaySidebar";
import { WeekStrip } from "@/components/planner/WeekStrip";
import { WeeklyStats } from "@/components/planner/WeeklyStats";
import { FocusTimer } from "@/components/planner/FocusTimer";
import { isLoggedIn } from "@/lib/auth";
import {
  loadDayRemote, saveDayRemote, loadHabitsRemote, saveHabitsRemote,
} from "@/lib/planner-api";
import {
  dateKey, fmtLong, isToday, addDays, toMin, weekDates,
  loadDay, saveDay, loadAllDays, loadHabits, saveHabits,
  loadHabitLog, saveHabitLog, dayCompletion, uid,
  type DayData, type Habit,
} from "@/lib/planner";

const EMPTY: DayData = { blocks: [], tasks: [], note: "", courseLink: "" };
type SyncState = "local" | "syncing" | "synced";

export default function PlannerPage() {
  const [date, setDate] = useState<Date | null>(null);
  const [day, setDay] = useState<DayData>(EMPTY);
  const [allDays, setAllDays] = useState<Record<string, DayData>>({});
  const [habits, setHabits] = useState<Habit[]>([]);
  const [log, setLog] = useState<Record<string, Record<string, boolean>>>({});
  const [sync, setSync] = useState<SyncState>("local");

  useEffect(() => {
    setDate(new Date());
    setAllDays(loadAllDays());
    if (isLoggedIn()) {
      loadHabitsRemote().then((remote) => {
        const localHabits = loadHabits();
        const localLog = loadHabitLog();
        // DIQQAT: server BO'SH javob qaytarishi mumkin (hech qachon saqlanmagan,
        // yoki eski nosozlik tufayli bo'sh yozilgan). Bunday javob bilan lokal
        // ma'lumotni ALMASHTIRIB YUBORMAYMIZ — aks holda foydalanuvchi rejasi
        // yo'qoladi. Bunday holatda lokalni serverga yuklaymiz.
        const remoteEmpty = !remote || remote.habits.length === 0;
        if (remoteEmpty && localHabits.length > 0) {
          setHabits(localHabits);
          setLog(localLog);
          saveHabitsRemote(localHabits, localLog);
          return;
        }
        if (remote) {
          setHabits(remote.habits);
          setLog(remote.log);
          saveHabits(remote.habits);
          saveHabitLog(remote.log);
        } else {
          setHabits(localHabits);
          setLog(localLog);
        }
      });
      setSync("synced");
    } else {
      setHabits(loadHabits());
      setLog(loadHabitLog());
    }
  }, []);

  const key = date ? dateKey(date) : "";

  useEffect(() => {
    if (!key) return;
    if (isLoggedIn()) {
      setSync("syncing");
      loadDayRemote(key).then((remote) => {
        if (remote) {
          setDay(remote);
          saveDay(key, remote);
          setAllDays((p) => ({ ...p, [key]: remote }));
        } else {
          const local = loadDay(key);
          setDay(local);
        }
        setSync("synced");
      });
    } else {
      setDay(loadDay(key));
    }
  }, [key]);

  if (!date) {
    return <div className="px-4 py-20 text-center text-soft">Yuklanmoqda…</div>;
  }

  const { weekday, date: dateStr } = fmtLong(date);
  const today = isToday(date);
  const dayLog = log[key] || {};
  const week = weekDates(date);

  function patch(p: Partial<DayData>) {
    const next = { ...day, ...p };
    setDay(next);
    saveDay(key, next);
    setAllDays((prev) => ({ ...prev, [key]: next }));
    if (isLoggedIn()) {
      setSync("syncing");
      saveDayRemote(key, next).then(() => setSync("synced"));
    }
  }
  function updateHabits(h: Habit[]) {
    setHabits(h);
    saveHabits(h);
    if (isLoggedIn()) saveHabitsRemote(h, log);
  }
  function updateDayLog(l: Record<string, boolean>) {
    const nl = { ...log, [key]: l };
    setLog(nl);
    saveHabitLog(nl);
    if (isLoggedIn()) saveHabitsRemote(habits, nl);
  }

  // ── Tezkor amallar ──
  function copyYesterday() {
    const y = allDays[dateKey(addDays(date!, -1))];
    if (!y || y.blocks.length === 0) return;
    const cloned = y.blocks.map((b) => ({ ...b, id: uid() }));
    patch({ blocks: [...day.blocks, ...cloned] });
  }
  function carryOverTasks() {
    const y = allDays[dateKey(addDays(date!, -1))];
    if (!y) return;
    const pending = y.tasks.filter((t) => !t.done);
    if (pending.length === 0) return;
    const cloned = pending.map((t) => ({ ...t, id: uid(), done: false }));
    patch({ tasks: [...day.tasks, ...cloned] });
  }

  const tasksDone = day.tasks.filter((t) => t.done).length;
  const habitsDone = habits.filter((h) => dayLog[h.id]).length;
  const plannedMin = day.blocks.reduce((s, b) => s + Math.max(toMin(b.end) - toMin(b.start), 0), 0);
  const plannedH = Math.round((plannedMin / 60) * 10) / 10;
  const completion = Math.round(dayCompletion(day, habits, dayLog) * 100);

  const yesterday = allDays[dateKey(addDays(date, -1))];
  const canCopy = (yesterday?.blocks.length ?? 0) > 0;
  const pendingYesterday = yesterday?.tasks.filter((t) => !t.done).length ?? 0;

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-page p-1 shadow-sm">
            <button
              onClick={() => setDate(addDays(date, -1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-soft transition hover:bg-ink/5 hover:text-ink"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setDate(new Date())}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${today ? "text-accent" : "text-soft hover:bg-ink/5"}`}
            >
              Bugun
            </button>
            <button
              onClick={() => setDate(addDays(date, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-soft transition hover:bg-ink/5 hover:text-ink"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div>
            <h1 className="flex items-center gap-2 font-sans text-2xl font-extrabold tracking-tight text-ink">
              {weekday}
              {today && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  <Sun size={11} className="mr-0.5 inline" /> bugun
                </span>
              )}
            </h1>
            <p className="text-soft">{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Day progress ring */}
          <div className="flex items-center gap-3 rounded-xl border border-line bg-page px-4 py-2 shadow-sm">
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--bg)" strokeWidth="5" />
                <circle
                  cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" strokeWidth="5"
                  strokeLinecap="round" strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - completion / 100)}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[11px] font-bold text-ink">{completion}%</span>
            </div>
            <div className="flex gap-3 text-center">
              <MiniStat label="Vazifa" value={`${tasksDone}/${day.tasks.length}`} />
              <MiniStat label="Odat" value={`${habitsDone}/${habits.length}`} />
              <MiniStat label="Soat" value={`${plannedH}`} />
            </div>
          </div>
          {isLoggedIn() && (
            <span className={`flex items-center gap-1 text-xs ${sync === "syncing" ? "text-amber-500" : "text-emerald-600"}`}>
              {sync === "syncing" ? <HardDrive size={12} /> : <Cloud size={12} />}
              {sync === "syncing" ? "saqlanmoqda…" : "saqlandi"}
            </span>
          )}
        </div>
      </header>

      {/* ── Week strip ── */}
      <div className="mb-5">
        <WeekStrip
          week={week}
          selected={date}
          days={allDays}
          habits={habits}
          log={log}
          onSelect={(d) => setDate(d)}
        />
      </div>

      {/* ── Quick actions ── */}
      {(canCopy || pendingYesterday > 0) && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-soft">
            <Sparkles size={13} className="text-accent" /> Tezkor:
          </span>
          {canCopy && (
            <button
              onClick={copyYesterday}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent/40 hover:text-accent"
            >
              <Copy size={13} /> Kechagi jadvalni nusxalash
            </button>
          )}
          {pendingYesterday > 0 && (
            <button
              onClick={carryOverTasks}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent/40 hover:text-accent"
            >
              <ArrowDownToLine size={13} /> Bajarilmagan {pendingYesterday} vazifani o'tkazish
            </button>
          )}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <DayView blocks={day.blocks} onChange={(b) => patch({ blocks: b })} showNow={today} />
          {/* Bottom: focus + stats */}
          <div className="grid gap-5 md:grid-cols-2">
            <FocusTimer />
            <WeeklyStats today={date} days={allDays} habits={habits} log={log} />
          </div>
        </div>
        <DaySidebar
          tasks={day.tasks}
          onTasks={(t) => patch({ tasks: t })}
          note={day.note}
          onNote={(s) => patch({ note: s })}
          courseLink={day.courseLink ?? ""}
          onCourseLink={(s) => patch({ courseLink: s })}
          habits={habits}
          onHabits={updateHabits}
          dayLog={dayLog}
          onDayLog={updateDayLog}
          log={log}
          date={date}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-soft">{label}</p>
    </div>
  );
}
