# Wisar — Ideallashtirish Spetsifikatsiyasi: Qo'shimcha (5 vazifa)

> Bu — [`IDEALLASHTIRISH-SPEC.md`](./IDEALLASHTIRISH-SPEC.md) (36 vazifa) ga
> **qo'shimcha**. Asosiy spec kuchli va yo'nalishi to'g'ri — pedagogika, AI
> chuqurligi, interaktivlik. Bu hujjat undagi **beshta bo'shliqni** to'ldiradi.
>
> Har biri kodni o'qib aniqlangan, `fayl:qator` bilan. Uslub asosiy spec bilan
> bir xil: **Maqsad · Fayllar · Ish · Definition of Done**.

---

## 0. Nega bu qo'shimcha kerak

Asosiy spec 36 vazifani qamraydi, lekin beshta narsa yo ochiq qolgan, yo
o'z va'dasidan ko'proq/kamroq ko'rsatilgan:

| # | Bo'shliq | Nega muhim |
|---|---|---|
| **41** | O'zbekcha to'liq matnli qidiruv | Hozirgi qidiruv o'zbek morfologiyasini bilmaydi — **platformaning asosiy qiymati ustidagi teshik** |
| **42** | Per-user AI byudjeti | AI vazifalari (17–21) har chaqiruvda **pul**. Suiiste'moldan himoya yo'q |
| **43** | RAG'ni miqyosda ishlaydigan qilish | `embedding String` + Node cosine 364k qatorda **imkonsiz** |
| **44** | Testni DoD'ga majburiy kiritish | Test faqat 33-vazifada; keyin "har vazifada" — amalda tashlab ketiladi |
| **45** | 20-vazifa (nutq baholash) va'dasini to'g'rilash | Transcript'dan **talaffuzni baholab bo'lmaydi** — va'da texnik jihatdan noto'g'ri |

---

## FAZA I — Qidiruv va miqyos

### 41. O'zbekcha to'liq matnli qidiruv 🔥

- **Maqsad:** Platformaning butun qiymati — 364 ming qatorlik kontent. Uni
  ichidan **to'g'ri** qidirib bo'lishi kerak. Hozirgi qidiruv bor, lekin
  o'zbek tili uchun yaroqsiz.

