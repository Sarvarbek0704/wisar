// Planner remote sync: auth bo'lsa server, bo'lmasa localStorage fallback

import { authFetch, isLoggedIn } from "@/lib/auth";
import type { DayData, Habit } from "@/lib/planner";

type HabitsPayload = { habits: string; log: string };

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
  } catch {
    // server mavjud bo'lmasa jimgina o'tkazib yuborish
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
  } catch {}
}
