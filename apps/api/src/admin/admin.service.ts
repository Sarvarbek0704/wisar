import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
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
  constructor(private readonly prisma: PrismaService) {}

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

  // --- Topic ---
  createTopic(dto: CreateTopicDto) {
    return this.prisma.topic.create({
      data: { ...dto, slug: dto.slug || slugify(dto.title) },
    });
  }
  updateTopic(id: string, dto: UpdateTopicDto) {
    return this.prisma.topic.update({ where: { id }, data: dto });
  }
  deleteTopic(id: string) {
    return this.prisma.topic.delete({ where: { id } });
  }

  // --- Section ---
  createSection(dto: CreateSectionDto) {
    return this.prisma.section.create({
      data: { ...dto, slug: dto.slug || slugify(dto.title) },
    });
  }
  updateSection(id: string, dto: UpdateSectionDto) {
    return this.prisma.section.update({ where: { id }, data: dto });
  }
  deleteSection(id: string) {
    return this.prisma.section.delete({ where: { id } });
  }

  // --- Article ---
  createArticle(dto: CreateArticleDto) {
    return this.prisma.article.create({
      data: {
        sectionId: dto.sectionId,
        title: dto.title,
        content: dto.content,
        slug: dto.slug || slugify(dto.title),
        order: dto.order ?? 0,
        excerpt: dto.excerpt ?? excerpt(dto.content),
        readingTime: readingTime(dto.content),
      },
    });
  }
  updateArticle(id: string, dto: UpdateArticleDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.content !== undefined) {
      data.readingTime = readingTime(dto.content);
      if (dto.excerpt === undefined) data.excerpt = excerpt(dto.content);
    }
    return this.prisma.article.update({ where: { id }, data });
  }
  deleteArticle(id: string) {
    return this.prisma.article.delete({ where: { id } });
  }

  // --- Quiz / Question ---
  createQuiz(dto: CreateQuizDto) {
    return this.prisma.quiz.create({
      data: { sectionId: dto.sectionId, title: dto.title, order: dto.order ?? 0 },
    });
  }
  deleteQuiz(id: string) {
    return this.prisma.quiz.delete({ where: { id } });
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
    return this.prisma.question.create({
      data: {
        quizId: dto.quizId,
        text: dto.text,
        options: JSON.stringify(dto.options),
        correctIndex: dto.correctIndex,
        explanation: dto.explanation,
        order: dto.order ?? 0,
      },
    });
  }
  updateQuestion(id: string, dto: UpdateQuestionDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.options) data.options = JSON.stringify(dto.options);
    return this.prisma.question.update({ where: { id }, data });
  }
  deleteQuestion(id: string) {
    return this.prisma.question.delete({ where: { id } });
  }

  // --- Foydalanuvchilar ---
  listUsers(search?: string) {
    const q = (search || "").trim();
    return this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { comments: true, progress: true, bookmarks: true, notes: true } },
      },
    });
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

  // --- Izohlar (moderatsiya) ---
  listComments(search?: string) {
    const q = (search || "").trim();
    return this.prisma.comment.findMany({
      where: q ? { body: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
    });
  }
  async deleteComment(id: string) {
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }

  // --- Publish holatini almashtirish ---
  setTopicPublished(id: string, published: boolean) {
    return this.prisma.topic.update({
      where: { id },
      data: { published },
      select: { id: true, published: true },
    });
  }
  setArticlePublished(id: string, published: boolean) {
    return this.prisma.article.update({
      where: { id },
      data: { published },
      select: { id: true, published: true },
    });
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
