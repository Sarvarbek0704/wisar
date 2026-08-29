# Quiz ma'lumotlari

Har maqola oxirida chiqadigan testlar (`Quiz` + `Question`) manbasi.

**Holat:** 604 test / 3020 savol — rus (191), ingliz (210), dasturlash (203).

## Tuzilma

```
quiz-data/
  rus/          20 fayl  — Rus tili kursi (A1–C2)
  ingliz/       24 fayl  — Ingliz tili kursi (A1–C2)
  dasturlash/   25 fayl  — Dasturlash kitobi (0–16-qismlar)
```

## Format

```json
[
  {
    "topic": "rus-tili",
    "section": "01-a1-boshlangich",
    "article": "05-rod-otlar",
    "title": "Test — ...",
    "questions": [
      { "text": "...", "options": ["a", "b", "c", "d"], "correctIndex": 1, "explanation": "..." }
    ]
  }
]
```

`topic` / `section` / `article` — slug'lar. Importer ularni `Topic` → `Section` → `Article`
zanjiri bo'yicha topadi; id qattiq yozilmagan, shuning uchun har muhitda ishlaydi.

## Import qilish

```bash
# Bitta papka yoki bitta fayl → SQL
node prisma/quiz-import.mjs prisma/quiz-data/rus out.sql

# SQL'ni bazaga yuborish
psql "$DATABASE_URL" -f out.sql
```

Import **idempotent**: har maqola uchun avval mavjud `Quiz` o'chiriladi, keyin yangisi qo'yiladi.
Shuning uchun qayta ishga tushirish xavfsiz va dublikat hosil qilmaydi.

## Yangi test qo'shish

1. Dars faylining xulosa bo'limidan asosiy qoidalarni oling.
2. Shu papkaga JSON qo'shing (5 savol/dars tavsiya etiladi).
3. Slug'larni dars fayl nomlari bilan solishtiring (kichik harf, `.md` siz).
4. Importer'ni ishga tushiring — u noto'g'ri elementlarni (variant < 2,
   `correctIndex` chegaradan tashqarida) o'tkazib yuboradi va hisobot beradi.
