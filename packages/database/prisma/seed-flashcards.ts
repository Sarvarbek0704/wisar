/**
 * Ingliz tili kursidan flashcard kartalarini DB'ga yuklaydi.
 * Manba: Ingliz-Tili-Kursi-Anki.tsv (tab-separated: front\tback\ttags)
 * - back maydoni: "/ipa/ "talaffuz" | o'zbekcha tarjima | example" formatida
 * - tags maydoni: "A1", "A2", "B1", "B2", "C1", "C2" CEFR darajasi
 *
 * Har CEFR darajasi uchun FlashcardDeck yaratilib, Flashcard yozuvlari
 * to'ldiriladi (idempotent: avval eski kartalar o'chiriladi).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dirname, "../../..");
dotenv.config({ path: join(MONOREPO_ROOT, ".env") });

const prisma = new PrismaClient();

const ENGLISH_DIR = process.env.ENGLISH_DIR
  ? resolve(MONOREPO_ROOT, process.env.ENGLISH_DIR)
  : resolve(MONOREPO_ROOT, "..", "Ingliz_Tili_Kursi");

const TSV_FILE = join(ENGLISH_DIR, "Ingliz-Tili-Kursi-Anki.tsv");
const LUGAT_FILE = join(ENGLISH_DIR, "LUGAT", "LUGAT-Anki.tsv");

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number] | "other";

interface ParsedCard {
  front: string;
  back: string;
  ipa?: string;
  example?: string;
  level: CefrLevel;
  order: number;
}

/**
 * Back maydoni parserlaydi.
 * Format 1: "/ipa/ "talaffuz" | o'zbekcha | example"
 * Format 2: "o'zbekcha (izoh)"
 * Ipa: birinchi segmentda /.../ yoki "..." ichidagi matn
 */
function parseBack(raw: string): { back: string; ipa?: string; example?: string } {
  const parts = raw.split(/\s*\|\s*/);

  let ipa: string | undefined;
  let back: string;
  let example: string | undefined;

  if (parts.length >= 2) {
    // birinchi qism IPA / talaffuz
    const firstPart = parts[0].trim();
    const ipaMatch = firstPart.match(/\/([^/]+)\//);
    if (ipaMatch) {
      ipa = ipaMatch[1].trim();
    }
    back = parts[1].trim();
    if (parts.length >= 3) {
      example = parts[2].trim() || undefined;
    }
  } else {
    back = raw.trim();
    // (ipa) formatni ham tekshiramiz
    const parenIpa = back.match(/\(([^)]+)\)/);
    if (parenIpa && /[ˈˌæɪʊəɒɔɑɛʌθðʒʃŋ]/.test(parenIpa[1])) {
      ipa = parenIpa[1].trim();
      back = back.replace(/\([^)]+\)/, "").trim();
    }
  }

  // back bo'sh bo'lsa fallback
  if (!back) back = raw.trim();

  return { back, ipa, example };
}

function extractLevel(tag: string): CefrLevel {
  const m = tag.trim().match(/^([ABC][12])/i);
  if (m) {
    const lvl = m[1].toUpperCase();
    if ((CEFR_LEVELS as readonly string[]).includes(lvl)) {
      return lvl as CefrLevel;
    }
  }
  return "other";
}

/**
 * LUGAT TSV tag → CEFR daraja.
 * "lugat A1" → A1, "lugat A1A2" → A2, "lugat A1B1" → B1,
 * "lugat MAXSUS" / "lugat JADVAL" → other
 */
function lugatLevel(tag: string): CefrLevel {
  const t = tag.replace(/^lugat\s+/i, "").trim().toUpperCase();
  if (t === "A1A2") return "A2";
  if (t === "A1B1") return "B1";
  if (t === "MAXSUS" || t === "JADVAL") return "other";
  const m = t.match(/^([ABC][12])/);
  if (m && (CEFR_LEVELS as readonly string[]).includes(m[1])) {
    return m[1] as CefrLevel;
  }
  return "other";
}

/**
 * LUGAT back formati: "/ipa/<br>tarjima<br><i>example</i>"
 * - IPA ixtiyoriy (MAXSUS'da yo'q)
 * - example <i>...</i> ichida
 * - JADVAL'da <br> yo'q — butun matn tarjima
 */
function parseLugatBack(raw: string): { back: string; ipa?: string; example?: string } {
  const segs = raw.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
  let ipa: string | undefined;
  let example: string | undefined;
  const backParts: string[] = [];

  for (const seg of segs) {
    const isItalic = /^<i>[\s\S]*<\/i>$/i.test(seg);
    const clean = seg.replace(/<\/?i>/gi, "").trim();
    const ipaMatch = clean.match(/^\/(.+)\/$/);
    if (ipaMatch && !ipa) {
      ipa = ipaMatch[1].trim();
      continue;
    }
    if (isItalic) {
      example = clean;
      continue;
    }
    backParts.push(clean);
  }

  let back = backParts.join(" — ").trim();
  if (!back) back = raw.replace(/<\/?[^>]+>/g, "").trim();
  return { back, ipa, example };
}

