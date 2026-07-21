import { describe, expect, it } from "vitest";
import {
  routeModule2,
  seededRng,
  selectModule1,
  selectQuestions,
  tiersForTarget,
  type PoolQuestion,
} from "./routing";

/** Build a pool with a controlled difficulty/topic distribution. */
function makePool(spec: { difficulty: string; topic: number; n: number }[]): PoolQuestion[] {
  const out: PoolQuestion[] = [];
  let id = 1;
  for (const s of spec) {
    for (let i = 0; i < s.n; i++) {
      out.push({ id: id++, difficulty: s.difficulty, topic_id: s.topic });
    }
  }
  return out;
}

describe("routeModule2", () => {
  it("routes hard at or above the threshold", () => {
    expect(routeModule2({ correct: 16, total: 22 }, 0.7)).toBe("hard"); // 0.727
    expect(routeModule2({ correct: 22, total: 22 }, 0.7)).toBe("hard");
  });

  it("routes easy below the threshold", () => {
    expect(routeModule2({ correct: 15, total: 22 }, 0.7)).toBe("easy"); // 0.681
    expect(routeModule2({ correct: 0, total: 22 }, 0.7)).toBe("easy");
  });

  it("treats the threshold as inclusive, matching satSectionScore", () => {
    expect(routeModule2({ correct: 7, total: 10 }, 0.7)).toBe("hard"); // exactly 0.7
  });

  it("routes easy for an empty module rather than dividing by zero", () => {
    expect(routeModule2({ correct: 0, total: 0 }, 0.7)).toBe("easy");
  });
});

describe("tiersForTarget", () => {
  const pool = makePool([
    { difficulty: "easy", topic: 1, n: 2 },
    { difficulty: "med", topic: 1, n: 2 },
    { difficulty: "hard", topic: 1, n: 2 },
    { difficulty: "1600level", topic: 1, n: 1 },
  ]);

  it("puts hard and 1600level in the first tier when targeting hard", () => {
    const [first] = tiersForTarget(pool, "hard");
    expect(first).toHaveLength(3);
    expect(first.every((q) => q.difficulty === "hard" || q.difficulty === "1600level")).toBe(true);
  });

  it("puts easy in the first tier when targeting easy", () => {
    const [first] = tiersForTarget(pool, "easy");
    expect(first.every((q) => q.difficulty === "easy")).toBe(true);
  });

  it("leads with medium for a mixed module", () => {
    const [first] = tiersForTarget(pool, "mixed");
    expect(first.every((q) => q.difficulty === "med")).toBe(true);
  });

  it("treats a null difficulty as medium", () => {
    const [first] = tiersForTarget([{ id: 1, difficulty: null, topic_id: 1 }], "mixed");
    expect(first).toHaveLength(1);
  });
});

