// quiz-import.mjs — qo'lda/agent yozilgan test JSON'larini SQL'ga aylantiradi.
//
//   node quiz-import.mjs <fayl.json|papka> [chiqish.sql]
//
// JSON formati (massiv):
//   [{ "topic":"rus-tili", "section":"01-a1-boshlangich", "article":"05-rod-otlar",
//      "title":"Test — ...",
//      "questions":[{"text":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}] }]
//
// Chiqish: BEGIN; ... COMMIT; — vps sqlfile wisar <fayl> bilan yuboriladi.
// Idempotent: har maqola uchun eski test o'chirilib, yangisi qo'yiladi.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

// Prisma cuid() ga o'xshash, to'qnashmaydigan id
const genId = (p) => "c" + p + Date.now().toString(36) + randomBytes(6).toString("hex");

const sq = (v) => (v === null || v === undefined ? "NULL" : "'" + String(v).replace(/'/g, "''") + "'");

function loadJson(target) {
  const p = resolve(target);
  const st = statSync(p);
  if (st.isDirectory()) {
    return readdirSync(p)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .flatMap((f) => JSON.parse(readFileSync(join(p, f), "utf8")));
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

const target = process.argv[2];
if (!target) {
  console.error("Ishlatish: node quiz-import.mjs <fayl.json|papka> [chiqish.sql]");
  process.exit(1);
}
const outFile = process.argv[3] || "quiz-import.sql";

const items = loadJson(target);
if (!Array.isArray(items) || !items.length) {
  console.error("JSON bo'sh yoki massiv emas");
  process.exit(1);
}

const lines = ["BEGIN;"];
let quizCount = 0;
let qCount = 0;
const problems = [];

for (const it of items) {
  const { topic, section, article, title, questions } = it;
  if (!topic || !section || !article || !Array.isArray(questions) || !questions.length) {
    problems.push(`to'liq emas: ${article ?? "?"}`);
    continue;
  }
  // Savol tekshiruvi
  const bad = questions.find(
    (q) =>
      !q.text ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      typeof q.correctIndex !== "number" ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.options.length
  );
  if (bad) {
    problems.push(`${article}: noto'g'ri savol — ${String(bad.text).slice(0, 40)}`);
    continue;
  }

  const quizId = genId("q");
  // Maqola id sini slug orqali topamiz (topic + section + article)
  const artSql = `(SELECT a.id FROM "Article" a
     JOIN "Section" s ON s.id = a."sectionId"
     JOIN "Topic" t ON t.id = s."topicId"
     WHERE t.slug = ${sq(topic)} AND s.slug = ${sq(section)} AND a.slug = ${sq(article)})`;
  const secSql = `(SELECT s.id FROM "Section" s
     JOIN "Topic" t ON t.id = s."topicId"
     WHERE t.slug = ${sq(topic)} AND s.slug = ${sq(section)})`;

  lines.push(`-- ${topic}/${section}/${article}`);
  // Eski testni o'chiramiz (idempotent) — savollar cascade bilan ketadi
  lines.push(`DELETE FROM "Quiz" WHERE "articleId" = ${artSql};`);
  lines.push(
    `INSERT INTO "Quiz" ("id","sectionId","articleId","title","order","createdAt")
 SELECT ${sq(quizId)}, ${secSql}, ${artSql}, ${sq(title || "Dars testi")}, 0, NOW()
 WHERE ${artSql} IS NOT NULL;`
  );

  questions.forEach((q, i) => {
    lines.push(
      `INSERT INTO "Question" ("id","quizId","text","options","correctIndex","explanation","order")
 SELECT ${sq(genId("s"))}, ${sq(quizId)}, ${sq(q.text)}, ${sq(JSON.stringify(q.options))}, ${q.correctIndex}, ${sq(q.explanation ?? null)}, ${i}
 WHERE EXISTS (SELECT 1 FROM "Quiz" WHERE id = ${sq(quizId)});`
    );
    qCount++;
  });
  quizCount++;
}

lines.push("COMMIT;");
writeFileSync(outFile, lines.join("\n") + "\n", "utf8");

console.log(`SQL yaratildi: ${outFile}`);
console.log(`  Testlar: ${quizCount}`);
console.log(`  Savollar: ${qCount}`);
if (problems.length) {
  console.log(`  DIQQAT — o'tkazib yuborilgan (${problems.length}):`);
  for (const p of problems.slice(0, 10)) console.log(`    - ${p}`);
}
