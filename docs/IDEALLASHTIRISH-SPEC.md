# Wisar — Ideallashtirish Spetsifikatsiyasi (36 vazifa)

> Bu hujjat **boshqa Claude sessiyasi** uchun yozilgan. Sessiya bu loyihaning oldingi
> suhbatini **eslamaydi** — shu sababli bu yerda hamma narsa to'liq, mustaqil yozilgan.
> Vazifa: quyidagi **36 ta yaxshilashni to'liq, ideal darajada** amalga oshirish.

---

## 0. Bajaruvchi sessiya uchun ko'rsatma (AVVAL O'QING)

**Missiya:** Mavjud Wisar o'quv platformasini 36 ta aniq yaxshilash bilan ideal holatga keltirish.
Loyiha allaqachon ishlaydi va boy — sen **buzmaysan, faqat yaxshilaysan va qo'shasan**.

**Ish tartibi (har vazifa uchun):**
1. Avval tegishli mavjud fayllarni **o'qib chiq** — pattern va uslubni tushun.
2. O'zgartirishni mavjud konventsiyaga **mos** qilib yoz (3-bo'limga qara).
3. Har modul tugagach `npx tsc --noEmit` (web + api) bilan **typecheck** qil.
4. Yangi logika uchun **test yoz** (33-vazifa Jest/Vitest infratuzilmasini beradi — uni birinchi tayyorla).
5. Vazifa "Definition of Done" mezonlariga javob bersa — keyingisiga o't.

**Qat'iy qoidalar:**
- ❌ Mavjud funksiyani buzma. Ishlab turgan sahifa/endpoint ishlamay qolmasin.
- ❌ Chart kutubxonasi qo'shma — barcha grafiklar **inline SVG** (loyihada shu uslub).
- ❌ Interfeysga **kirill** harf aralashtirma — faqat o'zbekcha **lotin** (homoglif xavfi bor: с,о,а,е,р,х kirillni tekshir).
- ✅ Theme token ishlat: `bg-page bg-bg border-line text-ink text-soft text-accent` (dark mode shart).
- ✅ AI chaqiruvlar uchun mavjud `ask()` patternni qayta ishlat (provayder-agnostik — Groq bepul → Anthropic fallback).
- ✅ Har yangi env o'zgaruvchini `.env.example` ga qo'sh va izohla.
- ✅ Schema o'zgarsa: `npx prisma db push` (yoki migrate) + `npx prisma generate`, API'ni avval to'xtat (Windows DLL lock).

**Definition of Done (umumiy):** typecheck toza · mavjud funksiyalar ishlaydi · yangi funksiya
brauzerda/endpointda tekshirildi · dark mode to'g'ri · test yozilgan (mantiqiy logika uchun).

---

## 1. Loyiha haqida qisqacha

**Wisar** — o'zbekcha full-stack o'quv platformasi (dasturlash kitobi + ingliz tili kursi + IELTS).

**Stack:** Next.js 15 (App Router) · NestJS 10 · Prisma + PostgreSQL 17 · TailwindCSS · TypeScript.
Monorepo (npm workspaces + turbo). AI: provayder-agnostik (Groq `llama-3.3-70b` bepul, Anthropic fallback).

**Struktura:**
```
wisar-platform/
├─ apps/
│  ├─ api/          NestJS backend (port 4000, global prefix /api)
│  │  └─ src/       admin auth comments content flashcards health ielts invite
│  │               mail me planner quiz tutor  + main.ts app.module.ts prisma.service.ts
│  └─ web/          Next.js frontend (port 3001)
│     ├─ app/       routes (App Router)
│     ├─ components/
│     └─ lib/       api.ts auth.ts me-api.ts ... (fetch helperlar)
└─ packages/
   ├─ content/      src/render.ts (markdown→HTML), icons.ts
   └─ database/     prisma/schema.prisma, seed*.ts
```

**Ishga tushirish (Windows PowerShell):**
```powershell
# Root .env bor (DATABASE_URL, LLM_API_KEY, SMTP_*, GOOGLE_* ...). Uni apps/api/.env va apps/web/.env.local ga nusxalang.
cd apps/api;  npm run dev     # NestJS (start --watch) → :4000
cd apps/web;  npm run dev     # Next.js → :3001
```
PostgreSQL native servis sifatida ishlaydi (`postgresql-x64-17`), Docker shart emas.

