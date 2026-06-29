"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Brain, TrendingUp, Flame, Target } from "lucide-react";
import {
  getInsights,
  getRecommendations,
  type Insights,
  type Recommendations,
} from "@/lib/me-api";

type TopicProgress = { slug: string; title: string; total: number; completed: number };

/** GitHub uslubidagi yillik heatmap + haftalik trend + tavsiyalar (10,30,32-vazifa). Inline SVG. */
export function InsightsPanel({ topicProgress }: { topicProgress: TopicProgress[] }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [recs, setRecs] = useState<Recommendations | null>(null);

  useEffect(() => {
    getInsights().then(setInsights).catch(() => {});
    getRecommendations().then(setRecs).catch(() => {});
  }, []);

  const strong = [...topicProgress]
    .filter((t) => t.total > 0)
    .map((t) => ({ ...t, pct: t.completed / t.total }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Tavsiyalar (10-vazifa) */}
      {recs && (recs.nextArticle || recs.weakTopics.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recs.nextArticle && (
            <Link
              href={`/${recs.nextArticle.topicSlug}/${recs.nextArticle.sectionSlug}/${recs.nextArticle.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 transition hover:bg-accent/10"
            >
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-white">
                <Play size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-wide text-accent">Keyingi dars</span>
                <span className="block truncate font-semibold text-ink">{recs.nextArticle.title}</span>
              </span>
            </Link>
          )}
          {recs.weakTopics.length > 0 && (
            <div className="rounded-2xl border border-line bg-page p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Brain size={15} className="text-rose-500" /> Zaif mavzular
              </div>
              <div className="space-y-1.5">
                {recs.weakTopics.map((t) => (
                  <div key={t.slug} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink">{t.title}</span>
                    <Link
                      href="/review"
                      className="ml-2 flex-none rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-500/20"
                    >
                      {t.count} xato · mustahkamlash
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Heatmap + trend (30-vazifa) */}
      {insights && (
        <div className="rounded-2xl border border-line bg-page p-5">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Flame size={15} className="text-orange-500" /> O'rganish faolligi (yil)
          </div>
          <Heatmap data={insights.heatmap} />

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Faol kunlar" value={insights.totals.activeDays} />
            <Stat label="Jami daqiqa" value={insights.totals.totalMinutes} />
            <Stat label="Maqolalar" value={insights.totals.totalArticles} />
            <Stat label="Kartalar" value={insights.totals.totalCards} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <TrendingUp size={15} className="text-accent" /> Haftalik trend (daqiqa)
            </div>
            <WeeklyTrend data={insights.weekly} />
          </div>
        </div>
      )}

      {/* Kuchli mavzular (30-vazifa) */}
      {strong.length > 0 && (
        <div className="rounded-2xl border border-line bg-page p-5">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Target size={15} className="text-success" /> Kuchli mavzular
          </div>
          <div className="space-y-2">
            {strong.map((t) => (
              <div key={t.slug} className="flex items-center gap-3 text-sm">
                <span className="w-28 flex-none truncate text-ink sm:w-40">{t.title}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-success" style={{ width: `${t.pct * 100}%` }} />
                </div>
                <span className="w-10 flex-none text-right text-xs text-soft">{Math.round(t.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-bold text-ink">{value}</div>
      <div className="text-xs text-soft">{label}</div>
    </div>
  );
}

function Heatmap({ data }: { data: { date: string; minutes: number }[] }) {
  const byDate = new Map(data.map((d) => [d.date, d.minutes]));
  const weeks = 53;
  const cell = 11;
  const gap = 3;
  const today = new Date();
  // Joriy haftaning yakshanbasi (ustun oxiri)
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - today.getDay()));

  const cells: { x: number; y: number; minutes: number; date: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(end);
      day.setDate(end.getDate() - (weeks - 1 - w) * 7 - (6 - d));
      const key = day.toISOString().slice(0, 10);
      cells.push({ x: w * (cell + gap), y: d * (cell + gap), minutes: byDate.get(key) ?? 0, date: key });
    }
  }
  const width = weeks * (cell + gap);
  const height = 7 * (cell + gap);

  function color(m: number): string {
    if (m <= 0) return "var(--line)";
    if (m < 5) return "color-mix(in srgb, var(--accent) 35%, transparent)";
    if (m < 15) return "color-mix(in srgb, var(--accent) 60%, transparent)";
    if (m < 30) return "color-mix(in srgb, var(--accent) 80%, transparent)";
    return "var(--accent)";
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        {cells.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={cell}
            height={cell}
            rx={2}
            fill={color(c.minutes)}
          >
            <title>{`${c.date}: ${c.minutes} daqiqa`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

function WeeklyTrend({ data }: { data: { week: string; minutes: number }[] }) {
  const max = Math.max(...data.map((d) => d.minutes), 1);
  const barW = 28;
  const gap = 10;
  const h = 80;
  const width = data.length * (barW + gap);
  return (
    <svg width={width} height={h + 18} className="block">
      {data.map((d, i) => {
        const bh = (d.minutes / max) * h;
        return (
          <g key={i}>
            <rect
              x={i * (barW + gap)}
              y={h - bh}
              width={barW}
              height={bh}
              rx={3}
              fill="var(--accent)"
              opacity={0.35 + (i / data.length) * 0.65}
            >
              <title>{`${d.week}: ${d.minutes} daqiqa`}</title>
            </rect>
            <text
              x={i * (barW + gap) + barW / 2}
              y={h + 13}
              textAnchor="middle"
              style={{ fontSize: 9, fill: "var(--soft)" }}
            >
              {d.week.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
