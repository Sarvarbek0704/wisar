import { Body, Controller, ForbiddenException, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { TelegramService, type TelegramUpdate } from "./telegram.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma.service";
import { formatPhone } from "../common/phone";

/**
 * Telegram bot webhook'i.
 *
 * Tasdiqlash oqimi:
 *   1. Sayt `t.me/<bot>?start=<token>` havolasini beradi
 *   2. Foydalanuvchi Start bosadi → bu yerga `/start <token>` keladi
 *      → tokenni shu chatga bog'laymiz va "Raqamni ulashish" tugmasini yuboramiz
 *   3. Foydalanuvchi tugmani bosadi → Telegram raqamni yuboradi
 *      → chat bo'yicha tokenni topib, raqamni tasdiqlaymiz
 *
 * Endpoint ochiq (Telegram JWT yubormaydi), shuning uchun
 * `X-Telegram-Bot-Api-Secret-Token` sarlavhasi bilan himoyalangan.
 */
@Controller("telegram")
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() update: TelegramUpdate,
    @Headers("x-telegram-bot-api-secret-token") secret?: string,
  ) {
    if (!this.telegram.verifySecret(secret)) {
      throw new ForbiddenException();
    }

    const msg = update?.message;
    const chatId = msg?.chat?.id;
    if (!chatId) return { ok: true };

    try {
      // ── 1-qadam: /start <token>
      const startMatch = msg?.text?.match(/^\/start(?:\s+(\S+))?/);
      if (startMatch) {
        await this.handleStart(chatId, startMatch[1]);
        return { ok: true };
      }

      // ── 2-qadam: foydalanuvchi raqamini ulashdi
      if (msg?.contact) {
        await this.handleContact(chatId, msg.contact, msg.from?.id);
        return { ok: true };
      }

      await this.telegram.sendMessage(
        chatId,
        "Bu bot faqat Wisar hisobingizga telefon raqamini bog'lash uchun ishlaydi.\n\n" +
          "Iltimos, saytdagi <b>“Telegram orqali tasdiqlash”</b> tugmasi orqali qayta keling.",
      );
    } catch (e) {
      // Telegram 200 dan boshqa javobni xato deb hisoblab, yangilanishni qayta yuboradi.
      // Shuning uchun ichki xatoda ham 200 qaytaramiz — faqat logga yozamiz.
      this.logger.error(`Webhook xatosi: ${(e as Error).message}`);
    }
    return { ok: true };
  }

  private async handleStart(chatId: number, token?: string) {
    if (!token) {
      await this.telegram.sendMessage(
        chatId,
        "Salom! 👋\n\nTelefon raqamini tasdiqlash uchun Wisar saytidagi " +
          "<b>“Telegram orqali tasdiqlash”</b> tugmasini bosing — u sizni shu yerga " +
          "maxsus havola bilan qaytaradi.",
      );
      return;
    }

    const rec = await this.prisma.phoneLinkToken.findUnique({
      where: { token },
      include: { user: { select: { phone: true, name: true } } },
    });

    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      await this.telegram.sendMessage(
        chatId,
        "Bu havolaning muddati tugagan yoki u allaqachon ishlatilgan.\n\n" +
          "Saytga qaytib, tasdiqlash tugmasini qaytadan bosing.",
      );
      return;
    }

    // Tokenni shu chatga bog'laymiz — raqam keyingi xabarda keladi
    await this.prisma.phoneLinkToken.update({
      where: { id: rec.id },
      data: { chatId: String(chatId) },
    });

    const salom = rec.user.name ? `Salom, ${rec.user.name}!` : "Salom!";
    await this.telegram.askForContact(
      chatId,
      `${salom} 👋\n\n` +
        `Wisar hisobingizdagi raqam: <b>${formatPhone(rec.user.phone ?? "")}</b>\n\n` +
        `Tasdiqlash uchun pastdagi <b>“📱 Raqamni ulashish”</b> tugmasini bosing. ` +
        `Raqamni qo'lda yozish shart emas.`,
    );
  }

  private async handleContact(
    chatId: number,
    contact: { phone_number: string; user_id?: number },
    fromId?: number,
  ) {
    // Boshqa odamning kontaktini yuborish mumkin — faqat O'ZINIKI qabul qilinadi.
    if (contact.user_id && fromId && contact.user_id !== fromId) {
      await this.telegram.sendMessage(
        chatId,
        "Faqat <b>o'zingizning</b> raqamingizni ulashishingiz mumkin. " +
          "Iltimos, tugmani bosib qayta urinib ko'ring.",
      );
      return;
    }

    const rec = await this.prisma.phoneLinkToken.findFirst({
      where: { chatId: String(chatId), usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!rec) {
      await this.telegram.sendMessage(
        chatId,
        "Tasdiqlash so'rovi topilmadi yoki muddati tugagan.\n\n" +
          "Saytga qaytib, tasdiqlash tugmasini qaytadan bosing.",
      );
      return;
    }

    const result = await this.auth.completePhoneVerification(
      rec.token,
      contact.phone_number,
      String(fromId ?? contact.user_id ?? chatId),
    );

    if (result.ok) {
      await this.telegram.sendMessage(
        chatId,
        "✅ <b>Raqamingiz tasdiqlandi!</b>\n\n" +
          "Endi saytga qaytib, telefon raqamingiz va parolingiz bilan kirishingiz mumkin.",
      );
      return;
    }

    if (result.reason === "mismatch") {
      await this.telegram.sendMessage(
        chatId,
        `Ulashilgan raqam hisobingizdagi raqamga mos kelmadi.\n\n` +
          `Hisobingizdagi raqam: <b>${formatPhone(result.expected ?? "")}</b>\n\n` +
          `Agar raqamni xato kiritgan bo'lsangiz — saytdan uni to'g'rilab, qaytadan urinib ko'ring.`,
      );
      return;
    }

    if (result.reason === "telegram_taken") {
      await this.telegram.sendMessage(
        chatId,
        "Bu Telegram hisobi allaqachon boshqa Wisar foydalanuvchisiga bog'langan.",
      );
      return;
    }

    await this.telegram.sendMessage(
      chatId,
      "Tasdiqlash muddati tugagan. Saytga qaytib, qaytadan urinib ko'ring.",
    );
  }
}
