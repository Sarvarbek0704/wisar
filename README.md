<div align="center">

# Wisar

**A learning platform built around a book — with the pedagogy that a book cannot do on its own.**

Spaced repetition, active recall, an AI tutor that knows the whole course, in-browser code execution, and full-text search over hundreds of thousands of lines of original Uzbek-language content. Topic-agnostic: the same engine serves a programming book today and any subject tomorrow.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[What makes it different](#what-makes-it-different) · [Learning engine](#the-learning-engine) · [Architecture](#architecture) · [Roadmap](#roadmap) · [Getting started](#getting-started)

</div>

> **Status.** Actively built. The plan is written down: [`docs/IDEALLASHTIRISH-SPEC.md`](./docs/IDEALLASHTIRISH-SPEC.md) is a 36-task specification across eight phases, and [`docs/IDEALLASHTIRISH-SPEC-QOSHIMCHA.md`](./docs/IDEALLASHTIRISH-SPEC-QOSHIMCHA.md) adds five more where the first left gaps. Both are in Uzbek, because that is the language of the work and of the content.

---

## What makes it different

Most portfolio projects can be rebuilt by a competitor in a weekend, because the value is the code. This one cannot, because the value is the **content**: hundreds of thousands of lines of original Uzbek-language programming material, structured for teaching. The code is the delivery mechanism; the moat is what it delivers.

That changes what the engineering has to do. It is not enough to display the text — the platform has to help someone *learn* it, in a language most learning tools ignore:

- **Search that understands Uzbek.** Uzbek is agglutinative: searching for `oʻqish` should find `oʻqidim`, `oʻquvchi`, `oʻqiyapman`. PostgreSQL ships no Uzbek text-search configuration and no stemmer does this out of the box — so the platform builds one, over a `tsvector` + GIN index rather than a `LIKE '%…%'` scan. ([spec §41](./docs/IDEALLASHTIRISH-SPEC-QOSHIMCHA.md))
- **An AI tutor that knows the whole course, not just the open page** — retrieval over embedded chunks, answering "which lesson covers X?" with a citation. ([task 18](./docs/IDEALLASHTIRISH-SPEC.md))
- **Real code, run in the browser** — JavaScript and Python (via Pyodide/WebAssembly), so a reader tries the example instead of reading it. ([task 25](./docs/IDEALLASHTIRISH-SPEC.md))

---

## The learning engine

A book is linear and forgets nothing about you. A learning platform is the opposite — it should adapt, and it should remember what you got wrong.

- **One review queue, SM-2 scheduled.** Flashcards *and* questions you missed on a quiz flow into a single spaced-repetition queue. Grade a card and its next review moves according to SM-2; the harder it was, the sooner it returns.
- **Active recall at the end of every article** — a few questions right after reading, and anything missed drops into the review queue above.
- **Adaptive recommendation** — the dashboard reads your quiz and review results and points at the next unread lesson and your weakest topic, rather than leaving you at the table of contents.
- **A streak that survives a bad day** — a limited freeze so one missed day does not erase a month of momentum.

The AI layer sits on top: a multi-turn tutor with streaming answers, roleplay for language practice, grammar checking anywhere you type English, and text-to-speech so an article can be listened to. Every AI feature degrades gracefully when no key is configured, and — [by spec §42](./docs/IDEALLASHTIRISH-SPEC-QOSHIMCHA.md) — runs under a per-user daily budget, because a tutor that anyone can call a thousand times is a bill, not a feature.

---

## Architecture

```
wisar/
├── apps/
│   ├── web/          Next.js 15 (App Router) · React 19 · Tailwind · lucide-react
│   └── api/          NestJS 10 · REST
├── packages/
│   ├── database/     Prisma schema (35 models) · seed (imports the book into Postgres)
│   └── content/      Markdown → HTML renderer · emoji → premium icons
├── docs/             the specification — 41 tasks across two documents
├── docker-compose.yml       PostgreSQL + Adminer
└── turbo.json               Turborepo pipeline
```

**Topic-agnostic data model.** Everything hangs off three levels:

```
Topic  →  Section  →  Article (markdown)
```

A programming book is one `Topic`. A language course is another. The engine does not know or care which — a new subject is a new `Topic`, and the frontend renders it with no code change. That generality is deliberate: the platform outlives any single book.

**Monorepo** via npm workspaces + Turborepo, so the web app, the API, the database package and the content renderer share types and version together.

---

## Roadmap

The work is specified, not improvised. Eight phases, ordered so the foundation comes before the features that stand on it:

| Phase | Focus |
|---|---|
| **A** | Infrastructure — tests, CI, caching, httpOnly refresh tokens |
| **B** | UX quick wins — graceful degradation, empty states, reading position, daily goal |
| **C** | Learning core — unified SM-2 review, active recall, cloze, adaptive recommendation |
| **D** | AI depth — streaming multi-turn tutor, RAG, roleplay, speaking assessment, grammar |
| **E** | Content & UX — article audio, PWA offline, highlights, Python runner, cross-references |
| **F** | Social — study groups, threaded comments, Q&A forum |
| **G** | Analytics — learner insights, admin metrics, weak-spot report |
| **H** | Site quality — streak freeze, pagination, i18n, SEO, admin audit + 2FA |

Plus five additions where the plan had gaps — Uzbek full-text search, a per-user AI budget, making RAG actually scale, weaving tests into every task's definition of done, and correcting one feature that promised more than transcripts can deliver. See [`docs/IDEALLASHTIRISH-SPEC-QOSHIMCHA.md`](./docs/IDEALLASHTIRISH-SPEC-QOSHIMCHA.md).

Every task in both documents carries an explicit **Definition of Done** — the plan is checkable, not aspirational.

---

## Getting started

**Requirements:** Node 20+ · Docker (for PostgreSQL)

```bash
git clone https://github.com/Sarvarbek0704/wisar.git
cd wisar
cp .env.example .env          # DATABASE_URL, LLM keys, SMTP, OAuth — as needed
npm install
npm run db:up                 # PostgreSQL in Docker
npm run db:generate           # Prisma client
npm run db:migrate            # create tables
npm run db:seed               # import the book into the database
npm run dev                   # web (3000) + api (4000) together
```

Then open **http://localhost:3000**. Adminer, to browse the database, is at **http://localhost:8080** (server `db`, user/password/db all `wisar`).

The seed reads markdown from `CONTENT_DIR` in `.env` — by default the book folder alongside this repo. AI features are optional: without keys, they fall back quietly rather than failing.

---

## Design

Professional and minimal: serif body text, clean cards, soft shadows, full light/dark support that persists. Fully responsive — a sidebar on desktop, a drawer on mobile. **No emoji anywhere** — every icon is from Lucide. The reading experience is meant to feel like a well-made book, not a dashboard.

---

## License

Proprietary. The platform is built by [Sarvarbek Sodiqov](https://github.com/Sarvarbek0704); the content is his own work. Published for review, not for reuse.
