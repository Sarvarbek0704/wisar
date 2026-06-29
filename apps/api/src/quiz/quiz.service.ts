import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  listBySection(sectionId: string) {
    return this.prisma.quiz.findMany({
      where: { sectionId },
      orderBy: { order: "asc" },
      include: { _count: { select: { questions: true } } },
    });
  }

  // Test olish — to'g'ri javoblarsiz (foydalanuvchi yechishi uchun)
  async forTaking(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) throw new NotFoundException("Test topilmadi");
    return {
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: JSON.parse(q.options) as string[],
      })),
    };
  }

  // Javoblarni baholash — ball + to'g'ri javoblar + izohlar
  async submit(id: string, answers: number[]) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) throw new NotFoundException("Test topilmadi");

    let score = 0;
    const results = quiz.questions.map((q, i) => {
      const your = answers[i];
      const correct = your === q.correctIndex;
      if (correct) score++;
      return {
        questionId: q.id,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        your,
        correct,
      };
    });
    return { score, total: quiz.questions.length, results };
  }
}
