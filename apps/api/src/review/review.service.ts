import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { FlashcardsService } from "../flashcards/flashcards.service";
import { sm2 } from "./sm2";

export type ReviewKind = "card" | "question";

/**
 * Birlashgan takrorlash navbati (7-vazifa).
 * Kartalar — mavjud FlashcardReview (buzilmaydi), xato quiz savollari — ReviewItem.
 * Bitta navbat sifatida birlashtiriladi (adapter), baholash SM-2 bilan.
 */
@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flashcards: FlashcardsService,
  ) {}

  /** Bugun takrorlash kerak bo'lgan elementlar soni (3-vazifa badge). */
  async dueCount(userId: string) {
    const now = new Date();
    const [cards, questions] = await Promise.all([
      this.prisma.flashcardReview.count({ where: { userId, nextReview: { lte: now } } }),
      this.prisma.reviewItem.count({
        where: { userId, kind: "question", nextReview: { lte: now } },
      }),
    ]);
    return { cards, questions, total: cards + questions };
  }

  /** Bugungi navbat — kartalar + xato savollar aralash. */
  async queue(userId: string, limit = 40) {
    const now = new Date();
    const [cardReviews, questionItems] = await Promise.all([
      this.prisma.flashcardReview.findMany({
        where: { userId, nextReview: { lte: now } },
        include: { card: { include: { deck: { select: { title: true } } } } },
        orderBy: { nextReview: "asc" },
        take: limit,
      }),
      this.prisma.reviewItem.findMany({
        where: { userId, kind: "question", nextReview: { lte: now } },
        orderBy: { nextReview: "asc" },
        take: limit,
      }),
    ]);

    const cardItems = cardReviews.map((r) => ({
      kind: "card" as const,
      refId: r.cardId,
      front: r.card.front,
      back: r.card.back,
      ipa: r.card.ipa,
      example: r.card.example,
      source: r.card.deck.title,
      nextReview: r.nextReview,
    }));

    const qIds = questionItems.map((q) => q.refId);
    const questions = qIds.length
      ? await this.prisma.question.findMany({
          where: { id: { in: qIds } },
          include: { quiz: { include: { section: { include: { topic: true } } } } },
        })
      : [];
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const questionItemsResolved = questionItems
      .filter((item) => qMap.has(item.refId))
      .map((item) => {
        const q = qMap.get(item.refId)!;
        return {
          kind: "question" as const,
          refId: item.refId,
          text: q.text,
          options: JSON.parse(q.options) as string[],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          source: q.quiz.section.topic.title,
          nextReview: item.nextReview,
        };
      });

    return [...cardItems, ...questionItemsResolved]
      .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
      .slice(0, limit);
  }

  /** Bitta elementni baholash (quality 0-5) — SM-2 nextReview ni suradi. */
  async grade(userId: string, kind: ReviewKind, refId: string, quality: number) {
    if (kind === "card") {
      return this.flashcards.reviewCard(userId, refId, quality);
    }
    const existing = await this.prisma.reviewItem.findUnique({
      where: { userId_kind_refId: { userId, kind: "question", refId } },
    });
    const prev = {
      interval: existing?.interval ?? 1,
      easeFactor: existing?.easeFactor ?? 2.5,
      reps: existing?.reps ?? 0,
    };
    const r = sm2(prev, quality);
    const item = await this.prisma.reviewItem.upsert({
      where: { userId_kind_refId: { userId, kind: "question", refId } },
      create: {
        userId,
        kind: "question",
        refId,
        interval: r.interval,
        easeFactor: r.easeFactor,
        reps: r.reps,
        nextReview: r.nextReview,
        reviewedAt: new Date(),
      },
      update: {
        interval: r.interval,
        easeFactor: r.easeFactor,
        reps: r.reps,
        nextReview: r.nextReview,
        reviewedAt: new Date(),
      },
    });
    return { refId, interval: item.interval, easeFactor: item.easeFactor, nextReview: item.nextReview };
  }

  /** Quizda xato qilingan savolni navbatga qo'shadi (ertaga) — 7,8-vazifa. */
  async addMistake(userId: string, questionId: string) {
    const existing = await this.prisma.reviewItem.findUnique({
      where: { userId_kind_refId: { userId, kind: "question", refId: questionId } },
    });
    if (existing) return existing; // allaqachon navbatda
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.prisma.reviewItem.create({
      data: {
        userId,
        kind: "question",
        refId: questionId,
        interval: 1,
        easeFactor: 2.5,
        reps: 0,
        nextReview: tomorrow,
      },
    });
  }

  /** Bir nechta xato savolni navbatga qo'shadi. */
  async addMistakes(userId: string, questionIds: string[]) {
    for (const id of questionIds) {
      await this.addMistake(userId, id);
    }
  }
}
