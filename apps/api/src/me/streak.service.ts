import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { dayStr, localWeekday } from "../common/date";

const MAX_FREEZES = 3;

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kunlik checkin (14-vazifa freeze bilan).
   * - Ketma-ket kun → streak +1.
   * - Aniq 1 kun o'tkazib yuborilgan va freeze bor → freeze sarflanadi, streak saqlanadi.
   * - Aks holda → streak 1 ga tushadi.
   * - Dushanba checkin'ida +1 freeze (haftada bir marta, cap 3).
   */
  async checkin(userId: string) {
    const today = dayStr(0);
    const existing = await this.prisma.streak.findUnique({ where: { userId } });
    if (existing?.lastCheckin === today) return existing;

    const yesterday = dayStr(-1);
    const twoDaysAgo = dayStr(-2);

    let current: number;
    let freezes = existing?.freezes ?? MAX_FREEZES - 1;
    let lastFreezeDate = existing?.lastFreezeDate ?? null;

    if (!existing || !existing.lastCheckin) {
      current = 1;
    } else if (existing.lastCheckin === yesterday) {
      current = (existing.current ?? 0) + 1;
    } else if (existing.lastCheckin === twoDaysAgo && freezes > 0) {
      // Bitta kun o'tkazib yuborildi — freeze ishlatamiz, streak uzilmaydi
      current = (existing.current ?? 0) + 1;
      freezes -= 1;
      lastFreezeDate = today;
    } else {
      current = 1;
    }

    // Haftalik freeze (dushanba checkin'ida +1, cap)
    if (localWeekday() === 1 && freezes < MAX_FREEZES) {
      freezes += 1;
    }

    const longest = Math.max(existing?.longest ?? 0, current);

    return this.prisma.streak.upsert({
      where: { userId },
      create: { userId, current, longest, lastCheckin: today, freezes, lastFreezeDate },
      update: { current, longest, lastCheckin: today, freezes, lastFreezeDate },
    });
  }

  async getStreak(userId: string) {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) return { current: 0, longest: 0, lastCheckin: null, freezes: MAX_FREEZES - 1, lastFreezeDate: null };
    return streak;
  }
}
