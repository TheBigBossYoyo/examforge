import { describe, expect, it } from "vitest";
import { isAnswerCorrect, normalizeText, numericallyEquivalent, parseNumeric } from "./answer";

describe("parseNumeric", () => {
  const cases: [string, number | null][] = [
    ["5", 5],
    ["-3", -3],
    [".5", 0.5],
    ["2.50", 2.5],
    ["1/2", 0.5],
    ["-3/4", -0.75],
    ["1,234", 1234],
    ["$5$", 5],
    ["$40", 40],
    ["50%", 50],
    ["\\frac{1}{2}", 0.5],
    ["\\tfrac{25}{3}", 25 / 3],
    ["\\dfrac{-1}{2}", -0.5],
    ["$\\tfrac{25}{3}$", 25 / 3],
    ["−3", -3], // unicode minus
    // Not numbers:
    ["2 1/2", null], // mixed number — see the note in answer.ts
    ["x", null],
    ["2x", null],
    ["\\sqrt{2}", null],
    ["\\pi", null],
    ["", null],
    ["1/0", null],
    ["abc", null],
  ];

  for (const [input, expected] of cases) {
    it(`parses ${JSON.stringify(input)} as ${expected}`, () => {
      const got = parseNumeric(input);
      if (expected === null) expect(got).toBeNull();
      else expect(got).toBeCloseTo(expected, 10);
    });
  }
});

describe("numericallyEquivalent", () => {
  it("matches exact values", () => {
    expect(numericallyEquivalent(0.5, 0.5)).toBe(true);
    expect(numericallyEquivalent(-3, -3)).toBe(true);
  });

  it("accepts repeating decimals rounded or truncated (SAT SPR rule)", () => {
    const twoThirds = 2 / 3;
    expect(numericallyEquivalent(0.6667, twoThirds)).toBe(true); // rounded, 4 sig
    expect(numericallyEquivalent(0.6666, twoThirds)).toBe(true); // truncated, 4 sig
    expect(numericallyEquivalent(0.667, twoThirds)).toBe(true); // 3 sig, we allow
  });

  it("rejects values that are simply not close enough", () => {
    expect(numericallyEquivalent(0.66, 2 / 3)).toBe(false);
    expect(numericallyEquivalent(0.7, 2 / 3)).toBe(false);
    expect(numericallyEquivalent(12, 0.5)).toBe(false);
  });
});

describe("normalizeText", () => {
  it("ignores case, whitespace and LaTeX delimiters", () => {
    expect(normalizeText("$5$")).toBe(normalizeText("5"));
    expect(normalizeText("  Hello   World ")).toBe("hello world");
    expect(normalizeText("The answer.")).toBe("the answer");
  });

  it("treats null and undefined as empty", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("isAnswerCorrect", () => {
  describe("multiple choice (stored choice strings)", () => {
    const correct: [string, string][] = [
      ["$5$", "$5$"],
      ["$5$", "5"],
      ["  $5$  ", "$5$"],
      ["$\\tfrac{25}{3}$", "$\\tfrac{25}{3}$"],
      ["Necessary but not sufficient", "necessary but not sufficient"],
    ];
    for (const [given, stored] of correct) {
      it(`marks ${JSON.stringify(given)} correct against ${JSON.stringify(stored)}`, () => {
        expect(isAnswerCorrect(given, stored)).toBe(true);
      });
    }

    it("marks a different choice wrong", () => {
      expect(isAnswerCorrect("$15$", "$5$")).toBe(false);
      expect(isAnswerCorrect("Sufficient but not necessary", "Necessary but not sufficient")).toBe(
        false,
      );
    });
  });

  describe("student-produced responses", () => {
    it("accepts equivalent fraction and decimal forms", () => {
      // Regression: the old marker stripped non-digits, turning "1/2" into 12.
      expect(isAnswerCorrect("1/2", "0.5")).toBe(true);
      expect(isAnswerCorrect("0.5", "1/2")).toBe(true);
      expect(isAnswerCorrect(".5", "1/2")).toBe(true);
      expect(isAnswerCorrect("2/4", "1/2")).toBe(true);
      expect(isAnswerCorrect("-3/4", "-0.75")).toBe(true);
      expect(isAnswerCorrect("25/3", "$\\tfrac{25}{3}$")).toBe(true);
    });

    it("ignores currency, percent and thousands separators", () => {
      expect(isAnswerCorrect("$40", "40")).toBe(true);
      expect(isAnswerCorrect("50%", "50")).toBe(true);
      expect(isAnswerCorrect("1,234", "1234")).toBe(true);
    });

    it("does NOT treat a fraction as its digits concatenated", () => {
      // The old implementation marked this CORRECT: "1/2" -> "12" -> 12.
      expect(isAnswerCorrect("12", "1/2")).toBe(false);
      // And this, via "\tfrac{25}{3}" -> "253".
      expect(isAnswerCorrect("253", "$\\tfrac{25}{3}$")).toBe(false);
    });

    it("rejects mixed numbers, as the real answer field does", () => {
      expect(isAnswerCorrect("2 1/2", "2.5")).toBe(false);
    });
  });

  describe("non-answers", () => {
    it("is never correct for null, undefined or blank", () => {
      expect(isAnswerCorrect(null, "5")).toBe(false);
      expect(isAnswerCorrect(undefined, "5")).toBe(false);
      expect(isAnswerCorrect("", "5")).toBe(false);
      expect(isAnswerCorrect("   ", "5")).toBe(false);
    });

    it("does not match a blank stored answer to a blank submission", () => {
      expect(isAnswerCorrect("", "")).toBe(false);
    });
  });
});
