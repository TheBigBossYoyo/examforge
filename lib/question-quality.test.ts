import { describe, expect, it } from "vitest";
import {
  hasBalancedLatex,
  isDuplicate,
  promptSimilarity,
  screenBatch,
  validateQuestion,
} from "./question-quality";
import type { ImportQuestion } from "./importer";

function q(over: Partial<ImportQuestion> = {}): ImportQuestion {
  return {
    exam: "SAT",
    area: "Math",
    subtopic: "Linear equations & functions",
    prompt_md: "If $3x + 5 = 20$, what is the value of $x$?",
    choices: ["$5$", "$10$", "$15$", "$3$"],
    correct_answer: "$5$",
    solution_md: "Subtract $5$ from both sides to get $3x = 15$, then divide by $3$ to get $x = 5$.",
    difficulty: "easy",
    desmos_recommended: false,
    ...over,
  };
}

const codes = (x: ImportQuestion) => validateQuestion(x).issues.map((i) => i.code);

describe("validateQuestion", () => {
  it("accepts a well-formed multiple-choice question", () => {
    expect(validateQuestion(q()).ok).toBe(true);
  });

  it("rejects an answer key that is not among the choices", () => {
    expect(codes(q({ correct_answer: "$7$" }))).toContain("key_not_in_choices");
  });

  it("matches the key to a choice ignoring LaTeX delimiters", () => {
    // "5" and "$5$" are the same answer; this must not be a rejection.
    expect(validateQuestion(q({ correct_answer: "5" })).ok).toBe(true);
  });

  it("rejects repeated choices", () => {
    expect(codes(q({ choices: ["$5$", "$5$", "$10$", "$15$"] }))).toContain("duplicate_choices");
  });

  it("rejects an implausible number of choices", () => {
    expect(codes(q({ choices: ["$5$", "$10$"] }))).toContain("bad_choice_count");
    expect(codes(q({ choices: ["1", "2", "3", "4", "5", "6"] }))).toContain("bad_choice_count");
  });

  it("rejects a missing or throwaway solution", () => {
    expect(codes(q({ solution_md: null }))).toContain("missing_solution");
    expect(codes(q({ solution_md: "Solve it." }))).toContain("solution_too_short");
  });

  it("rejects unbalanced LaTeX", () => {
    expect(codes(q({ prompt_md: "If $3x + 5 = 20, what is $x$?" }))).toContain("unbalanced_latex");
  });

  it("rejects a stub prompt", () => {
    expect(codes(q({ prompt_md: "Solve." }))).toContain("prompt_too_short");
  });

  describe("free response", () => {
    it("accepts a numeric free-response answer on SAT Math", () => {
      expect(validateQuestion(q({ choices: null, correct_answer: "5" })).ok).toBe(true);
      expect(validateQuestion(q({ choices: null, correct_answer: "1/2" })).ok).toBe(true);
    });

    it("rejects a non-numeric free-response answer", () => {
      expect(codes(q({ choices: null, correct_answer: "five" }))).toContain(
        "spr_answer_not_numeric",
      );
    });

    it("rejects free response where the real exam has none", () => {
      expect(codes(q({ exam: "SAT", area: "RW", choices: null, correct_answer: "5" }))).toContain(
        "spr_not_allowed_here",
      );
      expect(
        codes(q({ exam: "TMUA", area: "P1", choices: null, correct_answer: "5" })),
      ).toContain("spr_not_allowed_here");
    });
  });

  describe("Desmos", () => {
    it("requires a faster method when Desmos is recommended", () => {
      expect(codes(q({ desmos_recommended: true }))).toContain("desmos_without_method");
    });

    it("accepts Desmos with a method", () => {
      expect(
        validateQuestion(
          q({ desmos_recommended: true, faster_method_md: "Type the equation; read the root." }),
        ).ok,
      ).toBe(true);
    });

    it("rejects Desmos on sections with no calculator", () => {
      const rw = q({
        exam: "SAT",
        area: "RW",
        desmos_recommended: true,
        faster_method_md: "x",
        subtopic: "Transitions",
      });
      expect(codes(rw)).toContain("desmos_on_non_calculator");

      const tmua = q({
        exam: "TMUA",
        area: "P1",
        desmos_recommended: true,
        faster_method_md: "x",
        subtopic: "Algebra & functions",
      });
      expect(codes(tmua)).toContain("desmos_on_non_calculator");
    });
  });
});

