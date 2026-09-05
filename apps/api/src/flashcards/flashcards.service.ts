import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { LlmService } from "../llm/llm.service";
import { CacheService } from "../common/cache.service";
import { sm2 } from "../review/sm2";

@Injectable()
export class FlashcardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly cache: CacheService,
  ) {}

  /** AI yodlash maslahati + misol gap (11-vazifa). Keshlanadi (qayta so'ramaslik). */
  async getHint(cardId: string) {
    const key = `hint:${cardId}`;
    const cached = this.cache.get<{ mnemonic: string; example: string | null }>(key);
    if (cached) return cached;

    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException("Karta topilmadi");

    const system =
      `Sen ingliz tili o'qituvchisisan. So'zni yodlashga yordam ber. ` +
      `FAQAT shu JSON formatda qaytar (boshqa matnsiz): ` +
      `{"mnemonic":"<o'zbekcha yodlash usuli, assotsiatsiya>","example":"<inglizcha tabiiy misol gap>"}`;
    const user = `So'z: "${card.front}" — o'zbekcha tarjimasi: "${card.back}". Yodlash maslahati va bitta tabiiy misol gap ber.`;

    const raw = await this.llm.ask(system, user, 400, true);
    const parsed = this.llm.parseJson<{ mnemonic: string; example: string }>(raw);
    const result = { mnemonic: parsed.mnemonic, example: parsed.example || card.example };

    // Misol gap bo'sh bo'lsa Flashcard.example ga saqlaymiz (doimiy)
    if (!card.example && parsed.example) {
      await this.prisma.flashcard.update({ where: { id: cardId }, data: { example: parsed.example } });
    }
    this.cache.set(key, result, 24 * 60 * 60 * 1000);
    return result;
  }

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
   * Kartani baholaydi va review yozuvini yangilaydi.
   *
   * KANONIK SM-2 (`review/sm2.ts`) ishlatiladi — ilgari bu yerda alohida, biroz
   * boshqacha nusxa bor edi (birinchi interval 1 kun emas 3 kun, EF formulasi
   * soddalashtirilgan, xato javobda jarima yo'q). Natijada "birlashgan takrorlash
   * navbati"ning kartalar yarmi va savollar yarmi turli jadval bo'yicha ishlardi.
   *
   * quality: 0-5 (0=to'liq unutilgan, 5=mukammal)
   */
  async reviewCard(userId: string, cardId: string, quality: number) {
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException("Karta topilmadi");

    const existing = await this.prisma.flashcardReview.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    const r = sm2(
      {
        interval: existing?.interval ?? 1,
        easeFactor: existing?.easeFactor ?? 2.5,
        reps: existing?.reps ?? 0,
      },
      quality,
    );

    const review = await this.prisma.flashcardReview.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {
        quality,
        interval: r.interval,
        easeFactor: r.easeFactor,
        reps: r.reps,
        nextReview: r.nextReview,
        reviewedAt: new Date(),
      },
      create: {
        userId,
        cardId,
        quality,
        interval: r.interval,
        easeFactor: r.easeFactor,
        reps: r.reps,
        nextReview: r.nextReview,
        reviewedAt: new Date(),
      },
    });

    return {
      cardId,
      interval: review.interval,
      easeFactor: review.easeFactor,
      nextReview: review.nextReview,
    };
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

    // Faqat kerakli ustunlar — ilgari har qator uchun butun karta va dasta
    // yozuvi ham yuklanardi (minglab qator × ichma-ich join) va faqat sanash uchun ishlatilardi.
    const allReviews = await this.prisma.flashcardReview.findMany({
      where: { userId },
      select: {
        interval: true,
        nextReview: true,
        card: { select: { deck: { select: { slug: true, title: true } } } },
      },
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
