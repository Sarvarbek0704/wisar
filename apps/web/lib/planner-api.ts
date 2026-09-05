// Planner remote sync: auth bo'lsa server, bo'lmasa localStorage fallback

import { authFetch, isLoggedIn } from "@/lib/auth";
import { ApiOfflineError } from "@/lib/http";
import { toast } from "@/lib/ui";
import type { DayData, Habit } from "@/lib/planner";

type HabitsPayload = { habits: string; log: string };

/**
 * Serverga saqlash xatosi. Tarmoq uzilishi — normal holat, jim o'tamiz
 * (localStorage baribir saqlaydi). Lekin server so'rovni RAD ETSA, bu dastur
 * xatosi — bir marta ko'rsatamiz, aks holda sinxronizatsiya oylab jim buziladi.
 */
let lastSyncWarn = 0;
function reportSyncFailure(e: unknown): void {
  if (e instanceof ApiOfflineError) return; // oddiy offline — kutilgan
  const now = Date.now();
  if (now - lastSyncWarn < 30_000) return;
  lastSyncWarn = now;
  toast("Reja serverga saqlanmadi — faqat shu qurilmada turibdi.", "error");
  // eslint-disable-next-line no-console
  console.error("[planner] server sinxronizatsiyasi muvaffaqiyatsiz:", e);
}

export async function loadDayRemote(date: string): Promise<DayData | null> {
  if (!isLoggedIn()) return null;
  try {
    const raw = await authFetch<{ data: string } | null>(`/planner/${date}`);
    if (!raw?.data) return null;
    return JSON.parse(raw.data) as DayData;
  } catch {
    return null;
  }
}

export async function saveDayRemote(date: string, data: DayData): Promise<void> {
  if (!isLoggedIn()) return;
  try {
    await authFetch(`/planner/${date}`, {
      method: "PUT",
      body: JSON.stringify({ data: JSON.stringify(data) }),
    });
  } catch (e) {
    reportSyncFailure(e);
  }
}

export async function loadHabitsRemote(): Promise<{ habits: Habit[]; log: Record<string, Record<string, boolean>> } | null> {
  if (!isLoggedIn()) return null;
  try {
    const raw = await authFetch<HabitsPayload>("/planner/habits");
    return {
      habits: JSON.parse(raw.habits || "[]"),
      log: JSON.parse(raw.log || "{}"),
    };
  } catch {
    return null;
  }
}

export async function saveHabitsRemote(
  habits: Habit[],
  log: Record<string, Record<string, boolean>>,
): Promise<void> {
  if (!isLoggedIn()) return;
  try {
    await authFetch("/planner/habits", {
      method: "PUT",
      body: JSON.stringify({ habits: JSON.stringify(habits), log: JSON.stringify(log) }),
    });
  } catch (e) {
    reportSyncFailure(e);
  }
}
