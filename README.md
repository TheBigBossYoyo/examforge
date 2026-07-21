# ExamForge

A local-first, single-user revision platform for two exams at once:

- **TMUA** — Test of Mathematics for University Admission · target **9.0** · 13 Oct 2026
- **Digital SAT** — target **1600** · 22 Aug 2026

Everything runs on your machine. Your question bank, attempts, mistakes and
progress live in a local SQLite file (`data/examforge.db`) — no account, no cloud,
no telemetry.

---

## Quick start

```bash
npm install
npm run seed     # creates data/examforge.db + topics, resources, sample questions
npm run dev      # http://localhost:3000
```

That's it. `npm run seed` is idempotent — safe to re-run.

> **Requirements:** Node **≥ 22.5** (the app uses the built-in `node:sqlite`
> module, so there is **no native build step** and nothing to compile).

### Optional environment variables

Copy `.env.example` to `.env.local` and fill in what you want:

| Variable | Purpose | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_DESMOS_API_KEY` | Official Desmos Graphing Calculator (free key from <https://www.desmos.com/api/>) | Falls back to a shared demo key / a link to desmos.com |
| `AI_PROVIDER` + `GEMINI_API_KEY` | Live AI tutor via Google **Gemini** — a **free** key (no billing/card) from <https://aistudio.google.com/app/apikey> | Tutor runs as a fully-offline local stub |

> **Free AI tutor in 30s:** set `AI_PROVIDER=gemini` and paste a free Gemini key
> from Google AI Studio into `GEMINI_API_KEY`. No credit card, no subscription.
> Prefer OpenAI instead? Set `AI_PROVIDER=openai` with an `OPENAI_API_KEY`
> (paid, and separate from any ChatGPT subscription). Keys are read server-side only.

---

## What's inside

| Area | What it does |
| --- | --- |
| **Full sections** | Sit a complete exam section at real length and timing. For the SAT this is genuinely adaptive: module 1 is scored, and module 2's difficulty is chosen from that result exactly as the real test does. Includes Mark for Review, the answer eliminator, highlights & notes, the on-screen reference sheet, a hideable timer with a 5-minute warning, the review screen, and Desmos in Math. |
| **Desmos drills** | Timed speed drills with a par time per skill, scored on speed as well as correctness — including one drill on when *not* to reach for the calculator. |
| **Insights** | Ranked next-best-action by recency-weighted error density, root-cause triage of every mistake, and pacing analysis that separates "the clock is the problem" from "the content is the problem". |
| **Dashboard** | Per-exam countdown, projected score ring (estimate), strengths/weaknesses, recent mistakes, and the single highest-leverage "next task". |
| **Practice engine** | Paper-mode & drill-mode runner with a live timer, pace tracker, question navigator, per-question confidence, auto-marking for bank questions, hints (learning mode) and full review. |
| **Review** | Per-question breakdown: your answer vs correct, time vs pace, solution + faster method, confidence calibration, and one-click **redo-wrong**. |
| **Mistake notebook** | Auto-logged from wrong answers, filterable by exam / status / error type, editable notes, mark-resolved, **redo all unresolved**, printable. |
| **Analytics** | Accuracy by topic & difficulty, time-vs-pace, improvement over time, confidence calibration, error-type breakdown, score prediction & a readiness % (formula documented in `lib/analytics.ts`). |
| **Theory** | Concise, exam-mapped notes for every TMUA & SAT subtopic with worked examples, mini-exercises, common traps and strategy. |
| **Desmos Mastery** | An 11-lesson curriculum with interactive embedded calculators teaching fast SAT-Math Desmos workflows — and *when not* to reach for it. |
| **Planner + spaced repetition** | Generates a day-by-day study plan toward each exam date, plus an SM-2 review queue. |
| **Resource library** | Curated links to official specs, past papers and tools — every entry carries its exact licence note. |
| **Admin / Settings / Tutor** | Import your own questions (JSON/CSV), export all your data, edit dates / targets / pace / scoring tables, and chat with the (optional) AI tutor. |

---

## Copyright (read this)

ExamForge **never scrapes, bulk-downloads, stores or reproduces** copyrighted
TMUA / SAT / MAT / STEP / AEA / UKMT questions.

- Official past papers are **linked** (to the publisher's PDF/page), never copied.
  For TMUA papers you sit the official PDF and enter your raw mark — ExamForge
  bands it into an estimate without storing any question.
- The question bank is filled **only** from: your own imports, AI-generated
  originals, or the small set of shipped original sample questions
  (`origin = 'user_import' | 'ai_generated'`).
- Every seeded resource link is stored verbatim with its source URL and an
  exact licence note.

## Scores are estimates

Every score (TMUA band, SAT section/total, projections, readiness) is a
**norm-referenced estimate** — real conversions vary per sitting. All scoring
tables are editable in **Settings** and persisted to the database.

The Desmos calculator is available on **all SAT Math** questions and is **never**
shown in TMUA mode (TMUA is non-calculator).

---

## Project layout

```
app/            Next.js App Router pages + API routes (route handlers)
  api/          attempt, selfscore, mistake, plan, srs, import, export, settings, tutor, onboarding
components/     Shared UI, the practice runner, Desmos embed, KaTeX Markdown
lib/            Data layer (db, schema, types, queries), scoring, importer,
                attempt lifecycle, runner config, analytics, planner, SM-2, seed/
