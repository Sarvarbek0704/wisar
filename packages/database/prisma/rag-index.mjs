#!/usr/bin/env node
/**
 * RAG indeksatsiya — davom ettiriladigan (resumable) skript.
 *
 * `POST /tutor/index` endpointidan farqi:
 *   - faqat CHUNKSIZ maqolalarni indekslaydi (qaytadan boshlamaydi)
 *   - rate limit (429) da backoff bilan qayta uriniladi
 *   - har maqoladan keyin progress chiqaradi, uzilsa qoldigidan davom etadi
 *
 * Ishlatish (server konteynerida — env allaqachon bor):
 *   docker exec wisar-api node /app/rag-index.mjs
 *   docker exec wisar-api node /app/rag-index.mjs --topic rus-tili
 *   docker exec wisar-api node /app/rag-index.mjs --reindex     # hammasini qayta
 *
 * Kerakli env: DATABASE_URL, EMBED_BASE_URL, EMBED_API_KEY, EMBED_MODEL
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};
const REINDEX = args.includes("--reindex");
const TOPIC = flagValue("--topic");
const LIMIT = Number(flagValue("--limit")) || 0;
/** Maqolalar orasidagi kechikish (ms). Gemini bepul kvotasi uchun ~1.2s qulay. */
const DELAY = Number(flagValue("--delay")) || 1200;

const BASE = (process.env.EMBED_BASE_URL || "").trim().replace(/\/+$/, "");
const KEY = (process.env.EMBED_API_KEY || "").trim();
const MODEL = (process.env.EMBED_MODEL || "text-embedding-3-small").trim();

if (!BASE || !KEY) {
  console.error("EMBED_BASE_URL va EMBED_API_KEY kerak.");
  process.exit(1);
}

/** tutor.service.ts dagi chunkText bilan AYNAN bir xil bo'lishi shart. */
function chunkText(md, wordsPerChunk = 400) {
  const text = (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  const words = text.split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Moslashuvchan sur'at: har 429 dan keyin asosiy kechikish oshadi,
 * ketma-ket muvaffaqiyatlardan keyin asta pasayadi. Bu doimiy 429 ga
 * urilib turishdan ko'ra ancha tez tugaydi.
 */
let pace = DELAY;
let okStreak = 0;
function onRateLimit() {
  pace = Math.min(30000, Math.round(pace * 1.6));
  okStreak = 0;
}
function onSuccess() {
  if (++okStreak >= 5) {
    pace = Math.max(DELAY, Math.round(pace * 0.8));
    okStreak = 0;
  }
}

/** Embedding — 429/5xx da eksponensial backoff bilan qayta urinish. */
async function embed(texts, attempt = 0) {
  const res = await fetch(BASE + "/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, input: texts }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));

  if (res.ok) {
    const data = await res.json();
    return (data.data || []).map((d) => d.embedding);
  }

  const body = await res.text().catch(() => "");
  const retriable = res.status === 429 || res.status >= 500 || res.status === 0;
  if (retriable && attempt < 8) {
    if (res.status === 429) onRateLimit();
    const wait = Math.min(90000, 3000 * 2 ** attempt);
    console.log(`   ⏳ ${res.status} — ${wait / 1000}s (sur'at: ${pace / 1000}s) urinish ${attempt + 1}/8`);
    await sleep(wait);
    return embed(texts, attempt + 1);
  }
  throw new Error(`Embedding xatosi (${res.status}): ${body.slice(0, 200)}`);
}

async function main() {
  const where = { published: true };
  if (TOPIC) where.section = { topic: { slug: TOPIC } };

  const all = await prisma.article.findMany({
    where,
    select: { id: true, title: true, content: true, _count: { select: { chunks: true } } },
    orderBy: { createdAt: "asc" },
  });

  let todo = REINDEX ? all : all.filter((a) => a._count.chunks === 0);
  if (LIMIT) todo = todo.slice(0, LIMIT);

  console.log(`Jami maqola: ${all.length} · indekslanadi: ${todo.length}${TOPIC ? ` (topic: ${TOPIC})` : ""}`);
  if (!todo.length) {
    console.log("Hammasi indekslangan — qiladigan ish yo'q.");
    return;
  }

  let done = 0;
  let chunksTotal = 0;
  let failed = 0;

  for (const a of todo) {
    const chunks = chunkText(a.content);
    if (!chunks.length) {
      console.log(`   ⊘ bo'sh: ${a.title}`);
      done++;
      continue;
    }
    try {
      const vecs = await embed(chunks);
      if (vecs.length !== chunks.length) {
        throw new Error(`vektor soni mos emas: ${vecs.length} ≠ ${chunks.length}`);
      }
      await prisma.$transaction([
        prisma.articleChunk.deleteMany({ where: { articleId: a.id } }),
        prisma.articleChunk.createMany({
          data: chunks.map((content, ord) => ({
            articleId: a.id,
            ord,
            content,
            embedding: JSON.stringify(vecs[ord]),
          })),
        }),
      ]);
      chunksTotal += chunks.length;
      done++;
      onSuccess();
      console.log(`   ✓ [${done}/${todo.length}] ${a.title} — ${chunks.length} chunk`);
    } catch (e) {
      failed++;
      console.log(`   ✗ ${a.title}: ${e.message}`);
    }
    await sleep(pace); // moslashuvchan sur'at
  }

  console.log(`\nTayyor: ${done} maqola · ${chunksTotal} chunk · xato: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
