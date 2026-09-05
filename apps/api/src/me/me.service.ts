import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  // Foydalanuvchi holati: o'qilgan + saqlangan maqola ID'lari
  async state(userId: string) {
    const [progress, bookmarks] = await Promise.all([
      this.prisma.progress.findMany({
        where: { userId, completed: true },
        select: { articleId: true },
      }),
      this.prisma.bookmark.findMany({
        where: { userId },
        select: { articleId: true },
      }),
    ]);
    return {
      completed: progress.map((p) => p.articleId),
      bookmarked: bookmarks.map((b) => b.articleId),
    };
  }

  markProgress(userId: string, articleId: string) {
    return this.prisma.progress.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId, completed: true },
      update: { completed: true },
    });
  }
  unmarkProgress(userId: string, articleId: string) {
    return this.prisma.progress.deleteMany({ where: { userId, articleId } });
  }

  addBookmark(userId: string, articleId: string) {
    return this.prisma.bookmark.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: {},
    });
  }
  removeBookmark(userId: string, articleId: string) {
    return this.prisma.bookmark.deleteMany({ where: { userId, articleId } });
  }

  async bookmarks(userId: string, take = 20, skip = 0) {
    const safeTake = Math.min(100, Math.max(1, take));
    const [rows, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: safeTake,
        skip: Math.max(0, skip),
        include: {
          article: {
            select: {
              slug: true,
              title: true,
              readingTime: true,
              section: {
                select: {
                  slug: true,
                  title: true,
                  topic: { select: { slug: true, title: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);
    return {
      items: rows.map((r) => ({
        title: r.article.title,
        readingTime: r.article.readingTime,
        topicSlug: r.article.section.topic.slug,
        topicTitle: r.article.section.topic.title,
        sectionSlug: r.article.section.slug,
        sectionTitle: r.article.section.title,
        slug: r.article.slug,
      })),
      total,
    };
  }

  getNote(userId: string, articleId: string) {
    return this.prisma.note.findFirst({ where: { userId, articleId } });
  }
  async saveNote(userId: string, articleId: string, body: string) {
    const existing = await this.prisma.note.findFirst({
      where: { userId, articleId },
    });
    if (existing) {
      return this.prisma.note.update({
        where: { id: existing.id },
        data: { body },
      });
    }
    return this.prisma.note.create({ data: { userId, articleId, body } });
  }
  deleteNote(userId: string, articleId: string) {
    return this.prisma.note.deleteMany({ where: { userId, articleId } });
  }

  // ─── Highlight + inline izoh (24-vazifa) ─────────────────────────────────────
  createHighlight(
    userId: string,
    data: { articleId: string; quote: string; prefix?: string; note?: string; color?: string },
  ) {
    return this.prisma.highlight.create({
      data: {
        userId,
        articleId: data.articleId,
        quote: data.quote.slice(0, 1000),
        prefix: data.prefix?.slice(0, 60) ?? null,
        note: data.note?.slice(0, 2000) ?? null,
        color: data.color ?? "yellow",
      },
    });
  }

  listHighlights(userId: string, articleId: string) {
    return this.prisma.highlight.findMany({
      where: { userId, articleId },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Foydalanuvchining barcha highlightlari (me/bookmarks ko'rinishi uchun). */
  async allHighlights(userId: string) {
    const rows = await this.prisma.highlight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        article: {
          select: {
            slug: true,
            title: true,
            section: { select: { slug: true, topic: { select: { slug: true } } } },
          },
        },
      },
    });
    return rows.map((h) => ({
      id: h.id,
      quote: h.quote,
      note: h.note,
      color: h.color,
      createdAt: h.createdAt,
      articleTitle: h.article.title,
      href: `/${h.article.section.topic.slug}/${h.article.section.slug}/${h.article.slug}`,
    }));
  }

  async updateHighlight(userId: string, id: string, note: string) {
    const h = await this.prisma.highlight.findUnique({ where: { id } });
    if (!h || h.userId !== userId) return { ok: false };
    await this.prisma.highlight.update({ where: { id }, data: { note: note.slice(0, 2000) } });
    return { ok: true };
  }

  async deleteHighlight(userId: string, id: string) {
    await this.prisma.highlight.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  /** O'qish pozitsiyasini saqlaydi (5-vazifa) — completed holatiga tegmaydi. */
  saveScroll(userId: string, articleId: string, pct: number) {
    const clamped = Math.max(0, Math.min(1, pct));
    return this.prisma.progress.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId, completed: false, scrollPct: clamped },
      update: { scrollPct: clamped },
    });
  }

  async getScroll(userId: string, articleId: string) {
    const p = await this.prisma.progress.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    return { scrollPct: p?.scrollPct ?? null, completed: p?.completed ?? false };
  }

  /**
   * Adaptiv tavsiyalar (10,32-vazifa): keyingi o'qilmagan maqola + zaif mavzular.
   * Zaif mavzu = review navbatidagi xato savollar eng ko'p bo'lgan mavzu.
   */
  async recommendations(userId: string) {
    // Zaif mavzular — review navbatidagi xato savollar bo'yicha
    const items = await this.prisma.reviewItem.findMany({
      where: { userId, kind: "question" },
      select: { refId: true },
    });
    const qIds = items.map((i) => i.refId);
    let weakTopics: { slug: string; title: string; count: number }[] = [];
    if (qIds.length) {
      const qs = await this.prisma.question.findMany({
        where: { id: { in: qIds } },
        select: {
          quiz: { select: { section: { select: { topic: { select: { slug: true, title: true } } } } } },
        },
      });
      const map = new Map<string, { slug: string; title: string; count: number }>();
      for (const q of qs) {
        const t = q.quiz.section.topic;
        const e = map.get(t.slug) ?? { slug: t.slug, title: t.title, count: 0 };
        e.count += 1;
        map.set(t.slug, e);
      }
      weakTopics = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 3);
    }

    // Keyingi o'qilmagan maqola (tartib bo'yicha birinchi)
    const completedRows = await this.prisma.progress.findMany({
      where: { userId, completed: true },
      select: { articleId: true },
    });
    const completed = new Set(completedRows.map((p) => p.articleId));
    const topics = await this.prisma.topic.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      select: {
        slug: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            slug: true,
            articles: {
              where: { published: true },
              orderBy: { order: "asc" },
              select: { id: true, slug: true, title: true },
            },
          },
        },
      },
    });
    let nextArticle: { topicSlug: string; sectionSlug: string; slug: string; title: string } | null = null;
    outer: for (const t of topics) {
      for (const s of t.sections) {
        for (const a of s.articles) {
          if (!completed.has(a.id)) {
            nextArticle = { topicSlug: t.slug, sectionSlug: s.slug, slug: a.slug, title: a.title };
            break outer;
          }
        }
      }
    }

    return { nextArticle, weakTopics };
  }

  /** Onboarding aniqlagan CEFR darajasini saqlaydi (10-vazifa). */
  async setCefr(userId: string, level: string) {
    const valid = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const safe = valid.includes(level) ? level : null;
    await this.prisma.user.update({ where: { id: userId }, data: { cefrLevel: safe } });
    return { cefrLevel: safe };
  }

  /** Haftalik hisobot xatiga obuna holatini o'zgartiradi. */
  async setEmailOptIn(userId: string, optIn: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { emailOptIn: optIn } });
    return { emailOptIn: optIn };
  }

  // Shaxsiy dashboard: mavzular bo'yicha progress, davom ettirish, statistika
  async dashboard(userId: string) {
    const [topics, completedRows, bookmarkCount, last, prefs] = await Promise.all([
      this.prisma.topic.findMany({
        where: { published: true },
        orderBy: { order: "asc" },
        select: {
          slug: true,
          title: true,
          accent: true,
          icon: true,
          sections: {
            select: {
              articles: { where: { published: true }, select: { id: true } },
            },
          },
        },
      }),
      this.prisma.progress.findMany({
        where: { userId, completed: true },
        select: { articleId: true },
      }),
      this.prisma.bookmark.count({ where: { userId } }),
      this.prisma.progress.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: {
          article: {
            select: {
              slug: true,
              title: true,
              readingTime: true,
              section: {
                select: { slug: true, topic: { select: { slug: true, title: true } } },
              },
            },
          },
        },
      }),
      // Email obunasi — sozlamalar tugmasi uchun (qo'shimcha so'rovsiz)
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { emailOptIn: true },
      }),
    ]);

    const completed = new Set(completedRows.map((p) => p.articleId));

    const topicProgress = topics.map((t) => {
      const ids = t.sections.flatMap((s) => s.articles.map((a) => a.id));
      const done = ids.filter((id) => completed.has(id)).length;
      return {
        slug: t.slug,
        title: t.title,
        accent: t.accent,
        icon: t.icon,
        total: ids.length,
        completed: done,
      };
    });

    const lastRead = last
      ? {
          topicSlug: last.article.section.topic.slug,
          topicTitle: last.article.section.topic.title,
          sectionSlug: last.article.section.slug,
          slug: last.article.slug,
          title: last.article.title,
          readingTime: last.article.readingTime,
        }
      : null;

    return {
      topicProgress,
      lastRead,
      bookmarkCount,
      completedCount: completed.size,
      emailOptIn: prefs?.emailOptIn ?? true,
    };
  }
}
