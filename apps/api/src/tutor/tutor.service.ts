import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { LlmService, type ChatMessage } from "../llm/llm.service";
import { EmbedService, cosineSimilarity } from "../llm/embed.service";

/** Markdownni soddalashtirib RAG bo'laklariga bo'lamiz (~400 so'z). */
function chunkText(md: string, wordsPerChunk = 400): string[] {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  const words = text.split(" ");
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks;
}

export type RagSource = {
  title: string;
  topicSlug: string;
  sectionSlug: string;
  slug: string;
};

@Injectable()
export class TutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly embed: EmbedService,
  ) {}

  /** Eski bitta savol-javob (kontekstsiz) — backward compat. */
  async askTutor(articleId: string, question: string): Promise<{ answer: string }> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, content: true },
    });
    if (!article) throw new NotFoundException("Maqola topilmadi");
    const content = (article.content ?? "").slice(0, 3000);
    const system =
      `Sen Wisar o'quv yordamchisisan. Maqola: "${article.title}". ` +
      `Faqat quyidagi kontekst asosida o'zbek tilida aniq, qisqa javob ber.`;
    const answer = await this.llm.ask(system, content + "\n\nSavol: " + question, 800);
    return { answer };
  }

  // ─── Multi-turn suhbat (17,19-vazifa) ────────────────────────────────────────
  createThread(
    userId: string | undefined,
    kind: "tutor" | "roleplay",
    articleId?: string,
    scenario?: string,
  ) {
    return this.prisma.aiThread.create({
      data: { userId: userId ?? null, kind, articleId: articleId ?? null, scenario: scenario ?? null },
      select: { id: true, kind: true, scenario: true },
    });
  }

  async getThread(id: string) {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) throw new NotFoundException("Suhbat topilmadi");
    return thread;
  }

  /** RAG: savolga tegishli kurs bo'laklarini topadi (18-vazifa). */
  private async ragContext(question: string): Promise<{ context: string; sources: RagSource[] }> {
    if (!this.embed.isConfigured()) return { context: "", sources: [] };
    let qvec: number[];
    try {
      qvec = await this.embed.embedOne(question);
    } catch {
      return { context: "", sources: [] };
    }
    const chunks = await this.prisma.articleChunk.findMany({
      take: 3000,
      include: {
        article: {
          select: {
            title: true,
            slug: true,
            section: { select: { slug: true, topic: { select: { slug: true } } } },
          },
        },
      },
    });
    const scored = chunks
      .map((c) => {
        let vec: number[] = [];
        try {
          vec = JSON.parse(c.embedding) as number[];
        } catch {
          /* skip */
        }
        return { c, score: cosineSimilarity(qvec, vec) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const context = scored.map((s) => s.c.content).join("\n---\n");
    const seen = new Set<string>();
    const sources: RagSource[] = [];
    for (const s of scored) {
      const a = s.c.article;
      const key = `${a.section.topic.slug}/${a.section.slug}/${a.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({ title: a.title, topicSlug: a.section.topic.slug, sectionSlug: a.section.slug, slug: a.slug });
    }
    return { context, sources };
  }

  /** Streaming javob: kontekst + tarix bilan, so'zma-so'z (17,18,19-vazifa). */
  async *askStream(threadId: string, question: string): AsyncGenerator<string> {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) throw new NotFoundException("Suhbat topilmadi");

    await this.prisma.aiMessage.create({
      data: { threadId, role: "user", content: question },
    });

    const history: ChatMessage[] = thread.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
    history.push({ role: "user", content: question });

    let system: string;
    if (thread.kind === "roleplay") {
      system =
        `You are a friendly English conversation partner for a language learner. ` +
        `Scenario: ${thread.scenario || "general everyday conversation"}. ` +
        `Stay in character, speak natural English, keep replies short (2-4 sentences), ` +
        `ask follow-up questions, and gently keep the conversation going. Do not break character or switch to Uzbek.`;
    } else {
      const parts: string[] = [];
      if (thread.articleId) {
        const a = await this.prisma.article.findUnique({
          where: { id: thread.articleId },
          select: { title: true, content: true },
        });
        if (a) parts.push(`Joriy maqola: "${a.title}"\n${(a.content ?? "").slice(0, 2500)}`);
      }
      const rag = await this.ragContext(question);
      if (rag.context) parts.push(`Kurs materiallaridan tegishli parchalar:\n${rag.context}`);
      system =
        `Sen Wisar o'quv yordamchisisan. O'zbek tilida aniq, qisqa va do'stona javob ber. ` +
        `Quyidagi kontekst va umumiy bilimingdan foydalan.\n\n${parts.join("\n\n")}`;
    }

    let full = "";
    for await (const delta of this.llm.stream(system, history, 1000)) {
      full += delta;
      yield delta;
    }
    if (!full.trim()) full = "(javob olinmadi)";
    await this.prisma.aiMessage.create({
      data: { threadId, role: "assistant", content: full },
    });
  }

  /** Roleplay suhbati oxirida qisqa fikr-mulohaza (19-vazifa). */
  async feedback(threadId: string) {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) throw new NotFoundException("Suhbat topilmadi");
    const convo = thread.messages
      .map((m) => `${m.role === "user" ? "Talaba" : "AI"}: ${m.content}`)
      .join("\n");
    const system =
      `Sen ingliz tili o'qituvchisisan. Talabaning suhbatdagi ingliz tilini baholang. ` +
      `FAQAT shu JSON: {"strengths":["o'zbekcha"],"mistakes":[{"text":"asl","fix":"tuzatish","why":"o'zbekcha"}],"tips":["o'zbekcha maslahat"],"level":"A1..C2"}.`;
    const raw = await this.llm.ask(system, convo, 1200, true);
    return this.llm.parseJson(raw);
  }

  // ─── RAG indeksatsiya (18-vazifa, admin) ─────────────────────────────────────
  async indexAll() {
    if (!this.embed.isConfigured()) {
      throw new ServiceUnavailableException("Embedding sozlanmagan (EMBED_* env). RAG indekslab bo'lmadi.");
    }
    const articles = await this.prisma.article.findMany({
      where: { published: true },
      select: { id: true, content: true },
    });
    let totalChunks = 0;
    for (const a of articles) {
      const chunks = chunkText(a.content ?? "");
      if (!chunks.length) continue;
      const vecs = await this.embed.embed(chunks);
      await this.prisma.articleChunk.deleteMany({ where: { articleId: a.id } });
      await this.prisma.articleChunk.createMany({
        data: chunks.map((content, ord) => ({
          articleId: a.id,
          ord,
          content,
          embedding: JSON.stringify(vecs[ord]),
        })),
      });
      totalChunks += chunks.length;
    }
    return { articles: articles.length, chunks: totalChunks };
  }
}
