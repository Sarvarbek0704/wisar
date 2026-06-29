/**
 * Kanonik SM-2 spaced-repetition algoritmi (sof funksiya — testlanadigan).
 * Flashcard va xato quiz savollari uchun umumiy navbat (7-vazifa) shu funksiyani ishlatadi.
 *
 * quality: 0..5 (foydalanuvchi bahosi)
 *   0-2 → noto'g'ri/qiyin: takrorlar nolga tushadi, interval = 1 kun
 *   3-5 → to'g'ri: interval reps va easeFactor bo'yicha o'sadi
 */
export type Sm2State = {
  interval: number;
  easeFactor: number;
  reps: number;
};

export type Sm2Result = Sm2State & {
  nextReview: Date;
};

export const DAY_MS = 24 * 60 * 60 * 1000;

export function sm2(prev: Sm2State, quality: number, now: Date = new Date()): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let interval = prev.interval;
  let reps = prev.reps;
  let easeFactor = prev.easeFactor;

  if (q < 3) {
    // Noto'g'ri javob — boshidan boshlanadi
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  // Ease factor yangilanishi (SM-2 formula)
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  // Ortiqcha o'sishdan saqlash
  easeFactor = Math.round(easeFactor * 1000) / 1000;

  if (interval < 1) interval = 1;

  const nextReview = new Date(now.getTime() + interval * DAY_MS);
  return { interval, easeFactor, reps, nextReview };
}
