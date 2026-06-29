import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Zap,
  BarChart3,
  CalendarDays,
  Layers,
  Sparkles,
  Users,
  FileText,
  Clock,
  Target,
  ChevronRight,
} from "lucide-react";
import { getTopics, getStats, type Topic, type SiteStats } from "@/lib/api";
import { topicIcon } from "@/lib/icon-map";
import { ContinueReading } from "@/components/ContinueReading";
import { FadeIn } from "@/components/landing/FadeIn";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Tuzilgan kurslar",
    desc: "Mavzular bo'limma-bo'lim, bosqichma-bosqich tuzilgan. Har bir maqola amaliy misollar bilan.",
  },
  {
    icon: Zap,
    title: "Interaktiv mashqlar",
    desc: "Fill-in-blank, kod yozish va test savollar. O'rganish faqat o'qish bilan tugamaydi.",
  },
  {
    icon: CalendarDays,
    title: "Kunlik planner",
    desc: "Maqsadlarni belgilab, harakat jadvalingizni tuzib boring. Odat shakllantirish tizimi.",
  },
  {
    icon: Layers,
    title: "Flashkartlar",
    desc: "SM-2 algoritmiga asoslangan takrorlash. Yangi so'z va tushunchalarni mustahkam eslab qolish.",
  },
  {
    icon: Sparkles,
    title: "IELTS tayyorgarlik",
    desc: "Reading, Writing, Listening, Speaking — to'liq mock test va natijalarni kuzatish.",
  },
  {
    icon: BarChart3,
    title: "Progress kuzatish",
    desc: "Streak tizimi, haftalik hisobot va sertifikat. O'sishingizni ko'rib boring.",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Ro'yxatdan o'ting",
    desc: "Bir daqiqada akkaunt ochib, o'z profilingiz va kuzatuv tizimingizga ega bo'ling.",
  },
  {
    num: "2",
    title: "Kursni tanlang",
    desc: "Mavjud kurslardan birini tanlang va o'rganishni boshlang.",
  },
  {
    num: "3",
    title: "Har kuni o'qing",
    desc: "Planner va streak tizimi motivatsiyani ushlab turadi. Platforma sertifikati bilan yakunlang.",
  },
];

