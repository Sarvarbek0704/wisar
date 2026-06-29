import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CacheService } from "../common/cache.service";
import { CONTENT_CACHE_PREFIX } from "../content/content.service";
import {
  CreateArticleDto,
  CreateQuestionDto,
  CreateQuizDto,
  CreateSectionDto,
  CreateTopicDto,
  UpdateArticleDto,
  UpdateQuestionDto,
  UpdateSectionDto,
  UpdateTopicDto,
} from "./dto";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/['"`]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "item"
  );
}

function readingTime(md: string): number {
  const words = md.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function dayStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
}

function excerpt(md: string): string {
  for (const line of md.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith(">") || t.startsWith("---") || t.startsWith("```")) continue;
    const clean = t.replace(/[*_`#>\[\]]/g, "").replace(/\(.*?\)/g, "").trim();
    if (clean.length > 20) return clean.slice(0, 200);
  }
  return "";
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Kontent o'zgargach public keshni tozalaydi (36-vazifa). */
  private async mutate<T>(p: Promise<T>): Promise<T> {
    const r = await p;
    this.cache.invalidate(CONTENT_CACHE_PREFIX);
    return r;
  }

  // Umumiy ko'rinish (admin dashboard)
  overview() {
    return this.prisma.topic.findMany({
      orderBy: { order: "asc" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { _count: { select: { articles: true } } },
        },
      },
    });
  }

  getArticle(id: string) {
    return this.prisma.article.findUnique({ where: { id } });
  }

  // To'liq dashboard statistikasi (superadmin)
  async stats() {
    const [
      users, admins, topics, sections, articles, publishedArticles,
      comments, quizzes, questions, flashcards, decks, invites, notes, bookmarks,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: "admin" } }),
      this.prisma.topic.count(),
      this.prisma.section.count(),
      this.prisma.article.count(),
      this.prisma.article.count({ where: { published: true } }),
      this.prisma.comment.count(),
      this.prisma.quiz.count(),
      this.prisma.question.count(),
      this.prisma.flashcard.count(),
      this.prisma.flashcardDeck.count(),
      this.prisma.invite.count(),
      this.prisma.note.count(),
      this.prisma.bookmark.count(),
    ]);

    // So'nggi 14 kun ro'yxatdan o'tishlar (kun bo'yicha)
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);
    const recent = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const signups: { date: string; count: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      signups.push({
        date: key,
        count: recent.filter((u) => u.createdAt.toISOString().slice(0, 10) === key).length,
      });
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = recent.filter((u) => u.createdAt >= weekAgo).length;

    // So'nggi foydalanuvchilar va izohlar
    const latestUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    const latestComments = await this.prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
    });

    return {
      totals: {
        users, admins, topics, sections, articles, publishedArticles,
        comments, quizzes, questions, flashcards, decks, invites, notes, bookmarks,
      },
      signups,
      newThisWeek,
      latestUsers,
      latestComments,
    };
  }

  /** Audit log yozuvi (40-vazifa). */
  audit(actorId: string, action: string, target?: string, meta?: unknown) {
    return this.prisma.auditLog.create({
      data: { actorId, action, target: target ?? null, meta: meta ? JSON.stringify(meta) : null },
    });
  }

  /** Audit jurnali (40-vazifa) — aktor email bilan. */
  async listAuditLog() {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    const actorIds = [...new Set(rows.map((r) => r.actorId))];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const map = new Map(actors.map((a) => [a.id, a.name || a.email]));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      target: r.target,
      meta: r.meta,
      createdAt: r.createdAt,
      actor: map.get(r.actorId) ?? r.actorId,
    }));
  }

  /** Kengaytirilgan analitika (31-vazifa): DAU/MAU, retention, funnel, top/least maqolalar. */
  async analytics() {
    const today = dayStr(0);
    const since30 = dayStr(-29);

    const [dauRows, mauRows] = await Promise.all([
      this.prisma.dailyActivity.findMany({
        where: { date: today, minutes: { gt: 0 } },
        select: { userId: true },
      }),
      this.prisma.dailyActivity.findMany({
        where: { date: { gte: since30 }, minutes: { gt: 0 } },
        select: { userId: true },
      }),
    ]);
    const dau = new Set(dauRows.map((r) => r.userId)).size;
    const mau = new Set(mauRows.map((r) => r.userId)).size;

    // Funnel: ro'yxat → tasdiqlangan → birinchi dars
    const [registered, verified, withProgress] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { progress: { some: {} } } }),
    ]);

    // Retention (so'nggi 30 kunlik kohort)
    const cohortSince = new Date();
    cohortSince.setDate(cohortSince.getDate() - 30);
    const cohort = await this.prisma.user.findMany({
      where: { createdAt: { gte: cohortSince } },
      select: { createdAt: true, dailyActivity: { select: { date: true } } },
    });
    let d1 = 0;
    let d7 = 0;
    for (const u of cohort) {
      const created = u.createdAt.toISOString().slice(0, 10);
      const diffs = u.dailyActivity.map((a) => diffDays(a.date, created)).filter((d) => d >= 1);
      if (diffs.some((d) => d === 1)) d1++;
      if (diffs.some((d) => d >= 1 && d <= 7)) d7++;
    }
    const retention = {
      cohort: cohort.length,
      d1: cohort.length ? Math.round((d1 / cohort.length) * 100) : 0,
      d7: cohort.length ? Math.round((d7 / cohort.length) * 100) : 0,
    };

    // Eng ko'p / kam o'qilgan maqolalar (Progress soni bo'yicha)
    const grouped = await this.prisma.progress.groupBy({
      by: ["articleId"],
      _count: { articleId: true },
      orderBy: { _count: { articleId: "desc" } },
    });
    const topIds = grouped.slice(0, 5).map((g) => g.articleId);
    const leastIds = grouped.slice(-5).reverse().map((g) => g.articleId);
    const ids = [...new Set([...topIds, ...leastIds])];
    const articles = ids.length
      ? await this.prisma.article.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
      : [];
    const titleMap = new Map(articles.map((a) => [a.id, a.title]));
    const countMap = new Map(grouped.map((g) => [g.articleId, g._count.articleId]));
    const toItems = (idList: string[]) =>
      idList
        .filter((id) => titleMap.has(id))
        .map((id) => ({ title: titleMap.get(id)!, reads: countMap.get(id) ?? 0 }));

    return {
      dau,
      mau,
      funnel: { registered, verified, withProgress },
      retention,
      topArticles: toItems(topIds),
      leastArticles: toItems(leastIds),
    };
  }

  // --- Topic ---
  createTopic(dto: CreateTopicDto) {
    return this.mutate(
      this.prisma.topic.create({
        data: { ...dto, slug: dto.slug || slugify(dto.title) },
      }),
    );
  }
  updateTopic(id: string, dto: UpdateTopicDto) {
    return this.mutate(this.prisma.topic.update({ where: { id }, data: dto }));
  }
  deleteTopic(id: string) {
    return this.mutate(this.prisma.topic.delete({ where: { id } }));
  }

  // --- Section ---
  createSection(dto: CreateSectionDto) {
    return this.mutate(
      this.prisma.section.create({
        data: { ...dto, slug: dto.slug || slugify(dto.title) },
      }),
    );
  }
  updateSection(id: string, dto: UpdateSectionDto) {
    return this.mutate(this.prisma.section.update({ where: { id }, data: dto }));
  }
  deleteSection(id: string) {
    return this.mutate(this.prisma.section.delete({ where: { id } }));
  }

  // --- Article ---
  createArticle(dto: CreateArticleDto) {
    return this.mutate(
      this.prisma.article.create({
        data: {
          sectionId: dto.sectionId,
          title: dto.title,
          content: dto.content,
          slug: dto.slug || slugify(dto.title),
          order: dto.order ?? 0,
          excerpt: dto.excerpt ?? excerpt(dto.content),
          readingTime: readingTime(dto.content),
        },
      }),
    );
  }
  updateArticle(id: string, dto: UpdateArticleDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.content !== undefined) {
      data.readingTime = readingTime(dto.content);
      if (dto.excerpt === undefined) data.excerpt = excerpt(dto.content);
    }
    return this.mutate(this.prisma.article.update({ where: { id }, data }));
  }
  deleteArticle(id: string) {
    return this.mutate(this.prisma.article.delete({ where: { id } }));
  }

  // --- Quiz / Question ---
  createQuiz(dto: CreateQuizDto) {
    return this.mutate(
      this.prisma.quiz.create({
        data: { sectionId: dto.sectionId, title: dto.title, order: dto.order ?? 0 },
      }),
    );
  }
  deleteQuiz(id: string) {
    return this.mutate(this.prisma.quiz.delete({ where: { id } }));
  }
  // Tahrirlash uchun — to'g'ri javoblar bilan
  async quizForEdit(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) return null;
    return {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options) as string[],
      })),
    };
  }
  createQuestion(dto: CreateQuestionDto) {
    return this.mutate(
      this.prisma.question.create({
        data: {
          quizId: dto.quizId,
          text: dto.text,
          options: JSON.stringify(dto.options),
          correctIndex: dto.correctIndex,
          explanation: dto.explanation,
          order: dto.order ?? 0,
        },
      }),
    );
  }
  updateQuestion(id: string, dto: UpdateQuestionDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.options) data.options = JSON.stringify(dto.options);
    return this.mutate(this.prisma.question.update({ where: { id }, data }));
  }
  deleteQuestion(id: string) {
    return this.mutate(this.prisma.question.delete({ where: { id } }));
  }

  // --- Foydalanuvchilar (sahifalangan — 35-vazifa) ---
  async listUsers(search?: string, take = 50, skip = 0) {
    const q = (search || "").trim();
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;
    const safeTake = Math.min(100, Math.max(1, take));
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: safeTake,
        skip: Math.max(0, skip),
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { comments: true, progress: true, bookmarks: true, notes: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        googleId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            comments: true, progress: true, bookmarks: true,
            notes: true, plannerDays: true, flashcardReviews: true,
          },
        },
        streak: { select: { current: true, longest: true, lastCheckin: true } },
      },
    });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi");
    return user;
  }

  setUserRole(id: string, role: string) {
    const safe = role === "admin" ? "admin" : "user";
    return this.prisma.user.update({
      where: { id },
      data: { role: safe },
      select: { id: true, role: true },
    });
  }

  async deleteUser(currentAdminId: string, id: string) {
    if (id === currentAdminId) {
      throw new BadRequestException("O'z hisobingizni o'chira olmaysiz.");
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi");
    if (user.role === "admin") {
      const admins = await this.prisma.user.count({ where: { role: "admin" } });
      if (admins <= 1) {
        throw new BadRequestException("Oxirgi adminni o'chirib bo'lmaydi.");
      }
    }
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  // --- Izohlar (moderatsiya, sahifalangan — 35-vazifa) ---
  async listComments(search?: string, take = 50, skip = 0) {
    const q = (search || "").trim();
    const where = q ? { body: { contains: q, mode: "insensitive" as const } } : undefined;
    const safeTake = Math.min(100, Math.max(1, take));
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: safeTake,
        skip: Math.max(0, skip),
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          article: { select: { title: true, slug: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total };
  }
  async deleteComment(id: string) {
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }

  // --- Publish holatini almashtirish ---
  setTopicPublished(id: string, published: boolean) {
    return this.mutate(
      this.prisma.topic.update({
        where: { id },
        data: { published },
        select: { id: true, published: true },
      }),
    );
  }
  setArticlePublished(id: string, published: boolean) {
    return this.mutate(
      this.prisma.article.update({
        where: { id },
        data: { published },
        select: { id: true, published: true },
      }),
    );
  }

  // --- Invite ---
  createInvite(adminId: string) {
    const code = Math.random().toString(36).slice(2, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return this.prisma.invite.create({
      data: { code, createdBy: adminId, expiresAt },
    });
  }

  listInvites() {
    return this.prisma.invite.findMany({ orderBy: { createdAt: "desc" } });
  }

  async deleteInvite(id: string) {
    await this.prisma.invite.delete({ where: { id } });
    return { ok: true };
  }

  async checkInvite(code: string) {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite) throw new NotFoundException("Invite topilmadi");
    if (invite.usedBy) throw new NotFoundException("Invite allaqachon ishlatilgan");
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new NotFoundException("Invite muddati o'tgan");
    }
    return { valid: true, code: invite.code };
  }

  useInvite(code: string, userId: string) {
    return this.prisma.invite.update({
      where: { code },
      data: { usedBy: userId, usedAt: new Date() },
    });
  }
}
