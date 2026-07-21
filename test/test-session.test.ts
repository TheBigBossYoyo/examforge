/**
 * End-to-end test of the adaptive section lifecycle against a real SQLite
 * database: start a section, sit module 1, get routed, sit module 2, get a
 * score. This is the path that never existed before Phase 1 — the routing
 * arithmetic in lib/scoring.ts had no caller.
 *
 * Uses a throwaway database file per run via EXAMFORGE_DB_PATH, which lib/db.ts
 * reads at module load, so the import of any app module must happen after the
 * env var is set.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DB_PATH = path.join(os.tmpdir(), `examforge-test-${process.pid}-${Date.now()}.db`);
process.env.EXAMFORGE_DB_PATH = DB_PATH;

// Imported dynamically so EXAMFORGE_DB_PATH is set first.
type Mod = {
  db: typeof import("../lib/db");
  session: typeof import("../lib/test-session");
  format: typeof import("../lib/exam-format");
};
let m: Mod;

let examId: number;

/** Insert `n` questions of a given difficulty into a topic, with known answers. */
function seedQuestions(
  execute: typeof import("../lib/db").execute,
  topicId: number,
  difficulty: string,
  n: number,
  tag: string,
): void {
  for (let i = 0; i < n; i++) {
    execute(
      `INSERT INTO questions
         (exam_id, topic_id, prompt_md, choices_json, correct_answer, difficulty, origin, source_label)
       VALUES (?,?,?,?,?,?,'ai_generated',?)`,
      [
        examId,
        topicId,
        `${tag} question ${i}`,
        JSON.stringify(["A", "B", "C", "D"]),
        "A", // every seeded question has correct answer "A"
        difficulty,
        tag,
      ],
    );
  }
}

beforeAll(async () => {
  m = {
    db: await import("../lib/db"),
    session: await import("../lib/test-session"),
    format: await import("../lib/exam-format"),
  };
  const { execute, queryOne } = m.db;

  m.db.getDb(); // create schema + run migrations

  examId = execute(
    "INSERT INTO exams (name, target_score, exam_date, scale_min, scale_max) VALUES ('SAT',1600,'2026-08-22',400,1600)",
  ).lastInsertRowid;

  // Two Math topics so topic-spreading has something to spread across, with a
  // deep pool in every band so routing never has to fall back.
  const t1 = execute("INSERT INTO topics (exam_id, area, subtopic) VALUES (?,'Math','Algebra')", [
    examId,
  ]).lastInsertRowid;
  const t2 = execute("INSERT INTO topics (exam_id, area, subtopic) VALUES (?,'Math','Geometry')", [
    examId,
  ]).lastInsertRowid;

  for (const t of [t1, t2]) {
    seedQuestions(execute, t, "easy", 30, "easy");
    seedQuestions(execute, t, "med", 30, "med");
    seedQuestions(execute, t, "hard", 30, "hard");
  }

  expect(queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM questions")?.n).toBe(180);
});

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB_PATH + suffix);
    } catch {
      /* already gone */
    }
  }
});

/** Answer the first `correct` questions right and the rest wrong. */
function answers(
  questions: { id: number }[],
  correct: number,
): import("../lib/attempts").SubmittedResponse[] {
  return questions.map((q, i) => ({
    questionId: q.id,
    givenAnswer: i < correct ? "A" : "B",
    secondsSpent: 30,
    hintsUsed: 0,
  }));
}

