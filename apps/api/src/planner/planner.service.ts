import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PlannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlannerDay(userId: string, date: string) {
    const row = await this.prisma.plannerDay.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (!row) return null;
    return { data: row.data };
  }

  async savePlannerDay(userId: string, date: string, data: string) {
    return this.prisma.plannerDay.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, data },
      update: { data },
    });
  }

  async getPlannerHabits(userId: string) {
    const row = await this.prisma.plannerHabits.findUnique({ where: { userId } });
    if (!row) return { habits: "[]", log: "{}" };
    return { habits: row.habits, log: row.log };
  }

  async savePlannerHabits(userId: string, habits: string, log: string) {
    return this.prisma.plannerHabits.upsert({
      where: { userId },
      create: { userId, habits, log },
      update: { habits, log },
    });
  }
}
