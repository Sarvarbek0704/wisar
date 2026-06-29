import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(articleId: string) {
    const rows = await this.prisma.comment.findMany({
      where: { articleId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      userId: c.userId,
      author: c.user.name || c.user.email.split("@")[0],
    }));
  }

  create(userId: string, articleId: string, body: string) {
    return this.prisma.comment.create({ data: { userId, articleId, body } });
  }

  async remove(id: string, userId: string, role: string) {
    const c = await this.prisma.comment.findUnique({ where: { id } });
    if (!c) return { ok: true };
    if (c.userId !== userId && role !== "admin") {
      throw new ForbiddenException("Faqat o'z izohingizni o'chira olasiz");
    }
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }
}
