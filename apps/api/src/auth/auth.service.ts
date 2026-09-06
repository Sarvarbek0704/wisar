import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomBytes, createHash, randomInt } from "crypto";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { PrismaService } from "../prisma.service";
import { MailService } from "../mail/mail.service";
import { looksLikeEmail, normalizePhone } from "../common/phone";

/**
 * Token imzolash uchun kerakli minimal maydonlar.
 * `email` ham, `phone` ham null bo'lishi mumkin — lekin kamida bittasi bo'ladi
 * (buni ro'yxatdan o'tishda tekshiramiz).
 */
type SignableUser = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  name: string | null;
};

/** Access token muddati (qisqa) — refresh cookie uzoq muddat saqlaydi (34-vazifa). */
const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 30;
/** Tasdiqlash kodini qayta yuborishdan oldingi kutish vaqti (email bombardimoniga qarshi). */
const VERIFY_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
/** Telegram tasdiqlash havolasining amal qilish muddati. */
const PHONE_LINK_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ─── Refresh token (34-vazifa) ───────────────────────────────────────────────
  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  /** Yangi refresh token yaratadi (DB'da faqat hash saqlanadi), xom qiymatini qaytaradi. */
  async createRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashToken(raw), expiresAt },
    });
    return raw;
  }

  /** Refresh tokenni tekshiradi, rotatsiya qiladi va yangi access + refresh beradi. */
  async refresh(rawToken: string | undefined): Promise<{
    token: string;
    refreshToken: string;
    user: { id: string; email: string | null; phone: string | null; name: string | null; role: string };
  } | null> {
    if (!rawToken) return null;
    const rec = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    });
    if (!rec || rec.revoked || rec.expiresAt < new Date()) return null;
    // Rotatsiya: eskisini bekor qil, yangisini ber
    await this.prisma.refreshToken.update({ where: { id: rec.id }, data: { revoked: true } });
    const refreshToken = await this.createRefreshToken(rec.userId);
    return {
      token: this.signAccess(rec.user),
      refreshToken,
      user: {
        id: rec.user.id,
        email: rec.user.email,
        phone: rec.user.phone,
        name: rec.user.name,
        role: rec.user.role,
      },
    };
  }

  /** Refresh tokenni bekor qiladi (logout). */
  async revokeRefreshToken(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawToken) },
      data: { revoked: true },
    });
  }

  private signAccess(user: SignableUser): string {
    return this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        name: user.name,
      },
      { expiresIn: ACCESS_TTL },
    );
  }

  /**
   * 6 xonali tasdiqlash kodi yaratib, DB'ga yozadi va emailga yuboradi.
   * Kod kriptografik tasodifiy (`randomInt`) — `Math.random()` bashorat qilinadi.
   * Cooldown: yaqinda kod yuborilgan bo'lsa qaytadan yubormaymiz — bu ham email
   * bombardimonining, ham haqiqiy foydalanuvchining kodini bekor qilishning oldini oladi.
   */
  private async issueVerificationCode(
    userId: string,
    email: string,
    name: string | null,
    mailService: MailService,
  ): Promise<void> {
    const recent = await this.prisma.emailVerification.findFirst({
      where: { userId, createdAt: { gt: new Date(Date.now() - VERIFY_RESEND_COOLDOWN_MS) } },
      orderBy: { createdAt: "desc" },
    });
    if (recent) return; // hali amaldagi kod bor — yangisini yubormaymiz

    await this.prisma.emailVerification.deleteMany({ where: { userId } });
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 daqiqa
    await this.prisma.emailVerification.create({
      data: { userId, code, expiresAt },
    });
    await mailService.sendVerificationCode(email, code, name ?? undefined);
  }

  /**
   * Ro'yxatdan o'tish — foydalanuvchi EMAIL yoki TELEFON dan bittasini tanlaydi.
   * Parol ikkala holatda ham majburiy.
   *
   * Email tanlansa  → emailga 6 xonali kod (avvalgidek)
   * Telefon tanlansa → Telegram orqali tasdiqlash havolasi (kod terilmaydi)
   */
  async register(
    input: {
      email?: string;
      phone?: string;
      password: string;
      name?: string;
      inviteCode?: string;
    },
    mailService: MailService,
  ) {
    const email = input.email?.trim().toLowerCase() || undefined;
    const rawPhone = input.phone?.trim() || undefined;

    if (!email && !rawPhone) {
      throw new BadRequestException("Email yoki telefon raqamini kiriting");
    }

    let phone: string | undefined;
    if (rawPhone) {
      const normalized = normalizePhone(rawPhone);
      if (!normalized) {
        throw new BadRequestException(
          "Telefon raqami noto'g'ri. Namuna: +998 90 123 45 67",
        );
      }
      phone = normalized;
    }

    // Mavjud hisobni email yoki telefon bo'yicha qidiramiz
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (existing) {
      // Tasdiqlanmagan hisob bo'lsa — tasdiqlashni qayta boshlaymiz.
      // (Hisobni o'g'irlashning oldini oladi: parol o'zgartirilmaydi.)
      if (email && existing.email === email && !existing.emailVerified) {
        await this.issueVerificationCode(existing.id, email, existing.name, mailService);
        return { needsVerification: true, email };
      }
      if (phone && existing.phone === phone && !existing.phoneVerified) {
        return this.startPhoneVerification(existing.id);
      }
      throw new ConflictException(
        email && existing.email === email
          ? "Bu email allaqachon ro'yxatdan o'tgan"
          : "Bu telefon raqami allaqachon ro'yxatdan o'tgan",
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    // Birinchi ro'yxatdan o'tgan foydalanuvchi avtomatik ADMIN bo'ladi (va tasdiqlangan)
    const count = await this.prisma.user.count();
    const isFirst = count === 0;
    const role = isFirst ? "admin" : "user";

    const user = await this.prisma.user.create({
      data: {
        email: email ?? null,
        phone: phone ?? null,
        name: input.name,
        passwordHash,
        role,
        emailVerified: isFirst && !!email,
        phoneVerified: isFirst && !!phone,
      },
    });

    if (input.inviteCode) {
      const invite = await this.prisma.invite.findUnique({
        where: { code: input.inviteCode },
      });
      if (invite && !invite.usedBy && (!invite.expiresAt || invite.expiresAt > new Date())) {
        await this.prisma.invite.update({
          where: { code: input.inviteCode },
          data: { usedBy: user.id, usedAt: new Date() },
        });
      }
    }

    // Birinchi admin darhol kiritiladi; qolganlar tasdiqlashi shart
    if (isFirst) return this.sign(user);

    if (email) {
      await this.issueVerificationCode(user.id, email, user.name, mailService);
      return { needsVerification: true, email };
    }
    return this.startPhoneVerification(user.id);
  }

  // ─── Telefonni Telegram orqali tasdiqlash ────────────────────────────────────

  /**
   * Hisobga telefon raqamini qo'shadi yoki o'zgartiradi.
   * Raqam o'zgargach tasdiq bekor bo'ladi — aks holda eski, tasdiqlangan
   * holat yangi (tasdiqlanmagan) raqamga o'tib ketardi.
   */
  async setPhone(userId: string, rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      throw new BadRequestException("Telefon raqami noto'g'ri. Namuna: +998 90 123 45 67");
    }

    const taken = await this.prisma.user.findFirst({
      where: { phone, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw new ConflictException("Bu telefon raqami boshqa hisobga bog'langan");

    await this.prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: false, telegramId: null },
    });
    return this.startPhoneVerification(userId);
  }

  /**
   * Telefon tasdiqlash holati. Sayt Telegram'dan qaytgach shu yerni so'raydi.
   * Tasdiqlangan bo'lsa yangi access token ham beradi — foydalanuvchi
   * qaytadan kirmasligi uchun.
   */
  async phoneStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("Foydalanuvchi topilmadi");
    if (!user.phoneVerified) {
      return { phoneVerified: false as const, phone: user.phone };
    }
    return { phoneVerified: true as const, phone: user.phone, ...this.sign(user) };
  }

  /**
   * Bir martalik token yaratib, foydalanuvchini Telegram botiga yo'naltiradigan
   * havola qaytaradi. Foydalanuvchi botda "Raqamni ulashish" tugmasini bosadi —
   * Telegram raqamni O'ZI tasdiqlab botga yuboradi, ya'ni kod terish shart emas
   * va raqamni soxtalashtirib bo'lmaydi.
   */
  async startPhoneVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerified: true },
    });
    if (!user?.phone) throw new BadRequestException("Avval telefon raqamini kiriting");
    if (user.phoneVerified) return { phoneVerified: true as const };

    // Eski, ishlatilmagan tokenlarni bekor qilamiz — bir vaqtda bittasi amal qilsin
    await this.prisma.phoneLinkToken.deleteMany({ where: { userId, usedAt: null } });

    const token = randomBytes(24).toString("base64url");
    await this.prisma.phoneLinkToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + PHONE_LINK_TTL_MS),
      },
    });

    const bot = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
    return {
      needsPhoneVerification: true as const,
      phone: user.phone,
      telegramUrl: bot ? `https://t.me/${bot}?start=${token}` : null,
      // Sayt shu token bilan tasdiqlash holatini so'rab turadi (auth kerak emas).
      linkToken: token,
      expiresInMinutes: Math.round(PHONE_LINK_TTL_MS / 60000),
    };
  }

  /**
   * Havola tokeni bo'yicha tasdiqlash holatini tekshiradi — AUTH KERAK EMAS.
   *
   * Telefon bilan endi ro'yxatdan o'tgan foydalanuvchida hali access token yo'q,
   * shuning uchun `/auth/phone/status` (JWT talab qiladi) ishlamaydi. Sayt shu
   * yerni so'rab turadi va tasdiqlangach kirish sahifasiga o'tkazadi.
   *
   * Token o'zi maxfiy (48 belgi tasodifiy), ya'ni uni bilgan odam allaqachon
   * o'sha ro'yxatdan o'tish jarayonining egasi.
   */
  async checkPhoneLink(token: string) {
    const rec = await this.prisma.phoneLinkToken.findUnique({
      where: { token },
      select: {
        usedAt: true,
        expiresAt: true,
        user: { select: { phone: true, phoneVerified: true } },
      },
    });
    if (!rec) return { verified: false as const, expired: true as const };
    if (rec.user.phoneVerified && rec.usedAt) {
      return { verified: true as const, phone: rec.user.phone };
    }
    return {
      verified: false as const,
      expired: rec.expiresAt < new Date(),
      phone: rec.user.phone,
    };
  }

  /**
   * Telegram botdan kelgan tasdiqni qayta ishlaydi.
   *
   * `contactPhone` — Telegram yuborgan raqam (u foydalanuvchi hisobiga bog'langan
   * va Telegram tomonidan tasdiqlangan). Bu raqam hisobdagi raqam bilan MOS
   * kelishi shart: aks holda kimdir boshqasining raqamini yozib, o'z Telegramida
   * tasdiqlab qo'yishi mumkin bo'lardi.
   */
  async completePhoneVerification(rawToken: string, contactPhone: string, telegramId: string) {
    const rec = await this.prisma.phoneLinkToken.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      return { ok: false as const, reason: "expired" as const };
    }

    const normalized = normalizePhone(contactPhone);
    if (!normalized || normalized !== rec.user.phone) {
      return { ok: false as const, reason: "mismatch" as const, expected: rec.user.phone };
    }

    // Bitta Telegram hisobi bitta foydalanuvchiga — boshqasiga biriktirilgan bo'lsa rad etamiz
    const taken = await this.prisma.user.findFirst({
      where: { telegramId, NOT: { id: rec.userId } },
      select: { id: true },
    });
    if (taken) return { ok: false as const, reason: "telegram_taken" as const };

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: rec.userId },
        data: { phoneVerified: true, telegramId },
      }),
      this.prisma.phoneLinkToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true as const, name: rec.user.name };
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
    if (!user?.email || user.emailVerified) return;
    await this.issueVerificationCode(user.id, user.email, user.name, mailService);
  }

  /**
   * Kirish. `identifier` — EMAIL yoki TELEFON raqami; qaysi biri ekanini
   * o'zimiz aniqlaymiz. Parol ikkala holatda ham majburiy.
   */
  async login(identifier: string, password: string, mailService: MailService, code?: string) {
    const raw = identifier.trim();
    const XATO = "Login yoki parol noto'g'ri";

    let user = null;
    if (looksLikeEmail(raw)) {
      user = await this.prisma.user.findUnique({ where: { email: raw.toLowerCase() } });
    } else {
      const phone = normalizePhone(raw);
      if (phone) user = await this.prisma.user.findUnique({ where: { phone } });
    }

    if (!user) throw new UnauthorizedException(XATO);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException(XATO);

    // Telefon bilan ro'yxatdan o'tgan, lekin hali tasdiqlamagan
    if (user.phone && !user.phoneVerified && !user.email) {
      const start = await this.startPhoneVerification(user.id);
      throw new UnauthorizedException({
        message: "Telefon raqami tasdiqlanmagan.",
        ...start,
      });
    }

    if (user.email && !user.emailVerified) {
      // Kodni qayta yuborib, frontendga tasdiqlash kerakligini bildiramiz
      await this.issueVerificationCode(user.id, user.email, user.name, mailService);
      throw new UnauthorizedException({
        message: "Email tasdiqlanmagan. Kod qayta yuborildi.",
        needsVerification: true,
        email: user.email,
      });
    }
    // 2FA (40-vazifa)
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!code) {
        throw new UnauthorizedException({ message: "2FA kodi kerak", needs2fa: true });
      }
      if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
        throw new UnauthorizedException({ message: "2FA kodi noto'g'ri", needs2fa: true });
      }
    }
    return this.sign(user);
  }

  // ─── 2FA TOTP (40-vazifa) ────────────────────────────────────────────────────
  async twoFactorStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return { enabled: !!user?.twoFactorEnabled };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("Foydalanuvchi topilmadi");
    // 2FA allaqachon yoqilgan bo'lsa qayta sozlashga yo'l qo'ymaymiz: aks holda
    // o'g'irlangan token bilan setup chaqirib, 2FA'ni kodsiz o'chirib yuborish mumkin edi.
    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        "2FA allaqachon yoqilgan. Qayta sozlash uchun avval joriy kod bilan o'chiring.",
      );
    }
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    // Authenticator ilovasida ko'rinadigan yorliq: email → telefon → ism tartibida
    const label = user.email ?? user.phone ?? user.name ?? user.id;
    const otpauth = authenticator.keyuri(label, "Wisar", secret);
    const qr = await QRCode.toDataURL(otpauth);
    return { otpauth, qr, secret };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException("Avval 2FA sozlang.");
    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new BadRequestException("Kod noto'g'ri.");
    }
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    return { ok: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) return { ok: true };
    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new BadRequestException("Kod noto'g'ri.");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { ok: true };
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

    await mailService.sendPasswordReset(user.email!, token, user.name ?? undefined);
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

    // Parolni tiklash odatda hisob buzilganda qilinadi — shuning uchun BARCHA
    // sessiyalarni yopamiz. Aks holda buzg'unchining refresh tokeni 30 kun ishlayveradi.
    await this.prisma.refreshToken.updateMany({
      where: { userId: reset.userId, revoked: false },
      data: { revoked: true },
    });
    // Shu foydalanuvchining boshqa tiklash tokenlari ham kuchini yo'qotsin.
    await this.prisma.passwordReset.updateMany({
      where: { userId: reset.userId, used: false },
      data: { used: true },
    });
  }

  /**
   * Login qilingan foydalanuvchi parolini yangilaydi.
   * Xavfsizlik: boshqa qurilmalardagi barcha refresh tokenlar bekor qilinadi
   * (joriy sessiya cookie'si saqlanadi — foydalanuvchi chiqarib yuborilmaydi).
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    keepRefreshRaw?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Foydalanuvchi topilmadi");

    // Google orqali kirganlarda haqiqiy parol yo'q — avval reset orqali o'rnatsin
    if (user.passwordHash === "google-oauth-no-password") {
      throw new BadRequestException(
        "Siz Google orqali kirgansiz. Parol o'rnatish uchun \"Parolni unutdingizmi?\" bo'limidan foydalaning.",
      );
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException("Joriy parol noto'g'ri");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Boshqa qurilmalardagi sessiyalarni yopamiz (joriy refresh saqlanadi)
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
        ...(keepRefreshRaw ? { tokenHash: { not: this.hashToken(keepRefreshRaw) } } : {}),
      },
      data: { revoked: true },
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

  private sign(user: SignableUser) {
    return {
      token: this.signAccess(user),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    };
  }
}