scripts/seed.ts Idempotent seeder
samples/        questions.sample.json / .csv — the import format
data/           SQLite database (git-ignored, created by `npm run seed`)
```

- **Data:** Node's built-in `node:sqlite` (`DatabaseSync`) — zero native deps.
- **Math:** KaTeX via a small server-safe `Markdown` component (`$...$`, `$$...$$`).
- **Charts:** Recharts. **Calculator:** official Desmos API v1.10.

---

## Filling the practice bank

Three ways to get topic practice questions into the bank:

1. **Shipped AI-original starter bank (~440 questions, 10 per topic).** After
   seeding, load it with one command (no API key needed):

   ```
   npm run seed         # topics must exist first
   npm run load:bank    # imports samples/bank/*.json as origin=ai_generated
   ```

   Re-run with `npm run load:bank -- --force` to reload (only removes previously
   loaded, *un-attempted* bank questions; your attempted ones are kept).

2. **Generate more with AI, per topic.** Uses the same free **Gemini** key as the
   tutor (`AI_PROVIDER=gemini`, `GEMINI_API_KEY` in `.env.local`). Produces fresh
   **original** questions — it never reproduces copyrighted exam questions:

   ```
   npm run generate                         # 10/topic for every topic
   npm run generate -- --exam SAT --per-topic 5
   npm run generate -- --topic "quadratics" # only matching subtopics
   npm run generate -- --dry-run            # preview, do not insert
   ```

   Flags: `--exam TMUA|SAT|all`, `--per-topic N`, `--topic <substring>`,
   `--model <name>`, `--dry-run`. Desmos is auto-enabled for SAT Math only and
   never for TMUA.

3. **Import your own.** Real official questions can only enter the bank via your
   own import (the app never scrapes/stores them for you) — see below.

---

## Importing your own questions

See `samples/questions.sample.json` and `samples/questions.sample.csv` for the
exact format, or paste/upload them on the **Admin** page. Rows map to a topic by
`(exam, area, subtopic)`; unmatched rows are reported, not silently dropped.

```
exam=TMUA|SAT  area=P1|P2|Math|RW  subtopic=<taxonomy subtopic>
prompt_md, correct_answer (required) · choices (pipe-separated in CSV) optional
solution_md, hint1..3_md, difficulty, desmos_recommended, desmos_state_json, faster_method_md
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Create & populate the local database (idempotent) |
| `npm run load:bank` | Import the shipped AI-original starter bank (`samples/bank/*.json`) |
| `npm run generate` | Generate AI-original questions per topic (needs an AI key) |
| `npm run db:status` | Migrations applied, row counts, and integrity checks |
| `npm test` | Run the unit tests (`npm run test:watch` to watch) |
| `npm run lint` | Lint |

### Schema changes

`lib/schema.ts` bootstraps a **fresh** database only — `CREATE TABLE IF NOT
EXISTS` can never alter a table that already exists. Every change after that
goes in `lib/migrations.ts` as a new numbered migration, applied once and
recorded in `schema_migrations`. Never edit a migration that has already
shipped; add another one. `npm run db:status` shows what a database has.

### Exam structure

Module counts, per-module timing, calculator rules and answer shape live in
`lib/exam-format.ts` as data, not as `if (exam === "TMUA")` branches. Adding a
third exam track means adding a format entry, not hunting for conditionals.
`lib/routing.ts` holds the adaptive decision and question selection (pure),
and `lib/test-session.ts` is the database lifecycle around them.

Questions sent to the browser during a module are stripped of
`correct_answer`, solutions and hints — marking happens server-side, so the
answer key never reaches devtools.

### Generating questions

`npm run generate` supports Gemini, OpenAI and **OpenRouter** (one key, many
models, with a free tier). Set in `.env.local`:

```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
```

Benchmarked on the actual task, not on reputation. Of the free models:
Nemotron 3 Ultra 550B passed 5/5, gpt-oss-20b 4/5, Gemma 4 31B was rate-limited
upstream, Nemotron Super truncated. DeepSeek R1 is no longer offered free.

Two things worth knowing:

- **Reasoning models bill their scratchpad against the same token budget as the
  answer.** Nemotron Ultra at default effort spent 14k tokens thinking and
  returned an *empty* answer. Generation therefore requests low reasoning
  effort, and an empty answer after N characters of reasoning is reported as
  exactly that.
- **Free-tier OpenRouter models are capped per day** (roughly 50 requests
  without purchased credits). A full-bank run needs several days, or credits.

Flags: `--exam`, `--per-topic`, `--topic`, `--model`, `--delay`, `--retries`,
`--dry-run`. Rejections are reported by reason; see `lib/question-quality.ts`.

### Theming

Both themes are defined once in `app/globals.css` as semantic CSS variables
(`--surface`, `--content`, `--line`) that flip on `[data-theme]`. Components use
the Tailwind tokens `surface` / `content` / `line`, not raw shades, so they work
in both themes without a `dark:` variant. The theme is applied before first
paint by an inline script to avoid a flash.

### Tests

Scoring and marking are unit-tested (`lib/*.test.ts`) because a scoring bug is
worse than a missing feature. `lib/scoring.ts` is deliberately pure — the
database-backed table overrides live in `lib/scoring-config.ts` — so the maths
can be tested without a database.

Built for one student, two boulders. Roll them daily.
