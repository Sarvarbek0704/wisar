"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, FileText, MessageSquare, Layers, BookOpen,
  HelpCircle, Ticket, Bookmark, TrendingUp, ShieldCheck, Activity,
} from "lucide-react";
import { adminStats, type AdminStats } from "@/lib/admin-api";
import { CardsSkeleton } from "@/components/Skeleton";
import { AdminInsights } from "@/components/admin/AdminInsights";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminStats().then(setStats).catch((e) => setErr((e as Error).message));
  }, []);

  if (err) return <p className="text-rose-500">{err}</p>;
  if (!stats) return <div><div className="mb-6 h-8 w-40 animate-pulse rounded bg-line/60" /><CardsSkeleton count={8} /></div>;

  const t = stats.totals;
  const maxSignup = Math.max(...stats.signups.map((s) => s.count), 1);

  const cards = [
    { icon: Users, label: "Foydalanuvchilar", value: t.users, sub: `${t.admins} admin`, href: "/admin/users", color: "#0ea5e9" },
    { icon: FileText, label: "Maqolalar", value: t.articles, sub: `${t.publishedArticles} chop etilgan`, href: "/admin/content", color: "#22c55e" },
    { icon: Layers, label: "Mavzular", value: t.topics, sub: `${t.sections} bo'lim`, href: "/admin/content", color: "#8b5cf6" },
    { icon: MessageSquare, label: "Izohlar", value: t.comments, sub: "moderatsiya", href: "/admin/comments", color: "#f59e0b" },
    { icon: BookOpen, label: "Flashcardlar", value: t.flashcards, sub: `${t.decks} dasta`, color: "#ec4899" },
    { icon: HelpCircle, label: "Testlar", value: t.quizzes, sub: `${t.questions} savol`, color: "#14b8a6" },
    { icon: Bookmark, label: "Saqlanganlar", value: t.bookmarks, sub: `${t.notes} eslatma`, color: "#6366f1" },
    { icon: Ticket, label: "Takliflar", value: t.invites, sub: "invite", href: "/admin/invites", color: "#ef4444" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="text-accent" size={22} />
        <div>
          <h1 className="text-2xl font-bold text-ink">Boshqaruv paneli</h1>
          <p className="text-sm text-soft">Sayt umumiy holati va statistikasi</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600" title="Bugun faol foydalanuvchilar">
            <Activity size={13} /> {stats.active.today} bugun · {stats.active.week} hafta faol
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
            <TrendingUp size={13} /> +{stats.newThisWeek} bu hafta
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <div className="h-full rounded-2xl border border-line bg-page p-4 transition hover:border-accent/40">
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${c.color}1a`, color: c.color }}>
                <c.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-ink">{c.value.toLocaleString()}</div>
              <div className="text-xs font-medium text-ink/80">{c.label}</div>
              <div className="text-[11px] text-soft">{c.sub}</div>
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Signups chart */}
        <div className="rounded-2xl border border-line bg-page p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
            <TrendingUp size={17} className="text-accent" /> So'nggi 14 kun — ro'yxatdan o'tish
          </h2>
          <div className="flex h-32 items-end justify-between gap-1">
            {stats.signups.map((s) => (
              <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className="relative w-full overflow-hidden rounded bg-bg" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full rounded bg-accent/70 transition-all"
                      style={{ height: `${(s.count / maxSignup) * 100}%` }}
                      title={`${s.date}: ${s.count}`}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-soft">{s.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest users */}
        <div className="rounded-2xl border border-line bg-page p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <Users size={17} className="text-accent" /> Yangi foydalanuvchilar
          </h2>
          <div className="space-y-2">
            {stats.latestUsers.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users?focus=${u.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-bg"
              >
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent text-xs font-bold text-white">
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{u.name || u.email}</div>
                  <div className="truncate text-xs text-soft">{u.email}</div>
                </div>
                {u.role === "admin" && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">admin</span>}
                <span className="text-[11px] text-soft">{timeAgo(u.createdAt)}</span>
              </Link>
            ))}
            {stats.latestUsers.length === 0 && <p className="text-sm text-soft">Hali foydalanuvchi yo'q.</p>}
          </div>
        </div>

        {/* Mashhur kontent — eng ko'p o'qilgan */}
        <div className="rounded-2xl border border-line bg-page p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <FileText size={17} className="text-accent" /> Eng ko'p o'qilgan
          </h2>
          <div className="space-y-2">
            {stats.popularArticles.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                <span className="line-clamp-1 flex-1 text-sm text-ink/90">{a.title}</span>
                <span className="flex-none text-xs font-medium text-soft">{a.reads.toLocaleString()} o'qish</span>
              </div>
            ))}
            {stats.popularArticles.length === 0 && <p className="text-sm text-soft">Hali o'qish ma'lumoti yo'q.</p>}
          </div>
        </div>

        {/* CEFR daraja taqsimoti */}
        <div className="rounded-2xl border border-line bg-page p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <Layers size={17} className="text-accent" /> Daraja taqsimoti
          </h2>
          <div className="space-y-2">
            {stats.levelDist.map((l) => {
              const max = Math.max(...stats.levelDist.map((x) => x.count), 1);
              return (
                <div key={l.level} className="flex items-center gap-3">
                  <span className="w-8 flex-none text-xs font-semibold text-ink">{l.level}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-bg">
                    <div className="h-full rounded bg-accent/70" style={{ width: `${(l.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 flex-none text-right text-xs text-soft">{l.count}</span>
                </div>
              );
            })}
            {stats.levelDist.length === 0 && <p className="text-sm text-soft">Ma'lumot yo'q.</p>}
          </div>
        </div>

        {/* Latest comments */}
        <div className="rounded-2xl border border-line bg-page p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <MessageSquare size={17} className="text-accent" /> So'nggi izohlar
          </h2>
          <div className="space-y-2">
            {stats.latestComments.map((c) => (
              <div key={c.id} className="rounded-lg border border-line p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-soft">
                  <span className="font-medium text-ink">{c.user.name || c.user.email}</span>
                  <span>·</span>
                  <span className="truncate">{c.article.title}</span>
                  <span className="ml-auto flex-none">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-ink/80">{c.body}</p>
              </div>
            ))}
            {stats.latestComments.length === 0 && <p className="text-sm text-soft">Hali izoh yo'q.</p>}
          </div>
          <Link href="/admin/comments" className="mt-3 inline-block text-sm text-accent hover:underline">
            Barcha izohlar →
          </Link>
        </div>
      </div>

      {/* Kengaytirilgan analitika + audit (31,40-vazifa) */}
      <AdminInsights />
    </div>
  );
}
