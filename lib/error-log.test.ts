import { describe, expect, it } from "vitest";
import {
  rankNextActions,
  recencyWeight,
  suggestRootCause,
  unpractisedTopics,
  type TopicSignal,
} from "./error-log";

describe("suggestRootCause", () => {
  it("calls a confident wrong answer a concept gap", () => {
    const s = suggestRootCause({ secondsSpent: 60, paceBudget: 90, confidence: "confident" });
    expect(s.cause).toBe("concept_gap");
    expect(s.confidence).toBeGreaterThan(0.7);
  });

  it("prefers concept gap over timing when both could apply", () => {
    // Confident AND way over budget: the misconception is the real problem.
    const s = suggestRootCause({ secondsSpent: 300, paceBudget: 90, confidence: "confident" });
    expect(s.cause).toBe("concept_gap");
  });

  it("calls a big time overrun a timing problem", () => {
    const s = suggestRootCause({ secondsSpent: 200, paceBudget: 90, confidence: "unsure" });
    expect(s.cause).toBe("timing");
  });

  it("calls a very fast wrong answer a misread", () => {
    const s = suggestRootCause({ secondsSpent: 20, paceBudget: 90, confidence: "unsure" });
    expect(s.cause).toBe("misread");
  });

  it("treats an explicit guess as a concept gap, not a misread", () => {
    const s = suggestRootCause({ secondsSpent: 20, paceBudget: 90, confidence: "guessed" });
    expect(s.cause).toBe("concept_gap");
  });

  it("falls back to careless with low confidence in the guess", () => {
    const s = suggestRootCause({ secondsSpent: 85, paceBudget: 90, confidence: null });
    expect(s.cause).toBe("careless");
    expect(s.confidence).toBeLessThan(0.5);
  });

  it("always explains itself", () => {
    for (const c of ["confident", "unsure", "guessed", null] as const) {
      const s = suggestRootCause({ secondsSpent: 60, paceBudget: 90, confidence: c });
      expect(s.reason.length).toBeGreaterThan(20);
    }
  });

  it("survives a zero or missing budget", () => {
    expect(() => suggestRootCause({ secondsSpent: 60, paceBudget: 0 })).not.toThrow();
  });
});

describe("recencyWeight", () => {
  it("weights today at 1", () => {
    expect(recencyWeight("2026-07-21", "2026-07-21")).toBe(1);
  });

  it("halves after one half-life", () => {
    expect(recencyWeight("2026-07-07", "2026-07-21", 14)).toBeCloseTo(0.5, 6);
  });

  it("quarters after two half-lives", () => {
    expect(recencyWeight("2026-06-23", "2026-07-21", 14)).toBeCloseTo(0.25, 6);
  });

  it("never goes negative for a future date", () => {
    expect(recencyWeight("2026-08-01", "2026-07-21")).toBeLessThanOrEqual(1);
    expect(recencyWeight("2026-08-01", "2026-07-21")).toBeGreaterThanOrEqual(0);
  });
});

const topic = (over: Partial<TopicSignal> & { topicId: number }): TopicSignal => ({
  area: "Math",
  subtopic: `Topic ${over.topicId}`,
  attempts: 10,
  mistakeDates: [],
  mastery: 50,
  ...over,
});

describe("rankNextActions", () => {
  const NOW = "2026-07-21";

  it("ranks density above raw count", () => {
    const heavilyAttempted = topic({
      topicId: 1,
      subtopic: "Attempted a lot",
      attempts: 40,
      mistakeDates: Array(8).fill("2026-07-20"),
    });
    const denseFailure = topic({
      topicId: 2,
      subtopic: "Actually weak",
      attempts: 10,
      mistakeDates: Array(6).fill("2026-07-20"),
    });

    const ranked = rankNextActions([heavilyAttempted, denseFailure], NOW);
    expect(ranked[0].topicId).toBe(2); // fewer mistakes, far higher density
  });

  it("ranks a live gap above a stale one of equal density", () => {
    const stale = topic({
      topicId: 1,
      subtopic: "Old",
      attempts: 10,
      mistakeDates: Array(5).fill("2026-05-01"),
    });
    const live = topic({
      topicId: 2,
      subtopic: "Recent",
      attempts: 10,
      mistakeDates: Array(5).fill("2026-07-20"),
    });

    const ranked = rankNextActions([stale, live], NOW);
    expect(ranked[0].topicId).toBe(2);
    expect(ranked[0].recencyWeight).toBeGreaterThan(ranked[1].recencyWeight);
  });

  it("does not over-promote a topic with almost no evidence", () => {
    const oneBadQuestion = topic({
      topicId: 1,
      subtopic: "Barely touched",
      attempts: 1,
      mistakeDates: ["2026-07-20"],
    });
    const wellEvidenced = topic({
      topicId: 2,
      subtopic: "Well evidenced",
      attempts: 16,
      mistakeDates: Array(8).fill("2026-07-20"),
    });

    const ranked = rankNextActions([oneBadQuestion, wellEvidenced], NOW);
    expect(ranked[0].topicId).toBe(2);
  });

  it("excludes topics with no unresolved mistakes", () => {
    const clean = topic({ topicId: 1, attempts: 20, mistakeDates: [] });
    const weak = topic({ topicId: 2, attempts: 10, mistakeDates: ["2026-07-20"] });
    const ranked = rankNextActions([clean, weak], NOW);
    expect(ranked.map((r) => r.topicId)).not.toContain(1);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      topic({ topicId: i + 1, mistakeDates: ["2026-07-20"] }),
    );
    expect(rankNextActions(many, NOW, 3)).toHaveLength(3);
  });

  it("explains every recommendation", () => {
    const ranked = rankNextActions(
      [topic({ topicId: 1, mistakeDates: ["2026-07-20", "2026-07-19"] })],
      NOW,
    );
    expect(ranked[0].reason).toMatch(/unresolved/i);
  });

  it("handles an empty input", () => {
    expect(rankNextActions([], NOW)).toEqual([]);
  });
});

describe("unpractisedTopics", () => {
  it("surfaces coverage gaps that error ranking cannot see", () => {
    // A topic never attempted generates no errors, so it is invisible to
    // rankNextActions — but it is exactly what a 1600 attempt cannot skip.
    const never = topic({ topicId: 9, subtopic: "Untouched", attempts: 0 });
    const ranked = rankNextActions([never], "2026-07-21");
    expect(ranked).toHaveLength(0);
    expect(unpractisedTopics([never]).map((t) => t.topicId)).toEqual([9]);
  });
});
