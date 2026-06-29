import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  async checkin(userId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const existing = await this.prisma.streak.findUnique({ where: { userId } });

    if (existing?.lastCheckin === today) {
      return existing;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const currentStreak = existing?.lastCheckin === yesterdayStr
      ? (existing.current ?? 0) + 1
      : 1;

    const longestStreak = Math.max(existing?.longest ?? 0, currentStreak);

    return this.prisma.streak.upsert({
      where: { userId },
      create: {
        userId,
        current: currentStreak,
        longest: longestStreak,
        lastCheckin: today,
      },
      update: {
        current: currentStreak,
        longest: longestStreak,
        lastCheckin: today,
      },
    });
  }

  async getStreak(userId: string) {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) return { current: 0, longest: 0, lastCheckin: null };
    return streak;
  }
}
