import { Injectable, Logger } from "@nestjs/common";

/**
 * Telegram Bot API bilan ishlash.
 *
 * Nima uchun SMS emas: Eskiz SMS xizmatini faqat yuridik shaxsga beradi.
 * Telegram esa bepul, O'zbekistonda qamrovi keng va — eng muhimi — raqamning
 * haqiqiyligini O'ZI kafolatlaydi: foydalanuvchi "Raqamni ulashish" tugmasini
 * bosganda Telegram botga o'sha hisobga bog'langan haqiqiy raqamni yuboradi.
 * Ya'ni kod terish ham, kodni ushlab qolish xavfi ham yo'q.
 */

const API_BASE = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 15_000;

/** Telegram'dan keladigan yangilanishning bizga kerakli qismi. */
export type TelegramUpdate = {
  message?: {
    chat?: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
    contact?: {
      phone_number: string;
      user_id?: number;
    };
  };
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  private token(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined;
  }

  isConfigured(): boolean {
    return !!this.token();
  }

  /** Webhook so'rovi haqiqatan Telegram'dan kelganini tekshiradi. */
  verifySecret(headerValue: string | undefined): boolean {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    // Sir sozlanmagan bo'lsa tekshirmaymiz (lokal dev) — prod'da MAJBURIY.
    if (!expected) return process.env.NODE_ENV !== "production";
    return headerValue === expected;
  }

  private async call(method: string, body: unknown): Promise<unknown> {
    const token = this.token();
    if (!token) {
      this.logger.warn(`Telegram sozlanmagan — ${method} o'tkazib yuborildi.`);
      return null;
    }
    try {
      const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.logger.error(`Telegram ${method} xatosi (${res.status}): ${text.slice(0, 300)}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      this.logger.error(`Telegram ${method} ulanmadi: ${(e as Error).message}`);
      return null;
    }
  }

  /** Oddiy matnli xabar (klaviaturani olib tashlaydi). */
  sendMessage(chatId: number | string, text: string): Promise<unknown> {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true },
    });
  }

  /**
   * "Raqamni ulashish" tugmasi bilan xabar.
   * `request_contact: true` — Telegram foydalanuvchidan ruxsat so'rab, raqamni
   * o'zi yuboradi. Foydalanuvchi qo'lda yozmaydi, ya'ni xato ham, soxta ham bo'lmaydi.
   */
  askForContact(chatId: number | string, text: string): Promise<unknown> {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  /**
   * Webhook manzilini o'rnatadi. Deploydan keyin bir marta chaqiriladi
   * (scripts/telegram-setup.mjs orqali).
   */
  setWebhook(url: string, secret: string): Promise<unknown> {
    return this.call("setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    });
  }
}
