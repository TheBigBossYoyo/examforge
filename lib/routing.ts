/**
 * Adaptive module routing and question selection.
 *
 * The digital SAT serves a second module whose difficulty depends on how the
 * first went. `satSectionScore()` in lib/scoring.ts has always contained the
 * routing *arithmetic*, but nothing ever called it: every attempt was scored
 * through `satSectionFromAccuracy()`, which invents a module split from one
 * flat accuracy. This module supplies the missing half — deciding the route
 * and actually assembling each module's questions.
 *
 * Pure by construction: pools arrive as arrays, randomness arrives as a
 * function. No database, no I/O, fully unit-testable.
 */
import { DIFFICULTY_RANK } from "./exam-format";

export type RouteDifficulty = "easy" | "hard";

export interface ModuleResult {
  correct: number;
  total: number;
}

/** The minimum a question must expose to be routed. */
export interface PoolQuestion {
  id: number;
  difficulty: string | null;
  topic_id: number | null;
}

export interface SelectionResult<T> {
  selected: T[];
  /** Requested minus delivered. Non-zero means the bank is too thin. */
  shortfall: number;
  /** True when questions outside the target band had to be used. */
  usedFallback: boolean;
}

/* ------------------------------------------------------------------ *
 * Routing decision
 * ------------------------------------------------------------------ */

/**
 * Decide which module 2 to serve.
 *
 * The threshold is a *fraction of module 1 answered correctly*, and is
 * inclusive: scoring exactly at the threshold routes to the harder module,
 * matching satSectionScore()'s `>=` comparison. A module with no questions
 * cannot demonstrate anything, so it routes easy.
 */
export function routeModule2(m1: ModuleResult, threshold: number): RouteDifficulty {
  if (m1.total <= 0) return "easy";
  return m1.correct / m1.total >= threshold ? "hard" : "easy";
}

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

/** mulberry32 — small, fast, seedable. Used so selection is reproducible. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

function rankOf(q: PoolQuestion): number {
  return DIFFICULTY_RANK[q.difficulty ?? "med"] ?? 1;
}

export type DifficultyTarget = RouteDifficulty | "mixed";

/**
 * Order the pool into preference tiers for a target difficulty.
 *
 * "hard"  -> hard/1600level first, then medium, then easy.
 * "easy"  -> easy first, then medium, then hard.
 * "mixed" -> medium first, then easy and hard equally (module 1 shape).
 *
 * Returning tiers rather than one sorted list keeps "did we leave the target
 * band?" answerable, which is what `usedFallback` reports.
 */
export function tiersForTarget<T extends PoolQuestion>(pool: T[], target: DifficultyTarget): T[][] {
  const easy = pool.filter((q) => rankOf(q) <= 0);
  const med = pool.filter((q) => rankOf(q) === 1);
  const hard = pool.filter((q) => rankOf(q) >= 2);

  if (target === "hard") return [hard, med, easy];
  if (target === "easy") return [easy, med, hard];
  return [med, [...easy, ...hard]];
}

/**
 * Interleave by topic so a module spreads across subtopics instead of serving
 * a block of one. Questions are consumed round-robin from each topic bucket.
 */
function spreadByTopic<T extends PoolQuestion>(items: T[], rng: () => number): T[] {
  const buckets = new Map<number | string, T[]>();
  for (const q of shuffled(items, rng)) {
    const key = q.topic_id ?? "untagged";
    const list = buckets.get(key);
    if (list) list.push(q);
    else buckets.set(key, [q]);
  }

  const order = shuffled([...buckets.keys()], rng);
  const out: T[] = [];
  let drained = false;
  while (!drained) {
    drained = true;
    for (const key of order) {
      const list = buckets.get(key);
      if (list && list.length > 0) {
        out.push(list.shift() as T);
        drained = false;
      }
    }
  }
  return out;
}

/**
 * Assemble one module's questions.
 *
 * Takes from the target difficulty band first, then falls back through the
 * remaining tiers rather than returning a short module — a 14-question "22
 * question" module would silently corrupt the score. When the bank genuinely
 * cannot fill the module, `shortfall` says by how much so the caller can warn
 * instead of pretending.
 */
export function selectQuestions<T extends PoolQuestion>(
  pool: T[],
  count: number,
  opts: { target: DifficultyTarget; rng?: () => number; exclude?: Set<number> } = {
    target: "mixed",
  },
): SelectionResult<T> {
  const rng = opts.rng ?? Math.random;
  const exclude = opts.exclude ?? new Set<number>();
  const available = pool.filter((q) => !exclude.has(q.id));

  const wanted = Math.max(0, Math.floor(count));
  if (wanted === 0) return { selected: [], shortfall: 0, usedFallback: false };

  const tiers = tiersForTarget(available, opts.target);
  const selected: T[] = [];
  let usedFallback = false;

  for (let i = 0; i < tiers.length && selected.length < wanted; i++) {
    const tier = spreadByTopic(tiers[i], rng);
    const need = wanted - selected.length;
    const take = tier.slice(0, need);
    if (take.length > 0 && i > 0) usedFallback = true;
    selected.push(...take);
  }

  return {
    selected,
    shortfall: wanted - selected.length,
    usedFallback,
  };
}

/**
 * Build both modules of an adaptive section up front is NOT possible — module
 * 2 depends on module 1's result. This assembles module 1 only; call
 * `selectQuestions` again with the routed target once module 1 is marked,
 * passing the module 1 ids as `exclude` so nothing repeats within a section.
 */
export function selectModule1<T extends PoolQuestion>(
  pool: T[],
  count: number,
  rng?: () => number,
): SelectionResult<T> {
  return selectQuestions(pool, count, { target: "mixed", rng });
}