export default async function Home() {
  let topics: Topic[] = [];
  let stats: SiteStats = { articles: 0, sections: 0, topics: 0, users: 0 };
  let apiUp = true;
  try {
    [topics, stats] = await Promise.all([getTopics(), getStats()]);
  } catch {
    apiUp = false;
  }

  const STATS = [
    { value: stats.articles ? `${stats.articles}+` : "200+", label: "Maqolalar" },
    { value: stats.sections ? `${stats.sections}+` : "12+",  label: "Bo'limlar" },
    { value: stats.topics   ? `${stats.topics}ta`  : "3ta",  label: "Kurslar" },
    { value: "Mutlaqo bepul", label: "" },
  ];

  return (
    <div className="min-h-screen">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand px-4 py-24 sm:py-36">
        {/* background decorations */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #059669 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0d9488 0%, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl text-center">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-white/80 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
              author — Sarvarbek Sodiqov
            </div>
          </FadeIn>

          <FadeIn delay={0.07}>
            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-7xl">
              <span className="text-accent">Wisar</span> — biz bilan<br />
              o'sing, yuksaling.
            </h1>
          </FadeIn>

          <FadeIn delay={0.14}>
            <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/70">
              Wisar — dasturlash va ingliz tilini o'rganishga ko'maklashuvchi,
              kun tartibingizni izga soluvchi, takliflarga binoan kengaytiriladigan platforma.
              Tuzilgan kurslar, interaktiv mashqlar, streak tizimi va IELTS tayyorgarlik va boshqalar...
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 font-semibold text-white shadow-brand transition hover:opacity-90 hover:-translate-y-px"
              >
                Boshlash
                <ArrowRight size={18} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="border-b border-line bg-page">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          {STATS.map((s) => (
            <div key={s.label} className="px-8 py-8 text-center">
              <div className="font-display text-3xl font-bold text-ink">{s.value}</div>
              <div className="mt-1 text-sm text-soft">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTINUE READING (logged-in only, client) ─────── */}
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <ContinueReading />
      </div>

      {/* ── KURSLAR ──────────────────────────────────────────── */}
      {(apiUp && topics.length > 0) && (
        <section className="bg-bg px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <FadeIn>
              <div className="mb-12 text-center">
                <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                  Kurslar
                </h2>
                <p className="mt-3 text-soft">
                  Quyidagi mavzulardan birini tanlab, o'qishni boshlang.
                </p>
              </div>
            </FadeIn>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((t, i) => {
                const Icon = topicIcon(t.icon);
                return (
                  <FadeIn key={t.id} delay={i * 0.07}>
                    <Link
                      href={`/${t.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-line bg-page p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card"
                    >
                      <span
                        className="grid h-12 w-12 place-items-center rounded-xl text-white transition group-hover:scale-105"
                        style={{ background: t.accent || "var(--accent)" }}
                      >
                        <Icon size={24} />
                      </span>
                      <h3 className="mt-4 font-sans text-lg font-bold text-ink">
                        {t.title}
                      </h3>
                      {t.description && (
                        <p className="mt-1.5 flex-1 line-clamp-2 text-sm text-soft">
                          {t.description}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                        {t._count?.sections ?? 0} bo'lim
                        <ChevronRight
                          size={15}
                          className="transition group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* API ulanmagan xabar */}
      {!apiUp && (
        <div className="mx-auto max-w-xl px-4 py-20">
          <div className="rounded-2xl border border-line bg-page p-6 text-center text-soft">
            <p className="font-semibold text-ink">API ulanmadi</p>
            <p className="mt-1 text-sm">
              Backend ishga tushganini tekshiring.{" "}
              <code className="rounded bg-bg px-1.5 py-0.5">npm run dev</code>
            </p>
          </div>
        </div>
      )}

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="bg-page px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                Nima beradi?
              </h2>
              <p className="mt-3 text-soft">
                Bir platformada barcha kerakli narsalar.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div className="group rounded-2xl border border-line bg-bg p-6 transition hover:border-accent/30 hover:shadow-card">
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                    <f.icon size={22} />
                  </span>
                  <h3 className="font-sans text-base font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-soft">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand px-4 py-24">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 70% 80%, #059669 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                Qanday ishlaydi?
              </h2>
              <p className="mt-3 text-white/60">
                Uch qadamda natijaga erishish.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <FadeIn key={s.num} delay={i * 0.1}>
                <div className="flex flex-col items-start">
                  <span className="font-display text-5xl font-bold text-accent">
                    {s.num}
                  </span>
                  <h3 className="mt-2 font-sans text-xl font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY WISAR ────────────────────────────────────────── */}
      <section className="bg-bg px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <FadeIn direction="left">
              <div>
                <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                  Nima uchun Wisar?
                </h2>
                <p className="mt-4 text-soft leading-relaxed">
                  Ko'pchilik platformalar murakkab, qimmat yoki keraksiz ma'lumotlarga to'la.
                  Wisar o'zbek tilida, ochiq va aniq — bilim olish shunday bo'lishi kerak.
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    "O'zbekcha professional kontent",
                    "Nazariya + amaliyot birgalikda",
                    "Streak va planner bilan tartib",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 size={18} className="flex-shrink-0 text-accent" />
                      <span className="text-ink">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
                  >
                    Hozir boshlash
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: FileText, label: "Maqolalar",      val: stats.articles ? `${stats.articles}+` : "200+" },
                  { icon: Users,    label: "Foydalanuvchi",  val: stats.users    ? `${stats.users}+`    : "Ochiq" },
                  { icon: BookOpen, label: "Kurslar",        val: stats.topics   ? `${stats.topics}ta`  : "3ta" },
                  { icon: Clock,    label: "O'qish vaqti",   val: stats.articles ? `${Math.round(stats.articles * 5 / 60)}+ soat` : "50+ soat" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-line bg-page p-5"
                  >
                    <card.icon size={24} className="text-accent" />
                    <div className="mt-3 font-display text-2xl font-bold text-ink">
                      {card.val}
                    </div>
                    <div className="mt-0.5 text-xs text-soft">{card.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-line bg-bg px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center text-sm text-muted sm:flex-row sm:justify-between sm:text-left">
          <span className="font-display font-bold text-ink tracking-tight">Wisar</span>
          <span>© {new Date().getFullYear()} Wisar. Barcha huquqlar himoyalangan.</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-ink transition-colors">Kirish</Link>
            <Link href="/register" className="hover:text-ink transition-colors">Ro'yxat</Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-muted/60">
          Platformadagi barcha kontent 100% sun'iy intellekt yordamida tayyorlangan.
        </p>
      </footer>
    </div>
  );
}