describe("hasBalancedLatex", () => {
  it("accepts balanced inline and block math", () => {
    expect(hasBalancedLatex("$x$ and $y$")).toBe(true);
    expect(hasBalancedLatex("$$x^2$$")).toBe(true);
    expect(hasBalancedLatex("no maths here")).toBe(true);
  });

  it("rejects an odd delimiter", () => {
    expect(hasBalancedLatex("$x and y")).toBe(false);
    expect(hasBalancedLatex("$$x^2")).toBe(false);
  });

  it("ignores escaped dollar signs", () => {
    expect(hasBalancedLatex("costs \\$5 today")).toBe(true);
    expect(hasBalancedLatex("costs \\$5 and $x$ apples")).toBe(true);
  });
});

describe("duplicate detection", () => {
  it("scores identical prompts as fully similar", () => {
    expect(promptSimilarity("If 3x + 5 = 20, find x", "If 3x + 5 = 20, find x")).toBe(1);
  });

  it("scores unrelated prompts as dissimilar", () => {
    expect(
      promptSimilarity(
        "If 3x + 5 = 20, find x",
        "What is the area of a circle with radius seven",
      ),
    ).toBeLessThan(0.2);
  });

  it("catches an exact restatement", () => {
    const res = isDuplicate("If $3x+5=20$, what is $x$?", ["If $3x+5=20$, what is $x$?"]);
    expect(res.duplicate).toBe(true);
    expect(res.similarity).toBe(1);
  });

  it("catches a near-duplicate with trivial rewording", () => {
    const res = isDuplicate("The value of x when 3x plus 5 equals 20 is what number", [
      "The value of x when 3x plus 5 equals 20 is which number",
    ]);
    expect(res.duplicate).toBe(true);
  });

  it("does not flag genuinely different questions", () => {
    const res = isDuplicate("What is the slope of the line y = 4x - 7?", [
      "If $3x+5=20$, what is $x$?",
      "What is the area of a circle of radius 3?",
    ]);
    expect(res.duplicate).toBe(false);
  });
});

describe("screenBatch", () => {
  it("separates accepted from rejected and counts reasons", () => {
    const report = screenBatch([
      q(),
      q({ prompt_md: "What is $2+2$ equal to in total?", correct_answer: "$99$" }),
      q({ prompt_md: "What is the slope of $y=4x-7$?", choices: ["$4$", "$4$", "$7$", "$-7$"], correct_answer: "$4$" }),
    ]);

    expect(report.accepted).toHaveLength(1);
    expect(report.rejected).toHaveLength(2);
    expect(report.byCode.key_not_in_choices).toBe(1);
    expect(report.byCode.duplicate_choices).toBe(1);
  });

  it("removes duplicates within the batch itself", () => {
    const report = screenBatch([q(), q()]);
    expect(report.accepted).toHaveLength(1);
    expect(report.byCode.duplicate_of_existing).toBe(1);
  });

  it("removes candidates already present in the bank", () => {
    const report = screenBatch([q()], ["If $3x + 5 = 20$, what is the value of $x$?"]);
    expect(report.accepted).toHaveLength(0);
    expect(report.byCode.duplicate_of_existing).toBe(1);
  });

  it("distinguishes RW questions that share a boilerplate stem", () => {
    // Every transitions item asks the same thing; only the passage differs.
    // Comparing stems alone would reject the whole topic as duplicates.
    const stem = "Which choice completes the text with the most logical transition?";
    const rw = (passage: string) =>
      q({
        area: "RW",
        subtopic: "Transitions",
        prompt_md: stem,
        passage_md: passage,
        choices: ["However", "Therefore", "Moreover", "Meanwhile"],
        correct_answer: "However",
        solution_md:
          "The second sentence contrasts with the first, so a contrast transition is needed here.",
      });

    const report = screenBatch([
      rw("The trial produced no clear signal across three separate runs of the apparatus."),
      rw("Coral reefs absorb wave energy before it reaches the shoreline behind them."),
      rw("Medieval scribes copied manuscripts by hand in cold and poorly lit rooms."),
    ]);

    expect(report.accepted).toHaveLength(3);
    expect(report.byCode.duplicate_of_existing).toBeUndefined();
  });

  it("still catches RW items whose passages genuinely match", () => {
    const stem = "Which choice completes the text with the most logical transition?";
    const passage = "The trial produced no clear signal across three separate runs.";
    const rw = () =>
      q({
        area: "RW",
        subtopic: "Transitions",
        prompt_md: stem,
        passage_md: passage,
        choices: ["However", "Therefore", "Moreover", "Meanwhile"],
        correct_answer: "However",
        solution_md:
          "The second sentence contrasts with the first, so a contrast transition is needed here.",
      });

    const report = screenBatch([rw(), rw()]);
    expect(report.accepted).toHaveLength(1);
    expect(report.byCode.duplicate_of_existing).toBe(1);
  });
});