describe("adaptive SAT section", () => {
  it("serves a full module 1 sized to the real exam", () => {
    const handle = m.session.startSection({ examId, section: "Math", mode: "exam" });
    expect(handle.moduleNumber).toBe(1);
    expect(handle.moduleCount).toBe(2);
    expect(handle.questions).toHaveLength(22); // real digital SAT Math module
    expect(handle.timeLimitSec).toBe(35 * 60);
    expect(handle.allowCalculator).toBe(true); // Desmos is available in Math
    expect(handle.referenceSheet).toBe(true);
    expect(handle.shortfall).toBe(0);
    expect(handle.moduleDifficulty).toBeNull();
  });

  it("routes a strong module 1 into the HARD module 2", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    // 18/22 = 0.82, comfortably over the 0.7 threshold
    const res = m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 1200,
      responses: answers(m1.questions, 18),
    });

    expect(res.sessionComplete).toBe(false);
    expect(res.moduleRaw).toBe(18);
    expect(res.routedTo).toBe("hard");
    expect(res.next).not.toBeNull();
    expect(res.next!.moduleNumber).toBe(2);
    expect(res.next!.moduleDifficulty).toBe("hard");
    expect(res.next!.questions).toHaveLength(22);
    expect(res.next!.questions.every((q) => q.difficulty === "hard")).toBe(true);
  });

  it("routes a weak module 1 into the EASY module 2", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    // 10/22 = 0.45, under the threshold
    const res = m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 1200,
      responses: answers(m1.questions, 10),
    });

    expect(res.routedTo).toBe("easy");
    expect(res.next!.moduleDifficulty).toBe("easy");
    expect(res.next!.questions.every((q) => q.difficulty === "easy")).toBe(true);
  });

  it("never repeats a module 1 question in module 2", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    const seenInM1 = new Set(m1.questions.map((q) => q.id));
    const res = m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 1200,
      responses: answers(m1.questions, 18),
    });
    for (const q of res.next!.questions) {
      expect(seenInM1.has(q.id)).toBe(false);
    }
  });

  it("scores the whole section once module 2 is submitted", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    const afterM1 = m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 1200,
      responses: answers(m1.questions, 22), // perfect
    });

    const m2 = afterM1.next!;
    const final = m.session.submitModule({
      sessionId: m2.sessionId,
      attemptId: m2.attemptId,
      secondsTotal: 1200,
      responses: answers(m2.questions, 22), // perfect
    });

    expect(final.sessionComplete).toBe(true);
    expect(final.next).toBeNull();
    expect(final.routedTo).toBe("hard");
    expect(final.scaledScore).toBe(800);

    const saved = m.session.getSession(m1.sessionId)!;
    expect(saved.finished_at).not.toBeNull();
    expect(saved.raw_score).toBe(44);
    expect(saved.scaled_score).toBe(800);
    expect(saved.routed_difficulty).toBe("hard");
  });

  it("caps the score when module 1 missed the harder module 2", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    const afterM1 = m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 1200,
      responses: answers(m1.questions, 15), // 0.68 — just under threshold
    });
    expect(afterM1.routedTo).toBe("easy");

    const m2 = afterM1.next!;
    const final = m.session.submitModule({
      sessionId: m2.sessionId,
      attemptId: m2.attemptId,
      secondsTotal: 1200,
      responses: answers(m2.questions, 22), // perfect on the easy module
    });

    // 37/44 raw is a high fraction, but the easy route caps the section.
    expect(final.scaledScore).toBe(650);
    expect(final.scaledLabel).toContain("capped");
  });

  it("records one attempt per module, linked to the session", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    const afterM1 = m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 900,
      responses: answers(m1.questions, 20),
    });
    m.session.submitModule({
      sessionId: afterM1.next!.sessionId,
      attemptId: afterM1.next!.attemptId,
      secondsTotal: 900,
      responses: answers(afterM1.next!.questions, 12),
    });

    const rows = m.db.query<{ module_number: number; raw_score: number; module_difficulty: string | null }>(
      "SELECT module_number, raw_score, module_difficulty FROM attempts WHERE session_id = ? ORDER BY module_number",
      [m1.sessionId],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].module_number).toBe(1);
    expect(rows[0].raw_score).toBe(20);
    expect(rows[0].module_difficulty).toBeNull();
    expect(rows[1].module_number).toBe(2);
    expect(rows[1].raw_score).toBe(12);
    expect(rows[1].module_difficulty).toBe("hard");
  });

  it("persists Mark for Review and eliminated choices", () => {
    const m1 = m.session.startSection({ examId, section: "Math", mode: "exam" });
    const responses = answers(m1.questions, 18);
    responses[0] = { ...responses[0], flagged: true, eliminated: [1, 3] };

    m.session.submitModule({
      sessionId: m1.sessionId,
      attemptId: m1.attemptId,
      secondsTotal: 1200,
      responses,
    });

    const row = m.db.queryOne<{ flagged: number; eliminated_json: string | null }>(
      "SELECT flagged, eliminated_json FROM responses WHERE attempt_id = ? AND question_id = ?",
      [m1.attemptId, responses[0].questionId],
    );
    expect(row?.flagged).toBe(1);
    expect(JSON.parse(row!.eliminated_json!)).toEqual([1, 3]);
  });

  it("rejects an attempt that does not belong to the session", () => {
    const a = m.session.startSection({ examId, section: "Math", mode: "exam" });
    const b = m.session.startSection({ examId, section: "Math", mode: "exam" });
    expect(() =>
      m.session.submitModule({
        sessionId: a.sessionId,
        attemptId: b.attemptId, // mismatched
        secondsTotal: 10,
        responses: [],
      }),
    ).toThrow(/does not belong/i);
  });

  it("rejects an unknown section", () => {
    expect(() => m.session.startSection({ examId, section: "Nonsense", mode: "exam" })).toThrow(
      /unknown section/i,
    );
  });

  it("leaves an untimed diagnostic without a time limit", () => {
    const handle = m.session.startSection({ examId, section: "Math", mode: "untimed" });
    expect(handle.timeLimitSec).toBeNull();
  });
});
