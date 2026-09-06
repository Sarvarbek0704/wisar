import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { MailService } from './mail.service';
import { APP_TZ, cronsEnabled } from '../common/date';
import { displayName } from '../common/display-name';

@Injectable()
export class WeeklyCronService {
  private readonly logger = new Logger(WeeklyCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // Har yakshanba 09:00 — MAHALLIY vaqtda
  @Cron('0 9 * * 0', { timeZone: APP_TZ })
  async sendWeeklySummaries() {
    if (!cronsEnabled()) return;
    this.logger.log('Haftalik email yuborish boshlandi...');
    // Faqat email tasdiqlagan VA obunani bekor qilmagan foydalanuvchilar.
    // Ilgari hammaga — tasdiqlanmagan hisoblarga ham — yuborilardi.
    const users = await this.prisma.user.findMany({
      // email: { not: null } — telefon bilan ro'yxatdan o'tgan foydalanuvchida
      // email bo'lmasligi mumkin, ularga xat yuborib bo'lmaydi.
      where: { emailVerified: true, emailOptIn: true, email: { not: null } },
      include: { streak: true },
    });
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    for (const user of users) {
      try {
        const completed = await this.prisma.progress.count({
          where: { userId: user.id, updatedAt: { gte: weekAgo } },
        });
        const streak = user.streak?.current ?? 0;
        if (!user.email) continue; // TypeScript uchun ham, xavfsizlik uchun ham
        await this.mail.sendWeeklySummary(user.email, displayName(user), completed, streak);
      } catch (e) {
        this.logger.error(`${user.email} uchun xato: ${e}`);
      }
    }
    this.logger.log('Haftalik email tugadi.');
  }
}
