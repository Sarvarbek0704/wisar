/**
 * Daraja aniqlash (placement) ma'lumotlari — uch kurs uchun.
 *
 * Muammo: yangi foydalanuvchi 700+ maqola oldida qayerdan boshlashni bilmaydi.
 * Yechim: qisqa test → daraja → aynan shu darajaning birinchi darsiga havola.
 */

export type CourseId = "ingliz-tili" | "rus-tili" | "dasturlash";

export type PlacementQuestion = {
  q: string;
  options: string[];
  answer: number;
  level: string;
};

export type Course = {
  id: CourseId;
  title: string;
  subtitle: string;
  emoji: string;
  /** Daraja → shu darajaning birinchi darsi (to'liq yo'l). */
  start: Record<string, string>;
  /** To'g'ri javoblar soni → daraja. */
  scoreToLevel: (correct: number, total: number) => string;
  questions: PlacementQuestion[];
  /** Natija ekranidagi izoh. */
  blurb: Record<string, string>;
};

// ─── Ingliz tili ──────────────────────────────────────────────────────────────
const ENGLISH: Course = {
  id: "ingliz-tili",
  title: "Ingliz tili",
  subtitle: "A1 dan C2 gacha · 210 dars",
  emoji: "🇬🇧",
  start: {
    A1: "/ingliz-tili/01-a1-boshlangich/01-ingliz-alifbosi-tovushlar-phonics",
    A2: "/ingliz-tili/02-a2-elementar/01-present-continuous",
    B1: "/ingliz-tili/03-b1-orta/01-present-perfect-tushuncha",
    B2: "/ingliz-tili/04-b2-yuqori-orta/01-zamonlar-tizimi-review",
    C1: "/ingliz-tili/05-c1-ilgor/01-tense-aspect-nuances",
  },
  scoreToLevel: (c) => (c <= 2 ? "A1" : c <= 4 ? "A2" : c <= 6 ? "B1" : c <= 8 ? "B2" : "C1"),
  blurb: {
    A1: "Boshlang'ich daraja. Alifbo, talaffuz va birinchi jumlalardan boshlaymiz.",
    A2: "Yaxshi boshlanish! Zamonlar va kundalik suhbatni mustahkamlaymiz.",
    B1: "O'rta daraja. Perfect zamonlar va erkin muloqotga o'tamiz.",
    B2: "Kuchli baza. Murakkab sintaksis va akademik yozuvni olamiz.",
    C1: "Ilg'or daraja. Nozik ma'no, register va professional til ustida ishlaymiz.",
  },
  questions: [
    { q: "'What ___ your name?'", options: ["is", "are", "am", "be"], answer: 0, level: "A1" },
    { q: "'I ___ to school every day.'", options: ["go", "goes", "going", "went"], answer: 0, level: "A1" },
    { q: "'child' so'zining ko'pligi qaysi?", options: ["childs", "childes", "children", "childrens"], answer: 2, level: "A1" },
    { q: "'She ___ TV when I called.'", options: ["watch", "watches", "is watching", "was watching"], answer: 3, level: "A2" },
    { q: "'If it rains, we ___ stay home.'", options: ["would", "will", "shall", "are"], answer: 1, level: "A2" },
    { q: "Qaysi gap to'g'ri?", options: ["I have never been to Paris.", "I have ever been to Paris.", "I ever been to Paris.", "I have been never to Paris."], answer: 0, level: "B1" },
    { q: "'By the time she arrived, we ___ for an hour.'", options: ["had been waiting", "were waiting", "waited", "have waited"], answer: 0, level: "B1" },
    { q: "'You ___ smoke here' (ta'qiq)", options: ["don't have to", "mustn't", "needn't", "shouldn't have"], answer: 1, level: "B2" },
    { q: "'Never ___ I seen such a thing.'", options: ["have", "did", "was", "had been"], answer: 0, level: "B2" },
    { q: "'It is essential that he ___ informed.'", options: ["is", "be", "was", "will be"], answer: 1, level: "C1" },
  ],
};

