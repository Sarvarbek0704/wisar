# Wisar — o'quv / kontent platformasi

Mavzu-agnostik full-stack platforma: **Next.js + NestJS + PostgreSQL**.
Dasturlash kitobi (va istalgan boshqa mavzu) uchun professional, minimalist,
to'liq responsive (desktop + mobil) o'qish tajribasi. Emoji o'rniga premium
Lucide ikonkalar. Dizayn "Dasturlash-Kitobi-TOLIQ.html" uslubiga sodiq.

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, lucide-react |
| Backend | NestJS 10 (REST API) |
| Ma'lumotlar bazasi | PostgreSQL + Prisma |
| Monorepo | npm workspaces + Turborepo |

## Tuzilish

```text
wisar-platform/
  apps/
    web/        Next.js frontend (dizayn, sahifalar, qidiruv, dark mode)
    api/        NestJS backend (kontent REST API)
  packages/
    database/   Prisma sxema + seed (kitobni DB'ga import qiladi)
    content/    Markdown -> HTML renderer + emoji -> premium ikonka
  docker-compose.yml   PostgreSQL (+ Adminer)
```

## Ma'lumot modeli (mavzu-agnostik)

```text
Topic (mavzu)  ->  Section (qism/bo'lim)  ->  Article (bob, markdown)
```

Bu model dasturlash kitobi uchun ham, kelajakda **istalgan boshqa mavzu**
(dasturlashga aloqasiz ham) uchun ishlaydi. Yangi mavzu = yangi `Topic`.

## Ishga tushirish (birinchi marta)

Talab: Node 20+, Docker (PostgreSQL uchun).

```bash
cd wisar-platform
cp .env.example .env          # sozlamalar (kerak bo'lsa o'zgartiring)
npm install                   # barcha paketlar
npm run db:up                 # PostgreSQL'ni Docker'da ko'tarish
npm run db:generate           # Prisma client
npm run db:migrate            # jadvallarni yaratish
npm run db:seed               # kitob + hamroh materiallarni import qilish
npm run dev                   # web (3000) + api (4000) birga
```

Yoki bitta buyruq bilan (db:up dan keyin):

```bash
npm run setup && npm run dev
```

So'ng oching: **http://localhost:3000**

## Foydali buyruqlar

```bash
npm run dev          # web + api (Turborepo)
npm run build        # ishlab chiqarish uchun build
npm run db:seed      # kontentni qayta import qilish
npm run db:reset     # bazani tozalab, qayta seed
npm run db:down      # PostgreSQL'ni to'xtatish
```

Adminer (bazani brauzerda ko'rish): http://localhost:8080
(Server: `db`, foydalanuvchi: `wisar`, parol: `wisar`, baza: `wisar`).

## Kontent manbasi

Seed `CONTENT_DIR` (.env) papkasidan markdown'ni o'qiydi. Standart:
`../Dasturlash_Kitobi` (wisar-platform yonidagi kitob papkasi).

## Kelajakda kengaytirish

- **Yangi mavzu qo'shish:** `Topic` yarating (admin yoki seed orqali), unga
  `Section` va `Article` qo'shing. Frontend avtomatik ko'rsatadi.
- **Admin panel:** `apps/api` ga himoyalangan CRUD endpointlar + `apps/web`
  ga admin sahifalar qo'shish mumkin (auth — NestJS guard).
- **Boshqa mavzu (dasturlashga aloqasiz):** model umumiy — shunchaki yangi
  `Topic` yarating, kontent markdown bo'lsa kifoya.

## Dizayn tamoyillari

- Professional, minimalist; serif matn (Georgia), tiniq kartalar, yumshoq soya.
- To'liq responsive: desktop yon panel, mobil drawer.
- Yorug'/qorong'i rejim (saqlanadi).
- **Hech qanday emoji yo'q** — barchasi premium Lucide ikonka.
