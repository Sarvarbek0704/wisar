import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

@Injectable()
export class TutorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * AI ga so'rov yuboradi — provayder-agnostik.
   * 1) BEPUL: LLM_BASE_URL + LLM_API_KEY + LLM_MODEL (OpenAI-mos: Groq/Gemini/OpenRouter/Ollama)
   * 2) Pullik (fallback): ANTHROPIC_API_KEY (+ ANTHROPIC_MODEL)
   */
  private async ask(
    system: string,
    user: string,
    maxTokens = 3000,
    jsonMode = false,
  ): Promise<string> {
    const base = process.env.LLM_BASE_URL?.trim();
    if (base) {
      return this.askOpenAICompatible(base, system, user, maxTokens, jsonMode);
    }
    if (process.env.ANTHROPIC_API_KEY?.trim()) {
      return this.askAnthropic(system, user, maxTokens);
    }
    throw new ServiceUnavailableException(
      "AI sozlanmagan. .env ga BEPUL provayder qo'shing: LLM_BASE_URL + LLM_API_KEY + LLM_MODEL " +
        "(Groq/Gemini/Ollama) — yoki ANTHROPIC_API_KEY.",
    );
  }

  /** OpenAI-mos /chat/completions (Groq, Google Gemini, OpenRouter, Ollama...) — BEPUL. */
  private async askOpenAICompatible(
    base: string,
    system: string,
    user: string,
    maxTokens: number,
    jsonMode: boolean,
  ): Promise<string> {
    const url = base.replace(/\/+$/, "") + "/chat/completions";
    const key = process.env.LLM_API_KEY?.trim();
    const model = process.env.LLM_MODEL?.trim() || "llama-3.3-70b-versatile";
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (key) headers["authorization"] = `Bearer ${key}`;

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new ServiceUnavailableException("AI xizmatiga ulanib bo'lmadi: " + (e as Error).message);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`AI xizmati xatosi (${res.status}): ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new ServiceUnavailableException("AI bo'sh javob qaytardi.");
    return text;
  }

  /** Anthropic (Claude) Messages API — pullik fallback. */
  private async askAnthropic(system: string, user: string, maxTokens: number): Promise<string> {
    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
    } catch (e) {
      throw new ServiceUnavailableException("AI xizmatiga ulanib bo'lmadi: " + (e as Error).message);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`AI xizmati xatosi (${res.status}): ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("");
    if (!text) throw new ServiceUnavailableException("AI bo'sh javob qaytardi.");
    return text;
  }

  async askTutor(articleId: string, question: string): Promise<{ answer: string }> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, content: true },
    });
    if (!article) throw new NotFoundException("Maqola topilmadi");

    const content = (article.content ?? "").slice(0, 3000);
    const system =
      `Sen Wisar o'quv yordamchisisisan. Maqola: "${article.title}". ` +
      `Faqat quyidagi kontekst asosida o'zbek tilida aniq, qisqa javob ber.`;

    const answer = await this.ask(system, content + "\n\nSavol: " + question, 800);
    return { answer };
  }
}
