import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { parseJson } from "./parse-json";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const NOT_CONFIGURED =
  "AI sozlanmagan. .env ga BEPUL provayder qo'shing: LLM_BASE_URL + LLM_API_KEY + LLM_MODEL " +
  "(Groq/Gemini/Ollama) — yoki ANTHROPIC_API_KEY.";

/**
 * Markazlashtirilgan LLM xizmati (17-vazifa poydevori).
 * Provayder-agnostik: BEPUL OpenAI-mos (Groq/Gemini/OpenRouter/Ollama) → Anthropic fallback.
 * tutor.service va ielts.service shu xizmatni inject qiladi (DRY).
 * Qo'llab-quvvatlaydi: bitta so'rov (ask), multi-turn (chat), SSE streaming (stream), JSON (parseJson).
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  /** AI provayderi sozlanganmi? (yumshoq fallback uchun — 6-eslatma) */
  isConfigured(): boolean {
    return !!(process.env.LLM_BASE_URL?.trim() || process.env.ANTHROPIC_API_KEY?.trim());
  }

  parseJson<T>(text: string): T {
    try {
      return parseJson<T>(text);
    } catch {
      throw new ServiceUnavailableException("AI javobini o'qib bo'lmadi (JSON emas).");
    }
  }

  /** Grammatika tekshiruv (21-vazifa) — tuzatilgan matn + xatolar (o'zbekcha izoh). */
  async grammar(text: string): Promise<{
    corrected: string;
    errors: { original: string; fix: string; why: string }[];
  }> {
    const trimmed = (text ?? "").trim().slice(0, 2000);
    if (trimmed.length < 2) {
      return { corrected: trimmed, errors: [] };
    }
    const system =
      `Sen ingliz tili korrektorisan. Berilgan inglizcha matnni tabiiy va grammatik to'g'ri qilib qaytar. ` +
      `FAQAT shu JSON formatda (boshqa matnsiz): ` +
      `{"corrected":"<tuzatilgan to'liq matn>","errors":[{"original":"<asl bo'lak>","fix":"<tuzatilgan>","why":"<o'zbekcha qisqa sabab>"}]}. ` +
      `Xato bo'lmasa errors bo'sh massiv bo'lsin.`;
    const raw = await this.ask(system, trimmed, 1200, true);
    const parsed = this.parseJson<{
      corrected: string;
      errors?: { original: string; fix: string; why: string }[];
    }>(raw);
    return { corrected: parsed.corrected ?? trimmed, errors: parsed.errors ?? [] };
  }

  /** Bitta so'rov: system + user → matn. */
  ask(system: string, user: string, maxTokens = 1500, jsonMode = false): Promise<string> {
    return this.chat(system, [{ role: "user", content: user }], maxTokens, jsonMode);
  }

  /** Multi-turn: system + suhbat tarixi → to'liq matn. */
  async chat(
    system: string,
    messages: ChatMessage[],
    maxTokens = 1500,
    jsonMode = false,
  ): Promise<string> {
    const base = process.env.LLM_BASE_URL?.trim();
    if (base) return this.openaiChat(base, system, messages, maxTokens, jsonMode);
    if (process.env.ANTHROPIC_API_KEY?.trim())
      return this.anthropicChat(system, messages, maxTokens);
    throw new ServiceUnavailableException(NOT_CONFIGURED);
  }

  /** Streaming multi-turn — matn bo'laklari (delta). */
  async *stream(
    system: string,
    messages: ChatMessage[],
    maxTokens = 1500,
  ): AsyncGenerator<string> {
    const base = process.env.LLM_BASE_URL?.trim();
    if (base) {
      yield* this.openaiStream(base, system, messages, maxTokens);
      return;
    }
    if (process.env.ANTHROPIC_API_KEY?.trim()) {
      yield* this.anthropicStream(system, messages, maxTokens);
      return;
    }
    throw new ServiceUnavailableException(NOT_CONFIGURED);
  }

  // ─── OpenAI-mos (Groq/Gemini/OpenRouter/Ollama) ──────────────────────────────
  private openaiBody(messages: ChatMessage[], system: string, maxTokens: number, jsonMode: boolean, stream: boolean) {
    const model = process.env.LLM_MODEL?.trim() || "llama-3.3-70b-versatile";
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      stream,
      messages: [{ role: "system", content: system }, ...messages],
    };
    if (jsonMode) body.response_format = { type: "json_object" };
    return body;
  }

  private openaiHeaders(): Record<string, string> {
    const key = process.env.LLM_API_KEY?.trim();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (key) headers["authorization"] = `Bearer ${key}`;
    return headers;
  }

  private async openaiChat(
    base: string,
    system: string,
    messages: ChatMessage[],
    maxTokens: number,
    jsonMode: boolean,
  ): Promise<string> {
    const url = base.replace(/\/+$/, "") + "/chat/completions";
    const res = await this.fetchOrThrow(url, {
      method: "POST",
      headers: this.openaiHeaders(),
      body: JSON.stringify(this.openaiBody(messages, system, maxTokens, jsonMode, false)),
    });
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new ServiceUnavailableException("AI bo'sh javob qaytardi.");
    return text;
  }

  private async *openaiStream(
    base: string,
    system: string,
    messages: ChatMessage[],
    maxTokens: number,
  ): AsyncGenerator<string> {
    const url = base.replace(/\/+$/, "") + "/chat/completions";
    const res = await this.fetchOrThrow(url, {
      method: "POST",
      headers: this.openaiHeaders(),
      body: JSON.stringify(this.openaiBody(messages, system, maxTokens, false, true)),
    });
    for await (const data of this.parseSSE(res)) {
      try {
        const j = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* yaroqsiz qatorni o'tkazib yuboramiz */
      }
    }
  }

  // ─── Anthropic (Claude) ──────────────────────────────────────────────────────
  private anthropicHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    };
  }

  private anthropicBody(messages: ChatMessage[], system: string, maxTokens: number, stream: boolean) {
    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
    return { model, max_tokens: maxTokens, system, stream, messages };
  }

  private async anthropicChat(
    system: string,
    messages: ChatMessage[],
    maxTokens: number,
  ): Promise<string> {
    const res = await this.fetchOrThrow(ANTHROPIC_URL, {
      method: "POST",
      headers: this.anthropicHeaders(),
      body: JSON.stringify(this.anthropicBody(messages, system, maxTokens, false)),
    });
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("");
    if (!text) throw new ServiceUnavailableException("AI bo'sh javob qaytardi.");
    return text;
  }

  private async *anthropicStream(
    system: string,
    messages: ChatMessage[],
    maxTokens: number,
  ): AsyncGenerator<string> {
    const res = await this.fetchOrThrow(ANTHROPIC_URL, {
      method: "POST",
      headers: this.anthropicHeaders(),
      body: JSON.stringify(this.anthropicBody(messages, system, maxTokens, true)),
    });
    for await (const data of this.parseSSE(res)) {
      try {
        const j = JSON.parse(data) as { type?: string; delta?: { text?: string } };
        if (j.type === "content_block_delta" && j.delta?.text) yield j.delta.text;
      } catch {
        /* o'tkazib yuboramiz */
      }
    }
  }

  // ─── Umumiy yordamchilar ─────────────────────────────────────────────────────
  private async fetchOrThrow(url: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e) {
      throw new ServiceUnavailableException("AI xizmatiga ulanib bo'lmadi: " + (e as Error).message);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`AI xizmati xatosi (${res.status}): ${body.slice(0, 300)}`);
    }
    return res;
  }

  /** SSE oqimidan `data:` qatorlarini ajratib beradi (xom JSON string). */
  private async *parseSSE(res: Response): AsyncGenerator<string> {
    if (!res.body) return;
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        if (data) yield data;
      }
    }
  }
}
