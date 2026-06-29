import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

function authorName(u: { name: string | null; email: string }): string {
  return u.name || u.email.split("@")[0];
}

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  /** Savollar ro'yxati (sahifalangan — 35-vazifa). */
  async listThreads(take = 20, skip = 0) {
    const safeTake = Math.min(50, Math.max(1, take));
    const [rows, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        orderBy: { createdAt: "desc" },
        take: safeTake,
        skip: Math.max(0, skip),
        select: {
          id: true,
          title: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          posts: { where: { accepted: true }, select: { id: true }, take: 1 },
          _count: { select: { posts: true } },
        },
      }),
      this.prisma.forumThread.count(),
    ]);
    return {
      items: rows.map((t) => ({
        id: t.id,
        title: t.title,
        createdAt: t.createdAt,
        author: authorName(t.user),
        postCount: t._count.posts,
        solved: t.posts.length > 0,
      })),
      total,
    };
  }

  async createThread(userId: string, title: string, body: string) {
    const t = (title || "").trim();
    const b = (body || "").trim();
    if (t.length < 5) throw new BadRequestException("Sarlavha juda qisqa.");
    return this.prisma.forumThread.create({
      data: { userId, title: t, body: b },
      select: { id: true },
    });
  }

  async getThread(id: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        posts: {
          orderBy: [{ accepted: "desc" }, { createdAt: "asc" }],
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!thread) throw new NotFoundException("Savol topilmadi.");
    return {
      id: thread.id,
      title: thread.title,
      body: thread.body,
      createdAt: thread.createdAt,
      author: authorName(thread.user),
      ownerId: thread.userId,
      posts: thread.posts.map((p) => ({
        id: p.id,
        body: p.body,
        createdAt: p.createdAt,
        accepted: p.accepted,
        authorId: p.user.id,
        author: authorName(p.user),
      })),
    };
  }

  async addPost(userId: string, threadId: string, body: string) {
    const b = (body || "").trim();
    if (b.length < 2) throw new BadRequestException("Javob juda qisqa.");
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId }, select: { id: true } });
    if (!thread) throw new NotFoundException("Savol topilmadi.");
    return this.prisma.forumPost.create({
      data: { threadId, userId, body: b },
      select: { id: true },
    });
  }

  /** "To'g'ri javob" belgilash — faqat savol egasi. */
  async acceptPost(userId: string, postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      include: { thread: { select: { userId: true } } },
    });
    if (!post) throw new NotFoundException("Javob topilmadi.");
    if (post.thread.userId !== userId) {
      throw new ForbiddenException("Faqat savol egasi to'g'ri javobni belgilashi mumkin.");
    }
    await this.prisma.forumPost.updateMany({
      where: { threadId: post.threadId },
      data: { accepted: false },
    });
    return this.prisma.forumPost.update({
      where: { id: postId },
      data: { accepted: true },
      select: { id: true, accepted: true },
    });
  }
}
