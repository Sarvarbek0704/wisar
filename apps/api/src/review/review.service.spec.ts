import { ReviewService } from "./review.service";

function makePrismaMock() {
  return {
    flashcardReview: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    reviewItem: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "ri1", ...data })),
      upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: "ri1", ...create })),
    },
    question: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
}

const flashcardsMock = {
  reviewCard: jest.fn().mockResolvedValue({ cardId: "c1", interval: 6, easeFactor: 2.6, nextReview: new Date() }),
} as any;

describe("ReviewService", () => {
  let prisma: any;
  let review: ReviewService;

  beforeEach(() => {
    prisma = makePrismaMock();
    review = new ReviewService(prisma, flashcardsMock);
    jest.clearAllMocks();
  });

  it("dueCount karta + savol sonini qo'shadi", async () => {
    prisma.flashcardReview.count.mockResolvedValue(3);
    prisma.reviewItem.count.mockResolvedValue(2);
    const res = await review.dueCount("u1");
    expect(res).toEqual({ cards: 3, questions: 2, total: 5 });
  });

  it("grade('card') flashcards.reviewCard ga topshiradi", async () => {
    await review.grade("u1", "card", "c1", 5);
    expect(flashcardsMock.reviewCard).toHaveBeenCalledWith("u1", "c1", 5);
  });

  it("grade('question') ReviewItem ni SM-2 bilan upsert qiladi", async () => {
    prisma.reviewItem.findUnique.mockResolvedValue(null);
    const res: any = await review.grade("u1", "question", "q1", 5);
    expect(prisma.reviewItem.upsert).toHaveBeenCalled();
    expect(res.interval).toBeGreaterThanOrEqual(1);
    expect(res.refId).toBe("q1");
  });

  it("addMistake yangi savolni ertaga navbatga qo'shadi", async () => {
    prisma.reviewItem.findUnique.mockResolvedValue(null);
    await review.addMistake("u1", "q1");
    expect(prisma.reviewItem.create).toHaveBeenCalled();
    const data = prisma.reviewItem.create.mock.calls[0][0].data;
    expect(data.kind).toBe("question");
    expect(data.refId).toBe("q1");
    // nextReview ~ ertaga (bugundan keyin)
    expect(new Date(data.nextReview).getTime()).toBeGreaterThan(Date.now());
  });

  it("addMistake takroran qo'shmaydi (allaqachon navbatda)", async () => {
    prisma.reviewItem.findUnique.mockResolvedValue({ id: "ri1", refId: "q1" });
    await review.addMistake("u1", "q1");
    expect(prisma.reviewItem.create).not.toHaveBeenCalled();
  });
});