describe("selectQuestions", () => {
  const rng = () => seededRng(42)();

  it("fills the module entirely from the target band when it can", () => {
    const pool = makePool([
      { difficulty: "hard", topic: 1, n: 30 },
      { difficulty: "easy", topic: 2, n: 30 },
    ]);
    const res = selectQuestions(pool, 22, { target: "hard", rng: seededRng(1) });
    expect(res.selected).toHaveLength(22);
    expect(res.shortfall).toBe(0);
    expect(res.usedFallback).toBe(false);
    expect(res.selected.every((q) => q.difficulty === "hard")).toBe(true);
  });

  it("falls back to adjacent bands rather than returning a short module", () => {
    // Only 5 hard available but 22 needed — a short module would corrupt scoring.
    const pool = makePool([
      { difficulty: "hard", topic: 1, n: 5 },
      { difficulty: "med", topic: 2, n: 40 },
    ]);
    const res = selectQuestions(pool, 22, { target: "hard", rng: seededRng(2) });
    expect(res.selected).toHaveLength(22);
    expect(res.shortfall).toBe(0);
    expect(res.usedFallback).toBe(true);
    expect(res.selected.filter((q) => q.difficulty === "hard")).toHaveLength(5);
  });

  it("reports a shortfall when the bank genuinely cannot fill the module", () => {
    const pool = makePool([{ difficulty: "med", topic: 1, n: 10 }]);
    const res = selectQuestions(pool, 22, { target: "hard", rng: seededRng(3) });
    expect(res.selected).toHaveLength(10);
    expect(res.shortfall).toBe(12);
  });

  it("never repeats a question within a module", () => {
    const pool = makePool([{ difficulty: "med", topic: 1, n: 50 }]);
    const res = selectQuestions(pool, 22, { target: "mixed", rng: seededRng(4) });
    expect(new Set(res.selected.map((q) => q.id)).size).toBe(22);
  });

  it("honours the exclude set so module 2 cannot repeat module 1", () => {
    const pool = makePool([{ difficulty: "med", topic: 1, n: 40 }]);
    const m1 = selectQuestions(pool, 20, { target: "mixed", rng: seededRng(5) });
    const usedIds = new Set(m1.selected.map((q) => q.id));
    const m2 = selectQuestions(pool, 20, {
      target: "hard",
      rng: seededRng(6),
      exclude: usedIds,
    });
    expect(m2.selected).toHaveLength(20);
    for (const q of m2.selected) expect(usedIds.has(q.id)).toBe(false);
  });

  it("spreads across topics instead of serving one block", () => {
    const pool = makePool([
      { difficulty: "med", topic: 1, n: 20 },
      { difficulty: "med", topic: 2, n: 20 },
      { difficulty: "med", topic: 3, n: 20 },
      { difficulty: "med", topic: 4, n: 20 },
    ]);
    const res = selectQuestions(pool, 12, { target: "mixed", rng: seededRng(7) });
    const topics = new Set(res.selected.map((q) => q.topic_id));
    expect(topics.size).toBe(4);
    // Round-robin means no topic should dominate.
    for (const t of topics) {
      expect(res.selected.filter((q) => q.topic_id === t).length).toBeLessThanOrEqual(4);
    }
  });

  it("is deterministic for a given seed", () => {
    const pool = makePool([
      { difficulty: "med", topic: 1, n: 30 },
      { difficulty: "hard", topic: 2, n: 30 },
    ]);
    const a = selectQuestions(pool, 15, { target: "hard", rng: seededRng(99) });
    const b = selectQuestions(pool, 15, { target: "hard", rng: seededRng(99) });
    expect(a.selected.map((q) => q.id)).toEqual(b.selected.map((q) => q.id));
  });

  it("returns nothing for a zero or negative count", () => {
    const pool = makePool([{ difficulty: "med", topic: 1, n: 10 }]);
    expect(selectQuestions(pool, 0, { target: "mixed", rng }).selected).toHaveLength(0);
    expect(selectQuestions(pool, -5, { target: "mixed", rng }).selected).toHaveLength(0);
  });

  it("handles an empty pool without throwing", () => {
    const res = selectQuestions([], 22, { target: "hard", rng });
    expect(res.selected).toHaveLength(0);
    expect(res.shortfall).toBe(22);
  });
});

describe("selectModule1", () => {
  it("leads with medium-difficulty questions", () => {
    const pool = makePool([
      { difficulty: "easy", topic: 1, n: 20 },
      { difficulty: "med", topic: 2, n: 20 },
      { difficulty: "hard", topic: 3, n: 20 },
    ]);
    const res = selectModule1(pool, 20, seededRng(11));
    expect(res.selected).toHaveLength(20);
    expect(res.selected.every((q) => q.difficulty === "med")).toBe(true);
  });

  it("mixes in easy and hard once medium runs out", () => {
    const pool = makePool([
      { difficulty: "easy", topic: 1, n: 20 },
      { difficulty: "med", topic: 2, n: 5 },
      { difficulty: "hard", topic: 3, n: 20 },
    ]);
    const res = selectModule1(pool, 22, seededRng(12));
    expect(res.selected).toHaveLength(22);
    const kinds = new Set(res.selected.map((q) => q.difficulty));
    expect(kinds.size).toBeGreaterThan(1);
  });
});
