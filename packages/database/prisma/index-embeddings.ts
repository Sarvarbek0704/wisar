/**
 * RAG embeddings indeksatsiya skripti (18-vazifa).
 * Barcha published maqolalarni ~400 so'zli bo'laklarga bo'lib, EMBED_* provayderi
 * orqali embedding olib `ArticleChunk` jadvaliga yozadi.
 *
 * Ishga tushirish:
 *   npm run db:index   (root)
 * Talab: .env da EMBED_BASE_URL + EMBED_API_KEY (+ EMBED_MODEL).
 *
 * Eslatma: API'dagi `POST /api/tutor/index` (admin) ham xuddi shu ishni qiladi.
 */
import { prisma } from "../src/index";

const EMBED_BASE_URL = process.env.EMBED_BASE_URL?.trim();
const EMBED_API_KEY = process.env.EMBED_API_KEY?.trim();
const EMBED_MODEL = process.env.EMBED_MODEL?.trim() || "text-embedding-3-small";

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

async function embed(texts: string[]): Promise<number[][]> {
  const url = EMBED_BASE_URL!.replace(/\/+$/, "") + "/embeddings";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${EMBED_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`Embedding xatosi (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

async function main() {
  if (!EMBED_BASE_URL || !EMBED_API_KEY) {
    console.error("EMBED_BASE_URL va EMBED_API_KEY kerak (.env). Skript to'xtatildi.");
    process.exit(1);
  }
  const articles = await prisma.article.findMany({
    where: { published: true },
    select: { id: true, title: true, content: true },
  });
  console.log(`${articles.length} maqola indekslanmoqda...`);
  let total = 0;
  for (const a of articles) {
    const chunks = chunkText(a.content ?? "");
    if (!chunks.length) continue;
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
    console.log(`  ✓ ${a.title} — ${chunks.length} bo'lak`);
  }
  console.log(`Tugadi: ${total} bo'lak indekslandi.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
