/**
 * Anonim flashcard progressi.
 *
 * Muammo: kartalar dastasi ro'yxatdan o'tmagan foydalanuvchiga ham ochiq
 * (OptionalJwtGuard), lekin baho serverga yuborilmasdi — progress jimgina
 * yo'qolardi. Natijada 12 000+ kartaga qaramay `FlashcardReview` jadvali bo'sh edi.
 *
 * Yechim: anonim baholar localStorage'da navbatga yoziladi, foydalanuvchi
 * kirgach serverga ko'chiriladi.
 */
import { reviewCard } from "./flashcards-api";
import { isLoggedIn } from "./auth";

const KEY = "wisar-pending-reviews";
const MAX = 500; // navbat cheksiz o'smasin
/** Shundan eski baholar tashlab yuboriladi — server doim rad etsa navbat abadiy qolmasin. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type PendingReview = {
  cardId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  at: number;
};

function read(): PendingReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as PendingReview[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: PendingReview[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* kvota to'lgan bo'lsa jim o'tamiz */
  }
}

/** Anonim bahoni navbatga qo'yadi. Bir karta bir marta — oxirgi baho saqlanadi. */
export function queueReview(cardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  const list = read().filter((r) => r.cardId !== cardId);
  list.push({ cardId, quality, at: Date.now() });
  write(list);
}

/** Navbatdagi baholar soni (UI'da "N ta natija kutmoqda" uchun). */
export function pendingCount(): number {
  return read().length;
}

export function clearPending() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Navbatni serverga ko'chiradi. Faqat kirgan foydalanuvchida ishlaydi.
 * Muvaffaqiyatli yuborilganlar navbatdan olib tashlanadi — uzilib qolsa
 * qolgani keyingi urinishda yuboriladi.
 *
 * @returns ko'chirilgan baholar soni
 */
export async function syncPendingReviews(): Promise<number> {
  if (!isLoggedIn()) return 0;
  // Juda eski yozuvlarni tashlab yuboramiz (server ularni baribir qabul qilmasa).
  const cutoff = Date.now() - MAX_AGE_MS;
  const list = read().filter((r) => r.at >= cutoff);
  if (!list.length) {
    clearPending();
    return 0;
  }

  const failed: PendingReview[] = [];
  let synced = 0;

  for (const r of list) {
    try {
      await reviewCard(r.cardId, r.quality);
      synced++;
    } catch {
      failed.push(r);
    }
  }

  if (failed.length) write(failed);
  else clearPending();

  return synced;
}
