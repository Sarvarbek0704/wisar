/**
 * Seed — mavjud markdown kontentni (kitob + hamroh materiallar) DB'ga import qiladi.
 * Manba: CONTENT_DIR (.env) yoki standart "../Dasturlash_Kitobi".
 *
 * Tuzilish:
 *   Topic "Dasturlash kitobi"  <- NN-Qism-* papkalar (Section) + .md fayllar (Article)
 *   Topic "Hamroh materiallar" <- Qoshimcha/* papkalar (Section) + .md fayllar (Article)
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dirname, "../../.."); // packages/database/prisma -> root
dotenv.config({ path: join(MONOREPO_ROOT, ".env") });

const prisma = new PrismaClient();

const CONTENT_DIR = process.env.CONTENT_DIR
  ? resolve(MONOREPO_ROOT, process.env.CONTENT_DIR)
  : resolve(MONOREPO_ROOT, "..", "Dasturlash_Kitobi");

const ENGLISH_DIR = process.env.ENGLISH_DIR
  ? resolve(MONOREPO_ROOT, process.env.ENGLISH_DIR)
  : resolve(MONOREPO_ROOT, "..", "Ingliz_Tili_Kursi");

// ---- yordamchilar ----

// Emojini olib tashlaymiz (sarlavhalar toza matn bo'lsin; ikonkalar UI'da Lucide).
// Faqat Unicode-escape ishlatamiz — kodda literal emoji bo'lmasin.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;

function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}

function titleFromMd(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  const raw = m ? m[1] : fallback;
  return stripEmoji(raw.replace(/[*_`]/g, "")).trim();
}

function excerptFromMd(md: string): string {
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith(">") || t.startsWith("---") || t.startsWith("```")) continue;
    const clean = stripEmoji(t.replace(/[*_`#>\[\]]/g, "").replace(/\(.*?\)/g, "")).trim();
    if (clean.length > 20) return clean.slice(0, 200);
  }
  return "";
}

function readingTime(md: string): number {
  const words = md.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function listMd(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));
}

function slugFromFile(name: string): string {
  return basename(name, ".md").toLowerCase();
}

// ---- import bloklari ----

async function importBook(): Promise<number> {
  const folders = readdirSync(CONTENT_DIR)
    .filter((n) => /^\d{2}-Qism-/.test(n) && statSync(join(CONTENT_DIR, n)).isDirectory())
    .sort((a, b) => a.localeCompare(b));

  if (!folders.length) return 0;

  const topic = await prisma.topic.create({
    data: {
      slug: "dasturlash",
      title: "Dasturlash kitobi",
      description: "Noldan senior+ gacha to'liq full-stack dasturlash kursi.",
      icon: "book-open",
      accent: "#3b5bdb",
      order: 0,
    },
  });

  let count = 0;
  let secOrder = 0;
  for (const folder of folders) {
    const m = folder.match(/^(\d{2})-Qism-(.+)$/);
    const num = m ? parseInt(m[1], 10) : secOrder;
    const name = m ? m[2].replace(/-/g, " ") : folder;
    const section = await prisma.section.create({
      data: {
        topicId: topic.id,
        slug: folder.toLowerCase(),
        title: `${num}-QISM — ${name}`,
        order: num,
      },
    });

    const files = listMd(join(CONTENT_DIR, folder));
    let artOrder = 0;
    for (const file of files) {
      const md = readFileSync(join(CONTENT_DIR, folder, file), "utf8");
      const fm = file.match(/^(\d{2})/);
      await prisma.article.create({
        data: {
          sectionId: section.id,
          slug: slugFromFile(file),
          title: titleFromMd(md, file),
          content: md,
          excerpt: excerptFromMd(md),
          order: fm ? parseInt(fm[1], 10) : artOrder,
          readingTime: readingTime(md),
        },
      });
      count++;
      artOrder++;
    }
    secOrder++;
  }
  return count;
}

async function importCompanion(): Promise<number> {
  const compRoot = join(CONTENT_DIR, "Qoshimcha");
  if (!existsSync(compRoot)) return 0;

  const folders = readdirSync(compRoot)
    .filter((n) => /^\d{2}-/.test(n) && statSync(join(compRoot, n)).isDirectory())
    .sort((a, b) => a.localeCompare(b));

  if (!folders.length) return 0;

  const topic = await prisma.topic.create({
    data: {
      slug: "hamroh",
      title: "Hamroh materiallar",
      description: "Amaliyot, mashqlar, intervyu, ma'lumotnoma va karyera materiallari.",
      icon: "wrench",
      accent: "#7048e8",
      order: 1,
    },
  });

  let count = 0;
  for (const folder of folders) {
    const m = folder.match(/^(\d{2})-(.+)$/);
    const num = m ? parseInt(m[1], 10) : 0;
    const name = m ? m[2].replace(/-/g, " ") : folder;
    const section = await prisma.section.create({
      data: {
        topicId: topic.id,
        slug: folder.toLowerCase(),
        title: name,
        order: num,
      },
    });

    const files = listMd(join(compRoot, folder));
    let artOrder = 0;
    for (const file of files) {
      const md = readFileSync(join(compRoot, folder, file), "utf8");
      await prisma.article.create({
        data: {
          sectionId: section.id,
          slug: slugFromFile(file),
          title: titleFromMd(md, file),
          content: md,
          excerpt: excerptFromMd(md),
          order: artOrder,
          readingTime: readingTime(md),
        },
      });
      count++;
      artOrder++;
    }
  }
  return count;
}

// Ingliz tili kursini import qiladi (level papkalar -> Section, darslar -> Article)
async function importEnglish(): Promise<number> {
  if (!existsSync(ENGLISH_DIR)) return 0;
  const folders = readdirSync(ENGLISH_DIR)
    .filter((n) => (/^\d{2}-/.test(n) || n === "LUGAT") && statSync(join(ENGLISH_DIR, n)).isDirectory())
    .sort((a, b) => a.localeCompare(b));
  if (!folders.length) return 0;

  const topic = await prisma.topic.create({
    data: {
      slug: "ingliz-tili",
      title: "Ingliz tili kursi",
      description: "0 dan native (C2) gacha to'liq ingliz tili kursi — sof o'zbek tilida.",
      icon: "languages",
      accent: "#0ea5e9",
      order: 2,
    },
  });

  let count = 0;
  for (const folder of folders) {
    const m = folder.match(/^(\d{2})-(.+)$/);
    const num = m ? parseInt(m[1], 10) : 99;
    const name = m ? m[2].replace(/-/g, " ") : "LUG'AT";
    const section = await prisma.section.create({
      data: { topicId: topic.id, slug: folder.toLowerCase(), title: name, order: num },
    });
    const files = listMd(join(ENGLISH_DIR, folder));
    let artOrder = 0;
    for (const file of files) {
      const md = readFileSync(join(ENGLISH_DIR, folder, file), "utf8");
      const fm = file.match(/^(\d{2})/);
      await prisma.article.create({
        data: {
          sectionId: section.id,
          slug: slugFromFile(file),
          title: titleFromMd(md, file),
          content: md,
          excerpt: excerptFromMd(md),
          order: fm ? parseInt(fm[1], 10) : artOrder,
          readingTime: readingTime(md),
        },
      });
      count++;
      artOrder++;
    }
  }
  return count;
}

async function main() {
  console.log("Seed boshlandi. Manba:", CONTENT_DIR);
  if (!existsSync(CONTENT_DIR)) {
    console.warn("DIQQAT: CONTENT_DIR topilmadi. Bo'sh platforma seed qilinadi.");
  }

  // Eski ma'lumotni tozalaymiz (qayta ishga tushirish uchun)
  await prisma.article.deleteMany();
  await prisma.section.deleteMany();
  await prisma.topic.deleteMany();

  let total = 0;
  if (existsSync(CONTENT_DIR)) {
    total += await importBook();
    total += await importCompanion();
  }
  total += await importEnglish();

  console.log(`Seed tugadi. Jami ${total} ta maqola import qilindi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
