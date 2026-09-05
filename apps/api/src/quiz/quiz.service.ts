import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ReviewService } from "../review/review.service";
import { LlmService } from "../llm/llm.service";

type GeneratedQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly review: ReviewService,
    private readonly llm: LlmService,
  ) {}

  /** Maqola matnidan AI bilan 3 ta active-recall savol yaratadi (8-vazifa, admin). */
  async generateForArticle(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, content: true, sectionId: true },
    });
    if (!article) throw new NotFoundException("Maqola topilmadi");

    const system =
      `Sen tajribali o'qituvchisan. Berilgan maqola matnidan 3 ta "active recall" test savoli yarat (o'zbekcha). ` +
      `Har savol 4 variantli, faqat bittasi to'g'ri. FAQAT shu JSON formatda qaytar (boshqa matnsiz):\n` +
      `{"questions":[{"text":"<savol>","options":["A","B","C","D"],"correctIndex":0,"explanation":"<nega>"}]}`;
    const user = `Maqola: "${article.title}"\n\n${(article.content ?? "").slice(0, 4000)}\n\nShu maqoladan 3 savol yarat.`;

    const raw = await this.llm.ask(system, user, 1500, true);
    const parsed = this.llm.parseJson<{ questions: GeneratedQuestion[] }>(raw);
    const qs = (parsed.questions || [])
      .filter((q) => q.text && Array.isArray(q.options) && q.options.length >= 2)
      .slice(0, 5);
    if (!qs.length) throw new ServiceUnavailableException("AI savol yarata olmadi.");

    // Idempotent — eski article testini o'chirib qayta yaratamiz
    await this.prisma.quiz.deleteMany({ where: { articleId } });
    return this.prisma.quiz.create({
      data: {
        sectionId: article.sectionId,
        articleId,
        title: `${article.title} — tezkor test`,
        questions: {
          create: qs.map((q, i) => ({
            text: q.text,
            options: JSON.stringify(q.options),
            correctIndex: Math.max(0, Math.min(q.options.length - 1, q.correctIndex ?? 0)),
            explanation: q.explanation ?? null,
            order: i,
          })),
        },
      },
      select: { id: true, title: true },
    });
  }

  listBySection(sectionId: string) {
    // Prisma'da `where: { sectionId: undefined }` = "filtrsiz" — ya'ni parametrsiz
    // so'rov butun jadvalni qaytarardi. Aniq talab qilamiz.
    if (!sectionId?.trim()) {
      throw new BadRequestException("section parametri kerak");
    }
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

  // Javoblarni baholash — ball + to'g'ri javoblar + izohlar.
  // Login bo'lsa: xato savollar review navbatiga qo'shiladi (7,8-vazifa).
  async submit(id: string, answers: number[], userId?: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) throw new NotFoundException("Test topilmadi");

    let score = 0;
    const wrongQuestionIds: string[] = [];
    const results = quiz.questions.map((q, i) => {
      const your = answers[i];
      const correct = your === q.correctIndex;
      if (correct) score++;
      else wrongQuestionIds.push(q.id);
      return {
        questionId: q.id,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        your,
        correct,
      };
    });

    if (userId && wrongQuestionIds.length) {
      await this.review.addMistakes(userId, wrongQuestionIds);
    }

    return { score, total: quiz.questions.length, results };
  }
}
