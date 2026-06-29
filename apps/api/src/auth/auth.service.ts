import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** 6 xonali tasdiqlash kodi yaratib, DB'ga yozadi va emailga yuboradi. */
  private async issueVerificationCode(
    userId: string,
    email: string,
    name: string | null,
    mailService: MailService,
  ): Promise<void> {
    // Eski kodlarni tozalaymiz
    await this.prisma.emailVerification.deleteMany({ where: { userId } });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 daqiqa
    await this.prisma.emailVerification.create({
      data: { userId, code, expiresAt },
    });
    await mailService.sendVerificationCode(email, code, name ?? undefined);
  }

  async register(
    email: string,
    password: string,
    name: string | undefined,
    inviteCode: string | undefined,
    mailService: MailService,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Tasdiqlanmagan akkaunt bo'lsa — kodni qayta yuboramiz (akkaunt o'g'irlashni oldini olish)
      if (!existing.emailVerified) {
        await this.issueVerificationCode(existing.id, existing.email, existing.name, mailService);
        return { needsVerification: true, email: existing.email };
      }
      throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Birinchi ro'yxatdan o'tgan foydalanuvchi avtomatik ADMIN bo'ladi (va tasdiqlangan)
    const count = await this.prisma.user.count();
    const isFirst = count === 0;
    const role = isFirst ? "admin" : "user";

    const user = await this.prisma.user.create({
      data: { email, name, passwordHash, role, emailVerified: isFirst },
    });

    if (inviteCode) {
      const invite = await this.prisma.invite.findUnique({ where: { code: inviteCode } });
      if (invite && !invite.usedBy && (!invite.expiresAt || invite.expiresAt > new Date())) {
        await this.prisma.invite.update({
          where: { code: inviteCode },
          data: { usedBy: user.id, usedAt: new Date() },
        });
      }
    }

    // Birinchi admin darhol kiritiladi; qolganlar email tasdiqlashi shart
    if (isFirst) return this.sign(user);

    await this.issueVerificationCode(user.id, user.email, user.name, mailService);
    return { needsVerification: true, email: user.email };
  }

  /** Email tasdiqlash kodini tekshiradi, tasdiqlaydi va token qaytaradi. */
  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException("Foydalanuvchi topilmadi");
    if (user.emailVerified) return this.sign(user);

    const record = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id, code },
      orderBy: { createdAt: "desc" },
    });
    if (!record) throw new BadRequestException("Kod noto'g'ri");
    if (record.expiresAt < new Date()) {
      throw new BadRequestException("Kod muddati o'tgan. Qayta yuboring.");
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    await this.prisma.emailVerification.deleteMany({ where: { userId: user.id } });
    return this.sign(updated);
  }

  /** Tasdiqlash kodini qayta yuboradi. */
  async resendVerification(email: string, mailService: MailService) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Mavjudlikni oshkor qilmaymiz
    if (!user || user.emailVerified) return;
    await this.issueVerificationCode(user.id, user.email, user.name, mailService);
  }

  async login(email: string, password: string, mailService: MailService) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Email yoki parol noto'g'ri");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Email yoki parol noto'g'ri");
    if (!user.emailVerified) {
      // Kodni qayta yuborib, frontendga tasdiqlash kerakligini bildiramiz
      await this.issueVerificationCode(user.id, user.email, user.name, mailService);
      throw new UnauthorizedException({
        message: "Email tasdiqlanmagan. Kod qayta yuborildi.",
        needsVerification: true,
        email: user.email,
      });
    }
    return this.sign(user);
  }

  async forgotPassword(email: string, mailService: MailService): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Security: do not reveal whether email exists
    if (!user) return;

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: {
        token,
        expiresAt,
        userId: user.id,
      },
    });

    await mailService.sendPasswordReset(user.email, token, user.name ?? undefined);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new BadRequestException("Token yaroqsiz yoki muddati o'tgan");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordReset.update({
      where: { token },
      data: { used: true },
    });
  }

  async googleLogin(profile: { googleId: string; email: string; name: string }) {
    // 1. Find by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (user) return this.sign(user);

    // 2. Find by email and link googleId
    user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
      return this.sign(user);
    }

    // 3. Create new user
    const count = await this.prisma.user.count();
    const role = count === 0 ? "admin" : "user";
    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        passwordHash: "google-oauth-no-password",
        role,
        emailVerified: true, // Google email allaqachon tasdiqlangan
      },
    });
    return this.sign(user);
  }

  private sign(user: {
    id: string;
    email: string;
    role: string;
    name: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return {
      token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