// ─── Rus tili ─────────────────────────────────────────────────────────────────
const RUSSIAN: Course = {
  id: "rus-tili",
  title: "Rus tili",
  subtitle: "A1 dan C2 gacha · 191 dars",
  emoji: "🇷🇺",
  start: {
    A1: "/rus-tili/01-a1-boshlangich/01-russkiy-alifbo-tovushlar",
    A2: "/rus-tili/02-a2-elementar/01-a1-takror-a2-kirish",
    B1: "/rus-tili/03-b1-orta/01-a2-takror-b1-kirish",
    B2: "/rus-tili/04-b2-yuqori-orta/01-b1-takror-b2-kirish",
    C1: "/rus-tili/05-c1-ilgor/01-b2-takror-c1-kirish",
  },
  scoreToLevel: (c) => (c <= 2 ? "A1" : c <= 4 ? "A2" : c <= 6 ? "B1" : c <= 8 ? "B2" : "C1"),
  blurb: {
    A1: "Boshlang'ich daraja. Kirill alifbosi va birinchi jumlalardan boshlaymiz.",
    A2: "Yaxshi boshlanish! Kelishiklar va aspektni mustahkamlaymiz.",
    B1: "O'rta daraja. Sifatdosh, ravishdosh va ergash gaplarga o'tamiz.",
    B2: "Kuchli baza. Fe'l boshqaruvi, stilistika va rasmiy uslubni olamiz.",
    C1: "Ilg'or daraja. Nozik ma'no, register va badiiy til ustida ishlaymiz.",
  },
  questions: [
    { q: "«Э́то ___ кни́га» (mening) — to'g'ri shakl?", options: ["мой", "моя́", "моё", "мои́"], answer: 1, level: "A1" },
    { q: "«Я живу́ ___ Ташке́нте» — qaysi predlog?", options: ["на", "в", "у", "с"], answer: 1, level: "A1" },
    { q: "«кни́га» so'zining ko'pligi qaysi?", options: ["кни́ги", "кни́гы", "кни́ге", "кни́гов"], answer: 0, level: "A1" },
    { q: "«Вчера́ я ___ кни́гу» (o'qib tugatdim)", options: ["чита́л", "прочита́л", "чита́ю", "бу́ду чита́ть"], answer: 1, level: "A2" },
    { q: "«Я интересу́юсь ___ » (tarix bilan) — qaysi shakl?", options: ["исто́рию", "исто́рии", "исто́рией", "об исто́рии"], answer: 2, level: "A2" },
    { q: "«Я хочу́, что́бы ты ___ » (kelishing)", options: ["прийти́", "пришёл", "придёшь", "придёт"], answer: 1, level: "B1" },
    { q: "«Прочита́в кни́гу, он...» — ravishdosh nimani bildiradi?", options: ["Bir vaqtda", "Avval tugagan harakat", "Kelasi zamon", "Shart"], answer: 1, level: "B1" },
    { q: "«несмотря́ на» qaysi kelishik bilan?", options: ["Qaratqich", "Tushum", "Jo'nalish", "Vosita"], answer: 1, level: "B2" },
    { q: "«Я не зна́ю ___ » (pravda) — inkor obyekti", options: ["пра́вду", "пра́вды", "пра́вде", "пра́вдой"], answer: 1, level: "B2" },
    { q: "«в лесу́» va «о ле́се» farqi nimada?", options: ["Uslub", "-у́ joy, -е mavzu", "Zamon", "Farqi yo'q"], answer: 1, level: "C1" },
  ],
};

// ─── Dasturlash ───────────────────────────────────────────────────────────────
const PROGRAMMING: Course = {
  id: "dasturlash",
  title: "Dasturlash",
  subtitle: "Noldan full-stack · 203 mavzu",
  emoji: "💻",
  start: {
    "Noldan": "/dasturlash/00-qism-tayyorgarlik/01-kompyuter-qanday-ishlaydi",
    "Frontend": "/dasturlash/02-qism-javascript/01-js-kirish-ozgaruvchilar-turlar-operatorlar",
    "Backend": "/dasturlash/05-qism-nodejs/01-nodejs-kirish-event-loop-v8",
    "Senior": "/dasturlash/09-qism-arxitektura/01-solid-prinsiplari",
  },
  scoreToLevel: (c) => (c <= 1 ? "Noldan" : c <= 3 ? "Frontend" : c <= 5 ? "Backend" : "Senior"),
  blurb: {
    Noldan: "Noldan boshlaymiz: kompyuter, terminal, internet — keyin kod.",
    Frontend: "Asoslar bor. JavaScript'ni chuqurlashtirib, React'ga boramiz.",
    Backend: "Frontend tayyor. Node.js, ma'lumotlar bazasi va API'ga o'tamiz.",
    Senior: "Kuchli baza. Arxitektura, SOLID va tizim dizayni ustida ishlaymiz.",
  },
  questions: [
    { q: "1 bayt necha bitdan iborat?", options: ["4", "8", "16", "32"], answer: 1, level: "Noldan" },
    { q: "«const» bilan e'lon qilingan obyekt ichini o'zgartirish mumkinmi?", options: ["Yo'q", "Ha — havola o'zgarmaydi", "Faqat massivda", "Xato beradi"], answer: 1, level: "Frontend" },
    { q: "«typeof null» nima qaytaradi?", options: ["null", "object", "undefined", "number"], answer: 1, level: "Frontend" },
    { q: "React'da «key» nima uchun kerak?", options: ["Stil", "Elementlarni aniqlash va to'g'ri qayta ishlatish", "Tartib", "Validatsiya"], answer: 1, level: "Frontend" },
    { q: "Node.js event loop nechta asosiy fazadan iborat?", options: ["3", "4", "6", "8"], answer: 2, level: "Backend" },
    { q: "SQL injection'dan asosiy himoya qaysi?", options: ["Escape qilish", "Parametrli so'rovlar", "WAF", "Uzunlikni cheklash"], answer: 1, level: "Backend" },
    { q: "Indeks so'rovni qanday tezlashtiradi?", options: ["Kesh bilan", "Full scan O(n) → B-tree O(log n)", "Xotira bilan", "Tezlashtirmaydi"], answer: 1, level: "Senior" },
    { q: "«DIP» (SOLID) nimani talab qiladi?", options: ["Bir vazifa", "Abstraksiyaga tayanish", "Kichik interfeys", "Merosdan qochish"], answer: 1, level: "Senior" },
    { q: "CAP teoremasi bo'yicha tarmoq bo'linishida nima tanlanadi?", options: ["Uchtasi", "Izchillik yoki mavjudlik", "Faqat tezlik", "Hech narsa"], answer: 1, level: "Senior" },
  ],
};

export const COURSES: Course[] = [ENGLISH, RUSSIAN, PROGRAMMING];

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
