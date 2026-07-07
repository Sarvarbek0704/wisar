"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, Brain, Layers, Sparkles, TrendingDown,
} from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { getDashboard, getRecommendations, type DashboardData, type Recommendations } from "@/lib/me-api";
import { getDueCount, type DueCount } from "@/lib/review-api";
import { DailyGoalRing } from "@/components/DailyGoalRing";

/**
 * "Bugungi fokus" paneli — platformadagi tayyor ma'lumotlarni (davom etilayotgan
 * dars, tavsiya, review navbati, kunlik maqsad) planner sahifasiga olib chiqadi.
 * Shu orqali planner umumiy todo-ilova emas, aynan Wisar'dagi o'qishga bog'langan
 * "bugungi ish markazi" bo'ladi.
 */
export function TodayFocusPanel({ onPickLink }: { onPickLink: (href: string, title: string) => void }) {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [rec, setRec] = useState<Recommendations | null>(null);
  const [due, setDue] = useState<DueCount | null>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const l = isLoggedIn();
    setLogged(l);
    if (!l) return;
    getDashboard().then(setDash).catch(() => {});
    getRecommendations().then(setRec).catch(() => {});
    getDueCount().then(setDue).catch(() => {});
  }, []);

  if (!logged) return null;

  const continueItem = dash?.lastRead ?? null;
  const startItem = !continueItem ? rec?.nextArticle ?? null : null;
  const weak = rec?.weakTopics?.[0] ?? null;
  const dueTotal = due?.total ?? 0;

  const hasContent = continueItem || startItem || dueTotal > 0 || weak;
  if (!dash && !rec && !due) return null; // hali yuklanmoqda — bo'sh joy qoldirmaymiz
  if (!hasContent) return null;

  function hrefOf(item: { topicSlug: string; sectionSlug: string; slug: string; title: string }) {
    return `/${item.topicSlug}/${item.sectionSlug}/${item.slug}`;
  }

  return (
    <div className="mb-5 rounded-2xl border border-accent/20 bg-accent/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={15} className="text-accent" />
        <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-accent">Bugungi fokus</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kunlik maqsad ring */}
        <div className="flex items-center justify-center rounded-xl border border-line bg-page p-3 sm:col-span-2 lg:col-span-1">
          <DailyGoalRing size={64} />
        </div>

        {/* Davom ettirish / boshlash */}
        {(continueItem || startItem) && (
          <FocusCard
            icon={BookOpen}
            iconClass="text-sky-500"
            label={continueItem ? "Davom ettirish" : "Keyingi dars"}
            title={(continueItem ?? startItem)!.title}
            action={() => {
              const item = (continueItem ?? startItem)!;
              onPickLink(hrefOf(item), item.title);
            }}
            href={hrefOf((continueItem ?? startItem)!)}
          />
        )}

        {/* Review navbati */}
        {dueTotal > 0 && (
          <Link
            href="/review"
            className="group flex flex-col justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 transition hover:border-amber-500/50"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <Layers size={13} /> Takrorlash kutmoqda
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-ink">{dueTotal}</span>
              <ArrowRight size={15} className="text-amber-600 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        )}

        {/* Zaif mavzu */}
        {weak && (
          <Link
            href={`/${weak.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 transition hover:border-rose-500/40"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
              <TrendingDown size={13} /> Mustahkamlash kerak
            </div>
            <span className="truncate text-sm font-semibold text-ink">{weak.title}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function FocusCard({
  icon: Icon, iconClass, label, title, action, href,
}: {
  icon: typeof BookOpen;
  iconClass: string;
  label: string;
  title: string;
  action: () => void;
  href: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-line bg-page p-3 sm:col-span-2 lg:col-span-1">
      <div className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${iconClass}`}>
        <Icon size={13} /> {label}
      </div>
      <p className="mb-2 line-clamp-2 text-sm font-semibold text-ink">{title}</p>
      <div className="flex items-center gap-2">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          O'qish <ArrowRight size={11} />
        </Link>
        <button
          onClick={action}
          title="Bugungi darsga belgilash (Kunim paneliga)"
          className="inline-flex items-center gap-1 text-xs font-medium text-soft hover:text-accent"
        >
          <Brain size={11} /> Rejaga qo'shish
        </button>
      </div>
    </div>
  );
}
