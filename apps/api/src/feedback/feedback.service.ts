import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { NotificationService } from "../notifications/notification.service";

export type SubmitFeedback = {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  category: string;
  message: string;
  page?: string | null;
};

const CATEGORIES = ["like", "dislike", "suggestion", "bug", "feature", "other"];

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotificationService,
  ) {}

  /** Fikr yuborish (kirgan yoki mehmon). Yuborilgach adminlarга bildirishnoma. */
  async submit(input: SubmitFeedback) {
    const category = CATEGORIES.includes(input.category) ? input.category : "other";
    const message = (input.message || "").trim().slice(0, 4000);

    const fb = await this.prisma.feedback.create({
      data: {
        userId: input.userId ?? null,
        name: (input.name || "").trim().slice(0, 120) || null,
        email: (input.email || "").trim().slice(0, 160) || null,
        category,
        message,
        page: (input.page || "").slice(0, 300) || null,
      },
    });

    // Adminlarni xabardor qilamiz (bell ikonkasi)
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });
      const who = fb.name || fb.email || "Mehmon";
      await this.notify.createMany(
        admins.map((a) => a.id),
        {
          type: "system",
          title: "Yangi fikr-mulohaza",
          body: `${who}: ${message.slice(0, 80)}`,
          link: "/admin/feedback",
        },
      );
    } catch {
      /* bildirishnoma xatosi asosiy oqimni buzmasin */
    }

    return { ok: true, id: fb.id };
  }

  /** Admin ro'yxati — sahifalash + filter (all | unread). */
  async adminList(filter: "all" | "unread", take = 30, skip = 0) {
    const where = filter === "unread" ? { read: false } : {};
    const [items, total, unread] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: [{ read: "asc" }, { createdAt: "desc" }],
        take: Math.min(take, 100),
        skip,
      }),
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.count({ where: { read: false } }),
    ]);
    return { items, total, unread };
  }

  markRead(id: string, read = true) {
    return this.prisma.feedback.update({ where: { id }, data: { read } });
  }

  remove(id: string) {
    return this.prisma.feedback.delete({ where: { id } });
  }

  unreadCount(): Promise<number> {
    return this.prisma.feedback.count({ where: { read: false } });
  }
}
