import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ActivityDelta = {
  minutes?: number;
  articlesRead?: number;
  cardsReviewed?: number;
  quizzesTaken?: number;
};

/** Kunlik faollik (DailyActivity) — daily goal, heatmap, analitika manbai (4,30-vazifa). */
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bugungi faollikni oshiradi (heartbeat yoki sahifa yopilganda). */
  async addActivity(userId: string, delta: ActivityDelta) {
    const date = todayStr();
    // Heartbeat odatda 0.5-1 daqiqa; bir so'rovda 60 daqiqadan oshmasin (sanity).
    const minutes = Math.max(0, Math.min(60, Math.round(delta.minutes ?? 0)));
    const articlesRead = Math.max(0, Math.round(delta.articlesRead ?? 0));
    const cardsReviewed = Math.max(0, Math.round(delta.cardsReviewed ?? 0));
    const quizzesTaken = Math.max(0, Math.round(delta.quizzesTaken ?? 0));

    return this.prisma.dailyActivity.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, minutes, articlesRead, cardsReviewed, quizzesTaken },
      update: {
        minutes: { increment: minutes },
        articlesRead: { increment: articlesRead },
        cardsReviewed: { increment: cardsReviewed },
        quizzesTaken: { increment: quizzesTaken },
      },
    });
  }

  /** Bugungi daqiqa + maqsad + progress (4-vazifa). */
  async today(userId: string) {
    const date = todayStr();
    const [row, user] = await Promise.all([
      this.prisma.dailyActivity.findUnique({ where: { userId_date: { userId, date } } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { dailyGoalMinutes: true } }),
    ]);
    const goal = user?.dailyGoalMinutes ?? 10;
    const minutes = row?.minutes ?? 0;
    return {
      date,
      minutes,
      goal,
      articlesRead: row?.articlesRead ?? 0,
      cardsReviewed: row?.cardsReviewed ?? 0,
      quizzesTaken: row?.quizzesTaken ?? 0,
      goalMet: minutes >= goal,
      pct: goal > 0 ? Math.min(1, minutes / goal) : 0,
    };
  }

  /** Kunlik maqsadni o'rnatadi (daqiqa). */
  async setGoal(userId: string, minutes: number) {
    const safe = Math.max(1, Math.min(600, Math.round(minutes)));
    await this.prisma.user.update({ where: { id: userId }, data: { dailyGoalMinutes: safe } });
    return { dailyGoalMinutes: safe };
  }

  /** So'nggi 365 kun heatmap + haftalik trend + umumiy (30-vazifa). */
  async insights(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 364);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = await this.prisma.dailyActivity.findMany({
      where: { userId, date: { gte: sinceStr } },
      orderBy: { date: "asc" },
      select: { date: true, minutes: true, articlesRead: true, cardsReviewed: true, quizzesTaken: true },
    });

    const heatmap = rows.map((r) => ({ date: r.date, minutes: r.minutes }));

    // Haftalik trend — so'nggi 8 hafta jami daqiqalar (dushanbadan boshlab)
    const weekly = this.weeklyTrend(rows, 8);

    const totalMinutes = rows.reduce((s, r) => s + r.minutes, 0);
    const activeDays = rows.filter((r) => r.minutes > 0).length;
    const totalArticles = rows.reduce((s, r) => s + r.articlesRead, 0);
    const totalCards = rows.reduce((s, r) => s + r.cardsReviewed, 0);

    return {
      heatmap,
      weekly,
      totals: { totalMinutes, activeDays, totalArticles, totalCards },
    };
  }

  private weeklyTrend(
    rows: { date: string; minutes: number }[],
    weeks: number,
  ): { week: string; minutes: number }[] {
    // Sana → daqiqa map
    const byDate = new Map(rows.map((r) => [r.date, r.minutes]));
    const out: { week: string; minutes: number }[] = [];
    const now = new Date();
    // Joriy haftaning dushanbasi
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    for (let w = weeks - 1; w >= 0; w--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - w * 7);
      let sum = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + d);
        sum += byDate.get(day.toISOString().slice(0, 10)) ?? 0;
      }
      out.push({ week: start.toISOString().slice(0, 10), minutes: sum });
    }
    return out;
  }
}
