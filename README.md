# ExamForge

A local-first revision app I built to prepare for two admissions exams at once: the TMUA and the Digital SAT.

## Why I built it

Both exams need the same three things: a large bank of practice questions, realistic timed conditions, and a way to see which topics are actually costing me marks instead of just "doing more questions". I couldn't find one tool that did all three for both exams without an account, a subscription, or my data living on someone else's server, so I built one that runs entirely on my own machine. Everything (the question bank, attempts, mistakes, progress) lives in a local SQLite file (`data/examforge.db`). No account, no cloud sync, no telemetry.

## What it does

- **Full timed sections.** Sit a complete section at real length and timing. The SAT side is genuinely adaptive: module 1 is scored and module 2's difficulty is chosen from that result, the way the real test does it. Includes Mark for Review, an answer eliminator, highlights/notes, the on-screen reference sheet, and Desmos in Math.
- **Desmos drills.** Timed speed drills with a par time per skill, including one drill specifically about *not* reaching for the calculator when it's slower.
- **A dashboard and insights.** Per-exam countdown, a projected score estimate, and a ranked "next best action" based on recency-weighted error rates per topic, plus pacing analysis that tries to separate "I ran out of time" from "I don't know this".
- **A mistake notebook.** Every wrong answer is logged automatically, filterable and editable, with a one-click "redo all unresolved".
- **Theory notes** for every TMUA/SAT subtopic, and an 11-lesson Desmos curriculum on the calculator workflows that are actually fast on test day.
- **A day-by-day study planner** toward each exam date, plus a spaced-repetition (SM-2) review queue.
- **Import/export and an admin page** to bring in your own questions or generate more (see below).

## How it works

**Data layer.** Storage uses Node's built-in `node:sqlite` (`DatabaseSync`), not `better-sqlite3`, so there's no native module to compile: `npm install` is enough on Node ≥ 22.5. `lib/schema.ts` only bootstraps a fresh database (`CREATE TABLE IF NOT EXISTS` can't alter an existing table), so every change after that is a numbered migration in `lib/migrations.ts`, applied once and recorded in `schema_migrations`. I never edit a shipped migration, only add new ones, and `npm run db:status` shows what state a given database file is in.

**Exam structure as data.** Module counts, per-module timing, calculator rules and answer format live in `lib/exam-format.ts` as plain data rather than `if (exam === "TMUA")` branches scattered through the codebase. Adding a third exam track would mean adding one format entry, not hunting down conditionals. The adaptive routing decision and question selection are pure functions in `lib/routing.ts` (no I/O, fully unit-testable); `lib/test-session.ts` wraps them with the actual database lifecycle. Questions sent to the browser during a live module have `correct_answer`, solutions and hints stripped out server-side, so the answer key never reaches devtools.

**Filling the question bank.** There are three ways to get questions in: a shipped starter bank of about 440 AI-generated originals (`npm run load:bank`), on-demand generation per topic against Gemini, OpenAI, or OpenRouter (`npm run generate`), or importing your own questions from JSON/CSV. Generated and imported questions go through a quality gate (`lib/question-quality.ts`) that rejects anything with a missing/duplicate answer choice, an answer not among the choices, unbalanced LaTeX, or a solution that's just one hand-wavy sentence. An LLM will happily produce all of these, and a bad item is worse than no item because it corrupts the difficulty statistics the router depends on.

**Copyright.** The app never scrapes, stores or reproduces copyrighted TMUA/SAT/MAT/STEP/AEA/UKMT questions. Official past papers are linked to the publisher, never copied; for TMUA papers you sit the official PDF and enter your raw mark, which the app bands into an estimate without ever storing the questions themselves.

**Scoring.** Every score (TMUA band, SAT section/total, projected score, readiness %) is a norm-referenced estimate, not an official conversion — real conversions vary per sitting. The conversion tables are editable in Settings and persisted to the database. Scoring logic (`lib/scoring.ts`) is deliberately pure with no database access, specifically so a scoring bug shows up in a unit test rather than in a live attempt.

**Theming.** Both light and dark themes are defined once as CSS variables that flip on a `[data-theme]` attribute, so components use semantic Tailwind tokens instead of a `dark:` variant scattered everywhere.

## Running it locally

Requires Node ≥ 22.5 (for `node:sqlite`).

```bash
npm install
npm run seed     # creates data/examforge.db + topics, resources, sample questions
npm run dev      # http://localhost:3000
```

`npm run seed` is idempotent, so it's safe to re-run. To get a real question bank rather than just samples:

```bash
npm run load:bank    # imports the shipped ~440-question AI-original starter bank
```

Optional environment variables (copy `.env.example` to `.env.local`):

| Variable | Purpose | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_DESMOS_API_KEY` | Official Desmos Graphing Calculator key (free from desmos.com/api) | Falls back to a shared demo key / a link to desmos.com |
| `AI_PROVIDER` + `GEMINI_API_KEY` (or `OPENAI_API_KEY` / `OPENROUTER_API_KEY`) | Enables the AI tutor and `npm run generate` | Tutor runs as an offline local stub; generation is unavailable |

Keys are read server-side only and never reach the browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev server / production build / serve |
| `npm run seed` | Create and populate the local database (idempotent) |
| `npm run load:bank` | Import the shipped starter question bank |
| `npm run generate` | Generate AI-original questions per topic (needs an API key) |
| `npm run db:status` | Show migrations applied, row counts, integrity checks |
| `npm test` | Run unit tests (`npm run test:watch` to watch) |
| `npm run lint` | Lint |

## Limitations / what I'd do next

- It's built for one user on one machine. There's no multi-user support and it isn't meant to be deployed as a shared service.
- The generated question bank quality depends on which model you use; I benchmarked a few free OpenRouter models on the actual task rather than trusting their reputation, and free tiers are rate-limited (roughly 50 requests/day without credits), so filling the whole bank that way takes a few days.
- The score estimates are just that: estimates calibrated against published percentiles, not official conversion tables, so I still treat real past papers as the ground truth.
- I'd like to add more worked examples to the theory notes for the harder TMUA topics, and calibrate the readiness percentage against more real attempts.
