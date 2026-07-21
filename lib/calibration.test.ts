import { describe, expect, it } from "vitest";
import {
  MIN_ATTEMPTS_TO_CALIBRATE,
  bandDistance,
  calibrateBatch,
  calibrateQuestion,
  pValueToDifficulty,
  summarise,
} from "./calibration";

describe("pValueToDifficulty", () => {
  it("maps the facility index onto bands", () => {
    expect(pValueToDifficulty(1)).toBe("easy");
    expect(pValueToDifficulty(0.85)).toBe("easy");
    expect(pValueToDifficulty(0.84)).toBe("med");
    expect(pValueToDifficulty(0.6)).toBe("med");
    expect(pValueToDifficulty(0.59)).toBe("hard");
    expect(pValueToDifficulty(0.35)).toBe("hard");
    expect(pValueToDifficulty(0.34)).toBe("1600level");
    expect(pValueToDifficulty(0)).toBe("1600level");
  });

  it("is monotonic — an easier question never gets a harder label", () => {
    const order = ["1600level", "hard", "med", "easy"];
    let lastIndex = -1;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const idx = order.indexOf(pValueToDifficulty(p));
      expect(idx).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = idx;
    }
  });
});

describe("bandDistance", () => {
  it("measures how far apart two labels are", () => {
    expect(bandDistance("easy", "easy")).toBe(0);
    expect(bandDistance("easy", "med")).toBe(1);
    expect(bandDistance("easy", "1600level")).toBe(3);
  });

  it("treats an unknown label as no distance rather than throwing", () => {
    expect(bandDistance("real", "easy")).toBe(0);
    expect(bandDistance(null, "easy")).toBe(0);
  });
});

describe("calibrateQuestion", () => {
  it("refuses to calibrate on too little evidence", () => {
    const r = calibrateQuestion({
      questionId: 1,
      asserted: "easy",
      attempts: MIN_ATTEMPTS_TO_CALIBRATE - 1,
      correct: 0,
    });
    // 0% correct, but from too few attempts to mean anything.
    expect(r.reliable).toBe(false);
    expect(r.calibrated).toBeNull();
    expect(r.mistagged).toBe(false);
  });

  it("calibrates once there is enough evidence", () => {
    const r = calibrateQuestion({ questionId: 1, asserted: "easy", attempts: 10, correct: 2 });
    expect(r.reliable).toBe(true);
    expect(r.pValue).toBeCloseTo(0.2);
    expect(r.calibrated).toBe("1600level");
  });

  it("flags a question shipped as easy that nobody can answer", () => {
    const r = calibrateQuestion({ questionId: 7, asserted: "easy", attempts: 12, correct: 2 });
    expect(r.drift).toBe(3);
    expect(r.mistagged).toBe(true);
  });

  it("does not flag a one-band disagreement as mis-tagged", () => {
    // easy -> med is within tolerance; labels are inherently fuzzy.
    const r = calibrateQuestion({ questionId: 2, asserted: "easy", attempts: 10, correct: 7 });
    expect(r.calibrated).toBe("med");
    expect(r.drift).toBe(1);
    expect(r.mistagged).toBe(false);
  });

  it("handles a question with no attempts", () => {
    const r = calibrateQuestion({ questionId: 3, asserted: "med", attempts: 0, correct: 0 });
    expect(r.pValue).toBe(0);
    expect(r.reliable).toBe(false);
    expect(r.calibrated).toBeNull();
  });

  it("clamps impossible input rather than producing a p-value above 1", () => {
    const r = calibrateQuestion({ questionId: 4, asserted: "med", attempts: 5, correct: 99 });
    expect(r.pValue).toBeLessThanOrEqual(1);
  });

  it("treats a question that everyone gets right as easy", () => {
    const r = calibrateQuestion({ questionId: 5, asserted: "hard", attempts: 8, correct: 8 });
    expect(r.calibrated).toBe("easy");
    expect(r.mistagged).toBe(true); // hard -> easy is two bands
  });
});

describe("summarise", () => {
  it("counts reliability and mis-tagging separately", () => {
    const results = calibrateBatch([
      { questionId: 1, asserted: "easy", attempts: 10, correct: 1 }, // mistagged
      { questionId: 2, asserted: "hard", attempts: 10, correct: 10 }, // mistagged
      { questionId: 3, asserted: "med", attempts: 10, correct: 7 }, // fine
      { questionId: 4, asserted: "med", attempts: 1, correct: 0 }, // unreliable
    ]);
    const s = summarise(results);

    expect(s.considered).toBe(4);
    expect(s.reliable).toBe(3);
    expect(s.mistagged).toBe(2);
    expect(s.worst).toHaveLength(2);
    expect(s.byBand.med).toBe(1);
  });

  it("orders the worst offenders by drift", () => {
    const results = calibrateBatch([
      { questionId: 1, asserted: "easy", attempts: 10, correct: 5 }, // easy->hard, drift 2
      { questionId: 2, asserted: "easy", attempts: 10, correct: 1 }, // easy->1600, drift 3
    ]);
    const s = summarise(results);
    expect(s.worst[0].questionId).toBe(2);
  });

  it("handles an empty batch", () => {
    const s = summarise([]);
    expect(s.considered).toBe(0);
    expect(s.worst).toEqual([]);
  });
});
