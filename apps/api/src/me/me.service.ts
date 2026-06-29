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

  async bookmarks(userId: string) {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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
    });
    return rows.map((r) => ({
      title: r.article.title,
      readingTime: r.article.readingTime,
      topicSlug: r.article.section.topic.slug,
      topicTitle: r.article.section.topic.title,
      sectionSlug: r.article.section.slug,
      sectionTitle: r.article.section.title,
      slug: r.article.slug,
    }));
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

  // Shaxsiy dashboard: mavzular bo'yicha progress, davom ettirish, statistika
  async dashboard(userId: string) {
    const [topics, completedRows, bookmarkCount, last] = await Promise.all([
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
    };
  }
}
