"use client";

import { useEffect, useState } from "react";
import { isLoggedIn, getState } from "@/lib/me-api";

export function TopicProgress({
  articleIds,
  accent,
}: {
  articleIds: string[];
  accent?: string | null;
}) {
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getState()
      .then((s) => {
        const set = new Set(s.completed);
        setDone(articleIds.filter((id) => set.has(id)).length);
      })
      .catch(() => {});
  }, [articleIds]);

  if (done === null) return null;
  const total = articleIds.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mt-5 rounded-xl border border-line bg-page p-4 font-sans">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">Sizning progressingiz</span>
        <span className="text-soft">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: accent || "var(--accent)" }}
        />
      </div>
    </div>
  );
}
