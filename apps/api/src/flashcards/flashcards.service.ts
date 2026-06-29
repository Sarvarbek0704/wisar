import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class FlashcardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Barcha flashcard dastalari — karta soni bilan */
  async getDecks() {
    return this.prisma.flashcardDeck.findMany({
      orderBy: { level: "asc" },
      include: { _count: { select: { cards: true } } },
    });
  }

  /**
   * Bitta dastadagi barcha kartalar + foydalanuvchining review holati.
   * Bugungi kartalar (nextReview <= hozir) birinchi, qolganlari order bo'yicha.
   */
  async getDeckWithCards(deckSlug: string, userId?: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: { slug: deckSlug },
      include: {
        cards: {
          orderBy: { order: "asc" },
        },
      },
    });
    if (!deck) throw new NotFoundException("Dasta topilmadi");

    if (!userId) {
      return { ...deck, cards: deck.cards };
    }

    // Foydalanuvchining review yozuvlarini olamiz
    const cardIds = deck.cards.map((c) => c.id);
    const reviews = await this.prisma.flashcardReview.findMany({
      where: { userId, cardId: { in: cardIds } },
    });
    const reviewMap = new Map(reviews.map((r) => [r.cardId, r]));

    const now = new Date();

    const cardsWithReview = deck.cards.map((card) => {
      const review = reviewMap.get(card.id);
      return {
        ...card,
        review: review
          ? {
              interval: review.interval,
              easeFactor: review.easeFactor,
              nextReview: review.nextReview,
              quality: review.quality,
              reviewedAt: review.reviewedAt,
            }
          : null,
        isDue: review ? review.nextReview <= now : true,
      };
    });

    // Bugungi kartalar birinchi, qolganlari order bo'yicha
    cardsWithReview.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return a.order - b.order;
    });

    return { ...deck, cards: cardsWithReview };
  }

  /**
   * SM-2 algoritmi bo'yicha kartani baholaydi va review yozuvini yangilaydi.
   * quality: 0-5 (0=to'liq unutilgan, 5=mukammal)
   */
  async reviewCard(userId: string, cardId: string, quality: number) {
    // Karta mavjudligini tekshiramiz
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException("Karta topilmadi");

    // Mavjud review yoki standart qiymatlar
    const existing = await this.prisma.flashcardReview.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    const oldInterval = existing?.interval ?? 1;
    const oldEf = existing?.easeFactor ?? 2.5;

    // SM-2 hisoblash
    let interval: number;
    let easeFactor: number;

    if (quality >= 3) {
      interval = Math.round(oldInterval * oldEf);
      // easeFactor yangilanishi
      easeFactor = oldEf + 0.1 - (5 - quality) * 0.08;
      if (easeFactor < 1.3) easeFactor = 1.3;
    } else {
      // Yomon natija — ertadan qayta boshlaydi
      interval = 1;
      easeFactor = oldEf; // EF saqlanadi
    }

    // Minimal interval 1 kun
    if (interval < 1) interval = 1;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    const review = await this.prisma.flashcardReview.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {
        quality,
        interval,
        easeFactor,
        nextReview,
        reviewedAt: new Date(),
      },
      create: {
        userId,
        cardId,
        quality,
        interval,
        easeFactor,
        nextReview,
        reviewedAt: new Date(),
      },
    });

    return { cardId, interval, easeFactor: review.easeFactor, nextReview };
  }

  /**
   * Foydalanuvchi statistikasi:
   *  - total: jami ko'rilgan kartalar
   *  - mastered: interval >= 21 kun (o'zlashtirilgan)
   *  - due: hozir takrorlanishi kerak
   *  - byDeck: har dasta uchun due va mastered soni
   */
  async getStats(userId: string) {
    const now = new Date();

    const allReviews = await this.prisma.flashcardReview.findMany({
      where: { userId },
      include: { card: { include: { deck: true } } },
    });

    const total = allReviews.length;
    const mastered = allReviews.filter((r) => r.interval >= 21).length;
    const due = allReviews.filter((r) => r.nextReview <= now).length;

    // Dasta bo'yicha guruhlaymiz
    const deckMap = new Map<
      string,
      { deckSlug: string; deckTitle: string; due: number; mastered: number }
    >();

    for (const r of allReviews) {
      const slug = r.card.deck.slug;
      if (!deckMap.has(slug)) {
        deckMap.set(slug, {
          deckSlug: slug,
          deckTitle: r.card.deck.title,
          due: 0,
          mastered: 0,
        });
      }
      const entry = deckMap.get(slug)!;
      if (r.nextReview <= now) entry.due++;
      if (r.interval >= 21) entry.mastered++;
    }

    return {
      total,
      mastered,
      due,
      byDeck: Array.from(deckMap.values()),
    };
  }
}