/** LUGAT faylni parserlab, mavjud grouplarga qo'shadi (front bo'yicha dedupe) */
function parseLugat(filePath: string, groups: Map<CefrLevel, ParsedCard[]>): void {
  if (!existsSync(filePath)) {
    console.log("  LUGAT fayl topilmadi, o'tkazib yuborildi:", filePath);
    return;
  }
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  // Har daraja uchun mavjud front'lar (dedupe)
  const seen = new Map<CefrLevel, Set<string>>();
  for (const [lvl, cards] of groups) {
    seen.set(lvl, new Set(cards.map((c) => c.front.toLowerCase())));
  }

  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split("\t");
    if (parts.length < 2) { skipped++; continue; }

    const front = parts[0].trim();
    const rawBack = parts[1].trim();
    const tag = parts.length >= 3 ? parts[2].trim() : "";
    if (!front || !rawBack) { skipped++; continue; }

    const level = lugatLevel(tag);
    const seenSet = seen.get(level) ?? new Set<string>();
    if (seenSet.has(front.toLowerCase())) { skipped++; continue; }
    seenSet.add(front.toLowerCase());
    seen.set(level, seenSet);

    const { back, ipa, example } = parseLugatBack(rawBack);

    if (!groups.has(level)) groups.set(level, []);
    const arr = groups.get(level)!;
    arr.push({ front, back, ipa, example, level, order: arr.length + 1 });
    added++;
  }

  console.log(`  LUGAT: ${added} karta qo'shildi (${skipped} o'tkazib yuborildi)`);
}

function parseTsv(filePath: string): Map<CefrLevel, ParsedCard[]> {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  const groups = new Map<CefrLevel, ParsedCard[]>();
  const counters = new Map<CefrLevel, number>();

  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Anki meta-satrlari va bo'sh satrlarni o'tkazib yuboramiz
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split("\t");
    if (parts.length < 2) {
      skipped++;
      continue;
    }

    const front = parts[0].trim();
    const rawBack = parts[1].trim();
    const tag = parts.length >= 3 ? parts[2].trim() : "";

    if (!front || !rawBack) {
      skipped++;
      continue;
    }

    const level = extractLevel(tag);
    const { back, ipa, example } = parseBack(rawBack);

    const order = (counters.get(level) ?? 0) + 1;
    counters.set(level, order);

    if (!groups.has(level)) groups.set(level, []);
    groups.get(level)!.push({ front, back, ipa, example, level, order });
  }

  if (skipped > 0) {
    console.log(`  (${skipped} noto'g'ri satr o'tkazib yuborildi)`);
  }

  return groups;
}

async function upsertDeck(level: CefrLevel): Promise<string> {
  const slug = level.toLowerCase();
  const title = level === "other" ? "Boshqa — Maxsus lug'at" : `${level} Lug'at`;
  const deck = await prisma.flashcardDeck.upsert({
    where: { slug },
    update: { title, level },
    create: { slug, title, level },
  });
  return deck.id;
}

async function seedLevel(level: CefrLevel, cards: ParsedCard[]): Promise<void> {
  const deckId = await upsertDeck(level);

  // Mavjud kartalarni o'chiramiz
  await prisma.flashcard.deleteMany({ where: { deckId } });

  // Batch'larda yaratamiz (PostgreSQL 65535 param limiti uchun)
  const BATCH = 500;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await prisma.flashcard.createMany({
      data: batch.map((c) => ({
        deckId,
        front: c.front,
        back: c.back,
        ipa: c.ipa,
        example: c.example,
        order: c.order,
      })),
    });
  }

  const label = level === "other" ? "other" : level;
  console.log(`  ${label}: ${cards.length} karta`);
}

async function main() {
  if (!existsSync(TSV_FILE)) {
    console.error("TSV fayl topilmadi:", TSV_FILE);
    process.exit(1);
  }

  console.log("Flashcard seed boshlandi:", TSV_FILE);

  const groups = parseTsv(TSV_FILE);

  // Katta LUGAT lug'atini ham qo'shamiz (~4500 karta)
  console.log("LUGAT lug'ati qo'shilmoqda:", LUGAT_FILE);
  parseLugat(LUGAT_FILE, groups);

  // Darajalar tartibida ishlaydi: A1, A2, B1, B2, C1, C2, other
  const orderedLevels: CefrLevel[] = [...CEFR_LEVELS, "other"];

  let total = 0;
  for (const level of orderedLevels) {
    const cards = groups.get(level);
    if (!cards || cards.length === 0) continue;
    await seedLevel(level, cards);
    total += cards.length;
  }

  console.log(`\nJami ${total} karta import qilindi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
