import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { NotificationService } from "./notification.service";

/**
 * Kunlik spaced-repetition eslatmasi (extra funksiya) — bugun takrorlanishi kerak bo'lgan
 * kartalar/savollar bo'yicha "review_due" bildirishnoma. Yodda saqlashni oshiradi (SRS).
 * Spam yo'q: kuniga 1 marta, va o'sha kuni allaqachon eslatma bo'lsa — o'tkazib yuboriladi.
 */
@Injectable()
export class ReviewReminderCron {
  private readonly logger = new Logger(ReviewReminderCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // Har kuni ertalab 08:00
  @Cron("0 8 * * *")
  async remindDueReviews() {
    const now = new Date();

    // Bugun takrorlanishi kerak bo'lgan kartalar/savollar — foydalanuvchi bo'yicha soni
    const [cardGroups, itemGroups] = await Promise.all([
      this.prisma.flashcardReview.groupBy({
        by: ["userId"],
        where: { nextReview: { lte: now } },
        _count: { _all: true },
      }),
      this.prisma.reviewItem.groupBy({
        by: ["userId"],
        where: { kind: "question", nextReview: { lte: now } },
        _count: { _all: true },
      }),
    ]);

    const dueByUser = new Map<string, number>();
    for (const g of cardGroups) dueByUser.set(g.userId, (dueByUser.get(g.userId) ?? 0) + g._count._all);
    for (const g of itemGroups) dueByUser.set(g.userId, (dueByUser.get(g.userId) ?? 0) + g._count._all);
    if (dueByUser.size === 0) return;

    // Bugun allaqachon eslatma yuborilganlarni chiqarib tashlaymiz (spamsiz)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const alreadyReminded = await this.prisma.notification.findMany({
      where: { type: "review_due", createdAt: { gte: startOfDay }, userId: { in: [...dueByUser.keys()] } },
      select: { userId: true },
    });
    const skip = new Set(alreadyReminded.map((n) => n.userId));

    let sent = 0;
    for (const [userId, count] of dueByUser) {
      if (skip.has(userId) || count === 0) continue;
      await this.notifications.create({
        userId,
        type: "review_due",
        title: `${count} ta takror sizni kutmoqda`,
        body: "Bugungi takror-tekshiruvni bajaring — bilimni mustahkamlaydi.",
        link: "/review",
      });
      sent++;
    }
    this.logger.log(`Takror eslatmasi: ${sent} foydalanuvchiga yuborildi.`);
  }
}
