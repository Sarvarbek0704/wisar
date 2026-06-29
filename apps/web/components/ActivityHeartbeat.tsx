"use client";

import { useEffect, useRef } from "react";
import { isLoggedIn } from "@/lib/auth";
import { addActivity } from "@/lib/me-api";

/**
 * Faol o'qish vaqtini yig'adi (4-vazifa). Sahifa ko'rinib turganida har sekund
 * sanaydi, har to'la daqiqada serverga `POST /me/activity` yuboradi (DailyActivity.minutes).
 * Sahifa yopilganda/yashirilganda qolgan daqiqalarni jo'natadi.
 */
export function ActivityHeartbeat() {
  const seconds = useRef(0);
  const pending = useRef(0);

  useEffect(() => {
    if (!isLoggedIn()) return;

    let active = typeof document !== "undefined" && !document.hidden;

    const flush = () => {
      const m = pending.current;
      if (m <= 0) return;
      pending.current = 0;
      addActivity({ minutes: m }).catch(() => {
        pending.current += m; // muvaffaqiyatsiz bo'lsa keyingi safar qayta yuboramiz
      });
    };

    const tick = window.setInterval(() => {
      if (!active) return;
      seconds.current += 1;
      if (seconds.current >= 60) {
        seconds.current = 0;
        pending.current += 1;
        flush();
      }
    }, 1000);

    const onVisibility = () => {
      active = !document.hidden;
      if (document.hidden) flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return null;
}
