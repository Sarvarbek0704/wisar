import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export type NotificationType =
  | "review_due"
  | "forum_reply"
  | "group"
  | "content"
  | "certificate"
  | "system";

export interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * In-app bildirishnoma xizmati (46-vazifa).
 * Boshqa modullar (forum, guruh, cron) `create()` ni chaqirib bildirishnoma yaratadi.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Bitta bildirishnoma yaratish. Xato bo'lsa yutadi (asosiy oqimni buzmasin). */
  async create(input: CreateNotification): Promise<void> {
    try {
      await this.prisma.notification.create({ data: input });
    } catch (e) {
      this.logger.warn(`Bildirishnoma yaratilmadi (${input.type}): ${(e as Error).message}`);
    }
  }

  /** Ko'p foydalanuvchiga bir xil bildirishnoma (masalan yangi kontent — barcha o'quvchilarga). */
  async createMany(userIds: string[], base: Omit<CreateNotification, "userId">): Promise<void> {
    if (!userIds.length) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({ ...base, userId })),
      });
    } catch (e) {
      this.logger.warn(`Ommaviy bildirishnoma xatosi: ${(e as Error).message}`);
    }
  }

  /** Ro'yxat — eng yangisi birinchi (sahifalash bilan). */
  async list(userId: string, opts: { unreadOnly?: boolean; take?: number; skip?: number } = {}) {
    // `?take=abc` -> Number("abc") = NaN -> Prisma 500.
    // Number.isFinite bilan har qanday yaroqsiz qiymatni standartga qaytaramiz.
    const take = Number.isFinite(opts.take) ? Math.min(Math.max(1, opts.take!), 50) : 20;
    const skip = Number.isFinite(opts.skip) ? Math.max(0, opts.skip!) : 0;
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  /** Bitta bildirishnomani o'qilgan deb belgilash (faqat egasi). */
  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
