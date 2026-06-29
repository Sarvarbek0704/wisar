"use client";

import { useEffect, useState } from "react";
import { Target, Check } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { getTodayActivity, type TodayActivity } from "@/lib/me-api";
import { ProgressRing } from "./ProgressRing";

/** Kunlik maqsad progress ringi (4-vazifa) — me sahifasida. */
export function DailyGoalRing({ size = 88 }: { size?: number }) {
  const [data, setData] = useState<TodayActivity | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getTodayActivity()
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="flex items-center gap-4">
      <ProgressRing pct={data.pct} size={size} barClass={data.goalMet ? "text-success" : "text-accent"}>
        {data.goalMet ? (
          <Check size={size / 3} className="text-success" />
        ) : (
          <>
            <span className="text-lg font-bold leading-none text-ink">{data.minutes}</span>
            <span className="text-[10px] text-soft">/{data.goal} daq</span>
          </>
        )}
      </ProgressRing>
      <div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Target size={15} className="text-accent" />
          Kunlik maqsad
        </div>
        <p className="mt-0.5 text-xs text-soft">
          {data.goalMet
            ? "Bugungi maqsad bajarildi 🎉"
            : `Bugun ${data.minutes}/${data.goal} daqiqa o'qidingiz`}
        </p>
      </div>
    </div>
  );
}
