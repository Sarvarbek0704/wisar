// "Mening kunim" — kundalik rejalashtiruvchi. Ma'lumot localStorage'da (shaxsiy vosita).

export type Category = "study" | "work" | "personal" | "health" | "rest" | "other";

// icon: Lucide icon nomi (CategoryIcon komponenti orqali render qilinadi)
export const CATEGORIES: {
  key: Category;
  label: string;
  icon: string;
  dot: string;
  chip: string;
}[] = [
  { key: "study",    label: "O'qish",   icon: "BookOpen",  dot: "bg-sky-500",     chip: "bg-sky-100 text-sky-700" },
  { key: "work",     label: "Ish",      icon: "Briefcase", dot: "bg-violet-500",  chip: "bg-violet-100 text-violet-700" },
  { key: "personal", label: "Shaxsiy",  icon: "Target",    dot: "bg-amber-500",   chip: "bg-amber-100 text-amber-700" },
  { key: "health",   label: "Sog'liq",  icon: "Dumbbell",  dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700" },
  { key: "rest",     label: "Dam",      icon: "Coffee",    dot: "bg-rose-400",    chip: "bg-rose-100 text-rose-700" },
  { key: "other",    label: "Boshqa",   icon: "Circle",    dot: "bg-slate-400",   chip: "bg-slate-100 text-slate-600" },
];

export function cat(key: Category) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

export type Block = {
  id: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  title: string;
  category: Category;
};
export type Task  = { id: string; text: string; done: boolean; priority: boolean };
export type DayData = { blocks: Block[]; tasks: Task[]; note: string; courseLink?: string };

// Habit: emoji maydoni backward-compat uchun saqlanadi, lekin UI ikonka ishlatadi
export type Habit = { id: string; name: string; emoji?: string };

const DAYS_KEY     = "planner-days-v1";
const HABITS_KEY   = "planner-habits-v1";
const HABITLOG_KEY = "planner-habitlog-v1";
const WEEKGOAL_KEY = "planner-weekgoal-v1";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ── Sana ────────────────────────────────────────────────────────────
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

export function fmtLong(d: Date): { weekday: string; date: string } {
  return { weekday: WEEKDAYS[d.getDay()], date: `${d.getDate()}-${MONTHS[d.getMonth()]}` };
}

export function isToday(d: Date): boolean {
  return dateKey(d) === dateKey(new Date());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Haftaning dushanbasidan boshlab 7 kun (Mon→Sun)
export function weekDates(d: Date): Date[] {
  const day = d.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(d, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Sanadan ortga N kun (eng eskidan eng yangiga)
export function lastNDays(d: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => addDays(d, -(n - 1 - i)));
}

const SHORT_WEEKDAYS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
export function shortWeekday(d: Date): string {
  return SHORT_WEEKDAYS[d.getDay()];
}

// ── Vaqt ────────────────────────────────────────────────────────────
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ── localStorage ────────────────────────────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown): void {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
}

const EMPTY_DAY: DayData = { blocks: [], tasks: [], note: "" };

export function loadDay(key: string): DayData {
  const all = read<Record<string, DayData>>(DAYS_KEY, {});
  return all[key] ? { ...EMPTY_DAY, ...all[key] } : { ...EMPTY_DAY };
}
export function saveDay(key: string, data: DayData): void {
  const all = read<Record<string, DayData>>(DAYS_KEY, {});
  all[key] = data;
  write(DAYS_KEY, all);
}
export function loadAllDays(): Record<string, DayData> {
  return read<Record<string, DayData>>(DAYS_KEY, {});
}

export function loadHabits(): Habit[] {
  return read<Habit[]>(HABITS_KEY, [
    { id: "h-eng",   name: "Ingliz tili (30 daq)" },
    { id: "h-read",  name: "O'qish" },
    { id: "h-sport", name: "Sport" },
    { id: "h-water", name: "Suv ichish" },
  ]);
}
export function saveHabits(h: Habit[]): void {
  write(HABITS_KEY, h);
}

export function loadHabitLog(): Record<string, Record<string, boolean>> {
  return read<Record<string, Record<string, boolean>>>(HABITLOG_KEY, {});
}
export function saveHabitLog(log: Record<string, Record<string, boolean>>): void {
  write(HABITLOG_KEY, log);
}

// ── Haftalik soat maqsadi (shaxsiy sozlama, faqat shu qurilmada) ─────
export function loadWeeklyGoalHours(): number {
  return read<number>(WEEKGOAL_KEY, 10);
}
export function saveWeeklyGoalHours(hours: number): void {
  write(WEEKGOAL_KEY, Math.max(1, Math.min(100, Math.round(hours))));
}

// ── Statistika yordamchilari ────────────────────────────────────────

// Bitta odatning ketma-ket bajarilgan kunlari (bugundan ortga)
export function habitStreak(
  habitId: string,
  log: Record<string, Record<string, boolean>>,
  upto: Date,
): number {
  let streak = 0;
  let cur = new Date(upto);
  // Agar bugun belgilanmagan bo'lsa, kechadan boshlab sanaymiz (streak uzilmagan hisoblanadi)
  if (!log[dateKey(cur)]?.[habitId]) {
    cur = addDays(cur, -1);
  }
  // 2 yillik chegarani qo'yamiz (cheksiz loopdan himoya)
  for (let i = 0; i < 730; i++) {
    if (log[dateKey(cur)]?.[habitId]) {
      streak++;
      cur = addDays(cur, -1);
    } else {
      break;
    }
  }
  return streak;
}

// Kun to'liqligi: 0..1 (vazifa + odat o'rtacha)
export function dayCompletion(
  data: DayData,
  habits: Habit[],
  dayLog: Record<string, boolean>,
): number {
  const taskTotal = data.tasks.length;
  const taskDone = data.tasks.filter((t) => t.done).length;
  const habitTotal = habits.length;
  const habitDone = habits.filter((h) => dayLog[h.id]).length;
  const total = taskTotal + habitTotal;
  if (total === 0) return 0;
  return (taskDone + habitDone) / total;
}