- **Hozirgi holat (o'lchangan):** `content.service.ts:149-186` — qidiruv
  ikki bosqichli:
  1. `title` + `excerpt` bo'yicha `contains` (primary, 40 ta)
  2. `content` (body) bo'yicha `contains` — **faqat primary 40 tadan kam
     bo'lsa** (`:165` `if (primary.length < 40)`)

  Uchta muammo:
  - **`contains` = `ILIKE '%q%'`** — indeks ishlatilmaydi, ketma-ket skan.
    364k qatorda sekin va yuklamada yomonlashadi
  - **Substring moslik — morfologiyani bilmaydi.** O'zbek tili
    agglyutinativ: `o'qish` qidirilsa `o'qidim`, `o'qiyapman`, `o'quvchi`
    **topilmaydi** (ular `o'qish` ni o'z ichiga olmaydi). `kitoblar`
    qidirilsa `kitob` topilmaydi
  - **Reyting yo'q.** `body` da topilganlar ikkinchi darajali; relevantlik
    bo'yicha saralanmaydi

- **Fayllar:** `packages/database/prisma/schema.prisma` (`Article` ga
  `tsv` tsvector ustuni + GIN indeks migratsiya orqali),
  `packages/database/prisma/migrations/` (raw SQL — Prisma tsvector'ni
  to'liq ifodalamaydi), `apps/api/src/content/content.service.ts` (search
  qayta yoziladi), yangi `packages/database/prisma/uz-search.sql` (o'zbek
  text search configuration).

- **Ish:**

  **1-qadam — O'zbek `text search configuration`.** PostgreSQL'da o'zbek
  tili uchun tayyor konfiguratsiya **yo'q** (Snowball stemmer'da ham yo'q).
  Ikki variant, ikkalasining narxi bilan:

  - **Variant A (tavsiya) — `simple` + unaccent + affiks normalizatsiya.**
    O'zbek qo'shimchalarini (`-lar`, `-ni`, `-ga`, `-da`, `-dan`, `-ning`,
    `-im`, `-ing`, `-i`, `-miz`, `-siz`, `-di`, `-ib`, `-yap`, `-gan`, …)
    kesuvchi **oddiy qoidaviy stemmer** yozing (JS'da, indekslashdan oldin
    va so'rovda bir xil qo'llang). Bu — to'liq lingvistik stemmer emas,
    lekin **eng ko'p uchraydigan qo'shimchalarni** qamrab, `contains` dan
    ancha yaxshi natija beradi. Halol chegara: u ba'zi so'zlarni noto'g'ri
    kesadi (masalan ` da'volar` → `da'vo` emas, `da'`), shuning uchun
    minimal uzunlik sharti (≥4 harf) qo'ying.

  - **Variant B — `simple` konfiguratsiya, stemmer'siz.** Faqat
    tokenizatsiya + `unaccent` (`o'` va `oʻ` va `o` ni birlashtirish —
    apostrof variantlari o'zbekcha uchun jiddiy muammo). Morfologiyani
    hal qilmaydi, lekin apostrof/registr muammosini hal qiladi va **A ga
    poydevor** bo'ladi. **A dan oldin B ni qiling.**

  **2-qadam — `tsvector` ustuni + GIN indeks:**
  ```sql
  ALTER TABLE "Article" ADD COLUMN tsv tsvector;
  UPDATE "Article" SET tsv =
    setweight(to_tsvector('simple', unaccent(coalesce(title,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(excerpt,''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(content,''))), 'C');
  CREATE INDEX article_tsv_idx ON "Article" USING GIN (tsv);
  ```
  `setweight` — sarlavha (A) > excerpt (B) > matn (C). Bu **reyting** beradi:
  sarlavhada topilgan yuqoriroq. `title` va `content` o'zgarganda `tsv` ni
  yangilovchi trigger yoki servis qatlamida yangilang (admin CRUD'da).

  **3-qadam — so'rov:**
  ```sql
  SELECT ..., ts_rank(tsv, query) AS rank
  FROM "Article", websearch_to_tsquery('simple', unaccent($1)) query
  WHERE published AND tsv @@ query
  ORDER BY rank DESC
  LIMIT 40;
  ```
  `websearch_to_tsquery` — foydalanuvchi `"aniq ibora"`, `so'z1 so'z2`
  (VA), `-istisno` yoza oladi. So'rovga ham 1-qadamdagi affiks
  normalizatsiyasini qo'llang (indeks va so'rov bir xil normallashtirilsin).

  **4-qadam — snippet:** `ts_headline('simple', content, query)` topilgan
  so'z atrofidagi matnni `<mark>` bilan qaytaradi — hozirgi qo'lda
  `snippet()` (`:177`) o'rniga.

- **Definition of Done:**
  - `o'qish` qidirilsa `o'qidim`, `o'quvchi` topiladi (morfologiya ishlaydi)
  - `oʻzgaruvchi` va `o'zgaruvchi` va `ozgaruvchi` bir xil natija beradi
  - Natijalar relevantlik bo'yicha saralanadi (sarlavha > matn)
  - `EXPLAIN` GIN indeks ishlatilganini ko'rsatadi (Seq Scan emas)
  - Snippet topilgan so'zni belgilaydi
  - **Test:** stemmer birlik testlari (10+ so'z-qo'shimcha juftligi);
    integratsiya testi (Testcontainers) — ma'lum maqola ma'lum so'z bilan
    topiladi
  - ⚠️ **Halol chegara hujjatlashtirilsin:** qoidaviy stemmer to'liq emas,
    ba'zi kam uchraydigan so'zlarni noto'g'ri kesishi mumkin. Bu — `contains`
    dan **yaxshiroq**, lekin lingvistik stemmer emas

- ⚠️ **Nega bu №1:** RAG (18-vazifa) semantik qidiruv — "shu haqda nima
  deyilgan". Bu vazifa **leksik** qidiruv — "`useState` so'zi qayerda". O'quv
  platformasida ikkalasi ham kerak va ular bir-birini almashtirmaydi.
  Talaba aniq atamani qidiradi, tushunchani emas.

---

### 43. RAG'ni miqyosda ishlaydigan qilish (18-vazifaning old sharti)

- **Maqsad:** Asosiy spec 18-vaznifa (RAG) `pgvector` ni **ixtiyoriy** deb
  ko'rsatadi ("bo'lmasa Node cosine"). 364k qator uchun bu **noto'g'ri** —
  `pgvector` majburiy old shart.

- **Hozirgi holat (o'lchangan):** `schema.prisma:416-424` —
  `ArticleChunk.embedding` **`String`** (JSON `number[]`). Izoh:
  *"pgvector mavjud emas — cosine Node'da"*.

- **Nega Node cosine miqyosda ishlamaydi:**
  - Har savol uchun **barcha** `ArticleChunk` yozuvlarini DB'dan o'qish
    kerak (embedding'lar string'da, indekslanmaydi)
  - 364k qator ~500 so'zli bo'laklarga bo'linsa — **minglab bo'lak**
  - Har savolda minglab 768-o'lchamli vektorni DB'dan tortib, JSON parse
    qilib, Node'da cosine hisoblash — **har savol uchun sekin va qimmat**
  - Bu foydalanuvchi kutadigan darajada sekin (bir necha soniya) va
    server xotirasini yeydi

- **Fayllar:** `packages/database/prisma/migrations/` (`CREATE EXTENSION
  vector` + `ArticleChunk.embedding` ni `vector(768)` ga o'zgartirish),
  `schema.prisma` (`Unsupported("vector(768)")`),
  `apps/api/src/llm/embed.service.ts`, `apps/api/src/tutor/*`.

- **Ish:**
  - **Avval tekshiring:** deploy muhitida (Render/…) `CREATE EXTENSION
    vector;` mumkinmi? Render'ning boshqariladigan Postgres'ida `pgvector`
    **bor** (2023-dan). Neon, Supabase'da ham. Tekshiring va hujjatlang
  - `ArticleChunk.embedding` → `vector(768)` (Prisma
    `Unsupported("vector(768)")`, migratsiya raw SQL)
  - **IVFFlat yoki HNSW indeks:**
    ```sql
    CREATE INDEX ON "ArticleChunk" USING hnsw (embedding vector_cosine_ops);
    ```
  - Qidiruv: `ORDER BY embedding <=> $1::vector LIMIT 5` — indeks ishlaydi,
    barcha qatorlarni o'qimaydi
  - ⚠️ **Agar `pgvector` deploy muhitida imkonsiz bo'lsa** — RAG ni
    **kechiktiring**, "ishlaydi" deb ko'rsatmang. Sekin RAG — yomon RAG.
    Node cosine faqat **kichik** kontent uchun (bir necha yuz bo'lak) maqbul

- **Definition of Done:**
  - `pgvector` o'rnatilgan, `embedding` `vector(768)`, HNSW indeks bor
  - RAG so'rovi `EXPLAIN` da indeks ishlatadi (barcha qatorlar emas)
  - "X mavzu qaysi darsda?" savoli **1 soniyadan tez** javob beradi + manba
  - **Test:** ma'lum savol ma'lum bo'lakni qaytaradi (Testcontainers +
    pgvector image)

---

## FAZA J — AI xarajat va ishonchlilik

### 42. Per-user AI byudjeti va suiiste'mol himoyasi 🔥

- **Maqsad:** AI vazifalari (17 tutor, 18 RAG, 19 roleplay, 20 Whisper, 21
  grammatika) har chaqiruvda **real pul**. Hozir suiiste'moldan himoya
  deyarli yo'q — birinchi haqiqiy foydalanuvchi (yoki bot) hisobingizni
  bo'shatishi mumkin.

- **Hozirgi holat (o'lchangan):** `app.module.ts:30` — `ThrottlerModule`
  global `100/min`. Bu **so'rov tezligi**, **token/pul emas**. `@Throttle`
  faqat auth endpointlarida (`auth.controller.ts:63,72`). AI endpointlarida
  per-user **kunlik** yoki **token** chegarasi **yo'q**.

  ⚠️ Nega rate limit yetarli emas: `100/min` — bu daqiqasiga 100 ta RAG
  so'rovi, har biri uzun kontekst bilan. Bu daqiqasiga o'nlab dollar
  bo'lishi mumkin. Va u **per-user emas, global** — bitta foydalanuvchi
  butun limitni yeydi.

- **Fayllar:** schema `AiUsage` (yangi: `userId`, `date`, `tokensIn`,
  `tokensOut`, `costCents`, `callCount` — kun bo'yicha),
  `apps/api/src/llm/llm.service.ts` (asosiy spec FAZA D'da markazlashtirilgan
  `ask()` — **byudjet tekshiruvi shu yerda**), yangi
  `apps/api/src/llm/ai-budget.guard.ts` yoki servis metodi.

- **Ish:**
  - Har AI chaqiruvdan **oldin** `AiUsage` ni tekshiring: bugungi
    `costCents` yoki `callCount` limitdan oshdimi?
  - Limitlar env'da: `AI_DAILY_CALLS_FREE`, `AI_DAILY_TOKENS_FREE` (masalan
    50 chaqiruv/kun bepul foydalanuvchi uchun). Rol/tarif bo'yicha farq
    qilishi mumkin
  - Chaqiruvdan **keyin** haqiqiy token sarfini (`usage` provider
    javobidan) `AiUsage` ga qo'shing. Taxminiy narxni hisoblang
  - Limit oshsa: yumshoq xato ("Bugungi AI limitingiz tugadi, ertaga qayta
    urinib ko'ring") — 500 emas, aniq 429
  - ⚠️ **Markazlashtirilgan `ask()` — bu ishning yagona to'g'ri joyi.** Agar
    byudjet har modulda alohida tekshirilsa, kimdir unutadi. Asosiy spec
    FAZA D allaqachon `ask()` ni markazlashtirishni talab qiladi — byudjet
    **o'sha markazga** kirsin. Aks holda 5 ta AI vazifasi 5 ta teshik

- **Definition of Done:**
  - Bir foydalanuvchi kunlik limitdan oshsa, keyingi AI so'rovi 429 bilan
    yumshoq rad etiladi
  - `AiUsage` da har foydalanuvchining kunlik sarfi ko'rinadi
  - Admin analitikasida (31-vazifa) umumiy AI xarajat ko'rinadi
  - **Test:** limit oshgan foydalanuvchi rad etiladi; sarf to'g'ri yig'iladi
  - ⚠️ **Bu 17-vazifadan OLDIN yoki u bilan BIRGA** qilinishi kerak — AI
    endpoint byudjetsiz productionga chiqmasin

---

## FAZA K — Sifat va halollik

### 44. Testni har vazifaning DoD'iga majburiy kiritish

- **Maqsad:** Asosiy spec test infratuzilmasini 33-vazifada quradi, keyin
  "har keyingi vazifada test qo'shilsin" deydi. Bu amalda ishlamaydi —
  bosim ostida test birinchi tashlab ketiladigan narsa.

- **Ish (bu — jarayon o'zgarishi, kod emas):**
  - Quyidagi vazifalarning DoD'iga **majburiy test** qo'shing (ular murakkab
    logika, testsiz refactoring xavfli):
    - **7 (SM-2 review):** SM-2 hisob — ma'lum sifat → ma'lum `nextReview`.
      Property test: `nextReview > now` har doim
    - **9 (cloze tekshirish):** javob solishtirish mantiqi
    - **41 (qidiruv):** stemmer + integratsiya (yuqorida)
    - **42 (AI byudjet):** limit mantiqi
    - **43 (RAG):** ma'lum savol → ma'lum bo'lak
  - **Qoida:** yangi logikali PR test'siz merge qilinmaydi. CI (37-vazifa)
    buni majburlaydi — test soni kamaysa yoki coverage tushsa, qizil

- **Definition of Done:**
  - Yuqoridagi 5 vazifaning har birida ishlaydigan test bor
  - CI test'siz logikani rad etadi
  - ⚠️ **"80% coverage" maqsad qilinmasin** — ma'nosiz. Aniq maqsad: **SM-2,
    qidiruv, AI byudjet, RAG — 100%**; qolgani o'sib boradi

---

### 45. 20-vazifa (nutq baholash) va'dasini to'g'rilash

- **Maqsad:** Asosiy spec 20-vazifa "audio → **talaffuz**/ravonlik tahlili"
  va'da qiladi va "pauza, tezlikdan **talaffuz** bahosini boyit" deydi. Bu
  texnik jihatdan **noto'g'ri** va uni tuzatish kerak.

- **Nega noto'g'ri:** Whisper (yoki har qanday ASR) **matnni** beradi —
  tovushni emas. Transcript'dan **talaffuzni baholab bo'lmaydi**: "spik" va
  "speak" ni Whisper ikkalasini ham `speak` deb yozishi mumkin, ya'ni
  noto'g'ri talaffuz transcript'da ko'rinmaydi. Haqiqiy talaffuz bahosi
  **audio signal tahlilini** (fonema darajasida, forced alignment) talab
  qiladi — bu Whisper API bermaydigan alohida, murakkab soha.

- **Ish (DoD to'g'rilash — kod emas, kutish darajasi):**
  - 20-vazifa **ravonlik (fluency)** ni baholaydi, **talaffuz (pronunciation)
    ni EMAS**. Bu halol va baribir qimmatli:
    - **Ravonlik:** pauza chastotasi, gapirish tezligi (so'z/daqiqa),
      to'ldiruvchilar ("um", "uh") — bularni transcript + audio davomiyligidan
      **haqiqatan** hisoblab bo'ladi
    - **Grammatika va lug'at:** transcript'dan (mavjud IELTS logikasi)
    - **Talaffuz:** ⚠️ **va'da qilinmaydi.** Agar kerak bo'lsa — bu alohida
      loyiha (Azure Pronunciation Assessment API kabi tashqi xizmat, yoki
      forced-alignment kutubxonasi). Ochiq savol qilib qoldiring
  - DoD'dan "talaffuz" so'zini olib tashlang, "ravonlik + grammatika + lug'at"
    qo'ying

- **Definition of Done:**
  - Ovoz yozilib yuborilsa: transcript + **ravonlik** bandi (pauza, tezlik) +
    grammatika/lug'at bandi
  - Natija `IeltsAttempt` ga saqlanadi
  - ⚠️ UI "talaffuz bahosi" **demaydi** — "ravonlik va til bahosi" deydi.
    Foydalanuvchini aldamaslik

- ⚠️ **Nega bu muhim:** portfolio loyihasi o'z va'dasidan ko'proq ko'rsatsa,
  ish beruvchi buni **darhol** payqaydi ("talaffuzni transcript'dan
  baholabsanmi?"). Kam va'da qilib, rost bajarish — ko'proq ishonch beradi.

---

## Yakuniy eslatma

Bu beshta vazifa asosiy spec'ni **almashtirmaydi** — to'ldiradi. Tartib:

| Ustuvorlik | Vazifa | Nega |
|---|---|---|
| **1** | 42 (AI byudjet) | 17–21 dan **oldin** — AI byudjetsiz productionga chiqmasin |
| **2** | 41 (qidiruv) | Platformaning asosiy qiymati ustidagi teshik |
| **3** | 43 (RAG miqyos) | 18-vazifaning old sharti — usiz RAG "ishlaydi" deb ko'rsatilmasin |
| **4** | 44 (test DoD) | Jarayon o'zgarishi — darhol qo'llanadi |
| **5** | 45 (nutq va'da) | Hujjat to'g'rilash — 20-vazifadan oldin |

⚠️ **44 va 45 — kod emas, qaror.** Ular hoziroq qo'llanadi: 44 keyingi har
vazifaga ta'sir qiladi, 45 esa 20-vazifa boshlanmasdan oldin kutishni
to'g'rilaydi.
