import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma.service";

function makeCode(): string {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

function dayStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
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
    const members = await Promise.all(
      group.members.map(async (m) => {
        const [completed, streak, activity] = await Promise.all([
          this.prisma.progress.count({ where: { userId: m.userId, completed: true } }),
          this.prisma.streak.findUnique({ where: { userId: m.userId }, select: { current: true } }),
          this.prisma.dailyActivity.findMany({
            where: { userId: m.userId, date: { gte: since } },
            select: { minutes: true },
          }),
        ]);
        return {
          id: m.user.id,
          name: m.user.name || m.user.email.split("@")[0],
          isOwner: m.userId === group.ownerId,
          completedCount: completed,
          streakCurrent: streak?.current ?? 0,
          weeklyMinutes: activity.reduce((s, a) => s + a.minutes, 0),
        };
      }),
    );
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
