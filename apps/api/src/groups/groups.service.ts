import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma.service";
import { dayStr } from "../common/date";
import { displayName } from "../common/display-name";

function makeCode(): string {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guruh yaratadi (egasi avtomatik a'zo). */
  async create(userId: string, name: string) {
    const trimmed = (name || "").trim();
    if (trimmed.length < 2) throw new BadRequestException("Guruh nomi juda qisqa.");
    // Kod unikal bo'lishi uchun bir necha urinish
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      const exists = await this.prisma.group.findUnique({ where: { code } });
      if (exists) continue;
      return this.prisma.group.create({
        data: { name: trimmed, code, ownerId: userId, members: { create: { userId } } },
        select: { id: true, name: true, code: true },
      });
    }
    throw new BadRequestException("Kod yaratib bo'lmadi, qayta urinib ko'ring.");
  }

  /** Kod bilan guruhga qo'shilish. */
  async join(userId: string, code: string) {
    const group = await this.prisma.group.findUnique({ where: { code: (code || "").trim().toUpperCase() } });
    if (!group) throw new NotFoundException("Bunday kodli guruh topilmadi.");
    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      create: { groupId: group.id, userId },
      update: {},
    });
    return { id: group.id, name: group.name };
  }

  /** Foydalanuvchi a'zo bo'lgan guruhlar. */
  myGroups(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, code: true, ownerId: true, _count: { select: { members: true } } },
    });
  }

  /** Guruh tafsiloti — a'zolar umumiy progress/streak/haftalik faollik bilan. */
  async detail(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!group) throw new NotFoundException("Guruh topilmadi.");
    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException("Siz bu guruh a'zosi emassiz.");
    }

    const since = dayStr(-6);
    const memberIds = group.members.map((m) => m.userId);

    // Har a'zoga 3 tadan so'rov o'rniga 3 ta guruhlangan so'rov —
    // 50 kishilik guruhda 150 emas, 3 ta so'rov ketadi.
    const [progressRows, streakRows, activityRows] = await Promise.all([
      this.prisma.progress.groupBy({
        by: ["userId"],
        where: { userId: { in: memberIds }, completed: true },
        _count: { _all: true },
      }),
      this.prisma.streak.findMany({
        where: { userId: { in: memberIds } },
        select: { userId: true, current: true },
      }),
      this.prisma.dailyActivity.groupBy({
        by: ["userId"],
        where: { userId: { in: memberIds }, date: { gte: since } },
        _sum: { minutes: true },
      }),
    ]);

    const completedBy = new Map(progressRows.map((r) => [r.userId, r._count._all]));
    const streakBy = new Map(streakRows.map((r) => [r.userId, r.current]));
    const minutesBy = new Map(activityRows.map((r) => [r.userId, r._sum.minutes ?? 0]));

    const members = group.members.map((m) => ({
      id: m.user.id,
      name: displayName(m.user),
      isOwner: m.userId === group.ownerId,
      completedCount: completedBy.get(m.userId) ?? 0,
      streakCurrent: streakBy.get(m.userId) ?? 0,
      weeklyMinutes: minutesBy.get(m.userId) ?? 0,
    }));
    // Eng faol a'zolar tepada
    members.sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);

    return {
      id: group.id,
      name: group.name,
      code: group.code,
      isOwner: group.ownerId === userId,
      members,
    };
  }

  /** Guruhdan chiqish (egasi chiqsa guruh o'chadi). */
  async leave(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi.");
    if (group.ownerId === userId) {
      await this.prisma.group.delete({ where: { id: groupId } });
      return { ok: true, deleted: true };
    }
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
    return { ok: true, deleted: false };
  }
}