**Asosiy patternlar (o'qib tushun):**
- Backend himoyalangan endpoint: `@UseGuards(JwtGuard)` + `@CurrentUser() u: AuthUser` (`u.sub` = userId).
  Misol: `apps/api/src/me/me.controller.ts`.
- Frontend himoyalangan so'rov: `authFetch<T>("/path", {...})` — `apps/web/lib/auth.ts`.
- Frontend public so'rov: `get<T>()` — `apps/web/lib/api.ts` (`API` = `NEXT_PUBLIC_API_URL`).
- AI: `apps/api/src/tutor/tutor.service.ts` va `ielts.service.ts` da `ask(system, user, maxTokens, jsonMode)`
  metodi bor — **shuni qayta ishlat** (yangi joyga ko'chir yoki umumiy `LlmService` qil — 17-vazifaga qara).
- Markdown render: `packages/content/src/render.ts` → `renderMarkdown(md)`.

---

## 2. Mavjud holatni bilish (takrorlamaslik uchun)

Bular **allaqachon bor** — qaytadan yozma, faqat ko'rsatilgan joyda kengaytirilADI:
- Auth: JWT + Google OAuth + qat'iy email verification + parol tiklash.
- `me`: progress, bookmark, note, dashboard, streak (checkin).
- Flashcard: SM-2 (`FlashcardReview` modeli), deck/card, UI flip.
- IELTS: AI examiner (writing/speaking scoring + reading/listening/prompt generation). Speaking faqat **transcript** bo'yicha.
- AI Tutor: maqola ichida **bitta** savol-javob (kontekstsiz, 3000 belgiga kesilgan).
- Planner: DB-backed, habits, Pomodoro (`FocusTimer`), haftalik stat.
- Admin: oddiy stats, users, comments, invites.
- PWA: `manifest.json` + minimal `sw.js`. Sentry, Plausible — DSN bo'lsa yoqiladi.
- `render.ts`: `addCrossRefs` (lekin `onclick="return false"` — **ishlamaydi**), `addFillBlanks` (`[___]`, `[___:javob]` — tekshirish ulanmagan).
- Rate limiting: `ThrottlerModule` global 100/min. Helmet yoqilgan.

**Bu vazifalar bu spec'ga KIRMAYDI** (foydalanuvchi keyinroq qiladi): XP tizimi, badge'lar,
leaderboard, web push. Ularga bog'liq joyni tayyor qoldir, lekin amalga oshirma.

---

## 3. Schema o'zgarishlari (BIRINCHI BAJAR — konsolidatsiyalangan)

`packages/database/prisma/schema.prisma` ga quyidagi yangi modellarni qo'sh va `User` ga
yangi relation/maydonlarni ula. Keyin `db push` + `generate`. Hammasi bitta migratsiyada.

```prisma
// User modeliga qo'shiladigan maydonlar:
//   cefrLevel        String?   // onboarding aniqlagan daraja: "A1".."C2" (10,32-vazifa)
//   dailyGoalMinutes Int       @default(10)  // kunlik maqsad (4-vazifa)
//   twoFactorSecret  String?   // 2FA (40-vazifa)
//   twoFactorEnabled Boolean   @default(false)
//   + relationlar: dailyActivity, reviewItems, highlights, refreshTokens,
//     groupsOwned, groupMemberships, forumThreads, forumPosts, commentLikes, ieltsAttempts

/// Kunlik faollik — daily goal, streak heatmap, analitika manbai (4,30,31-vazifa)
model DailyActivity {
  id             String @id @default(cuid())
  userId         String
  user           User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  date           String // "YYYY-MM-DD"
  minutes        Int    @default(0)
  articlesRead   Int    @default(0)
  cardsReviewed  Int    @default(0)
  quizzesTaken   Int    @default(0)
  xp             Int    @default(0) // kelajak XP uchun joy (hozir to'ldirilmaydi)
  @@unique([userId, date])
  @@index([userId, date])
}

/// Umumiy takrorlash navbati (SM-2) — flashcard + xato quiz savollari bitta navbatda (7-vazifa)
model ReviewItem {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind       String   // "card" | "question"
  refId      String   // Flashcard.id yoki Question.id
  interval   Int      @default(1)
  easeFactor Float    @default(2.5)
  reps       Int      @default(0)
  nextReview DateTime @default(now())
  reviewedAt DateTime @default(now())
  @@unique([userId, kind, refId])
  @@index([userId, nextReview])
}

/// Maqola matnidagi belgilash + inline izoh (24-vazifa)
model Highlight {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  articleId String
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  quote     String   // belgilangan matn
  prefix    String?  // anchorlash uchun oldidagi ~20 belgi
  note      String?  // ixtiyoriy izoh
  color     String   @default("yellow")
  createdAt DateTime @default(now())
  @@index([userId, articleId])
}

/// RAG uchun maqola bo'laklari + embedding (18-vazifa)
/// pgvector bo'lsa: embedding Unsupported("vector(768)"). Bo'lmasa: embedding String (JSON float[]).
model ArticleChunk {
  id        String  @id @default(cuid())
  articleId String
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  ord       Int
  content   String
  embedding String  // JSON: number[] (provayder dimentsiyasi). pgvector mavjud bo'lsa migratsiyada o'zgartir.
  @@index([articleId])
}

/// AI suhbat tarixi — multi-turn tutor + roleplay (17,19-vazifa)
model AiThread {
  id        String      @id @default(cuid())
  userId    String?
  user      User?       @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      String      // "tutor" | "roleplay"
  articleId String?     // tutor uchun
  scenario  String?     // roleplay senariysi
  messages  AiMessage[]
  createdAt DateTime    @default(now())
  @@index([userId])
}
model AiMessage {
  id        String   @id @default(cuid())
  threadId  String
  thread    AiThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
  @@index([threadId])
}

/// IELTS urinishlari serverda (20,30-vazifa) — hozir faqat localStorage'da
model IeltsAttempt {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  skill     String   // "writing" | "speaking" | "reading" | "listening"
  part      String?  // "1" | "2" | "3"
  band      Float
  detail    String   // JSON: to'liq natija
  createdAt DateTime @default(now())
  @@index([userId, skill, createdAt])
}

/// Refresh token (34-vazifa) — httpOnly cookie'da saqlanadi, DB'da hash
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([userId])
}

/// O'quv guruhlari (27-vazifa)
model Group {
  id        String        @id @default(cuid())
  name      String
  code      String        @unique // qo'shilish kodi
  ownerId   String
  owner     User          @relation("GroupsOwned", fields: [ownerId], references: [id], onDelete: Cascade)
  members   GroupMember[]
  createdAt DateTime      @default(now())
}
model GroupMember {
  id       String   @id @default(cuid())
  groupId  String
  group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation("GroupMemberships", fields: [userId], references: [id], onDelete: Cascade)
  joinedAt DateTime @default(now())
  @@unique([groupId, userId])
}

/// Comment thread + like (28-vazifa) — mavjud Comment modelini kengaytir:
//   Comment ga qo'sh: parentId String?  (self-relation), likes CommentLike[]
model CommentLike {
  id        String  @id @default(cuid())
  commentId String
  comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([commentId, userId])
}

/// Q&A forum (29-vazifa)
model ForumThread {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  posts     ForumPost[]
  createdAt DateTime    @default(now())
  @@index([createdAt])
}
model ForumPost {
  id        String      @id @default(cuid())
  threadId  String
  thread    ForumThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  body      String
  accepted  Boolean     @default(false)
  createdAt DateTime    @default(now())
  @@index([threadId])
}

/// Streak freeze (14-vazifa) — mavjud Streak modeliga qo'sh:
//   freezes Int @default(2)   lastFreezeDate String?

/// Article-level quiz (8-vazifa) — mavjud Quiz modeliga qo'sh:
//   articleId String?  + Article ga: articleQuizzes Quiz[] relation
//   (sectionId ni optional qilma agar mavjud data buzilsa — yangi articleId optional yetarli)

/// Admin audit log (40-vazifa)
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String   // "delete_user" | "delete_comment" | ...
  target    String?
  meta      String?  // JSON
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

> **pgvector eslatma (18-vazifa):** Agar PG'da `CREATE EXTENSION vector;` mumkin bo'lsa, `ArticleChunk.embedding`
> ni `Unsupported("vector(768)")` qilib raw SQL bilan cosine qidiruv qil. Imkonsiz bo'lsa — `embedding String`
> (JSON) qoldir va cosine'ni Node'da hisobla (kontent kichik bo'lsa yetarli). Ikkala yo'l ham qabul qilinadi.

---

## 4. Vazifalar (36 ta) — fazalarga bo'lingan

Har vazifa: **Maqsad · Fayllar · Ish · Definition of Done**. Raqamlar foydalanuvchi ro'yxatiga mos
(12,13,15,16 yo'q — ular gamifikatsiya, bu spec'ga kirmaydi).

### FAZA A — Infratuzilma (avval)

#### 33. Test infratuzilmasi + testlar 🔥
- **Maqsad:** Loyihada test yo'q. Jest (yoki Vitest) o'rnatib, kritik logikani qopla.
- **Fayllar:** `apps/api` (Jest + Supertest), `apps/web` (Vitest + Testing Library), root `package.json` `test` script.
- **Ish:** API uchun unit testlar: auth (register/login/verify), SM-2 hisob (ReviewItem), content.search, ielts
  `parseJson`. Kamida e2e: `/api/health`, auth flow. Web uchun: `lib/` sof funksiyalar (planner.ts, ielts-progress.ts).
  Har keyingi vazifada yangi logika uchun test qo'shilsin.
- **DoD:** `npm test` ishlaydi, asosiy logika qoplangan (≥30 test), CI'da ishlaydi (37-vazifa).

#### 37. CI/CD (GitHub Actions)
- **Maqsad:** Har push'da avtomatik tekshiruv. Repo: `github.com/Sarvarbek0704/wisar`.
- **Fayllar:** `.github/workflows/ci.yml`.
- **Ish:** Node 20 · `npm ci` · `npx prisma generate` · web+api `tsc --noEmit` · `npm test` · `npm run build`.
  PostgreSQL service container (testlar uchun) yoki testlarni DB'siz mock bilan yoz.
- **DoD:** Workflow yashil. PR'da status ko'rinadi.

#### 36. Caching
- **Maqsad:** Tez-tez o'qiladigan public ma'lumotni keshlash.
- **Fayllar:** `apps/api/src/content/content.service.ts` (`stats`, `topics`), yangi `apps/api/src/common/cache.service.ts`.
- **Ish:** Oddiy in-memory TTL kesh (60s) — `stats`, `topics`, `topicBySlug`. Redis shart emas (ixtiyoriy:
  `REDIS_URL` bo'lsa ishlat). Kontent o'zgarsa (admin CRUD) keshni invalidatsiya qil.
- **DoD:** Bir xil so'rov ikkinchi marta DB urmайди (log bilan tekshir). Admin o'zgartirgach yangilanadi.

#### 34. Refresh token + httpOnly cookie 🔥
- **Maqsad:** JWT hozir `localStorage`'da (XSS xavfi). Qisqa access token + httpOnly refresh cookie.
- **Fayllar:** `apps/api/src/auth/*`, `apps/web/lib/auth.ts`, schema `RefreshToken`.
- **Ish:** Login/verify access token (15 min) + refresh token (httpOnly, secure, 30 kun cookie, DB'da hash).
  `POST /api/auth/refresh` — cookie bilan yangi access beradi. `POST /api/auth/logout` — refresh'ni revoke.
  Frontend: `authFetch` 401'da bir marta `/auth/refresh` urinib, qayta so'rov yuborsin (silent refresh).
  **Muhimlik:** mavjud login oqimini buzmasdan migratsiya qil — access token hali ham frontend'da ishlatiladi,
  faqat uzoq muddat refresh cookie'da. Google OAuth callback ham refresh cookie qo'yadi.
- **DoD:** Login → 15 min'dan keyin avtomatik refresh, foydalanuvchi chiqib ketmaydi. Logout cookie'ni tozalaydi.

---

### FAZA B — Tez g'alabalar (UX)

#### 1. API o'lganda graceful degradation 🔥
- **Maqsad:** Backend yiqilsa konsol `ERR_CONNECTION_REFUSED` bilan to'lmasin, foydalanuvchi yumshoq xabar ko'rsin.
- **Fayllar:** `apps/web/lib/auth.ts` (`authFetch`), `apps/web/lib/api.ts`, `apps/web/components/Toaster.tsx`,
  `apps/web/components/StreakWidget.tsx`, `apps/web/app/me/page.tsx`.
- **Ish:** `authFetch`/`get` ga `AbortController` timeout (8s) qo'sh. Ulanish xatosini (TypeError/timeout)
  alohida `ApiOfflineError` qil. Global bitta toast "Server bilan aloqa yo'q" (spam emas — debounce). Widget'lar
  xatoda jim fallback (bo'sh holat) ko'rsatsin, `console.error` bosmasin.
- **DoD:** API'ni o'chir → sahifa yiqilmaydi, bitta yumshoq xabar, konsol toza.

#### 6. Empty states
- **Maqsad:** Bo'sh sahifalar (bookmark, planner, flashcard, review, forum) chiroyli "boshlang" kartasi ko'rsatsin.
- **Fayllar:** `apps/web/components/EmptyState.tsx` (yangi, qayta ishlatiladigan), tegishli sahifalar.
- **Ish:** Lucide ikonka + sarlavha + tavsif + CTA tugma. Theme token, dark mode.
- **DoD:** Har bo'sh ro'yxat o'rniga mazmunli empty state.

#### 4. Kunlik maqsad (daily goal)
- **Maqsad:** Foydalanuvchi kunlik maqsad belgilaydi (daqiqa), progress ring ko'rinadi.
- **Fayllar:** schema `DailyActivity` + `User.dailyGoalMinutes`, `apps/api/src/me/*`, `apps/web/app/me/page.tsx`,
  `apps/web/app/onboarding/page.tsx`, `apps/web/components/StreakWidget.tsx`.
- **Ish:** Faollik vaqtini yig'ish: frontend maqola o'qish/flashcard vaqtini `POST /api/me/activity` bilan
  `DailyActivity.minutes` ga qo'shsin (har 30s heartbeat yoki sahifa yopilganda). `GET /api/me/activity/today`
  bugungi daqiqa. Onboardingda maqsad tanlash (5/10/20/30 min). `me` da SVG progress ring.
- **DoD:** Maqsad belgilanadi, kunlik progress real yangilanadi, ring to'ladi.

#### 3. "Bugun takrorlash" badge 🔥
- **Maqsad:** Takrorlash kerak bo'lgan kartalar sonini ko'rsatib qaytib kelishga undash.
- **Fayllar:** `apps/api/src/flashcards/*` (yoki yangi review endpoint), `apps/web/components/AppSidebar.tsx`,
  `apps/web/components/TopBar.tsx`, `apps/web/lib/flashcards-api.ts`.
- **Ish:** `GET /api/review/due-count` → `ReviewItem.nextReview <= now` soni (7-vazifa bilan birga). Sidebar/TopBar'da
  qizil badge. 7-vazifadan oldin qilinsa, flashcard `FlashcardReview` bo'yicha hisobla, keyin `ReviewItem`ga ko'chir.
- **DoD:** Navbatda kartalar bo'lsa badge ko'rinadi, bosilsa review sahifasiga olib boradi.

#### 5. Reading position eslab qolish
- **Maqsad:** Maqolada qayerda to'xtaganini eslab, "davom ettirish" o'sha joydan ochsin.
- **Fayllar:** `apps/web/components/ReadingProgress.tsx`, `apps/web/app/[topic]/[section]/[article]/page.tsx`,
  `apps/web/lib/me-api.ts`, `apps/api/src/me/*` (Progress ga `scrollPct Float?` qo'sh).
- **Ish:** Scroll % ni debounce bilan saqla (login bo'lsa DB, bo'lmasa localStorage). Maqola ochilganda
  saqlangan joyga yumshoq scroll + "kaldagi joyingizdan davom etasizmi?" kichik tugma.
- **DoD:** Maqolani yarmida tashlab, qayta ochsa — o'sha joyga qaytadi.

---

### FAZA C — O'rganish yadrosi (pedagogika)

#### 7. Birlashgan Review Queue 🔥
- **Maqsad:** SM-2 takrorlashni faqat flashcard emas, **xato qilingan quiz savollari** ham qamrasin — bitta navbat.
- **Fayllar:** schema `ReviewItem`, yangi `apps/api/src/review/` moduli, `apps/web/app/review/page.tsx`,
  `apps/web/lib/review-api.ts`.
- **Ish:** SM-2 algoritmni `ReviewItem`ga umumlashtir (mavjud `FlashcardReview` logikasini ko'chir/birlashtir).
  Quiz'da xato qilingan savol → `ReviewItem(kind:"question")` yaratilsin. `GET /api/review/queue` bugungi navbat
  (card+question aralash), `POST /api/review/:id/grade` (quality 0-5 → SM-2 yangilash). UI: karta yoki savol
  ko'rsatib, "Bilardim/Qiyin/Bilmadim" baholash. Mavjud flashcard review buzilmasin (migratsiya yoki adapter).
- **DoD:** Quizda xato qilsang ertasi review navbatda paydo bo'ladi; baholash nextReview'ni to'g'ri suradi; test bor.

#### 8. Maqola oxirida active-recall
- **Maqsad:** Har maqola oxirida 2-3 savol — o'qiganni darhol mustahkamlash.
- **Fayllar:** schema `Quiz.articleId?`, `apps/api/src/quiz/*`, `apps/api/src/content/content.service.ts`
  (article javobiga `articleQuiz` qo'sh), `apps/web/app/[topic]/[section]/[article]/page.tsx`, mavjud `Quiz.tsx`.
- **Ish:** Quiz'ni article'ga ham bog'lash imkoni. Admin qo'lda qo'shadi YOKI "AI savol yarat" tugmasi
  (maqola matnidan 3 savol generatsiya — `ask()` jsonMode). Maqola oxirida `Quiz` komponenti. Xato → 7-vazifa navbatiga.
- **DoD:** Maqola oxirida savollar chiqadi, javob beriladi, natija saqlanadi.

#### 9. Avtomatik cloze (fill-in-blank) + tekshirishni ulash
- **Maqsad:** `render.ts`da `[___:javob]` bor lekin **tekshirish ulanmagan**. Ulagin + maqoladan avtomatik cloze yarat.
- **Fayllar:** `packages/content/src/render.ts`, yangi `apps/web/components/FillBlank.tsx` (yoki client enhancer
  `apps/web/components/CopyCodeEnhancer.tsx` patternida), `apps/web/components/ArticleContent.tsx`.
- **Ish:** Client komponent `.fill-blank` input'larini topib, "Tekshir" tugmasi qo'shsin: `data-answer` bilan
  solishtirib yashil/qizil rang + to'g'ri javob. Qo'shimcha: maqoladan AI bilan "cloze mashq yarat" tugmasi
  (muhim so'zlarni `[___:...]` qilib) — ixtiyoriy interaktiv blok.
- **DoD:** `[___:javob]` input ishlaydi, tekshiriladi; dark mode'da rang to'g'ri.

#### 10. Adaptiv tavsiya
- **Maqsad:** Onboarding darajani aniqlaydi, lekin keyin moslashmaydi. Natijaga qarab "keyingi dars"/"zaif mavzu" tavsiya.
- **Fayllar:** `User.cefrLevel`, `apps/api/src/me/me.service.ts` (`dashboard` ga `recommendations` qo'sh),
  `apps/web/app/me/page.tsx`, `apps/web/app/onboarding/page.tsx`.
- **Ish:** Onboarding natijasini `cefrLevel`ga saqla. Dashboard: progress + quiz/review natijasidan keyingi
  o'qilmagan maqola va eng past natija mavzusini tavsiya qil. "Davom et" + "Zaif mavzuni mustahkamla" kartalari.
- **DoD:** `me` sahifasida shaxsiy tavsiyalar ko'rinadi, foydalanuvchi holatiga mos.

#### 11. AI mnemonika & misol (flashcard)
- **Maqsad:** Flashcard orqasida "esda saqlash usuli" + tabiiy misol gap.
- **Fayllar:** `apps/api/src/flashcards/*` (yangi endpoint), `apps/web/app/flashcards/[level]/page.tsx`.
- **Ish:** `POST /api/flashcards/:cardId/hint` → `ask()` bilan mnemonika + misol gap (o'zbekcha izoh, inglizcha misol).
  Natijani Flashcard'ga cache qil (qayta so'ramaslik uchun — `Flashcard.example` bo'sh bo'lsa to'ldir). Karta
  orqasida "Yodlash maslahati" tugmasi.
- **DoD:** Tugma bosilsa AI mnemonika chiqadi, ikkinchi marta keshdan keladi.

---

### FAZA D — AI chuqurlashtirish

> **Avval:** AI chaqiruvni markazlashtir. `tutor.service.ts` va `ielts.service.ts`dagi takrorlangan `ask()`,
> `askOpenAICompatible()`, `askAnthropic()`, `parseJson()` ni yangi `apps/api/src/llm/llm.service.ts`ga ko'chir
> va ikkalasi shuni inject qilsin (DRY). Bu 17-21 vazifalarning poydevori.

#### 17. AI Tutor — multi-turn + streaming 🔥
- **Maqsad:** Hozir bitta savol-javob, kontekstsiz. Suhbat tarixi + so'zma-so'z (streaming) javob.
- **Fayllar:** schema `AiThread`/`AiMessage`, `apps/api/src/tutor/*`, `apps/web/components/AiTutor.tsx`.
- **Ish:** `POST /api/tutor/thread` (yarat), `POST /api/tutor/thread/:id/ask` — **SSE stream** (NestJS `@Sse` yoki
  `text/event-stream`). Suhbat tarixini `AiMessage`'ga saqla, kontekst sifatida yubor. Frontend: stream'ni
  o'qib so'zma-so'z ko'rsat, suhbat ko'rinishi (user/assistant pufakchalari).
- **DoD:** Ketma-ket savol berish mumkin (kontekst saqlanadi), javob oqib chiqadi.

#### 18. RAG — butun kursni biladigan tutor 🔥
- **Maqsad:** Tutor faqat ochiq maqolani emas, **butun kontentni** biladi (embeddings).
- **Fayllar:** schema `ArticleChunk`, `apps/api/src/llm/embed.service.ts`, `apps/api/src/tutor/*`, seed/indeks script
  `packages/database/prisma/index-embeddings.ts`.
- **Ish:** Embedding provayderi (bepul variant: Google `text-embedding-004`, yoki OpenAI-mos `EMBED_*` env).
  Maqolalarni ~500 so'zli bo'laklarga bo'lib embed qilib `ArticleChunk`ga yoz (admin trigger yoki script).
  Savolda: savolni embed → cosine bilan top-5 bo'lak → kontekst sifatida `ask()`ga. pgvector bo'lsa SQL `<=>`,
  bo'lmasa Node cosine. Manba maqolaga havola ham qaytar.
- **DoD:** "X mavzu qaysi darsda?" kabi savolga butun kursdan to'g'ri javob + manba havola.

#### 19. AI suhbatdosh / roleplay
- **Maqsad:** Til amaliyoti — "restoranda buyurtma", "ish suhbati" senariylarида AI bilan suhbat.
- **Fayllar:** `AiThread(kind:"roleplay")`, `apps/api/src/tutor/*` (yoki yangi `roleplay` modul),
  `apps/web/app/practice/page.tsx` (yangi).
- **Ish:** Tayyor senariylar ro'yxati. AI rolni o'ynaydi (system prompt), foydalanuvchi yozadi/gapiradi
  (Web Speech API — speaking recorder mavjud). Suhbat oxirida qisqa fikr-mulohaza (xatolar, maslahat).
- **DoD:** Senariy tanlab AI bilan ingliz tilida suhbat qilish mumkin, oxirida baho.

#### 20. Real audio Speaking baholash
- **Maqsad:** IELTS Speaking hozir faqat transcript. Haqiqiy audio → talaffuz/ravonlik tahlili.
- **Fayllar:** `apps/api/src/ielts/*`, schema `IeltsAttempt`, `apps/web/app/ielts/page.tsx` (SpeakingTab).
- **Ish:** Audio yozib olish (MediaRecorder) → `POST /api/ielts/transcribe` (Whisper: OpenAI-mos `WHISPER_*` env yoki
  Groq whisper). Transcript + audio xususiyatlaridan (pauza, tezlik) talaffuz bahosini boyit. Natijani
  `IeltsAttempt`ga saqla (30-vazifa analitikasi uchun). Whisper sozlanmagan bo'lsa — mavjud transcript oqimiga fallback.
- **DoD:** Ovoz yozib yuborilsa transkripsiya + band; natija serverga saqlanadi.

#### 21. Har joyda grammatika tekshiruv
- **Maqsad:** Comment, note, planner, forum — istalgan inglizcha matnga "AI tuzatish" tugmasi.
- **Fayllar:** `apps/api/src/llm/*` (`POST /api/llm/grammar`), `apps/web/components/GrammarCheck.tsx` (yangi, qayta ishlatiladigan).
- **Ish:** Matn yuboriladi → tuzatilgan versiya + xatolar ro'yxati (o'zbekcha izoh). Throttle (10/min). Komponentni
  textarea yonига qo'yib bo'ladigan qil. Comment/note/forum textarea'larida ishlatil.
- **DoD:** Inglizcha matn yozib "Tekshir" bosilsa tuzatish va izoh chiqadi.

---

### FAZA E — Kontent & UX

#### 22. Audio (TTS) har maqolaga 🔥
- **Maqsad:** "Tinglab o'rganish" — maqolani brauzer ovozi o'qisin.
- **Fayllar:** `apps/web/components/ArticleAudio.tsx` (yangi), `apps/web/app/[topic]/[section]/[article]/page.tsx`.
- **Ish:** Web Speech API (`speechSynthesis`) — Play/Pause/tezlik. Joriy o'qilayotgan jumlani highlight (ixtiyoriy).
  IELTS Listening allaqachon TTS ishlatadi — patternni qara.
- **DoD:** Maqolada "Tinglash" tugmasi, ovoz o'qiydi, to'xtatish mumkin.

#### 23. Offline rejim (PWA)
- **Maqsad:** O'qilgan/saqlangan maqolalarni internetsiz o'qish.
- **Fayllar:** `apps/web/public/sw.js`, `apps/web/app/layout.tsx` (SW ro'yxatdan o'tkazish), ixtiyoriy `next-pwa`.
- **Ish:** Service worker: statik asset'lar cache-first; ko'rilgan maqola sahifalari stale-while-revalidate;
  offline fallback sahifa. Bookmark qilingan maqolalarni oldindan cache (ixtiyoriy). Manifest allaqachon bor.
- **DoD:** Bir marta ochilgan maqola offline'da ham ochiladi; offline banner ko'rinadi.

#### 24. Highlight + inline izoh
- **Maqsad:** Hozir note butun maqolaga. Matnning aniq qismini belgilab izoh qo'shish (Kindle uslubi).
- **Fayllar:** schema `Highlight`, `apps/api/src/me/*`, `apps/web/components/ArticleContent.tsx`,
  `apps/web/components/Highlighter.tsx` (yangi), `apps/web/lib/me-api.ts`.
- **Ish:** Matn belgilanganda (selection) — "Belgilash / izoh" popover. `quote`+`prefix` bilan anchorlab saqla,
  qayta ochilganda `<mark>` bilan ko'rsat. Izohlar ro'yxati yon panelda. `bookmarks`/`me`da ko'rinsin.
- **DoD:** Matn belgilab izoh qo'shiladi, qayta ochilganda saqlangan joyda highlight ko'rinadi.

#### 25. Kod runner — Python (Pyodide)
- **Maqsad:** Hozir faqat JS (`CodeRunner.tsx`). Python qo'sh (dasturlash kitobi uchun katta plyus).
- **Fayllar:** `apps/web/components/CodeRunner.tsx`.
- **Ish:** `language-python` bloklarга "Ishga tushir" — Pyodide (CDN `pyodide`) WebAssembly'da. `print` chiqishini
  ushlab ko'rsat. Pyodide og'ir — faqat birinchi run'da lazy yukla, loader ko'rsat.
- **DoD:** Python kod blokida "Ishga tushir" ishlaydi, output chiqadi; JS ham buzilmaydi.

#### 26. Cross-reference havolalar (ishlaydigan qil)
- **Maqsad:** `render.ts`dagi `addCrossRefs` `onclick="return false"` — **ishlamaydi**. Haqiqiy navigatsiya qil.
- **Fayllar:** `packages/content/src/render.ts`, `apps/web/components/ArticleContent.tsx`.
- **Ish:** `(N.N)` → mos maqola/bo'limga `href`. Mapping kerak: chapter→section slug. Agar barqaror moslik
  bo'lmasa, client'da `(N.N)` bosilganda topic ichidagi N-bo'lim/N-maqolaga `router.push`. Boblar tartibidan foydalan
  (`order`). Hover'da nom ko'rsat.
- **DoD:** `(3.2)` bosilsa to'g'ri maqolaga o'tadi.

---

### FAZA F — Ijtimoiy

#### 27. Study guruhlar
- **Maqsad:** Invite ustiga — guruh tuzib birga progress kuzatish.
- **Fayllar:** schema `Group`/`GroupMember`, yangi `apps/api/src/groups/`, `apps/web/app/groups/*`.
- **Ish:** Guruh yarat (kod), kod bilan qo'shil, a'zolar progress/streak ro'yxati (faqat umumiy stat — public profil
  patterni). Guruh sahifasi: a'zolar + haftalik faollik.
- **DoD:** Guruh yaratiladi, qo'shiladi, a'zolar progressi ko'rinadi.

#### 28. Comment thread + like + mention
- **Maqsad:** Hozir tekis ro'yxat. Reply (thread), like, @mention.
- **Fayllar:** schema `Comment.parentId` + `CommentLike`, `apps/api/src/comments/*`, `apps/web/components/Comments.tsx`.
- **Ish:** Reply (1 daraja yetarli), like toggle + soni, `@ism` ni link qil. Mavjud comment endpoint'larini buzma —
  kengaytir.
- **DoD:** Izohga javob yozish, like bosish ishlaydi; thread ko'rinadi.

#### 29. Q&A forum
- **Maqsad:** Maqolaga bog'liq bo'lmagan umumiy savollar bo'limi.
- **Fayllar:** schema `ForumThread`/`ForumPost`, yangi `apps/api/src/forum/`, `apps/web/app/forum/*`.
- **Ish:** Savol yarat, javob yoz, "to'g'ri javob" belgilash (thread egasi). Ro'yxat + bitta thread sahifasi.
  Ixtiyoriy: AI birinchi javobni taklif qiladi.
- **DoD:** Savol berish, javob yozish, accepted belgilash ishlaydi.

---

### FAZA G — Analitika

#### 30. Foydalanuvchi analitikasi (insights)
- **Maqsad:** O'rganish vaqti heatmap, kuchli/zaif mavzular, haftalik trend.
- **Fayllar:** `DailyActivity` + `IeltsAttempt`, `apps/api/src/me/me.service.ts` (`insights`),
  `apps/web/app/me/page.tsx` (yoki yangi "Insights" tab).
- **Ish:** GitHub uslubidagi yillik heatmap (inline SVG, `DailyActivity`dan), eng kuchli/zaif mavzu
  (quiz/review natijasidan), haftalik soat trendi. Hammasi inline SVG.
- **DoD:** `me`da heatmap + trend + kuchli/zaif mavzular ko'rinadi.

#### 31. Admin analitikasi kengaytmasi
- **Maqsad:** Hozir oddiy stat. DAU/MAU, retention (D1/D7), funnel, eng ko'p/kam o'qilgan maqolalar.
- **Fayllar:** `apps/api/src/admin/admin.service.ts` (`stats` kengaytir), `apps/web/app/admin/page.tsx`.
- **Ish:** `DailyActivity`dan DAU/MAU; ro'yxat→tasdiqlash→birinchi dars funnel; eng ko'p/kam o'qilgan maqolalar
  (Progress count). Inline SVG grafiklar.
- **DoD:** Admin dashboard'da yangi metrikalar to'g'ri ko'rinadi.

#### 32. "Weak spots" hisoboti
- **Maqsad:** Quiz/review natijalaridan eng ko'p xato mavzularni aniqlab, takrorlashga surish.
- **Fayllar:** `apps/api/src/me/me.service.ts`, `apps/web/app/me/page.tsx`, review navbati bilan bog'la.
- **Ish:** Mavzu bo'yicha xato foizi hisobla, eng past 3 tasini ko'rsat + "mustahkamlash" tugmasi → review/maqola.
- **DoD:** Zaif mavzular ro'yxati ko'rinadi, tugma takrorlashga olib boradi.

---

### FAZA H — Sayt sifati

#### 14. Streak freeze / repair
- **Maqsad:** Bir kun o'tkazsa streak butunlay yo'qolmasin (cheklangan "muzlatish").
- **Fayllar:** schema `Streak.freezes`+`lastFreezeDate`, `apps/api/src/me/streak.service.ts`,
  `apps/web/components/StreakWidget.tsx`.
- **Ish:** Checkin logikasi: kun o'tkazib yuborilsa va `freezes > 0` bo'lsa — streak saqlanadi, freeze kamayadi
  (1 kunlik bo'shliq uchun). Haftada +1 freeze (cron yoki checkin'da). UI'da freeze soni.
- **DoD:** Bir kun o'tkazib ketsa freeze ishlaydi, streak uzilmaydi; freeze tugasa uziladi.

#### 35. Pagination
- **Maqsad:** `bookmarks`, `comments`, admin `users` cheksiz qaytadi — sahifalash.
- **Fayllar:** `apps/api/src/me/*`, `comments/*`, `admin/*`, mos frontend `lib/*` va sahifalar.
- **Ish:** Cursor yoki offset pagination (`?take=&skip=` yoki `?cursor=`). Frontend "ko'proq yuklash"/sahifa.
  Javob `{ items, nextCursor|total }` shaklida. Mavjud chaqiruvchilarni moslashtir.
- **DoD:** Katta ro'yxatlar bo'lakli yuklanadi, "ko'proq" ishlaydi.

#### 38. i18n (ko'p til)
- **Maqsad:** Interfeys hardcoded o'zbekcha. Rus/ingliz qatlamini qo'sh.
- **Fayllar:** `apps/web/lib/i18n.ts` (yangi), `apps/web/messages/{uz,ru,en}.json`, til tanlash TopBar/UserMenu'da.
- **Ish:** Yengil i18n (oddiy kontekst + `t("key")` yoki `next-intl`). Avval **interfeys** matnlarini ko'chir
  (kontent emas). `uz` to'liq, `ru`/`en` skelet. Tanlov localStorage'da. **Kirill homoglif xavfi — uz matnlarni tekshir.**
- **DoD:** Til almashtirilsa interfeys tarjimaga o'tadi (kamida uz to'liq + ru/en asosiy).

#### 39. SEO + ulashish
- **Maqsad:** sitemap, dinamik og:image, structured data.
- **Fayllar:** `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`, maqola/layout `generateMetadata`,
  `apps/web/app/[topic]/[section]/[article]/opengraph-image.tsx` (yoki statik OG).
- **Ish:** Dinamik `sitemap.xml` (topic/section/article'lardan API orqali). Maqolalarga `generateMetadata`
  (title, description=excerpt, og). OG image (Next `ImageResponse`). `Article` uchun JSON-LD structured data.
- **DoD:** `/sitemap.xml` to'g'ri, maqolada og/twitter meta va JSON-LD bor.

#### 40. Admin audit log + 2FA
- **Maqsad:** Admin amallarida iz qolsin + qo'shimcha himoya.
- **Fayllar:** schema `AuditLog` + `User.twoFactor*`, `apps/api/src/admin/*`, `apps/api/src/auth/*`,
  `apps/web/app/admin/*`.
- **Ish:** Har destruktiv admin amal (`deleteUser`, `deleteComment`, publish toggle) `AuditLog`ga yozilsin +
  admin'da ko'rinadigan jurnal. 2FA: TOTP (`otplib`) — admin yoqishi mumkin, login'da kod so'raladi (QR setup).
- **DoD:** Admin amallari jurnalga tushadi; 2FA yoqilsa login'da TOTP kod so'raydi.

---

## 5. Yakuniy tekshirish (bajaruvchi sessiya o'zini tekshirsin)

- [ ] `npx tsc --noEmit -p apps/web/tsconfig.json` — toza
- [ ] `npx tsc --noEmit -p apps/api/tsconfig.json` — toza
- [ ] `npm test` — barcha test o'tadi
- [ ] `npx prisma validate` + `db push` muvaffaqiyatli, `generate` ishlaydi
- [ ] API ishga tushadi (`:4000`), Web ishga tushadi (`:3001`), konsol toza
- [ ] Mavjud oqimlar buzilmagan: login/register/verify, maqola o'qish, flashcard, IELTS, planner, admin
- [ ] Yangi sahifalar ochiladi: `/review`, `/practice`, `/groups`, `/forum`, yangilangan `/me`, `/admin`
- [ ] Dark mode hamma yangi UI'da to'g'ri
- [ ] API o'chirilganda frontend yumshoq degradatsiya qiladi (1-vazifa)
- [ ] `.env.example` barcha yangi env bilan yangilangan
- [ ] CI workflow yashil

## 6. Eslatmalar
- Har AI funksiya **AI sozlanmagan** holatda yumshoq xato/fallback bersin (kalit bo'lmasligi mumkin).
- O'zbekcha matnlarda **kirill homoglif** (с о а е р х к etc.) tekshir — faqat lotin.
- Schema o'zgartirishdan oldin **API'ni to'xtat** (Windows Prisma DLL lock).
- Katta vazifalarni kichik commit'larga bo'l, har modul tugaganda typecheck qil.
- Ishonchsiz joyda — mavjud o'xshash modulni namuna qilib ol (masalan yangi modul = `me` yoki `flashcards` strukturasi).
