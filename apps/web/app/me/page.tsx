"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Bookmark, CircleCheck, Play, Flame,
  Share2, Award, Layers, TrendingUp,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { isLoggedIn, getDashboard, type DashboardData } from "@/lib/me-api";
import { getStreak } from "@/lib/streak-api";
import { CardsSkeleton } from "@/components/Skeleton";
import { DailyGoalRing } from "@/components/DailyGoalRing";
import { InsightsPanel } from "@/components/InsightsPanel";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { ChangePassword } from "@/components/ChangePassword";

/* ── SVG helpers ──────────────────────────────────────── */

function RingChart({ pct, size = 72, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = size / 2 - stroke;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--accent)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: size < 60 ? 10 : 13, fontWeight: 700, fill: "var(--ink)" }}>
        {pct}%
      </text>
    </svg>
  );
}

function StreakGrid({ streakDays }: { streakDays: number }) {
  const total = 30;
  const today = new Date();
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const daysAgo = total - 1 - i;
        const active = daysAgo < streakDays;
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        return (
          <div
            key={i}
            title={label}
            className={`h-4 w-4 rounded-sm transition-colors ${
              active ? "bg-accent" : "bg-line"
            }`}
          />
        );
      })}
    </div>
  );
}

function MiniBar({ values, color = "var(--accent)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-10 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.3 + (i / values.length) * 0.7 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */

export default function MePage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const user = mounted ? getUser() : null;

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      Promise.all([
        getDashboard().catch(() => null),
        getStreak().catch(() => null),
      ]).then(([d, s]) => {
        setData(d);
        if (s) setStreak({ current: s.current, longest: s.longest ?? s.current });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (!mounted) return null;

  if (!isLoggedIn()) {
    return (
      <div className="mx-auto max-w-page px-4 py-16 text-center font-sans">
        <p className="text-soft">
          Shaxsiy sahifani ko'rish uchun{" "}
          <Link href="/login?next=/me" className="text-accent">kiring</Link>.
        </p>
      </div>
    );
  }

  const totalArticles = data?.topicProgress.reduce((s, t) => s + t.total, 0) ?? 0;
  const totalCompleted = data?.topicProgress.reduce((s, t) => s + t.completed, 0) ?? 0;
  const overallPct = totalArticles ? Math.round((totalCompleted / totalArticles) * 100) : 0;

  const mockWeek = [1, 0, 2, 1, 3, 1, streak?.current ? 1 : 0];

  return (
    <div className="px-4 py-6 font-sans sm:px-6">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Salom{user?.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-sm text-soft">O'qish progressingiz va statistikangiz.</p>
        </div>
        {user && (
          <Link
            href={`/profile/${user.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-soft hover:border-accent/40 hover:text-accent"
          >
            <Share2 size={12} /> Profil
          </Link>
        )}
      </div>

      {loading && <CardsSkeleton count={6} />}

      {data && (
        <div className="space-y-5">

          {/* ── Kunlik maqsad ringi (4-vazifa) ── */}
          <div className="rounded-2xl border border-line bg-page p-5">
            <DailyGoalRing />
          </div>

          {/* ── Row 1: Davom ettirish + Streak ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Davom ettirish */}
            <div className="sm:col-span-2">
              {data.lastRead ? (
                <Link
                  href={`/${data.lastRead.topicSlug}/${data.lastRead.sectionSlug}/${data.lastRead.slug}`}
                  className="flex h-full items-center gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5 transition hover:bg-accent/10"
                >
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-accent text-white">
                    <Play size={22} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-accent">Davom ettirish</div>
                    <div className="truncate font-bold text-ink">{data.lastRead.title}</div>
                    <div className="text-sm text-soft">{data.lastRead.topicTitle} · {data.lastRead.readingTime} daq</div>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/kurslar"
                  className="flex h-full items-center gap-4 rounded-2xl border border-line bg-page p-5 transition hover:border-accent/30"
                >
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-bg text-soft">
                    <BookOpen size={22} />
                  </span>
                  <div>
                    <div className="font-bold text-ink">O'qishni boshlang</div>
                    <div className="text-sm text-soft">Kurslardan birini tanlang</div>
                  </div>
                </Link>
              )}
            </div>

            {/* Streak card */}
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5">
              <div className="mb-2 flex items-center gap-1.5 text-orange-500">
                <Flame size={16} />
                <span className="text-xs font-medium">Streak</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-orange-700">
                  {streak?.current ?? "—"}
                </span>
                {streak?.current ? <span className="mb-1 text-orange-500">kun</span> : null}
              </div>
              {streak && streak.longest > 0 && (
                <div className="mt-1 text-xs text-orange-400">Rekord: {streak.longest} kun</div>
              )}
              <div className="mt-3">
                <MiniBar values={mockWeek} color="#f97316" />
              </div>
            </div>
          </div>

          {/* ── Row 2: Overall donut + Stats ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Umumiy progress */}
            <div className="col-span-2 flex items-center gap-5 rounded-2xl border border-line bg-page p-5 sm:col-span-1">
              <RingChart pct={overallPct} size={80} stroke={8} />
              <div>
                <div className="text-xs text-soft">Umumiy progress</div>
                <div className="mt-0.5 text-lg font-bold text-ink">{totalCompleted}/{totalArticles}</div>
                <div className="text-xs text-soft">maqola</div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="rounded-xl border border-line bg-page p-4">
              <div className="mb-1 flex items-center gap-1.5 text-soft">
                <CircleCheck size={15} />
                <span className="text-xs">O'qilgan</span>
              </div>
              <div className="text-2xl font-bold text-ink">{data.completedCount}</div>
              <div className="mt-1 text-xs text-soft">bob</div>
            </div>

            <Link href="/bookmarks" className="rounded-xl border border-line bg-page p-4 transition hover:border-accent/40">
              <div className="mb-1 flex items-center gap-1.5 text-soft">
                <Bookmark size={15} />
                <span className="text-xs">Saqlangan</span>
              </div>
              <div className="text-2xl font-bold text-ink">{data.bookmarkCount}</div>
              <div className="mt-1 text-xs text-soft">bookmark</div>
            </Link>

            <div className="rounded-xl border border-line bg-page p-4">
              <div className="mb-1 flex items-center gap-1.5 text-soft">
                <TrendingUp size={15} />
                <span className="text-xs">Mavzular</span>
              </div>
              <div className="text-2xl font-bold text-ink">{data.topicProgress.length}</div>
              <div className="mt-1 text-xs text-soft">ta kurs</div>
            </div>
          </div>

          {/* ── Row 3: Topics + Streak calendar ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Topics */}
            <div className="lg:col-span-3">
              <h2 className="mb-3 text-base font-bold text-ink">Mavzular bo'yicha</h2>
              <div className="space-y-3">
                {data.topicProgress.map((t) => {
                  const pct = t.total ? Math.round((t.completed / t.total) * 100) : 0;
                  return (
                    <Link
                      key={t.slug}
                      href={`/${t.slug}`}
                      className="flex items-center gap-4 rounded-xl border border-line bg-page p-4 transition hover:border-accent/40"
                    >
                      <RingChart pct={pct} size={52} stroke={5} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">{t.title}</div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: t.accent || "var(--accent)" }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-soft">{t.completed}/{t.total} maqola</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right column: streak calendar + quick links */}
            <div className="space-y-4 lg:col-span-2">
              {/* Streak calendar */}
              <div className="rounded-xl border border-line bg-page p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <Flame size={14} className="text-orange-500" />
                  <span className="text-sm font-semibold text-ink">So'nggi 30 kun</span>
                </div>
                <StreakGrid streakDays={streak?.current ?? 0} />
                <div className="mt-2 flex items-center gap-3 text-xs text-soft">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-line" /> Faoliyat yo'q</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-accent" /> Faol</span>
                </div>
              </div>

            </div>
          </div>

          {/* ── Tavsiyalar + analitika (10,30,32-vazifa) ── */}
          <InsightsPanel topicProgress={data.topicProgress} />

          {/* ── Xavfsizlik: parol + 2FA (40-vazifa) ── */}
          <ChangePassword />
          <TwoFactorSetup />

        </div>
      )}
    </div>
  );
}
