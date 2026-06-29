import { Injectable, ServiceUnavailableException } from "@nestjs/common";

/** Ikki vektor orasidagi kosinus o'xshashligi (sof funksiya — testlanadigan). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Embedding xizmati (18-vazifa — RAG).
 * Provayder-agnostik OpenAI-mos /embeddings (EMBED_BASE_URL/EMBED_API_KEY/EMBED_MODEL).
 * Masalan: OpenAI `text-embedding-3-small`, yoki Google `text-embedding-004`
 * (EMBED_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/").
 */
@Injectable()
export class EmbedService {
  isConfigured(): boolean {
    return !!(process.env.EMBED_BASE_URL?.trim() && process.env.EMBED_API_KEY?.trim());
  }

  /** Matnlar ro'yxatini embedding vektorlariga aylantiradi. */
  async embed(texts: string[]): Promise<number[][]> {
    const base = process.env.EMBED_BASE_URL?.trim();
    const key = process.env.EMBED_API_KEY?.trim();
    const model = process.env.EMBED_MODEL?.trim() || "text-embedding-3-small";
    if (!base || !key) {
      throw new ServiceUnavailableException(
        "Embedding sozlanmagan. .env ga EMBED_BASE_URL + EMBED_API_KEY + EMBED_MODEL qo'shing.",
      );
    }
    const url = base.replace(/\/+$/, "") + "/embeddings";
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, input: texts }),
      });
    } catch (e) {
      throw new ServiceUnavailableException("Embedding xizmatiga ulanib bo'lmadi: " + (e as Error).message);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`Embedding xatosi (${res.status}): ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    const out = (data.data || []).map((d) => d.embedding);
    if (out.length !== texts.length) {
      throw new ServiceUnavailableException("Embedding javobi to'liq emas.");
    }
    return out;
  }

  /** Bitta matn uchun embedding. */
  async embedOne(text: string): Promise<number[]> {
    const [v] = await this.embed([text]);
    return v;
  }
}
