"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, HelpCircle } from "lucide-react";
import type { TopicDetail } from "@/lib/api";

interface Props {
  topic: TopicDetail;
  activeSection: string;
  activeArticle: string;
}

export function Sidebar({ topic, activeSection, activeArticle }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    topic.sections.forEach((s) => { init[s.id] = s.slug === activeSection; });
    return init;
  });

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-line bg-page p-3 shadow-card">
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted">
          {topic.title}
        </p>

        <nav className="space-y-0.5">
          {topic.sections.map((section) => {
            const isOpenSec = open[section.id];
            const isActiveSec = section.slug === activeSection;

            return (
              <div key={section.id}>
                <button
                  onClick={() => setOpen((p) => ({ ...p, [section.id]: !p[section.id] }))}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium transition-colors ${
                    isActiveSec
                      ? "bg-accent-bg text-accent"
                      : "text-soft hover:bg-black/[0.03] hover:text-ink"
                  }`}
                >
                  <span className="flex-1 leading-tight">{section.title}</span>
                  {isOpenSec
                    ? <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
                    : <ChevronRight size={13} className="flex-shrink-0 opacity-40" />
                  }
                </button>

                {isOpenSec && (
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l border-line pl-3">
                    {section.articles.map((article) => {
                      const isActiveArt = article.slug === activeArticle;
                      return (
                        <Link
                          key={article.id}
                          href={`/${topic.slug}/${section.slug}/${article.slug}`}
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                            isActiveArt
                              ? "bg-accent-bg font-semibold text-accent"
                              : "text-soft hover:bg-black/[0.03] hover:text-ink"
                          }`}
                        >
                          <BookOpen size={11} className="flex-shrink-0 opacity-50" />
                          <span className="leading-tight">{article.title}</span>
                        </Link>
                      );
                    })}
                    {section.quizzes?.map((quiz) => (
                      <Link
                        key={quiz.id}
                        href={`/${topic.slug}/${section.slug}/quiz/${quiz.id}`}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-soft transition-colors hover:bg-black/[0.03] hover:text-ink"
                      >
                        <HelpCircle size={11} className="flex-shrink-0 opacity-50" />
                        <span className="leading-tight">{quiz.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
