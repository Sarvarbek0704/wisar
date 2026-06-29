// IELTS progress — natijalarni localStorage'da saqlash + band hisoblash.
// (Shaxsiy o'quv vositasi — server/DB shart emas.)

export type Skill = "writing" | "speaking" | "reading" | "listening";

export type Attempt = {
  skill: Skill;
  band: number;
  date: string; // ISO
  detail?: string; // masalan "Task 2" yoki "8/10"
};

const KEY = "ielts-progress-v1";

export function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Attempt[];
  } catch {
    return [];
  }
}

export function saveAttempt(a: Attempt): void {
  if (typeof window === "undefined") return;
  const all = loadAttempts();
  all.push(a);
  localStorage.setItem(KEY, JSON.stringify(all.slice(-200)));
}

export function clearAttempts(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

/** Eng so'nggi band — har ko'nikma bo'yicha. */
export function latestBands(): Record<Skill, number | null> {
  const all = loadAttempts();
  const out: Record<Skill, number | null> = {
    writing: null,
    speaking: null,
    reading: null,
    listening: null,
  };
  for (const a of all) out[a.skill] = a.band;
  return out;
}

/** Umumiy band (4 ko'nikma o'rtachasi, 0.5 ga yaxlit) — IELTS qoidasi. */
export function overallBand(): number | null {
  const b = latestBands();
  const vals = Object.values(b).filter((x): x is number => x !== null);
  if (vals.length === 0) return null;
  const avg = vals.reduce((s, x) => s + x, 0) / vals.length;
  return Math.round(avg * 2) / 2;
}

/**
 * Reading/Listening: to'g'ri javoblar sonidan TAXMINIY band.
 * (Bitta passage/skript — to'liq 40-savollik test emas, shuning uchun taxminiy.)
 * Foiz asosida IELTS jadvaliga yaqinlashtirilgan.
 */
export function estimateBand(correct: number, total: number): number {
  if (total === 0) return 0;
  const p = correct / total;
  if (p >= 0.97) return 9;
  if (p >= 0.92) return 8.5;
  if (p >= 0.85) return 8;
  if (p >= 0.77) return 7.5;
  if (p >= 0.68) return 7;
  if (p >= 0.58) return 6.5;
  if (p >= 0.5) return 6;
  if (p >= 0.42) return 5.5;
  if (p >= 0.33) return 5;
  if (p >= 0.25) return 4.5;
  return 4;
}

/** Javobni solishtirish (TFNG/MCQ/completion — kichik farqlarga bardoshli). */
export function isCorrect(userAnswer: string, correct: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:"'()]/g, "")
      .replace(/\s+/g, " ");
  const u = norm(userAnswer);
  const c = norm(correct);
  if (!u) return false;
  if (u === c) return true;
  // "NOT GIVEN" / "NG", "TRUE"/"T", "FALSE"/"F"
  const map: Record<string, string> = { t: "true", f: "false", ng: "not given", "not given": "not given" };
  if (map[u] && map[u] === c) return true;
  // completion: bitta so'z to'g'ri kelsa (artikl farqi)
  if (c.replace(/^(a|an|the)\s+/, "") === u.replace(/^(a|an|the)\s+/, "")) return true;
  return false;
}
