/**
 * O'zbekiston telefon raqamlari bilan ishlash.
 *
 * Raqam bazada DOIM bitta ko'rinishda saqlanadi: `998901234567` (12 raqam,
 * `+` siz, probelsiz). Aks holda bitta odam turli ko'rinishda yozib, ikkita
 * hisob ochib olishi mumkin edi — `@unique` cheklovi buni ushlay olmasdi.
 */

/** Bazada saqlanadigan ko'rinish: 998 + 9 raqam. */
const NORMALIZED_RE = /^998\d{9}$/;

/**
 * O'zbekiston mobil operator kodlari.
 * Shahar (69, 71...) va xizmat raqamlarini rad etamiz — ularga Telegram
 * yoki SMS bormaydi, ya'ni tasdiqlab bo'lmaydi.
 */
const MOBILE_PREFIXES = [
  "20", // Humans
  "33", // Humans / Uzmobile
  "50", // Perfectum / Uzmobile
  "55", // Perfectum
  "77", // Uzmobile
  "88", // Humans / Ucell
  "90",
  "91", // Beeline
  "93",
  "94", // Ucell
  "95", // Uzmobile
  "97",
  "98", // Mobiuz
  "99", // Uzmobile
];

/**
 * Foydalanuvchi kiritgan raqamni bazadagi ko'rinishga keltiradi.
 * Qabul qiladi: `+998 90 123 45 67`, `998901234567`, `90 123 45 67`,
 * `(90) 123-45-67`, `8 90 123 45 67`.
 * Yaroqsiz bo'lsa `null` qaytaradi — chaqiruvchi xato beradi.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Faqat raqamlarni qoldiramiz
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return null;

  // "8" bilan boshlanuvchi eski ko'rinish (8 90 123 45 67) — 8 ni tashlaymiz
  if (digits.length === 10 && digits.startsWith("8")) {
    digits = digits.slice(1);
  }
  // Mamlakat kodisiz kiritilgan (90 123 45 67) — 998 qo'shamiz
  if (digits.length === 9) {
    digits = "998" + digits;
  }
  // "00998..." xalqaro ko'rinish
  if (digits.length === 14 && digits.startsWith("00998")) {
    digits = digits.slice(2);
  }

  if (!NORMALIZED_RE.test(digits)) return null;

  // Operator kodi mobil ekanini tekshiramiz
  const prefix = digits.slice(3, 5);
  if (!MOBILE_PREFIXES.includes(prefix)) return null;

  return digits;
}

/** Raqam bazadagi to'g'ri ko'rinishdami? */
export function isNormalizedPhone(value: string): boolean {
  return NORMALIZED_RE.test(value) && MOBILE_PREFIXES.includes(value.slice(3, 5));
}

/** Ko'rsatish uchun chiroyli ko'rinish: `+998 90 123 45 67`. */
export function formatPhone(normalized: string): string {
  if (!NORMALIZED_RE.test(normalized)) return normalized;
  const cc = normalized.slice(0, 3);
  const op = normalized.slice(3, 5);
  const a = normalized.slice(5, 8);
  const b = normalized.slice(8, 10);
  const c = normalized.slice(10, 12);
  return `+${cc} ${op} ${a} ${b} ${c}`;
}

/**
 * Kirish maydoniga kiritilgan qiymat email'ga o'xshaydimi yoki telefongami?
 * Kirishda foydalanuvchi ikkalasini ham kiritishi mumkin — qaysi biri
 * ekanini shu funksiya hal qiladi.
 */
export function looksLikeEmail(input: string): boolean {
  return input.includes("@");
}
