import { authFetch } from "@/lib/auth";

export type StreakData = {
  current: number;
  longest: number;
  lastCheckin: string | null;
};

export async function checkin(): Promise<StreakData> {
  return authFetch<StreakData>("/me/streak/checkin", { method: "POST" });
}

export async function getStreak(): Promise<StreakData> {
  return authFetch<StreakData>("/me/streak");
}
