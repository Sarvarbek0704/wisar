"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { isLoggedIn, getDashboard, type DashboardData } from "@/lib/me-api";

export function ContinueReading() {
  const [last, setLast] = useState<DashboardData["lastRead"]>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getDashboard()
      .then((d) => setLast(d.lastRead))
      .catch(() => {});
  }, []);

  if (!last) return null;

  return (
    <Link
      href={`/${last.topicSlug}/${last.sectionSlug}/${last.slug}`}
      className="mb-8 flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5 font-sans transition hover:bg-accent/10"
    >
      <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-accent text-white">
        <Play size={22} />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-accent">
          Davom ettirish
        </div>
        <div className="truncate font-bold text-ink">{last.title}</div>
        <div className="text-sm text-soft">{last.topicTitle}</div>
      </div>
    </Link>
  );
}
