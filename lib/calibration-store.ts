/** Persisting observed difficulty. Pure logic lives in lib/calibration.ts. */
import { execute, query, transaction } from "./db";
import {
  calibrateBatch,
  summarise,
  type CalibrationInput,
  type CalibrationResult,
  type CalibrationSummary,
} from "./calibration";

/** Observed performance per question, from every marked response. */
export function collectCalibrationInputs(examId?: number): CalibrationInput[] {
  const where = ["r.is_correct IS NOT NULL"];
  const params: unknown[] = [];
  if (examId) {
    where.push("q.exam_id = ?");
    params.push(examId);
  }

  return query<{ questionId: number; asserted: string | null; attempts: number; correct: number }>(
    `SELECT q.id AS questionId,
            q.difficulty AS asserted,
            COUNT(*) AS attempts,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM responses r
       JOIN questions q ON q.id = r.question_id
      WHERE ${where.join(" AND ")}
      GROUP BY q.id`,
    params,
  );
}

export interface CalibrationRun {
  summary: CalibrationSummary;
  written: number;
  results: CalibrationResult[];
}

/**
 * Recompute and store observed difficulty.
 *
 * Writes only to the observed_* columns. `difficulty` — the asserted, exam-
 * fidelity label that module routing reads — is never overwritten, so
 * calibration cannot make a simulated section drift away from the real one.
 */
export function runCalibration(examId?: number, dryRun = false): CalibrationRun {
  const inputs = collectCalibrationInputs(examId);
  const results = calibrateBatch(inputs);
  const summary = summarise(results);

  if (dryRun) return { summary, written: 0, results };

  const written = transaction(() => {
    let n = 0;
    for (const r of results) {
      execute(
        `UPDATE questions
            SET observed_p_value = ?, observed_attempts = ?,
                calibrated_difficulty = ?, calibrated_at = datetime('now')
          WHERE id = ?`,
        [r.pValue, r.attempts, r.calibrated, r.questionId],
      );
      n++;
    }
    return n;
  });

  return { summary, written, results };
}

export interface MistaggedQuestion {
  id: number;
  prompt_md: string;
  area: string | null;
  subtopic: string | null;
  asserted: string | null;
  calibrated: string | null;
  observed_p_value: number;
  observed_attempts: number;
}

/**
 * Questions whose shipped label disagrees with reality by two or more bands.
 * These are the ones actively degrading module composition.
 */
export function getMistaggedQuestions(examId?: number, limit = 20): MistaggedQuestion[] {
  const where = [
    "q.calibrated_difficulty IS NOT NULL",
    "q.difficulty IS NOT NULL",
    "q.calibrated_difficulty <> q.difficulty",
  ];
  const params: unknown[] = [];
  if (examId) {
    where.push("q.exam_id = ?");
    params.push(examId);
  }
  params.push(Math.max(1, limit));

  const rows = query<MistaggedQuestion>(
    `SELECT q.id, q.prompt_md, t.area, t.subtopic,
            q.difficulty AS asserted, q.calibrated_difficulty AS calibrated,
            q.observed_p_value, q.observed_attempts
       FROM questions q
       LEFT JOIN topics t ON t.id = q.topic_id
      WHERE ${where.join(" AND ")}
      ORDER BY q.observed_attempts DESC
      LIMIT ?`,
    params,
  );

  // Only two-band-plus disagreements are worth surfacing; one band is noise.
  const ORDER = ["easy", "med", "hard", "1600level"];
  return rows.filter(
    (r) => Math.abs(ORDER.indexOf(r.asserted ?? "") - ORDER.indexOf(r.calibrated ?? "")) >= 2,
  );
}
