"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { isLoggedIn, getToken } from "@/lib/auth";
import { checkin, getStreak, type StreakData } from "@/lib/streak-api";

const CHECKIN_KEY = "mana-streak-checkin";

export function StreakWidget() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) return;

    const today = new Date().toISOString().slice(0, 10);
    const lastCheckin = localStorage.getItem(CHECKIN_KEY);

    // Kuniga bir marta checkin
    if (lastCheckin !== today) {
      checkin()
        .then((s) => {
          setStreak(s);
          localStorage.setItem(CHECKIN_KEY, today);
        })
        .catch(() => {
          getStreak().then(setStreak).catch(() => {});
        });
    } else {
      getStreak().then(setStreak).catch(() => {});
    }
  }, []);

  if (!mounted || !streak) return null;

  const color = streak.current >= 7 ? "text-orange-500" : streak.current >= 3 ? "text-amber-500" : "text-soft";

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${color}`}
      title={`Eng uzun streak: ${streak.longest} kun`}
    >
      <Flame size={15} />
      {streak.current}
    </span>
  );
}
