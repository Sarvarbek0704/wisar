/**
 * Ingliz tili kursini platformaga TO'LIQ qo'shadi — boshqa kontentni o'chirmasdan
 * (idempotent: avval "ingliz-tili" mavzusini o'chirib, qaytadan import qiladi).
 *
 * Import qiladi:
 *   - Kirish (kurs xaritasi — MUNDARIJA.md)
 *   - A1 → C1 darajalari (har papka = bo'lim, har .md = dars/maqola)
 *   - LUGAT (tarjima lug'ati — 8000+ so'z) alohida bo'lim sifatida
 *
 * Platforma mavzu-agnostik bo'lgani uchun, import qilingach ingliz tili
 * dasturda ALOHIDA bo'lim bo'lib chiqadi — o'qish, progress, bookmark,
 * eslatma, izoh va qidiruv qulayliklari bilan birga.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
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

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;
const stripEmoji = (s: string) => s.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();

function titleFromMd(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return stripEmoji((m ? m[1] : fallback).replace(/[*_`]/g, "")).trim();
}
function excerptFromMd(md: string): string {
  for (const line of md.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith(">") || t.startsWith("---") || t.startsWith("```") || t.startsWith("|")) continue;
    const clean = stripEmoji(t.replace(/[*_`#>\[\]]/g, "").replace(/\(.*?\)/g, "")).trim();
    if (clean.length > 20) return clean.slice(0, 200);
  }
  return "";
}
const readingTime = (md: string) =>
  Math.max(1, Math.ceil(md.split(/\s+/).filter(Boolean).length / 200));
const listMd = (dir: string) =>
  readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

/** Bo'lim metama'lumotlari — chiroyli nom + tartib (DB'da s.title ko'rsatiladi). */
const SECTION_META: Record<string, { title: string; order: number }> = {
  "01-A1-Boshlangich": { title: "A1 — Boshlang'ich", order: 1 },
  "02-A2-Elementar": { title: "A2 — Elementar", order: 2 },
  "03-B1-Orta": { title: "B1 — O'rta", order: 3 },
  "04-B2-Yuqori-Orta": { title: "B2 — Yuqori o'rta", order: 4 },
  "05-C1-Ilgor": { title: "C1 — Ilg'or", order: 5 },
  "06-C2-Mahorat": { title: "C2 — Mahorat (native)", order: 6 },
  LUGAT: { title: "Lug'at — Tarjima lug'ati (8000+ so'z)", order: 9 },
};

function sectionMeta(folder: string): { title: string; order: number } {
  if (SECTION_META[folder]) return SECTION_META[folder];
  const m = folder.match(/^(\d{2})-(.+)$/);
  return {
    title: m ? m[2].replace(/-/g, " ") : folder,
    order: m ? parseInt(m[1], 10) : 50,
  };
}

/** Bitta papka (bo'lim) ichidagi barcha .md fayllarni maqola sifatida import qiladi. */
async function importFolder(topicId: string, dir: string, folder: string) {
  const meta = sectionMeta(folder);
  const section = await prisma.section.create({
    data: { topicId, slug: folder.toLowerCase(), title: meta.title, order: meta.order },
  });
  let artOrder = 0;
  let n = 0;
  for (const file of listMd(dir)) {
    const md = readFileSync(join(dir, file), "utf8");
    const fm = file.match(/^(\d{2})/);
    await prisma.article.create({
      data: {
        sectionId: section.id,
        slug: basename(file, ".md").toLowerCase(),
        title: titleFromMd(md, file),
        content: md,
        excerpt: excerptFromMd(md),
        order: fm ? parseInt(fm[1], 10) : artOrder,
        readingTime: readingTime(md),
      },
    });
    artOrder++;
    n++;
  }
  return n;
}

async function main() {
  if (!existsSync(ENGLISH_DIR)) {
    console.log("Ingliz kurs papkasi topilmadi:", ENGLISH_DIR);
    return;
  }
  // Idempotent — eski "ingliz-tili" mavzusini o'chiramiz (cascade barchasini tozalaydi)
  await prisma.topic.deleteMany({ where: { slug: "ingliz-tili" } });

  const topic = await prisma.topic.create({
    data: {
      slug: "ingliz-tili",
      title: "Ingliz tili kursi",
      description:
        "0 dan native (C2) gacha to'liq ingliz tili kursi — sof o'zbek tilida. " +
        "A1→C1 darslar + 8000+ so'zlik tarjima lug'ati. Cambridge/IELTS standartlari asosida.",
      icon: "languages",
      accent: "#0ea5e9",
      order: 2,
    },
  });

  let lessons = 0;
  let sections = 0;

  // 1) Kirish — kurs xaritasi (MUNDARIJA.md), agar mavjud bo'lsa
  const mundarija = join(ENGLISH_DIR, "MUNDARIJA.md");
  if (existsSync(mundarija)) {
    const md = readFileSync(mundarija, "utf8");
    const introSection = await prisma.section.create({
      data: { topicId: topic.id, slug: "kirish", title: "Kirish — Kurs xaritasi", order: 0 },
    });
    await prisma.article.create({
      data: {
        sectionId: introSection.id,
        slug: "mundarija",
        title: "Kurs rejasi va mundarija",
        content: md,
        excerpt: "Butun kursning to'liq xaritasi — A1 dan C2 gacha barcha darslar ro'yxati.",
        order: 0,
        readingTime: readingTime(md),
      },
    });
    sections++;
  }

  // 2) Daraja papkalari (01-.. ) + LUGAT — tartiblangan holda
  const folders = readdirSync(ENGLISH_DIR).filter((n) => {
    const p = join(ENGLISH_DIR, n);
    return statSync(p).isDirectory() && n !== "node_modules" && (/^\d{2}-/.test(n) || n === "LUGAT");
  });
  // Tartib: SECTION_META.order bo'yicha (LUGAT oxirida)
  folders.sort((a, b) => sectionMeta(a).order - sectionMeta(b).order);

  for (const folder of folders) {
    const n = await importFolder(topic.id, join(ENGLISH_DIR, folder), folder);
    lessons += n;
    sections++;
    console.log(`  ✓ ${sectionMeta(folder).title}: ${n} maqola`);
  }

  console.log(
    `\nIngliz tili kursi import qilindi: ${sections} bo'lim, ${lessons} maqola (darslar + lug'at).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
