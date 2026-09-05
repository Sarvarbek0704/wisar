import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { MailService } from './mail.service';
import { APP_TZ, cronsEnabled } from '../common/date';

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
      where: { emailVerified: true, emailOptIn: true },
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
        const name = user.name || user.email.split('@')[0];
        await this.mail.sendWeeklySummary(user.email, name, completed, streak);
      } catch (e) {
        this.logger.error(`${user.email} uchun xato: ${e}`);
      }
    }
    this.logger.log('Haftalik email tugadi.');
  }
}
