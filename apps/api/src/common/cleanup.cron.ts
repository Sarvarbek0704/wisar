import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { APP_TZ, cronsEnabled } from "./date";

/**
 * Eskirgan bir martalik yozuvlarni tozalaydi.
 *
 * Parol tiklash tokenlari, email tasdiqlash kodlari va refresh tokenlar
 * muddati o'tgach ham bazada abadiy qolardi — vaqt o'tishi bilan faqat o'sadi
 * va foydasiz. Ular allaqachon kuchsiz, shuning uchun o'chirish xavfsiz.
 */
@Injectable()
export class CleanupCron {
  private readonly logger = new Logger(CleanupCron.name);

  constructor(private readonly prisma: PrismaService) {}

  // Har kuni 03:30 (mahalliy) — backup 03:00 da tugagach.
  @Cron("30 3 * * *", { timeZone: APP_TZ })
  async cleanupExpired() {
    if (!cronsEnabled()) return;
    const now = new Date();
    // Refresh tokenlarni biroz kechroq o'chiramiz — tekshiruv tarixi uchun.
    const refreshCutoff = new Date(now.getTime() - 7 * 86_400_000);

    try {
      const [resets, codes, tokens] = await Promise.all([
        this.prisma.passwordReset.deleteMany({
          where: { OR: [{ expiresAt: { lt: now } }, { used: true }] },
        }),
        this.prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
        this.prisma.refreshToken.deleteMany({
          where: { OR: [{ expiresAt: { lt: refreshCutoff } }, { revoked: true, createdAt: { lt: refreshCutoff } }] },
        }),
      ]);
      this.logger.log(
        `Tozalash: ${resets.count} parol tiklash, ${codes.count} tasdiqlash kodi, ${tokens.count} refresh token o'chirildi.`,
      );
    } catch (e) {
      this.logger.error(`Tozalash xatosi: ${(e as Error).message}`);
    }
  }
}
