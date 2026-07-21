import { describe, expect, it } from "vitest";
import {
  DEFAULT_SAT_MATH,
  DEFAULT_SAT_RW,
  satSectionFromAccuracy,
  satSectionScore,
  satTotal,
} from "./scoring";

// NOTE: tmuaPaperBand / tmuaOverall are not covered here because they read the
// band table from the settings table, which needs a live database. Decoupling
// the tables from the pure conversion is Phase 1 work; these tests cover the
// parts that are already pure.

describe("satSectionScore", () => {
  const math = DEFAULT_SAT_MATH; // 44 total, 22 in module 1, threshold 0.7, cap 650

  it("routes to the hard module when module 1 clears the threshold", () => {
    const res = satSectionScore(math, 22, 22);
    expect(res.routedHard).toBe(true);
    expect(res.rawTotal).toBe(44);
    expect(res.scaled).toBe(800);
    expect(res.capped).toBe(false);
  });

  it("routes to the easy module below the threshold", () => {
    // 15/22 = 0.68 < 0.7
    const res = satSectionScore(math, 15, 22);
    expect(res.routedHard).toBe(false);
  });

  it("treats the threshold as inclusive", () => {
    const atThreshold = Math.ceil(math.routeThreshold * math.module1Questions); // 16/22 = 0.727
    expect(satSectionScore(math, atThreshold, 0).routedHard).toBe(true);
  });

  it("caps the scaled score when not routed to the hard module", () => {
    // Strong overall, but module 1 missed the routing threshold.
    const res = satSectionScore(math, 15, 22);
    expect(res.capped).toBe(true);
    expect(res.scaled).toBe(math.cappedMax);
  });

  it("does not cap a score that is already below the cap", () => {
    const res = satSectionScore(math, 10, 12);
    expect(res.routedHard).toBe(false);
    expect(res.scaled).toBeLessThanOrEqual(math.cappedMax);
    expect(res.capped).toBe(false);
  });

  it("floors at the bottom of the scale", () => {
    const res = satSectionScore(math, 0, 0);
    expect(res.scaled).toBe(200);
    expect(res.routedHard).toBe(false);
  });

  it("is monotonic: more correct answers never lower the score", () => {
    let prev = -Infinity;
    for (let m2 = 0; m2 <= 22; m2++) {
      const { scaled } = satSectionScore(math, 22, m2); // hold module 1 at full
      expect(scaled).toBeGreaterThanOrEqual(prev);
      prev = scaled;
    }
  });

  it("never returns a score outside 200-800", () => {
    for (let m1 = 0; m1 <= 22; m1++) {
      for (let m2 = 0; m2 <= 22; m2++) {
        const { scaled } = satSectionScore(math, m1, m2);
        expect(scaled).toBeGreaterThanOrEqual(200);
        expect(scaled).toBeLessThanOrEqual(800);
      }
    }
  });

  it("applies the same rules to the Reading & Writing config", () => {
    const rw = DEFAULT_SAT_RW; // 54 total, 27 in module 1
    expect(satSectionScore(rw, 27, 27).scaled).toBe(800);
    expect(satSectionScore(rw, 0, 0).scaled).toBe(200);
    expect(satSectionScore(rw, 18, 27).capped).toBe(true); // 18/27 = 0.667 < 0.7
  });
});

describe("satSectionFromAccuracy", () => {
  it("maps perfect accuracy to the top of the scale", () => {
    expect(satSectionFromAccuracy(DEFAULT_SAT_MATH, 1).scaled).toBe(800);
  });

  it("maps zero accuracy to the bottom of the scale", () => {
    expect(satSectionFromAccuracy(DEFAULT_SAT_MATH, 0).scaled).toBe(200);
  });

  it("is monotonic across accuracy", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const { scaled } = satSectionFromAccuracy(DEFAULT_SAT_MATH, i / 20);
      expect(scaled).toBeGreaterThanOrEqual(prev);
      prev = scaled;
    }
  });
});

describe("satTotal", () => {
  it("sums both sections", () => {
    const rw = satSectionScore(DEFAULT_SAT_RW, 27, 27);
    const math = satSectionScore(DEFAULT_SAT_MATH, 22, 22);
    expect(satTotal(rw, math).total).toBe(1600);
  });

  it("flags the weaker section for prioritisation", () => {
    const strongRw = satSectionScore(DEFAULT_SAT_RW, 27, 27); // 800
    const weakMath = satSectionScore(DEFAULT_SAT_MATH, 10, 10); // well under
    expect(satTotal(strongRw, weakMath).prioritise).toBe("Math");
    expect(satTotal(weakMath, strongRw).prioritise).toBe("Reading & Writing");
  });

  it("reports balanced when the sections are within 30 points", () => {
    const a = satSectionScore(DEFAULT_SAT_RW, 27, 27);
    const b = satSectionScore(DEFAULT_SAT_MATH, 22, 22);
    expect(satTotal(a, b).prioritise).toBe("Balanced");
  });
});
