import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { getTopics } from "@/lib/api";
import { topicIcon } from "@/lib/icon-map";

export const dynamic = "force-dynamic";

export default async function KurslarPage() {
  const topics = await getTopics().catch(() => [] as Awaited<ReturnType<typeof getTopics>>);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Kurslar</h1>
        <p className="mt-1 text-soft">Mavzuni tanlab, o'qishni boshlang.</p>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-2xl border border-line bg-page p-12 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-soft/40" />
          <p className="text-soft">Kurslar yuklanmadi.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => {
            const Icon = topicIcon(t.icon);
            return (
              <Link
                key={t.id}
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
                  <p className="mt-1.5 flex-1 line-clamp-3 text-sm text-soft">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
