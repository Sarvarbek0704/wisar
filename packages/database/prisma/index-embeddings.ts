/**
 * RAG embeddings indeksatsiya skripti (18-vazifa).
 * Barcha published maqolalarni ~400 so'zli bo'laklarga bo'lib, EMBED_* provayderi
 * orqali embedding olib `ArticleChunk` jadvaliga yozadi.
 *
 * Ishga tushirish:
 *   npm run db:index   (root)
 * Talab: .env da EMBED_BASE_URL + EMBED_API_KEY (+ EMBED_MODEL).
 *
 * CHIDAMLILIK:
 *  - Qayta ishga tushganda allaqachon indekslangan maqolalar o'tkazib yuboriladi (resumable).
 *  - 429 (rate limit / kvota) → backoff bilan qayta urinadi (Retry-After hisobga olinadi).
 *  - So'rovlar orasida throttle (EMBED_THROTTLE_MS, default 3000ms) — bepul limitga mos.
 *
 * Eslatma: API'dagi `POST /api/tutor/index` (admin) ham xuddi shu ishni qiladi.
 */
import { prisma } from "../src/index";

const EMBED_BASE_URL = process.env.EMBED_BASE_URL?.trim();
const EMBED_API_KEY = process.env.EMBED_API_KEY?.trim();
const EMBED_MODEL = process.env.EMBED_MODEL?.trim() || "text-embedding-3-small";
const THROTTLE_MS = Number(process.env.EMBED_THROTTLE_MS) || 3000;
const MAX_RETRIES = Number(process.env.EMBED_MAX_RETRIES) || 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chunkText(md: string, wordsPerChunk = 400): string[] {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  const words = text.split(" ");
  const out: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    out.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return out;
}

/** Embedding — 429 (rate limit) VA tarmoq xatosi (fetch failed / timeout)'da backoff bilan qayta urinadi. */
async function embed(texts: string[]): Promise<number[][]> {
  const url = EMBED_BASE_URL!.replace(/\/+$/, "") + "/embeddings";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${EMBED_API_KEY}` },
        body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
        signal: AbortSignal.timeout(60000), // 60s — osilib qolishdan himoya
      });
      if (res.ok) {
        const data = (await res.json()) as { data: { embedding: number[] }[] };
        return data.data.map((d) => d.embedding);
      }
      // Rate limit / kvota — kutib qayta urinamiz
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(60000, 15000 * (attempt + 1));
        console.log(`    … 429 (limit) — ${Math.round(waitMs / 1000)}s kutib qayta urinish (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`Embedding xatosi (${res.status}): ${(await res.text()).slice(0, 300)}`);
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      const isNetwork = /fetch failed|terminated|timeout|timed out|aborted|ECONN|ENOTFOUND|EAI_AGAIN|socket|network/i.test(msg);
      if (isNetwork && attempt < MAX_RETRIES) {
        const waitMs = Math.min(60000, 10000 * (attempt + 1));
        console.log(`    … tarmoq xatosi (${msg.slice(0, 50)}) — ${Math.round(waitMs / 1000)}s kutib qayta urinish (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      throw e; // haqiqiy HTTP xatosi (400 va h.k.) yoki qayta urinishlar tugadi
    }
  }
  throw new Error("Embedding: barcha qayta urinishlar tugadi.");
}

async function main() {
  if (!EMBED_BASE_URL || !EMBED_API_KEY) {
    console.error("EMBED_BASE_URL va EMBED_API_KEY kerak (.env). Skript to'xtatildi.");
    process.exit(1);
  }

  const articles = await prisma.article.findMany({
    where: { published: true },
    select: { id: true, title: true, content: true },
    orderBy: { createdAt: "asc" },
  });

  // Resumable: allaqachon bo'lakka ega maqolalarni o'tkazib yuboramiz
  const indexed = new Set(
    (await prisma.articleChunk.findMany({ select: { articleId: true }, distinct: ["articleId"] }))
      .map((c) => c.articleId),
  );

  const todo = articles.filter((a) => !indexed.has(a.id));
  console.log(
    `${articles.length} maqola jami; ${indexed.size} allaqachon indekslangan; ${todo.length} qoldi.`,
  );

  let total = 0;
  let done = 0;
  let skipped = 0;
  let consecFail = 0;
  for (const a of todo) {
    const chunks = chunkText(a.content ?? "");
    if (!chunks.length) continue;
    try {
      const vecs = await embed(chunks);
      await prisma.articleChunk.deleteMany({ where: { articleId: a.id } });
      await prisma.articleChunk.createMany({
        data: chunks.map((content, ord) => ({
          articleId: a.id,
          ord,
          content,
          embedding: JSON.stringify(vecs[ord]),
        })),
      });
      total += chunks.length;
      done++;
      consecFail = 0;
      console.log(`  ✓ [${done}/${todo.length}] ${a.title} — ${chunks.length} bo'lak`);
    } catch (e) {
      // Bitta maqola xato bersa — o'tkazib yuboramiz, indeks to'xtamaydi (qilingan ish saqlanadi, resumable).
      skipped++;
      consecFail++;
      console.error(`  ✗ O'tkazib yuborildi "${a.title}": ${(e as Error).message}`);
      // 5 ketma-ket xato = kvota/tarmoq butunlay o'lgan — to'xtaymiz (behuda urinmaslik uchun).
      if (consecFail >= 5) {
        console.error(`  → 5 ketma-ket xato: to'xtatildi. Kvota/tarmoq tiklangach qayta "npm run db:index".`);
        break;
      }
      continue;
    }
    await sleep(THROTTLE_MS);
  }

  console.log(
    `Bu sessiyada: ${done} maqola, ${total} bo'lak indekslandi` +
      (skipped ? `, ${skipped} o'tkazib yuborildi (keyin qayta urinib ko'ring).` : "."),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
