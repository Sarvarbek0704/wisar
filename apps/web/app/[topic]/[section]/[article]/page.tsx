import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { renderMarkdown, extractTocFromHtml } from "@wisar/content";
import { getArticle, getTopic } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { ArticleToc } from "@/components/ArticleToc";
import { ReadingProgress } from "@/components/ReadingProgress";
import { CopyCodeEnhancer } from "@/components/CopyCodeEnhancer";
import { ReaderSettings } from "@/components/ReaderSettings";
import { ArticleActions } from "@/components/ArticleActions";
import { ArticleContent } from "@/components/ArticleContent";
import { AiTutor } from "@/components/AiTutor";
import { Comments } from "@/components/Comments";
import { KeyboardNav } from "@/components/KeyboardNav";
import { ActivityHeartbeat } from "@/components/ActivityHeartbeat";
import { ReadingPosition } from "@/components/ReadingPosition";
import { CrossRefNav } from "@/components/CrossRefNav";
import { ArticleQuiz } from "@/components/ArticleQuiz";
import { Highlighter } from "@/components/Highlighter";
import { ArticleAudio } from "@/components/ArticleAudio";

export const dynamic = "force-dynamic";

type Params = Promise<{ topic: string; section: string; article: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { topic, section, article } = await params;
  const data = await getArticle(topic, section, article).catch(() => null);
  if (!data) return {};
  const url = `/${topic}/${section}/${article}`;
  const desc = data.article.excerpt || `${data.topic.title} — ${data.article.title}`;
  return {
    title: data.article.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: data.article.title,
      description: desc,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: data.article.title,
      description: desc,
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { topic: t, section: s, article: a } = await params;

  const [data, topicDetail] = await Promise.all([
    getArticle(t, s, a).catch(() => null),
    getTopic(t).catch(() => null),
  ]);
  if (!data || !topicDetail) notFound();

  const html = renderMarkdown(data.article.content);
  const toc = extractTocFromHtml(html);

  const prevHref = data.prev
    ? `/${data.prev.topicSlug}/${data.prev.sectionSlug}/${data.prev.slug}`
    : null;
  const nextHref = data.next
    ? `/${data.next.topicSlug}/${data.next.sectionSlug}/${data.next.slug}`
    : null;

  // JSON-LD structured data (39-vazifa)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.article.title,
    description: data.article.excerpt || undefined,
    articleSection: data.article.section.title,
    inLanguage: "uz",
    isPartOf: { "@type": "Course", name: data.topic.title },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingProgress />
      <ActivityHeartbeat />
      <Highlighter articleId={data.article.id} />
      <ReadingPosition articleId={data.article.id} />
      <CrossRefNav
        topic={t}
        sections={topicDetail.sections.map((sec) => ({
          slug: sec.slug,
          articles: sec.articles.map((ar) => ar.slug),
        }))}
      />
      <KeyboardNav prev={prevHref} next={nextHref} />
      <div
        id="reader"
        className="mx-auto flex max-w-[84rem] items-start gap-6 px-4 py-8 lg:gap-8"
      >
        <Sidebar topic={topicDetail} activeSection={s} activeArticle={a} />

        <article className="min-w-0 flex-1 animate-fade-in">
          <div className="article-card mx-auto max-w-page rounded-2xl border border-line bg-page p-6 shadow-card sm:p-10">
            {/* Breadcrumb + sozlamalar */}
            <div className="mb-5 flex flex-wrap items-center gap-2 font-sans text-xs text-soft">
              <Link href={`/${t}`} className="hover:text-accent">
                {data.topic.title}
              </Link>
              <span>/</span>
              <span>{data.article.section.title}</span>
              <span className="ml-auto inline-flex items-center gap-1">
                <Clock size={13} />
                {data.article.readingTime} daqiqa
              </span>
              <ReaderSettings />
            </div>

            {/* Foydalanuvchi amallari: o'qildi / saqlash / eslatma / AI yordam / tinglash */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <ArticleActions articleId={data.article.id} />
              <AiTutor articleId={data.article.id} />
              <ArticleAudio />
            </div>

            {/* Kontent (JS CodeRunner + fill-in-blank interaktivligi bilan) */}
            <ArticleContent html={html} articleId={data.article.id} />

            {/* Oldingi / keyingi */}
            <nav className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
              {data.prev ? (
                <Link
                  href={`/${data.prev.topicSlug}/${data.prev.sectionSlug}/${data.prev.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-line p-3 font-sans transition hover:border-accent/40"
                >
                  <ArrowLeft size={18} className="flex-none text-soft" />
                  <span className="min-w-0">
                    <span className="block text-xs text-soft">Oldingi</span>
                    <span className="block truncate font-medium text-ink group-hover:text-accent">
                      {data.prev.title}
                    </span>
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {data.next && (
                <Link
                  href={`/${data.next.topicSlug}/${data.next.sectionSlug}/${data.next.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-line p-3 text-right font-sans transition hover:border-accent/40 sm:justify-end"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-soft">Keyingi</span>
                    <span className="block truncate font-medium text-ink group-hover:text-accent">
                      {data.next.title}
                    </span>
                  </span>
                  <ArrowRight size={18} className="flex-none text-soft" />
                </Link>
              )}
            </nav>

            {/* Maqola oxiri active-recall test (8-vazifa) */}
            <ArticleQuiz articleId={data.article.id} quiz={data.articleQuiz ?? null} />

            {/* Izohlar */}
            <Comments articleId={data.article.id} />
          </div>
        </article>

        <ArticleToc toc={toc} />
      </div>

      <CopyCodeEnhancer trigger={data.article.id} />
    </>
  );
}
