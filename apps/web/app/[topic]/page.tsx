import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ChevronRight, FileQuestion } from "lucide-react";
import { getTopic } from "@/lib/api";
import { topicIcon } from "@/lib/icon-map";
import { TopicProgress } from "@/components/TopicProgress";

export const dynamic = "force-dynamic";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: slug } = await params;
  const topic = await getTopic(slug).catch(() => null);
  if (!topic) notFound();

  const Icon = topicIcon(topic.icon);

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl text-white"
            style={{ background: topic.accent || "var(--accent)" }}
          >
            <Icon size={24} />
          </span>
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-ink">
            {topic.title}
          </h1>
        </div>
        {topic.description && (
          <p className="mt-3 text-lg text-soft">{topic.description}</p>
        )}

        <TopicProgress
          articleIds={topic.sections.flatMap((s) => s.articles.map((a) => a.id))}
          accent={topic.accent}
        />

        <div className="mt-10 space-y-10">
          {topic.sections.map((s) => (
            <section key={s.id}>
              <h2 className="border-l-4 border-accent pl-3 font-sans text-xl font-bold text-ink">
                {s.title}
              </h2>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-page">
                {s.articles.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/${slug}/${s.slug}/${a.slug}`}
                      className="group flex items-center gap-3 px-4 py-3 transition hover:bg-bg"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans font-medium text-ink group-hover:text-accent">
                          {a.title}
                        </span>
                        {a.excerpt && (
                          <span className="mt-0.5 line-clamp-1 text-sm text-soft">
                            {a.excerpt}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-none items-center gap-1 font-sans text-xs text-soft">
                        <Clock size={13} />
                        {a.readingTime} daq
                      </span>
                      <ChevronRight
                        size={16}
                        className="flex-none text-soft transition group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              {s.quizzes && s.quizzes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.quizzes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/quiz/${q.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 font-sans text-sm font-medium text-accent transition hover:bg-accent/10"
                    >
                      <FileQuestion size={15} />
                      {q.title}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
