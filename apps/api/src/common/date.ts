/**
 * Mahalliy sana yordamchilari.
 *
 * MUAMMO: `new Date().toISOString().slice(0,10)` UTC sanasini beradi.
 * O'zbekiston UTC+5 — ya'ni mahalliy vaqt bilan 00:00–05:00 oralig'idagi faollik
 * KECHAGI kunga yozilardi. Natijada kechqurun o'qiydigan foydalanuvchining
 * streak'i asossiz uzilardi va kunlik maqsad noto'g'ri hisoblanardi.
 *
 * Barcha "kun" tushunchasi (streak, DailyActivity, planner) shu yerdan olinadi.
 */

/** Ilova vaqt mintaqasi. .env dagi APP_TZ bilan almashtirish mumkin. */
export const APP_TZ = process.env.APP_TZ?.trim() || "Asia/Tashkent";

// en-CA lokali YYYY-MM-DD formatini beradi — qo'lda yig'ishdan ishonchliroq.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Mahalliy mintaqadagi "YYYY-MM-DD". offset — kunlardagi siljish (-1 = kecha). */
export function dayStr(offset = 0, from: Date = new Date()): string {
  const d = new Date(from.getTime() + offset * 86_400_000);
  return dayFormatter.format(d);
}

/** Bugungi mahalliy sana. */
export function todayStr(from: Date = new Date()): string {
  return dayStr(0, from);
}

/** Mahalliy mintaqadagi hafta kuni (0 = yakshanba, 1 = dushanba). */
export function localWeekday(from: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    weekday: "short",
  }).format(from);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Ikki "YYYY-MM-DD" orasidagi kunlar farqi (a - b). */
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/**
 * Cron vazifalari shu jarayonda ishlashi kerakmi?
 *
 * Cron'lar HAR bir API nusxasida ishlaydi. Hozir bitta konteyner bor, lekin
 * ikkitaga chiqarilsa xatlar va bildirishnomalar IKKI marta yuboriladi.
 * Bir nechta nusxada faqat bittasida CRON_ENABLED=1 qo'ying.
 * Sozlanmagan bo'lsa — yoqilgan (mavjud xatti-harakat saqlanadi).
 */
export function cronsEnabled(): boolean {
  const v = process.env.CRON_ENABLED?.trim();
  return v === undefined || v === "" || v === "1" || v.toLowerCase() === "true";
}
