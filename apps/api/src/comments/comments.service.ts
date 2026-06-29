import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export type CommentNode = {
  id: string;
  body: string;
  createdAt: Date;
  userId: string;
  author: string;
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentNode[];
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Izohlar daraxti (reply + like) — 28-vazifa. */
  async list(articleId: string, viewerId?: string): Promise<CommentNode[]> {
    const rows = await this.prisma.comment.findMany({
      where: { articleId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { likes: true } },
      },
    });

    let likedSet = new Set<string>();
    if (viewerId) {
      const myLikes = await this.prisma.commentLike.findMany({
        where: { userId: viewerId, comment: { articleId } },
        select: { commentId: true },
      });
      likedSet = new Set(myLikes.map((l) => l.commentId));
    }

    const map = new Map<string, CommentNode>();
    for (const c of rows) {
      map.set(c.id, {
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        userId: c.userId,
        author: c.user.name || c.user.email.split("@")[0],
        parentId: c.parentId,
        likeCount: c._count.likes,
        likedByMe: likedSet.has(c.id),
        replies: [],
      });
    }
    const roots: CommentNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }
    // Ildizlar yangidan eskiga, javoblar eskidan yangiga (suhbat tartibi)
    roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return roots;
  }

  /** Izoh yoki javob yaratish (1 daraja thread). */
  async create(userId: string, articleId: string, body: string, parentId?: string) {
    let pid: string | null = parentId ?? null;
    if (pid) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: pid },
        select: { parentId: true },
      });
      if (!parent) pid = null;
      else if (parent.parentId) pid = parent.parentId; // 1 darajaga tekislash
    }
    return this.prisma.comment.create({ data: { userId, articleId, body, parentId: pid } });
  }

  /** Like toggle. */
  async toggleLike(userId: string, commentId: string) {
    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existing) {
      await this.prisma.commentLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.commentLike.create({ data: { commentId, userId } });
    return { liked: true };
  }

  async remove(id: string, userId: string, role: string) {
    const c = await this.prisma.comment.findUnique({ where: { id } });
    if (!c) return { ok: true };
    if (c.userId !== userId && role !== "admin") {
      throw new ForbiddenException("Faqat o'z izohingizni o'chira olasiz");
    }
    // Avval javoblarini o'chiramiz (self-FK NoAction)
    await this.prisma.comment.deleteMany({ where: { parentId: id } });
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }
}
