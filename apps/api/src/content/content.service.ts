import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CacheService } from "../common/cache.service";

/** Public kontent kesh kaliti prefiksi (36-vazifa) */
export const CONTENT_CACHE_PREFIX = "content:";
const CONTENT_TTL_MS = 60_000;

type NavItem = {
  topicSlug: string;
  sectionSlug: string;
  slug: string;
  title: string;
} | null;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Sayt statistikasi — landing page uchun (keshlanadi 60s). */
  async stats() {
    return this.cache.wrap(`${CONTENT_CACHE_PREFIX}stats`, CONTENT_TTL_MS, async () => {
      const [articles, sections, topics, users] = await Promise.all([
        this.prisma.article.count({ where: { published: true } }),
        this.prisma.section.count(),
        this.prisma.topic.count({ where: { published: true } }),
        this.prisma.user.count(),
      ]);
      return { articles, sections, topics, users };
    });
  }

  /** Barcha mavzular (bo'limlar soni bilan) — keshlanadi 60s. */
  async topics() {
    return this.cache.wrap(`${CONTENT_CACHE_PREFIX}topics`, CONTENT_TTL_MS, () =>
      this.prisma.topic.findMany({
        where: { published: true },
        orderBy: { order: "asc" },
        include: { _count: { select: { sections: true } } },
      }),
    );
  }

  /** Bitta mavzu — bo'limlar va maqola ro'yxati bilan (kontent emas), keshlanadi 60s. */
  async topicBySlug(slug: string) {
    return this.cache.wrap(`${CONTENT_CACHE_PREFIX}topic:${slug}`, CONTENT_TTL_MS, () =>
      this.topicBySlugUncached(slug),
    );
  }

  private async topicBySlugUncached(slug: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            articles: {
              where: { published: true },
              orderBy: { order: "asc" },
              select: { id: true, slug: true, title: true, order: true, readingTime: true, excerpt: true },
            },
            quizzes: {
              orderBy: { order: "asc" },
              select: { id: true, title: true },
            },
          },
        },
      },
    });
    if (!topic) throw new NotFoundException("Mavzu topilmadi");
    return topic;
  }

  /** Bitta maqola (to'liq kontent) + oldingi/keyingi navigatsiya. */
  async article(topicSlug: string, sectionSlug: string, articleSlug: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { slug: topicSlug },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            articles: {
              where: { published: true },
              orderBy: { order: "asc" },
              select: { slug: true, title: true },
            },
          },
        },
      },
    });
    if (!topic) throw new NotFoundException("Mavzu topilmadi");

    const section = topic.sections.find((s) => s.slug === sectionSlug);
    if (!section) throw new NotFoundException("Bo'lim topilmadi");

    const article = await this.prisma.article.findFirst({
      where: { slug: articleSlug, section: { slug: sectionSlug, topic: { slug: topicSlug } } },
      include: { section: { select: { slug: true, title: true } } },
    });
    if (!article) throw new NotFoundException("Maqola topilmadi");

    // Tekis ro'yxat — oldingi/keyingi uchun
    const flat: { sectionSlug: string; slug: string; title: string }[] = [];
    for (const s of topic.sections) {
      for (const a of s.articles) {
        flat.push({ sectionSlug: s.slug, slug: a.slug, title: a.title });
      }
    }
    const idx = flat.findIndex(
      (f) => f.sectionSlug === sectionSlug && f.slug === articleSlug,
    );
    const toNav = (i: number): NavItem =>
      i >= 0 && i < flat.length
        ? { topicSlug, sectionSlug: flat[i].sectionSlug, slug: flat[i].slug, title: flat[i].title }
        : null;

    // Maqola oxiri testi (8-vazifa) — agar bog'langan bo'lsa
    const articleQuiz = await this.prisma.quiz.findFirst({
      where: { articleId: article.id },
      select: { id: true, title: true },
    });

    return {
      topic: { slug: topic.slug, title: topic.title, accent: topic.accent },
      article,
      prev: toNav(idx - 1),
      next: toNav(idx + 1),
      articleQuiz,
    };
  }

  /** Qidiruv — sarlavha yoki tavsifda (barcha mavzular bo'ylab). */
  async search(q: string) {
    const query = (q || "").trim();
    if (query.length < 2) return [];

    const select = {
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      section: { select: { slug: true, title: true, topic: { select: { slug: true, title: true } } } },
    } as const;
    // PostgreSQL case-insensitive qidiruv uchun mode: "insensitive"
    const titleOrExcerpt = {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { excerpt: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    // 1) Asosiy — sarlavha/excerpt'da topilganlar (eng relevant)
    const primary = await this.prisma.article.findMany({
      where: { published: true, ...titleOrExcerpt },
      select,
      take: 40,
    });

    // 2) Qo'shimcha — matn ICHIDA topilganlar
    let secondary: typeof primary = [];
    if (primary.length < 40) {
      secondary = await this.prisma.article.findMany({
        where: {
          published: true,
          content: { contains: query, mode: 'insensitive' as const },
          NOT: titleOrExcerpt,
        },
        select,
        take: 40 - primary.length,
      });
    }

    const toResult = (r: (typeof primary)[number], inContent: boolean) => ({
      title: r.title,
      excerpt: (inContent && this.snippet(r.content, query)) || r.excerpt,
      topicSlug: r.section.topic.slug,
      topicTitle: r.section.topic.title,
      sectionSlug: r.section.slug,
      sectionTitle: r.section.title,
      slug: r.slug,
    });

    return [...primary.map((r) => toResult(r, false)), ...secondary.map((r) => toResult(r, true))];
  }

  /** Ochiq foydalanuvchi profili (email va passwordHash yo'q). */
  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { streak: true, _count: { select: { progress: true } } },
    });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi");
    return {
      id: user.id,
      name: user.name,
      completedCount: user._count.progress,
      streakCurrent: user.streak?.current ?? 0,
      joinedAt: user.createdAt,
    };
  }

  /** Matn ichida topilgan so'z atrofidan o'qiladigan parcha (snippet) chiqaradi. */
  private snippet(content: string, query: string): string {
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return "";
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + query.length + 90);
    const s = content
      .slice(start, end)
      .replace(/[\r\n]+/g, " ")
      .replace(/[#*`>|]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return (start > 0 ? "…" : "") + s + (end < content.length ? "…" : "");
  }
}
